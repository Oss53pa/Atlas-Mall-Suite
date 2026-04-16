// ═══ PROPH3T IMPORT MODAL — S'ouvre tout seul après l'import du plan ═══
// Affiche le résultat Phase A + bouton "Lancer audit complet" qui exécute B+C
// + bouton "Télécharger rapport détaillé PDF".

import React, { useState, useEffect } from 'react'
import { X, Sparkles, FileText, Play, CheckCircle2 } from 'lucide-react'
import { Proph3tResultPanel } from './Proph3tResultPanel'
import { runSkill, getLastResult, onProph3tResult } from '../orchestrator'
import { downloadProph3tReport } from '../proph3tReportEngine'
import type { Proph3tResult, Proph3tAction } from '../orchestrator.types'

interface Props {
  open: boolean
  onClose: () => void
  /** projectName affiché dans le rapport. */
  projectName: string
  orgName?: string
  /** Callback pour appliquer une action (l'app décide). */
  onApplyAction?: (action: Proph3tAction) => Promise<void> | void
  /** Builder pour l'audit sécurité (si dispo). */
  buildSecurityInput?: () => unknown | null
  /** Builder pour l'analyse parcours (si dispo). */
  buildParcoursInput?: () => unknown | null
  /** Builder pour analyse commerciale (si dispo). */
  buildCommercialInput?: () => unknown | null
  /** Capture de plan (PNG dataURL) pour PDF. */
  planScreenshotDataUrl?: string
}

export function Proph3tImportModal({
  open, onClose, projectName, orgName,
  onApplyAction, buildSecurityInput, buildParcoursInput, buildCommercialInput,
  planScreenshotDataUrl,
}: Props) {
  const [results, setResults] = useState<Record<string, Proph3tResult<unknown>>>({})
  const [running, setRunning] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Charge les résultats existants au montage
  useEffect(() => {
    if (!open) return
    const r0 = getLastResult('analyzePlanAtImport')
    if (r0) setResults(p => ({ ...p, analyzePlanAtImport: r0 }))
    const unsub = onProph3tResult((skillId, result) => {
      setResults(p => ({ ...p, [skillId]: result }))
    })
    return unsub
  }, [open])

  const runAudit = async () => {
    if (!buildSecurityInput) return
    setRunning('auditSecurity')
    try {
      const input = buildSecurityInput()
      if (input) await runSkill('auditSecurity', input)
    } finally { setRunning(null) }
  }

  const runParcours = async () => {
    if (!buildParcoursInput) return
    setRunning('analyzeParcours')
    try {
      const input = buildParcoursInput()
      if (input) await runSkill('analyzeParcours', input)
    } finally { setRunning(null) }
  }

  const runCommercial = async () => {
    if (!buildCommercialInput) return
    setRunning('analyzeCommercialMix')
    try {
      const input = buildCommercialInput()
      if (input) await runSkill('analyzeCommercialMix', input)
    } finally { setRunning(null) }
  }

  const runAllAndExport = async () => {
    await runAudit()
    await runCommercial()
    await runParcours()
    await downloadPdf()
  }

  const downloadPdf = async () => {
    setGeneratingPdf(true)
    try {
      downloadProph3tReport({
        projectName,
        orgName,
        results,
        planScreenshots: planScreenshotDataUrl ? [{ label: 'Plan principal', dataUrl: planScreenshotDataUrl }] : undefined,
        executiveNote: `Rapport généré automatiquement par PROPH3T après import du plan. ${Object.keys(results).length} skill(s) exécutée(s). Toutes les recommandations citent leurs sources et incluent score de confiance, budget et délai estimés.`,
      })
    } finally { setGeneratingPdf(false) }
  }

  if (!open) return null

  const skillsRun = Object.keys(results)
  const totalActions = Object.values(results).reduce((s, r) => s + r.actions.length, 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[92vh] rounded-xl bg-slate-950 border border-purple-500/30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-gradient-to-r from-purple-950/40 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
              <Sparkles size={18} className="text-purple-300" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-white">PROPH3T a analysé votre plan</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {skillsRun.length} skill(s) exécutée(s) · {totalActions} action(s) recommandée(s)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/[0.05] rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="px-5 py-3 border-b border-white/[0.06] bg-slate-900/40 flex items-center gap-2 flex-wrap">
          <button onClick={runAudit} disabled={running !== null || !buildSecurityInput || skillsRun.includes('auditSecurity')}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 disabled:opacity-40">
            {skillsRun.includes('auditSecurity') ? <CheckCircle2 size={12} /> : <Play size={11} />}
            {running === 'auditSecurity' ? 'Audit sécurité…' : 'Audit sécurité (Phase B)'}
          </button>
          <button onClick={runParcours} disabled={running !== null || !buildParcoursInput || skillsRun.includes('analyzeParcours')}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40">
            {skillsRun.includes('analyzeParcours') ? <CheckCircle2 size={12} /> : <Play size={11} />}
            {running === 'analyzeParcours' ? 'Parcours…' : 'Parcours client (Phase C)'}
          </button>
          <button onClick={runCommercial} disabled={running !== null || !buildCommercialInput || skillsRun.includes('analyzeCommercialMix')}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 disabled:opacity-40">
            {skillsRun.includes('analyzeCommercialMix') ? <CheckCircle2 size={12} /> : <Play size={11} />}
            {running === 'analyzeCommercialMix' ? 'Commercial…' : 'Mix commercial (Vol.1)'}
          </button>
          <div className="flex-1" />
          <button onClick={runAllAndExport} disabled={running !== null}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 disabled:opacity-50">
            <Sparkles size={12} />
            Tout lancer + Rapport
          </button>
          <button onClick={downloadPdf} disabled={generatingPdf || skillsRun.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[11px] font-medium bg-purple-600/30 border border-purple-500/50 text-purple-200 hover:bg-purple-600/40 disabled:opacity-40">
            <FileText size={12} />
            {generatingPdf ? 'Génération…' : 'Rapport PDF'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {skillsRun.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-[12px]">PROPH3T va exécuter l'analyse du plan…</p>
              <p className="text-[10px] mt-1">Lancez les autres skills depuis la barre d'actions ci-dessus.</p>
            </div>
          ) : (
            Object.values(results).map(r => (
              <Proph3tResultPanel key={r.skill} result={r} onApplyAction={onApplyAction} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 border-t border-white/[0.06] text-[10px] text-slate-500 flex items-center justify-between">
          <span>PROPH3T · Ollama priorité · Fallback transparent · {Object.keys(results).length} skill(s)</span>
          <span>Toutes recommandations citent leurs sources</span>
        </div>
      </div>
    </div>
  )
}
