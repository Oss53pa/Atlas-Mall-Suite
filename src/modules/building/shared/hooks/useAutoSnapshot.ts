// ═══ useAutoSnapshot — Snapshot automatique des versions à la volée ═══
//
// Surveille le ParsedPlan courant ; déclenche la création d'une version
// lorsque UNE des conditions suivantes est vraie :
//   • Changement significatif vs dernier snapshot (diff retourne > N entrées)
//   • Temps écoulé depuis dernier snapshot (débounce long)
//   • Modifications accumulées > seuil
//
// Conçu pour être non-intrusif : un seul effet dans le volume, zéro config,
// dégradation gracieuse (si versioningEngine indispo → no-op).
//
// Usage :
//   useAutoSnapshot({ volumeId: 'vol1', enabled: true })

import { useEffect, useRef } from 'react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import {
  createPlanVersion, listPlanVersions, diffPlanVersions,
  type PlanVersion,
} from '../engines/planVersioningEngine'
import type { ParsedPlan } from '../planReader/planEngineTypes'

// ─── Config ─────────────────────────────────────────────

export interface AutoSnapshotConfig {
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  enabled?: boolean
  /** Délai min entre deux snapshots automatiques (ms). Défaut 5 min. */
  minIntervalMs?: number
  /** Nombre min de changements dans le diff pour déclencher. Défaut 5. */
  minDiffEntries?: number
  /** Auteur à utiliser (sinon: "Auto-snapshot"). */
  author?: string
  /** Préfixe du message de commit. */
  messagePrefix?: string
  /** Délai de debounce : on attend N ms sans modif avant snapshot. Défaut 30s. */
  debounceMs?: number
}

const DEFAULTS = {
  minIntervalMs: 5 * 60 * 1000,
  minDiffEntries: 5,
  debounceMs: 30 * 1000,
}

// ─── Hook ───────────────────────────────────────────────

export function useAutoSnapshot(config: AutoSnapshotConfig): void {
  const enabled = config.enabled !== false
  const minInterval = config.minIntervalMs ?? DEFAULTS.minIntervalMs
  const minDiff = config.minDiffEntries ?? DEFAULTS.minDiffEntries
  const debounce = config.debounceMs ?? DEFAULTS.debounceMs

  const parsedPlan = usePlanEngineStore((s) => s.parsedPlan)
  const planId = `${config.volumeId}-plan`

  const lastSnapshotAtRef = useRef<number>(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSeenPlanRef = useRef<ParsedPlan | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (!parsedPlan) return
    if (parsedPlan === lastSeenPlanRef.current) return
    lastSeenPlanRef.current = parsedPlan

    // Debounce : on attend que ça se stabilise
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(async () => {
      await considerSnapshot(planId, parsedPlan, {
        lastAtMs: lastSnapshotAtRef.current,
        minInterval,
        minDiff,
        author: config.author ?? 'Auto-snapshot',
        messagePrefix: config.messagePrefix ?? 'Auto-snapshot',
      }).then((created) => {
        if (created) lastSnapshotAtRef.current = Date.now()
      })
    }, debounce)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [enabled, parsedPlan, planId, minInterval, minDiff, debounce, config.author, config.messagePrefix])
}

// ─── Logique de décision ────────────────────────────────

async function considerSnapshot(
  planId: string,
  current: ParsedPlan,
  opts: {
    lastAtMs: number
    minInterval: number
    minDiff: number
    author: string
    messagePrefix: string
  },
): Promise<boolean> {
  const now = Date.now()

  // Cooldown : pas plus d'un snapshot toutes les N minutes
  if (now - opts.lastAtMs < opts.minInterval) return false

  // Liste les versions existantes
  let versions: PlanVersion[] = []
  try {
    versions = await listPlanVersions(planId)
  } catch {
    return false
  }

  // Si aucune version → snapshot initial
  if (versions.length === 0) {
    await createPlanVersion({
      planId,
      snapshot: current,
      author: opts.author,
      message: `${opts.messagePrefix} · version initiale (${current.spaces.length} espaces)`,
    })
    return true
  }

  // Diff vs version la plus récente
  const latest = versions[0]
  const pseudoCurrent: PlanVersion = {
    ...latest,
    snapshot: current,
  }
  const diff = diffPlanVersions(latest, pseudoCurrent)
  if (diff.entries.length < opts.minDiff) return false

  // Assez de changements : snapshot
  const summary = summarizeDiff(diff.entries)
  await createPlanVersion({
    planId,
    snapshot: current,
    author: opts.author,
    message: `${opts.messagePrefix} · ${summary}`,
  })
  return true
}

function summarizeDiff(entries: Array<{ kind: string; summary: string }>): string {
  const counts = new Map<string, number>()
  for (const e of entries) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1)
  const parts: string[] = []
  for (const [kind, n] of counts) {
    const label =
      kind === 'space_added' ? `${n} ajout${n > 1 ? 's' : ''}`
      : kind === 'space_removed' ? `${n} suppression${n > 1 ? 's' : ''}`
      : kind === 'space_renamed' ? `${n} renommage${n > 1 ? 's' : ''}`
      : kind === 'space_resized' ? `${n} redim.`
      : kind === 'space_status_changed' ? `${n} changement${n > 1 ? 's' : ''} type`
      : kind === 'floor_restructured' ? 'restructuration plan'
      : `${n} ${kind}`
    parts.push(label)
  }
  return parts.slice(0, 4).join(' · ')
}
