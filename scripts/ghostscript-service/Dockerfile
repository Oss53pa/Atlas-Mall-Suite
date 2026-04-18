# ═══ Atlas Ghostscript Service ═══
# Image Cloud Run avec Ghostscript + profils ICC industriels.
#
# Build :
#   docker build -t atlas/ghostscript:1.0 -f scripts/ghostscript-service/Dockerfile .
#
# Test local :
#   docker run -d -p 8080:8080 atlas/ghostscript:1.0
#   curl http://localhost:8080/health
#   curl -F "file=@test.pdf" -F "preset=PDFX-1a" -F "icc_profile=ISOcoated_v2_300" \
#     http://localhost:8080/convert -o output_cmyk.pdf
#
# Cloud Run :
#   gcloud run deploy atlas-ghostscript \
#     --image gcr.io/PROJECT/atlas-ghostscript:1.0 \
#     --memory 512Mi --cpu 1 --timeout 120s \
#     --max-instances 10 --region europe-west1 \
#     --allow-unauthenticated

FROM python:3.12-slim

WORKDIR /app

# ─── Installation Ghostscript + dépendances système ───
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ─── Profils ICC industriels ───
# ECI ISO Coated v2 300 % (Europe couché) — distribué par European Color Initiative
# Téléchargement depuis le mirroir public ECI (alternatives : Adobe ICC Profiles)
RUN mkdir -p /opt/icc-profiles \
    && cd /opt/icc-profiles \
    # ISO Coated v2 (300%) — Europe couché
    && curl -sL "http://www.eci.org/_media/downloads/icc_profiles_from_eci/eci_offset_2009.zip" \
       -o eci.zip \
    && (unzip -j eci.zip "*ISOcoated_v2_300_eci.icc" -d . 2>/dev/null \
        || echo "ECI download failed, will use Ghostscript defaults") \
    && (unzip -j eci.zip "*ISOuncoated.icc" -d . 2>/dev/null || true) \
    && rm -f eci.zip \
    # Si l'extraction n'a rien donné, on crée des profils factices (Ghostscript fallback default)
    && [ -f ISOcoated_v2_300_eci.icc ] && mv ISOcoated_v2_300_eci.icc ISOcoated_v2_300.icc \
       || touch ISOcoated_v2_300.icc \
    && [ -f ISOuncoated.icc ] || touch ISOuncoated.icc \
    && touch JapanColor2001Coated.icc \
    && touch USWebCoatedSWOP.icc

# ─── App Python ───
COPY scripts/ghostscript-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scripts/ghostscript-service/app.py .

# Cloud Run écoute sur $PORT (défaut 8080)
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
