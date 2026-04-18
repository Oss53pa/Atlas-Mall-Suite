# ═══ Atlas Mall Suite — Image Ollama + modèles PROPH3T pré-pullés ═══
#
# Image Docker prête-à-l'emploi pour déploiement serveur (CDC §4.2).
# Tous les modèles requis sont téléchargés au build pour démarrage immédiat.
#
# Build :
#   docker build -t atlas/proph3t-ollama:1.0 -f scripts/ollama/Dockerfile .
#
# Run :
#   docker run -d -p 11434:11434 -v ollama:/root/.ollama atlas/proph3t-ollama:1.0
#
# Test :
#   curl http://localhost:11434/api/tags

FROM ollama/ollama:latest

LABEL maintainer="Atlas Studio <atokounafamily@gmail.com>"
LABEL description="Ollama + modèles PROPH3T (Llava + Mistral + Llama 3.1)"
LABEL version="1.0"

# Démarre Ollama en arrière-plan + pull les modèles + arrête proprement
RUN /bin/bash -c "ollama serve & \
    SERVER_PID=\$! && \
    sleep 5 && \
    ollama pull llava:7b && \
    ollama pull mistral:7b-instruct && \
    ollama pull llama3.1:8b && \
    kill \$SERVER_PID && \
    wait \$SERVER_PID 2>/dev/null || true"

EXPOSE 11434

# Healthcheck (CDC §4.2)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:11434/api/tags || exit 1

ENTRYPOINT ["ollama"]
CMD ["serve"]
