"""
═══ Atlas Mall Suite — LightGBM Service Python ═══

Service HTTP léger exposant LightGBM pour PROPH3T-COM (CDC §4.2).
À déployer sur Render / Railway / Cloud Run / Vercel Python.

Endpoints :
  GET  /health             → { ok, version }
  POST /train              → { features, targets, hyperparams }
                          → { modelId, metrics }
  POST /predict            → { modelId, features }
                          → { revenuePerYear, revenuePerSqm, ci80Low, ci80High, topContributors }
  POST /backtest           → { modelId, features, targets }
                          → { mape, mae, r2 }

Installation locale :
  pip install fastapi uvicorn lightgbm scikit-learn numpy pydantic
  uvicorn app:app --reload --port 8000

Déploiement Render :
  render.yaml :
    services:
      - type: web
        name: atlas-lightgbm
        env: python
        buildCommand: pip install -r requirements.txt
        startCommand: uvicorn app:app --host 0.0.0.0 --port $PORT

Configuration côté Atlas :
  .env.local :
    VITE_LIGHTGBM_SERVICE_URL=https://atlas-lightgbm.onrender.com
    VITE_LIGHTGBM_API_KEY=optional_secret_key
"""

import os
import uuid
import time
from typing import Any
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import numpy as np
import lightgbm as lgb
from sklearn.model_selection import train_test_split
import pickle

app = FastAPI(title="Atlas LightGBM Service", version="1.0.0")

API_KEY = os.environ.get("ATLAS_LIGHTGBM_API_KEY", "")

# Stockage modèles en mémoire (TODO: redis/disque pour prod)
_models: dict[str, dict[str, Any]] = {}


# ─── Models Pydantic ─────────────────────────


class LocalFeatures(BaseModel):
    surfaceSqm: float
    category: str
    floorLevel: float
    distanceToEntranceM: float
    distanceToAnchorM: float
    distanceToCompetitorsM: float
    visibilityScore: float
    frontageLengthM: float
    footfallScore: float
    neighborhoodDiversity: float
    accessPmr: int
    cornerLocation: int
    elevatorProximityM: float
    parkingProximityM: float


class TrainRequest(BaseModel):
    features: list[LocalFeatures]
    targets: list[float]
    hyperparams: dict[str, Any] | None = None


class TrainResponse(BaseModel):
    modelId: str
    metrics: dict[str, float]


class PredictRequest(BaseModel):
    modelId: str
    features: LocalFeatures


class PredictResponse(BaseModel):
    revenuePerYear: float
    revenuePerSqm: float
    ci80Low: float
    ci80High: float
    topContributors: list[dict[str, Any]]


class BacktestRequest(BaseModel):
    modelId: str
    features: list[LocalFeatures]
    targets: list[float]


class BacktestResponse(BaseModel):
    mape: float
    mae: float
    r2: float


# ─── Auth ──────────────────────────


def check_auth(x_api_key: str | None) -> None:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ─── Encoding features ────────────────


CATEGORIES = ["mode", "restauration", "services", "loisirs",
              "alimentaire", "beaute", "enfants", "autre"]


def encode_features(f: LocalFeatures) -> list[float]:
    cat_one_hot = [1.0 if f.category == c else 0.0 for c in CATEGORIES]
    return [
        f.surfaceSqm, *cat_one_hot, f.floorLevel,
        f.distanceToEntranceM, f.distanceToAnchorM, f.distanceToCompetitorsM,
        f.visibilityScore, f.frontageLengthM, f.footfallScore,
        f.neighborhoodDiversity, float(f.accessPmr), float(f.cornerLocation),
        f.elevatorProximityM, f.parkingProximityM,
    ]


FEATURE_NAMES = [
    "surfaceSqm",
    *[f"cat_{c}" for c in CATEGORIES],
    "floorLevel", "distanceEntranceM", "distanceAnchorM", "distanceCompetitorsM",
    "visibilityScore", "frontageLengthM", "footfallScore", "neighborhoodDiversity",
    "accessPmr", "cornerLocation", "elevatorProximityM", "parkingProximityM",
]


# ─── Endpoints ──────────────────────


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "version": app.version,
        "modelsCached": len(_models),
        "lightgbm_version": lgb.__version__,
    }


@app.post("/train", response_model=TrainResponse)
def train(req: TrainRequest, x_api_key: str | None = Header(default=None)) -> TrainResponse:
    check_auth(x_api_key)
    if len(req.features) != len(req.targets):
        raise HTTPException(status_code=400, detail="features/targets length mismatch")
    if len(req.features) < 30:
        raise HTTPException(status_code=400, detail="dataset too small (min 30 samples)")

    X = np.array([encode_features(f) for f in req.features])
    y = np.array(req.targets)

    # Split train/val pour MAPE
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42,
    )

    hp = req.hyperparams or {}
    params = {
        "objective": "regression",
        "metric": "mape",
        "n_estimators": hp.get("n_estimators", 200),
        "max_depth": hp.get("max_depth", 6),
        "learning_rate": hp.get("learning_rate", 0.05),
        "min_child_samples": hp.get("min_child_samples", 5),
        "num_leaves": hp.get("num_leaves", 31),
        "verbose": -1,
    }

    t0 = time.time()
    model = lgb.LGBMRegressor(**params)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)],
              callbacks=[lgb.early_stopping(20, verbose=False)])
    train_duration = time.time() - t0

    # Métriques validation
    y_pred = model.predict(X_val)
    mape = float(np.mean(np.abs((y_val - y_pred) / np.maximum(y_val, 1e-6))))
    mae = float(np.mean(np.abs(y_val - y_pred)))
    ss_res = float(np.sum((y_val - y_pred) ** 2))
    ss_tot = float(np.sum((y_val - np.mean(y_val)) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

    model_id = f"lgb-{uuid.uuid4().hex[:12]}"
    _models[model_id] = {
        "model": model,
        "trained_at": time.time(),
        "metrics": {"mape": mape, "mae": mae, "r2": r2},
        "samples": len(req.features),
    }

    return TrainResponse(
        modelId=model_id,
        metrics={
            "mape": mape, "mae": mae, "r2": r2,
            "samples": float(len(req.features)),
            "trainDurationSec": train_duration,
        },
    )


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, x_api_key: str | None = Header(default=None)) -> PredictResponse:
    check_auth(x_api_key)
    if req.modelId not in _models:
        raise HTTPException(status_code=404, detail=f"model {req.modelId} not found")

    model = _models[req.modelId]["model"]
    X = np.array([encode_features(req.features)])
    pred_per_sqm = float(model.predict(X)[0])
    pred_per_year = pred_per_sqm * req.features.surfaceSqm

    # IC 80 % approximé via stddev des arbres
    leaves_per_tree = []
    for booster_idx in range(model.n_estimators_):
        leaf = model.booster_.predict(X, start_iteration=booster_idx, num_iteration=1)[0]
        leaves_per_tree.append(leaf)
    std = float(np.std(leaves_per_tree))
    ci_margin = 1.28 * std * req.features.surfaceSqm

    # Top contributeurs (feature importance gain × valeur encodée)
    importances = model.booster_.feature_importance(importance_type="gain")
    contributions = importances * np.abs(X[0])
    top_idx = np.argsort(contributions)[-3:][::-1]
    top = [
        {"feature": FEATURE_NAMES[i], "gain": float(contributions[i])}
        for i in top_idx
    ]

    return PredictResponse(
        revenuePerYear=max(0.0, pred_per_year),
        revenuePerSqm=max(0.0, pred_per_sqm),
        ci80Low=max(0.0, pred_per_year - ci_margin),
        ci80High=pred_per_year + ci_margin,
        topContributors=top,
    )


@app.post("/backtest", response_model=BacktestResponse)
def backtest(req: BacktestRequest, x_api_key: str | None = Header(default=None)) -> BacktestResponse:
    check_auth(x_api_key)
    if req.modelId not in _models:
        raise HTTPException(status_code=404, detail=f"model {req.modelId} not found")
    if len(req.features) != len(req.targets):
        raise HTTPException(status_code=400, detail="length mismatch")

    model = _models[req.modelId]["model"]
    X = np.array([encode_features(f) for f in req.features])
    y = np.array(req.targets)
    y_pred = model.predict(X)

    mape = float(np.mean(np.abs((y - y_pred) / np.maximum(y, 1e-6))))
    mae = float(np.mean(np.abs(y - y_pred)))
    ss_res = float(np.sum((y - y_pred) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

    return BacktestResponse(mape=mape, mae=mae, r2=r2)
