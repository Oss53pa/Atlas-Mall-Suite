# ADR 0002 — PROPH3T : Moteurs algorithmiques + LLM wrapper

**Statut** : Accepté · **Date** : 2026-04-22

## Contexte
Le label "PROPH3T" recouvre en réalité **deux choses** :
1. 16 moteurs algorithmiques déterministes (Dijkstra, A*, Cox, Bayes, CUSUM, etc.)
2. Un wrapper LLM (Ollama prioritaire + Claude fallback) pour l'enrichissement narratif

## Décision
Séparer les deux couches :
- `shared/engines/` : moteurs algorithmiques purs (testables, déterministes)
- `shared/proph3t/narrativeEnricher.ts` : couche LLM avec dégradation gracieuse

Le label "PROPH3T" reste comme **marque** commune (marketing) mais la documentation
technique distingue `PROPH3T-engines` et `PROPH3T-llm`.

## Conséquences
- Les moteurs restent testables sans LLM
- Fallback automatique si Ollama/Claude indispo → app toujours fonctionnelle
- Explicabilité : les moteurs produisent des `rationale` structurés
