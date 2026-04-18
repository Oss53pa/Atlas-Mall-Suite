# Worktrees Claude — journal de décisions

Document de traçabilité exigé par F-005 (audit Axe 3).
Chaque worktree actif ou récemment supprimé est consigné ici avec sa décision.

## État au 2026-04-18

| Worktree | Branche | HEAD | Décision | Raison |
|---|---|---|---|---|
| `nervous-bose` | `claude/nervous-bose` | `e2be9eb` (= main) | **Actif** | Expérimentation récente (2 jours) : SpaceEditPanel + RapportSection. 9 fichiers modifiés, +617/−105. À revoir : merger ou abandonner après démo. |
| ~~`bold-hopper`~~ | `claude/bold-hopper` | `c710b01` (3 sem) | **Supprimé** (worktree) | Réécriture massive abandonnée, identique aux 3 autres ci-dessous. 206 fichiers / +2091 / −36296. Branche conservée dans git. |
| ~~`hungry-hugle`~~ | `claude/hungry-hugle` | `c710b01` | **Supprimé** (worktree) | Doublon de bold-hopper. Branche conservée. |
| ~~`inspiring-kapitsa`~~ | `claude/inspiring-kapitsa` | `c710b01` | **Supprimé** (worktree) | Doublon. Branche conservée. |
| ~~`priceless-chebyshev`~~ | `claude/priceless-chebyshev` | `c710b01` | **Supprimé** (worktree) | Doublon. Branche conservée. |

## Procédure

- **Créer** : `git worktree add .claude/worktrees/<nom> -b claude/<nom>` depuis la racine.
- **Supprimer proprement** (préserve la branche) : `git worktree remove --force .claude/worktrees/<nom>`.
- **Restaurer une branche supprimée** : `git worktree add .claude/worktrees/<nom> claude/<nom>`.
- **Supprimer définitivement une branche** : `git branch -D claude/<nom>`. À ne faire qu'après certitude (les commits orphelins sont récupérables 90 j via `git reflog`).

## Règle

Un worktree > 2 semaines d'inactivité **sans usage documenté** est candidat à la suppression.
Décision à inscrire dans ce fichier avant toute suppression future.
