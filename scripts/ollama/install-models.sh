#!/usr/bin/env bash
# ═══ Atlas Mall Suite — Installation modèles Ollama ═══
#
# Référence : Cahier des charges PROPH3T v1.0 §4.2
#
# Usage :
#   chmod +x scripts/ollama/install-models.sh
#   ./scripts/ollama/install-models.sh           # tous les modèles
#   ./scripts/ollama/install-models.sh --vision  # uniquement vision
#   ./scripts/ollama/install-models.sh --check   # vérifier installation

set -euo pipefail

# ─── Couleurs ─────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─── Modèles requis ──────────────
declare -A MODELS=(
  ["llava:7b"]="vision-plan • Analyse d'image plan architectural • ~4.5 Go VRAM"
  ["mistral:7b-instruct"]="space-classification • Taxonomie 31 types • ~4 Go RAM"
  ["llama3.1:8b"]="orchestration-reasoning • Décisions volumes • ~5 Go RAM"
)

# Modèles fallback (alternatives plus légères)
declare -A FALLBACKS=(
  ["llava:7b"]="moondream:1.8b"
  ["mistral:7b-instruct"]="qwen2.5:7b"
  ["llama3.1:8b"]="qwen2.5:7b"
)

# ─── Vérification Ollama installé ───────

check_ollama() {
  if ! command -v ollama &> /dev/null; then
    echo -e "${RED}✗ Ollama n'est pas installé.${NC}"
    echo ""
    echo "Installation :"
    echo "  • macOS/Linux : curl -fsSL https://ollama.com/install.sh | sh"
    echo "  • Windows    : télécharger https://ollama.com/download/OllamaSetup.exe"
    echo ""
    echo "Puis vérifier :"
    echo "  ollama serve     # démarre le service"
    echo "  ollama --version"
    exit 1
  fi
  echo -e "${GREEN}✓ Ollama détecté :${NC} $(ollama --version)"
}

# ─── Vérification serveur démarré ────────

check_serve() {
  if ! curl -sf http://localhost:11434/api/tags > /dev/null; then
    echo -e "${YELLOW}⚠ Le serveur Ollama ne répond pas sur localhost:11434.${NC}"
    echo "Démarrer en arrière-plan :"
    echo "  ollama serve &"
    echo "Ou lancer l'application Ollama (macOS / Windows)."
    exit 1
  fi
}

# ─── Liste les modèles installés ────────

list_installed() {
  ollama list | tail -n +2 | awk '{print $1}'
}

# ─── Pull un modèle si absent ────────

pull_if_missing() {
  local model="$1"
  local desc="$2"
  local installed
  installed="$(list_installed)"

  if echo "$installed" | grep -qE "^${model%:*}"; then
    echo -e "${GREEN}✓ Déjà installé :${NC} $model"
    return 0
  fi

  echo -e "${BLUE}↓ Téléchargement :${NC} $model"
  echo "    $desc"

  if ollama pull "$model"; then
    echo -e "${GREEN}✓ Installé :${NC} $model"
    return 0
  else
    local fallback="${FALLBACKS[$model]:-}"
    if [ -n "$fallback" ]; then
      echo -e "${YELLOW}⚠ Échec — tentative fallback :${NC} $fallback"
      ollama pull "$fallback" || {
        echo -e "${RED}✗ Fallback échoué également.${NC}"
        return 1
      }
    fi
  fi
}

# ─── Mode check ──────────────

mode_check() {
  echo "═══ Vérification installation modèles PROPH3T ═══"
  check_ollama
  check_serve

  local total=${#MODELS[@]}
  local found=0
  local missing=()

  for model in "${!MODELS[@]}"; do
    if list_installed | grep -qE "^${model%:*}"; then
      echo -e "${GREEN}✓${NC} $model — ${MODELS[$model]}"
      ((found++))
    else
      echo -e "${RED}✗${NC} $model — ${MODELS[$model]}"
      missing+=("$model")
    fi
  done

  echo ""
  echo "Statut : $found / $total modèles installés"

  if [ ${#missing[@]} -gt 0 ]; then
    echo ""
    echo "Pour installer les manquants :"
    for m in "${missing[@]}"; do
      echo "  ollama pull $m"
    done
    exit 1
  fi
  exit 0
}

# ─── Mode vision uniquement ────

mode_vision() {
  echo "═══ Installation modèle vision uniquement ═══"
  check_ollama
  check_serve
  pull_if_missing "llava:7b" "${MODELS[llava:7b]}"
}

# ─── Mode complet (par défaut) ────

mode_full() {
  echo "═══ Installation complète modèles PROPH3T ═══"
  check_ollama
  check_serve

  echo ""
  echo "Modèles à installer (CDC §4.2) :"
  for model in "${!MODELS[@]}"; do
    echo "  • $model — ${MODELS[$model]}"
  done
  echo ""
  read -rp "Continuer ? [O/n] " confirm
  confirm="${confirm:-O}"
  if [[ ! "$confirm" =~ ^[Oo]$ ]]; then
    echo "Annulé."
    exit 0
  fi

  local errors=0
  for model in "${!MODELS[@]}"; do
    if ! pull_if_missing "$model" "${MODELS[$model]}"; then
      ((errors++))
    fi
    echo ""
  done

  echo "═══ Résumé ═══"
  ollama list

  if [ $errors -gt 0 ]; then
    echo -e "${YELLOW}⚠ $errors erreur(s) — certains modèles non installés.${NC}"
    echo "PROPH3T basculera vers Claude API en fallback pour ces tâches."
    exit 1
  fi

  echo -e "${GREEN}✓ Installation complète terminée.${NC}"
  echo "Vous pouvez maintenant :"
  echo "  • Démarrer Atlas Mall Suite : npm run dev"
  echo "  • Tester PROPH3T-SEM dans Vol.3 → Wayfinder Designer"
}

# ─── Dispatcher ────────────

case "${1:-}" in
  --check)  mode_check ;;
  --vision) mode_vision ;;
  --help|-h)
    echo "Usage: $0 [--check | --vision | --help]"
    echo ""
    echo "  --check     Vérifie l'état d'installation des modèles"
    echo "  --vision    Installe uniquement Llava (vision)"
    echo "  (sans arg)  Installe tous les modèles requis"
    exit 0
    ;;
  *)        mode_full ;;
esac
