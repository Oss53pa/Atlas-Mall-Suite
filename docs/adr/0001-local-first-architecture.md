# ADR 0001 — Architecture Local-First

**Statut** : Accepté · **Date** : 2026-04-22 · **Décideurs** : CTO, Product

## Contexte
Atlas Mall Suite est déployé dans des pays avec une connectivité internet
variable (Cameroun, CI, CEMAC). Les utilisateurs cibles (exploitants,
architectes) doivent pouvoir travailler même sans réseau.

## Décision
Architecture **local-first** :
1. IndexedDB (Dexie) = source de vérité locale
2. Supabase = miroir cloud en best-effort
3. Offline : toutes les fonctionnalités métier fonctionnent
4. Online : synchronisation bidirectionnelle (fire-and-forget push, pull sur demande)

## Conséquences
- **Positif** : résilience réseau, vitesse perçue, contrôle utilisateur
- **Négatif** : complexité de sync, risque de divergence multi-device
- **Mitigation** : timestamps `updated_at`, résolution par version la plus récente
