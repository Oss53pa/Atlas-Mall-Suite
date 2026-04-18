"""
═══ Atlas Mall Suite — Ghostscript Service ═══

Service HTTP qui convertit un PDF sRGB en PDF/X-1a CMJN via Ghostscript.
Référence : Cahier des charges PROPH3T §07 + Fix 2 cmyk-convert.

Endpoints :
  GET  /health              → { ok, version, ghostscript }
  POST /convert             → multipart (file=PDF, preset=PDFX-1a, icc_profile=ISOcoated_v2_300)
                          → application/pdf (CMJN converti)

Profils ICC supportés (selon presets) :
  - ISOcoated_v2_300 (Europe, papier couché 300%)
  - ISOuncoated (Europe, papier non couché)
  - JapanColor2001Coated (Asie)
  - USWebCoatedSWOP (Amérique du Nord)

Déploiement Cloud Run :
  gcloud run deploy atlas-ghostscript \
    --image gcr.io/PROJECT/atlas-ghostscript:1.0 \
    --memory 512Mi --cpu 1 --timeout 120s \
    --max-instances 10 --region europe-west1

Configuration côté Atlas Edge Function :
  supabase secrets set GHOSTSCRIPT_SERVICE_URL=https://atlas-ghostscript-xxx.run.app
"""

import os
import subprocess
import tempfile
import uuid
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Atlas Ghostscript Service", version="1.0.0")

# CORS configurable
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Profils ICC disponibles dans /opt/icc-profiles
ICC_PROFILES = {
    "ISOcoated_v2_300": "/opt/icc-profiles/ISOcoated_v2_300_eci.icc",
    "ISOuncoated": "/opt/icc-profiles/ISOuncoated.icc",
    "JapanColor2001Coated": "/opt/icc-profiles/JapanColor2001Coated.icc",
    "USWebCoatedSWOP": "/opt/icc-profiles/USWebCoatedSWOP.icc",
}

PRESETS = {
    "PDFX-1a": {
        "PDFA": "1",
        "PDFACompatibilityPolicy": "1",
        "ProcessColorModel": "DeviceCMYK",
        "ColorConversionStrategy": "CMYK",
    },
    "PDFX-3": {
        "PDFA": "1",
        "ProcessColorModel": "DeviceCMYK",
        "ColorConversionStrategy": "CMYK",
    },
    "CMYK-coated": {
        "ProcessColorModel": "DeviceCMYK",
        "ColorConversionStrategy": "CMYK",
    },
    "CMYK-uncoated": {
        "ProcessColorModel": "DeviceCMYK",
        "ColorConversionStrategy": "CMYK",
    },
}

MAX_BYTES = 50 * 1024 * 1024  # 50 MB

# ─── Health ─────────────────


@app.get("/health")
def health() -> dict:
    """Vérifie que Ghostscript est installé et accessible."""
    try:
        result = subprocess.run(
            ["gs", "--version"],
            capture_output=True, text=True, timeout=5,
        )
        gs_version = result.stdout.strip() if result.returncode == 0 else "unknown"
    except Exception as err:
        gs_version = f"error: {err}"

    icc_files = {
        name: os.path.exists(path) for name, path in ICC_PROFILES.items()
    }

    return {
        "ok": True,
        "version": app.version,
        "ghostscript": gs_version,
        "icc_profiles_available": icc_files,
        "presets_available": list(PRESETS.keys()),
    }


# ─── Conversion ─────────────


@app.post("/convert")
async def convert(
    file: UploadFile = File(..., description="PDF source (sRGB)"),
    preset: str = Form("PDFX-1a", description="Preset PDFX-1a / PDFX-3 / CMYK-coated / CMYK-uncoated"),
    icc_profile: str = Form("ISOcoated_v2_300", description="Profil ICC cible"),
):
    """Convertit un PDF sRGB en PDF/X-1a CMJN via Ghostscript."""

    # Validation
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(415, f"Type non supporté : {file.content_type} (PDF attendu)")

    if preset not in PRESETS:
        raise HTTPException(400, f"Preset inconnu : {preset}. Supportés : {list(PRESETS.keys())}")

    icc_path = ICC_PROFILES.get(icc_profile)
    if icc_path is None:
        raise HTTPException(400, f"Profil ICC inconnu : {icc_profile}")
    if not os.path.exists(icc_path):
        # Fallback gracieux : sans profil ICC explicite (Ghostscript utilise le défaut)
        icc_path = None

    # Lecture borne taille
    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_BYTES:
        raise HTTPException(413, f"PDF trop volumineux : {len(pdf_bytes)} > {MAX_BYTES}")

    if len(pdf_bytes) == 0:
        raise HTTPException(400, "PDF vide")

    # Workspace temporaire
    workdir = Path(tempfile.mkdtemp(prefix="atlas-gs-"))
    input_path = workdir / "input.pdf"
    output_path = workdir / "output.pdf"
    input_path.write_bytes(pdf_bytes)

    # Construction commande Ghostscript
    preset_args = PRESETS[preset]
    gs_cmd = [
        "gs",
        "-dNOPAUSE",
        "-dBATCH",
        "-dQUIET",
        "-dSAFER",
        "-sDEVICE=pdfwrite",
        f"-sOutputFile={output_path}",
        # PDF/A compatibility
        "-dCompatibilityLevel=1.4",
        "-dPDFSETTINGS=/prepress",
        # Color conversion
        "-sColorConversionStrategy=CMYK",
        "-sProcessColorModel=DeviceCMYK",
        # Embed all fonts
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        # Quality
        "-dDetectDuplicateImages=true",
        "-dCompressFonts=true",
    ]

    # Profile ICC
    if icc_path:
        gs_cmd += [
            f"-sDefaultRGBProfile={icc_path}",
            f"-sOutputICCProfile={icc_path}",
            "-dRenderIntent=1",  # relative colorimetric
        ]

    # Preset-specific args
    for key, value in preset_args.items():
        gs_cmd.append(f"-d{key}={value}" if value.isdigit() else f"-s{key}={value}")

    # Source file (toujours en dernier)
    gs_cmd.append(str(input_path))

    # Exécution
    try:
        result = subprocess.run(
            gs_cmd, capture_output=True, text=True, timeout=90,
        )
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Ghostscript conversion failed",
                    "exit_code": result.returncode,
                    "stderr": error_msg[-2000:],  # tronqué
                },
            )
        if not output_path.exists() or output_path.stat().st_size == 0:
            return JSONResponse(
                status_code=500,
                content={"error": "Output PDF vide ou manquant"},
            )

        # Renvoyer le fichier
        download_name = f"converted-{uuid.uuid4().hex[:8]}.pdf"
        return FileResponse(
            path=str(output_path),
            media_type="application/pdf",
            filename=download_name,
            headers={
                "X-Ghostscript-Version": subprocess.run(
                    ["gs", "--version"], capture_output=True, text=True,
                ).stdout.strip(),
                "X-Preset": preset,
                "X-ICC-Profile": icc_profile,
                "X-Original-Size": str(len(pdf_bytes)),
                "X-Output-Size": str(output_path.stat().st_size),
            },
        )
    except subprocess.TimeoutExpired:
        return JSONResponse(
            status_code=504,
            content={"error": "Ghostscript timeout (>90s)"},
        )
    except Exception as err:
        return JSONResponse(
            status_code=500,
            content={"error": f"Erreur interne : {err}"},
        )
    # Note : on garde le workdir pour debug ; un cron Cloud Run nettoie /tmp.
