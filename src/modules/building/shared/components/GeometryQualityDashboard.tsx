// ═══ GEOMETRY QUALITY DASHBOARD ═══
//
// Vue admin : état de santé géométrique des EditableSpace du projet courant.
//
// Pour chaque space : score [0,1], drapeau simple-ring, ortho%, compacité.
// Bouton "Nettoyer (dry-run)" qui affiche le rapport `cleanupBatch` AVANT
// toute écriture. Le commit réel (cleanupBatch + setSpaces) demande une
// confirmation explicite.
//
// Lisible en dehors d'une route admin : on peut le monter dans Atlas Studio
// ou dans le Proph3t Quality panel.

import React, { useMemo, useState } from 'react'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'
import {
  cleanupBatch,
  type BatchCleanupReport,
} from '../engines/geometry/legacyCleanup'
import { scorePolygonQuality } from '../engines/geometry/qualityScore'
import { xyPolygonToMm } from '../engines/geometry/meterAdapter'

function badge(score: number): { color: string; label: string } {
  if (score >= 0.85) return { color: 'bg-emerald-500/20 text-emerald-300', label: 'OK' }
  if (score >= 0.60) return { color: 'bg-amber-500/20 text-amber-300', label: 'WARN' }
  return { color: 'bg-rose-500/20 text-rose-300', label: 'BAD' }
}

export function GeometryQualityDashboard(): React.ReactElement {
  const spaces = useEditableSpaceStore(s => s.spaces)
  const setSpaces = useEditableSpaceStore(s => s.setSpaces)
  const [dryRun, setDryRun] = useState<BatchCleanupReport | null>(null)

  const rows = useMemo(() => {
    return spaces.map(s => {
      const polyMm = xyPolygonToMm(s.polygon)
      const q = scorePolygonQuality(polyMm)
      return { id: s.id, name: s.name || s.id.slice(0, 8), type: String(s.type), score: q.score, breakdown: q.breakdown }
    })
  }, [spaces])

  const average = rows.length === 0 ? 0 : rows.reduce((a, r) => a + r.score, 0) / rows.length
  const redCount = rows.filter(r => r.score < 0.60).length
  const amberCount = rows.filter(r => r.score >= 0.60 && r.score < 0.85).length
  const greenCount = rows.filter(r => r.score >= 0.85).length

  const runDryClean = () => {
    const polys = spaces.map(s => xyPolygonToMm(s.polygon))
    setDryRun(cleanupBatch(polys, { gridMm: 100, orthoAlignMm: 50, maxDriftMm: 250 }))
  }

  const commitClean = () => {
    if (!dryRun) return
    if (!confirm(`Appliquer le nettoyage sur ${dryRun.cleaned} polygone(s) ? Cette opération crée un entry d'historique éditeur.`)) return
    const newSpaces = spaces.map((s, i) => {
      const detail = dryRun.details[i]
      if (!detail || !detail.result.changed) return s
      const cleanedMm = detail.result.cleaned
      const polygon = cleanedMm.map(([x, y]) => ({ x: x / 1000, y: y / 1000 }))
      return { ...s, polygon }
    })
    setSpaces(newSpaces)
    setDryRun(null)
  }

  return (
    <div className="p-4 text-white">
      <h2 className="text-lg font-bold mb-1">Qualité géométrique — Éditeur</h2>
      <p className="text-xs text-slate-400 mb-3">
        Score sur {spaces.length} polygone(s). 1.00 = parfait, ≥0.85 = OK,
        0.60–0.84 = WARN, &lt;0.60 = BAD (à redessiner ou à nettoyer).
      </p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <Stat label="Moyenne" value={average.toFixed(2)} />
        <Stat label="OK" value={String(greenCount)} color="text-emerald-300" />
        <Stat label="WARN" value={String(amberCount)} color="text-amber-300" />
        <Stat label="BAD" value={String(redCount)} color="text-rose-300" />
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={runDryClean}
          className="px-3 py-1.5 rounded bg-atlas-500 text-white text-xs hover:bg-atlas-400"
        >
          Analyser (dry-run)
        </button>
        {dryRun && (
          <button
            onClick={commitClean}
            disabled={dryRun.cleaned === 0}
            className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500 disabled:opacity-40"
          >
            Appliquer sur {dryRun.cleaned} polygone(s)
          </button>
        )}
      </div>

      {dryRun && (
        <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700 text-xs">
          <div className="font-bold mb-1">Dry-run</div>
          <div>Nettoyés : <span className="text-emerald-300">{dryRun.cleaned}</span></div>
          <div>Inchangés : <span className="text-slate-400">{dryRun.unchanged}</span></div>
          <div>Rejetés : <span className="text-rose-300">{dryRun.rejected}</span></div>
          <div>Score avant → après : {dryRun.averageScoreBefore.toFixed(2)} → {dryRun.averageScoreAfter.toFixed(2)}</div>
          {Object.keys(dryRun.byReason).length > 0 && (
            <div className="mt-1 text-slate-400">
              Raisons rejet : {Object.entries(dryRun.byReason).map(([k, v]) => `${k}:${v}`).join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="max-h-96 overflow-y-auto border border-slate-700 rounded">
        <table className="w-full text-xs">
          <thead className="bg-slate-800 sticky top-0">
            <tr>
              <th className="p-2 text-left">Nom</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-right">Score</th>
              <th className="p-2 text-right">Ortho</th>
              <th className="p-2 text-right">Ring</th>
              <th className="p-2 text-right">Compact</th>
              <th className="p-2 text-center">État</th>
            </tr>
          </thead>
          <tbody>
            {rows.sort((a, b) => a.score - b.score).map(r => {
              const b = badge(r.score)
              return (
                <tr key={r.id} className="border-t border-slate-800">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-slate-400">{r.type}</td>
                  <td className="p-2 text-right font-mono">{r.score.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono text-slate-400">{r.breakdown.orthogonality.toFixed(2)}</td>
                  <td className="p-2 text-right font-mono text-slate-400">{r.breakdown.simpleRing.toFixed(0)}</td>
                  <td className="p-2 text-right font-mono text-slate-400">{r.breakdown.compactness.toFixed(2)}</td>
                  <td className="p-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${b.color}`}>{b.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-2 bg-slate-800/50 rounded border border-slate-700">
      <div className="text-[10px] text-slate-400 uppercase">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}
