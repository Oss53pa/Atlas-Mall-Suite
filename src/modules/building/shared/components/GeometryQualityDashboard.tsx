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
import { useParams } from 'react-router-dom'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'
import {
  cleanupBatch,
  type BatchCleanupReport,
} from '../engines/geometry/legacyCleanup'
import { scorePolygonQualityForType } from '../engines/geometry/qualityScore'
import { xyPolygonToMm } from '../engines/geometry/meterAdapter'
import { pushEditableSpaces, type PushResult } from '../engines/geometry/cellsSyncAdapter'
import { isOfflineMode } from '../../../../lib/supabase'
import { batchSuggestRelabels, type RelabelSuggestion } from '../engines/geometry/relabelByLabel'
import { editableSpacesToSpatialEntities } from '../engines/geometry/editableSpaceAdapter'
import { auditPlan, type AuditReport } from '../../../../../packages/spatial-core/src/proph3t/proph3tAudit'
import { detectMisalignments, type AlignmentSuggestion } from '../../../../../packages/spatial-core/src/proph3t/proph3tAdvise'

function badge(score: number): { color: string; label: string } {
  if (score >= 0.85) return { color: 'bg-emerald-500/20 text-emerald-300', label: 'OK' }
  if (score >= 0.60) return { color: 'bg-amber-500/20 text-amber-300', label: 'WARN' }
  return { color: 'bg-rose-500/20 text-rose-300', label: 'BAD' }
}

export function GeometryQualityDashboard(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>()
  const spaces = useEditableSpaceStore(s => s.spaces)
  const setSpaces = useEditableSpaceStore(s => s.setSpaces)
  const [dryRun, setDryRun] = useState<BatchCleanupReport | null>(null)
  const [pushState, setPushState] = useState<'idle' | 'pushing' | 'done'>('idle')
  const [pushResult, setPushResult] = useState<PushResult | null>(null)
  const [relabelSuggestions, setRelabelSuggestions] = useState<RelabelSuggestion[] | null>(null)
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null)
  const [alignmentSuggestions, setAlignmentSuggestions] = useState<AlignmentSuggestion[] | null>(null)

  const rows = useMemo(() => {
    return spaces.map(s => {
      const polyMm = xyPolygonToMm(s.polygon)
      // Scoring context-aware : portes/voies/organiques pondérées différemment.
      const q = scorePolygonQualityForType(polyMm, String(s.type))
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

  const runRelabelDryRun = () => {
    const sugs = batchSuggestRelabels(spaces.map(s => ({
      id: s.id, type: String(s.type), label: s.name, name: s.name,
    })))
    setRelabelSuggestions(sugs)
  }

  const applyRelabels = () => {
    if (!relabelSuggestions || relabelSuggestions.length === 0) return
    const highOnly = relabelSuggestions.filter(s => s.confidence === 'high')
    if (!confirm(`Appliquer ${highOnly.length} re-typages confidence HIGH ? (les ${relabelSuggestions.length - highOnly.length} medium/low restent à valider à la main)`)) return
    const byId = new Map(highOnly.map(s => [s.spaceId, s]))
    const newSpaces = spaces.map(s => {
      const sug = byId.get(s.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return sug ? { ...s, type: sug.suggestedType as any } : s
    })
    setSpaces(newSpaces)
    setRelabelSuggestions(null)
  }

  const runAudit = () => {
    const spatial = editableSpacesToSpatialEntities(spaces, projectId ?? 'cosmos-angre')
    setAuditReport(auditPlan(spatial, projectId ?? 'cosmos-angre'))
  }

  const runDetectAlignments = () => {
    const spatial = editableSpacesToSpatialEntities(spaces, projectId ?? 'cosmos-angre')
    setAlignmentSuggestions(detectMisalignments(spatial, 0.5))
  }

  const exportLegacyJson = () => {
    const pid = projectId ?? 'cosmos-angre'
    // Format LegacyEntity attendu par le LegacyPlanMigrator
    const legacy = spaces.map(s => ({
      id: s.id,
      projectId: pid,
      type: String(s.type),
      geometry: { outer: s.polygon.map(p => ({ x: p.x, y: p.y })) },
      label: s.name,
      notes: s.notes,
      level: String(s.floorLevel ?? 'rdc'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    const blob = new Blob([JSON.stringify(legacy, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pid}-legacy-spaces.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const runManualPush = async () => {
    if (!projectId) { alert('Pas de projectId dans l\'URL'); return }
    setPushState('pushing')
    setPushResult(null)
    try {
      const result = await pushEditableSpaces(projectId, spaces)
      setPushResult(result)
    } catch (err) {
      setPushResult({
        attempted: spaces.length, succeeded: 0, failed: spaces.length,
        skippedOffline: false,
        errors: [{ spaceId: '_', message: String(err) }],
      })
    } finally {
      setPushState('done')
    }
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

      {/* ─── Export pour CLI migrator ─────────────────────── */}
      <div className="mb-3">
        <button
          onClick={exportLegacyJson}
          disabled={spaces.length === 0}
          className="px-3 py-1.5 rounded bg-slate-700 text-white text-xs hover:bg-slate-600 disabled:opacity-40"
          title="Télécharge un JSON LegacyEntity[] consommable par scripts/migrate-plan.ts (npm run migrate:plan)"
        >
          ⬇️ Exporter pour migrator CLI ({spaces.length} legacy)
        </button>
      </div>

      {/* ─── PROPH3T mode D — Audit du plan ──────────────── */}
      <div className="mb-4 p-3 bg-slate-800/30 rounded border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Audit du plan</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">PROPH3T mode D</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Analyse statique : polygones invalides, hauteurs aberrantes, parents orphelins,
              compliance ERP basique. Lecture seule.
            </div>
          </div>
          <button
            onClick={runAudit}
            disabled={spaces.length === 0}
            className="px-3 py-1.5 rounded bg-amber-600 text-white text-xs hover:bg-amber-500 disabled:opacity-40"
          >
            Auditer ({spaces.length})
          </button>
        </div>

        {auditReport && (
          <div className="mt-2 pt-2 border-t border-slate-700 text-[11px]">
            <div className="text-slate-200 mb-1">{auditReport.summary}</div>
            <div className="text-[10px] text-slate-400 mb-2 font-mono">
              GLA : <span className="text-emerald-300">{auditReport.glaSqm.toFixed(0)} m²</span> ·
              Catégories : {Object.entries(auditReport.countByCategory).slice(0, 5).map(([k, v]) => `${k}=${v}`).join(' · ')}
            </div>
            {auditReport.findings.length === 0 ? (
              <div className="text-emerald-300">✓ Aucune anomalie détectée.</div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-0.5 font-mono text-[10px]">
                {auditReport.findings.slice(0, 50).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 py-0.5 border-b border-slate-800/50">
                    <span className={`px-1 rounded text-[9px] flex-shrink-0 ${
                      f.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' :
                      f.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-sky-500/20 text-sky-300'
                    }`}>{f.severity[0].toUpperCase()}</span>
                    <span className="text-slate-300 flex-1">{f.message}</span>
                  </div>
                ))}
                {auditReport.findings.length > 50 && (
                  <div className="text-slate-500 text-center pt-1">... et {auditReport.findings.length - 50} autres</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── PROPH3T mode A — Suggestions alignement ─────── */}
      <div className="mb-4 p-3 bg-slate-800/30 rounded border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Suggestions d'alignement</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">PROPH3T mode A</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Détecte les murs voisins quasi-alignés (tol 50 cm) et propose
              de les harmoniser sur la médiane. Calculé par moteur TS pur.
            </div>
          </div>
          <button
            onClick={runDetectAlignments}
            disabled={spaces.length === 0}
            className="px-3 py-1.5 rounded bg-sky-600 text-white text-xs hover:bg-sky-500 disabled:opacity-40"
          >
            Détecter ({spaces.length})
          </button>
        </div>

        {alignmentSuggestions && (
          <div className="mt-2 pt-2 border-t border-slate-700 text-[11px]">
            <div className="text-slate-200 mb-2">
              <span className="font-bold">{alignmentSuggestions.length}</span> suggestion(s) d'alignement.
              {alignmentSuggestions.length === 0 && <span className="text-emerald-300 ml-2">Plan déjà bien aligné.</span>}
            </div>
            {alignmentSuggestions.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-0.5 font-mono text-[10px]">
                {alignmentSuggestions.slice(0, 30).map(s => (
                  <div key={s.id} className="flex items-start gap-2 py-1 border-b border-slate-800/50">
                    <span className="px-1 rounded bg-sky-500/20 text-sky-300 text-[9px] flex-shrink-0">{s.axis.toUpperCase()}</span>
                    <span className="text-slate-300 flex-1">{s.humanReadable}</span>
                  </div>
                ))}
                {alignmentSuggestions.length > 30 && (
                  <div className="text-slate-500 text-center pt-1">... et {alignmentSuggestions.length - 30} autres</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Re-typage par labels (PROPH3T mode B) ──────── */}
      <div className="mb-4 p-3 bg-slate-800/30 rounded border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-bold">Reclassification heuristique sur labels</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Détecte les espaces dont le label suggère un type différent de celui assigné
              (ex: labellé "TERRE PLEIN" mais typé `commerce`).
            </div>
          </div>
          <button
            onClick={runRelabelDryRun}
            disabled={spaces.length === 0}
            className="px-3 py-1.5 rounded bg-violet-600 text-white text-xs hover:bg-violet-500 disabled:opacity-40"
          >
            Analyser ({spaces.length})
          </button>
        </div>

        {relabelSuggestions && (
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px]">
                <span className="text-slate-200 font-bold">{relabelSuggestions.length}</span>
                <span className="text-slate-400"> suggestions ·</span>
                <span className="text-emerald-300 ml-1">{relabelSuggestions.filter(s => s.confidence === 'high').length} HIGH</span>
                <span className="text-amber-300 ml-1">{relabelSuggestions.filter(s => s.confidence === 'medium').length} MEDIUM</span>
                <span className="text-rose-300 ml-1">{relabelSuggestions.filter(s => s.confidence === 'low').length} LOW</span>
              </div>
              <button
                onClick={applyRelabels}
                disabled={!relabelSuggestions.some(s => s.confidence === 'high')}
                className="px-3 py-1 rounded bg-emerald-600 text-white text-[10px] hover:bg-emerald-500 disabled:opacity-40"
              >
                Appliquer les HIGH
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto text-[10px] font-mono space-y-0.5">
              {relabelSuggestions.slice(0, 50).map(s => (
                <div key={s.spaceId} className="flex items-center gap-2 py-0.5 border-b border-slate-800/50">
                  <span className={`px-1 rounded ${
                    s.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-300' :
                    s.confidence === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-rose-500/20 text-rose-300'
                  }`}>{s.confidence[0].toUpperCase()}</span>
                  <span className="text-slate-300 flex-1 truncate" title={s.matchedText}>{s.matchedText.slice(0, 40)}</span>
                  <span className="text-rose-300">{s.currentType}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-emerald-300">{s.suggestedType}</span>
                  <span className="text-slate-500 text-[9px]">({s.matchedRule})</span>
                </div>
              ))}
              {relabelSuggestions.length > 50 && (
                <div className="text-slate-500 text-center pt-1">... et {relabelSuggestions.length - 50} autres</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Sync cloud manuelle (debug + force) ─────────── */}
      <div className="mb-4 p-3 bg-slate-800/30 rounded border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-bold">Sync Supabase (cells)</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Projet : <span className="font-mono text-slate-200">{projectId ?? '(aucun)'}</span> ·
              Mode : <span className={isOfflineMode ? 'text-amber-300' : 'text-emerald-300'}>
                {isOfflineMode ? 'OFFLINE (env Supabase non configurée)' : 'ONLINE'}
              </span>
            </div>
          </div>
          <button
            onClick={runManualPush}
            disabled={pushState === 'pushing' || spaces.length === 0 || isOfflineMode}
            className="px-3 py-1.5 rounded bg-sky-600 text-white text-xs hover:bg-sky-500 disabled:opacity-40"
          >
            {pushState === 'pushing' ? 'Push en cours…' : `Pousser maintenant (${spaces.length})`}
          </button>
        </div>

        {pushResult && (
          <div className="mt-2 pt-2 border-t border-slate-700 text-[11px] space-y-0.5 font-mono">
            <div>Tentés : <span className="text-slate-200">{pushResult.attempted}</span></div>
            <div>Réussis : <span className="text-emerald-300">{pushResult.succeeded}</span></div>
            <div>Échecs : <span className={pushResult.failed > 0 ? 'text-rose-300' : 'text-slate-400'}>{pushResult.failed}</span></div>
            {pushResult.skippedOffline && (
              <div className="text-amber-300">⚠ Skip — mode offline détecté par le client</div>
            )}
            {pushResult.errors.length > 0 && (
              <div className="mt-2">
                <div className="text-rose-300 font-bold mb-1">Erreurs (3 premières) :</div>
                {pushResult.errors.slice(0, 3).map((e, i) => (
                  <div key={i} className="pl-2 border-l-2 border-rose-500/50">
                    <span className="text-slate-400">{e.spaceId}</span> →
                    <span className="text-rose-200"> {e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
