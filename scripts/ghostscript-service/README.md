# Atlas Ghostscript Service

Service HTTP de conversion PDF sRGB → PDF/X-1a CMJN.
Utilisé par l'Edge Function Supabase `cmyk-convert` lorsque `GHOSTSCRIPT_SERVICE_URL` est configuré.

## API

| Endpoint | Méthode | Description |
|---|---|---|
| `/health` | GET | Statut + version Ghostscript + profils ICC dispo |
| `/convert` | POST (multipart) | Conversion PDF |

### POST /convert

| Param | Type | Défaut | Description |
|---|---|---|---|
| `file` | PDF (binary) | requis | PDF source (sRGB) |
| `preset` | text | `PDFX-1a` | `PDFX-1a` / `PDFX-3` / `CMYK-coated` / `CMYK-uncoated` |
| `icc_profile` | text | `ISOcoated_v2_300` | `ISOcoated_v2_300` / `ISOuncoated` / `JapanColor2001Coated` / `USWebCoatedSWOP` |

**Retour** : PDF binaire CMJN avec headers :
- `X-Ghostscript-Version`
- `X-Preset` / `X-ICC-Profile`
- `X-Original-Size` / `X-Output-Size`

## Déploiement

### Local Docker

```bash
docker build -t atlas/ghostscript:1.0 -f scripts/ghostscript-service/Dockerfile .
docker run -d -p 8080:8080 atlas/ghostscript:1.0

# Test
curl http://localhost:8080/health
curl -F "file=@test.pdf" -F "preset=PDFX-1a" \
  http://localhost:8080/convert -o output_cmyk.pdf
```

### Cloud Run (recommandé)

```bash
PROJECT_ID=your-gcp-project
REGION=europe-west1

# Build & push
gcloud builds submit --tag gcr.io/$PROJECT_ID/atlas-ghostscript:1.0 \
  -f scripts/ghostscript-service/Dockerfile .

# Deploy
gcloud run deploy atlas-ghostscript \
  --image gcr.io/$PROJECT_ID/atlas-ghostscript:1.0 \
  --memory 512Mi --cpu 1 --timeout 120s \
  --max-instances 10 \
  --region $REGION \
  --allow-unauthenticated

# Configurer côté Supabase
URL=$(gcloud run services describe atlas-ghostscript --region $REGION --format 'value(status.url)')
supabase secrets set GHOSTSCRIPT_SERVICE_URL=$URL
```

### Render / Railway / Fly.io

Identique au flow Docker — pousser l'image sur le registry du PaaS choisi
puis configurer `GHOSTSCRIPT_SERVICE_URL` dans les secrets Supabase.

## Coût indicatif Cloud Run

- 100 conversions/jour × 30 jours = 3000 invocations/mois
- Ressources 512Mi/1CPU × 3s/conv = 9000s/mois CPU
- Coût estimé : **< 1 USD/mois** (couvert par free tier Cloud Run généralement)

## Profils ICC

Les profils ECI (European Color Initiative) sont téléchargés au build.
En cas d'échec réseau (build offline), le service tombera en mode
"profil par défaut Ghostscript" — qualité moindre mais fonctionnel.

Pour distribuer manuellement vos propres profils ICC :
```bash
docker run -v $(pwd)/my-profiles:/opt/icc-profiles atlas/ghostscript:1.0
```

## Sécurité

- `-dSAFER` activé (Ghostscript ne peut pas lire/écrire hors du workspace)
- Limite taille fichier 50 MB
- Timeout 90 s
- Pas d'authentification activée par défaut — déployer derrière Cloud IAP ou
  ajouter un middleware FastAPI `Bearer` token si exposé Internet.
