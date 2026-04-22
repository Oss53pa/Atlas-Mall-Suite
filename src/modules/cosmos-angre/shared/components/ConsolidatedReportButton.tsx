// ═══ CONSOLIDATED REPORT BUTTON — Génère le PDF directeur cross-volume ═══
// Drop-in dans n'importe quel volume. Assemble toute la donnée depuis
// les stores + lotsStore + moteurs, puis exporte le PDF.

import { useState } from 'react'

interface Props {
  projectName: string
  orgName?: string
  className?: string
  /** Callback retournant AnalysisInput partielle (ou complète) pour runGlobalAnalysis. */
  buildAnalysisInput: () => Promise<import('../engines/floorAnalysisEngine').AnalysisInput | null>
  /** Input finance optionnel (leases + opex). */
  buildFinanceInput?: () => Promise<import('../engines/realEstateFinance').PortfolioInput | null>
  executiveNote?: string
}

export function ConsolidatedReportButton({
  projectName, orgName, className = '',
  buildAnalysisInput, buildFinanceInput, executiveNote,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onClick = async () => {
    if (busy) return
    setBusy(true); setErr(null)
    try {
      const input = await buildAnalysisInput()
      if (!input) {
        setErr('Aucun plan chargé')
        return
      }
      const [
        { runGlobalAnalysis },
        { computePortfolioMetrics },
        { downloadConsolidatedPDF },
      ] = await Promise.all([
        import('../engines/floorAnalysisEngine'),
        import('../engines/realEstateFinance'),
        import('../engines/consolidatedReportEngine'),
      ])
      const analysis = runGlobalAnalysis(input)
      let finance = undefined
      if (buildFinanceInput) {
        const fi = await buildFinanceInput()
        if (fi) finance = computePortfolioMetrics(fi)
      }
      downloadConsolidatedPDF({
        projectName,
        orgName,
        analysisDate: analysis.timestamp,
        analysis,
        finance,
        executiveNote,
      })
    } catch (e) {
      console.error('[ConsolidatedReport] failed', e)
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 text-[10px] font-medium hover:bg-purple-600/30 transition-colors disabled:opacity-50 ${className}`}
      title="Générer le rapport directeur cross-volume (Commercial · Sécurité · Parcours + Finance)"
    >
      {busy ? '⏳' : '📑'} {busy ? 'Génération…' : 'Rapport directeur'}
      {err && <span className="text-red-400 ml-1">⚠</span>}
    </button>
  )
}
