// ═══ VOL.1 — Exports (F1.6) ═══

import React, { useState } from 'react'
import { FileText, Download, Table2, FileImage, Presentation, Loader2, CheckCircle } from 'lucide-react'
import { useVol1Store } from '../store/vol1Store'
import { formatFcfa } from '../../shared/utils/formatting'

type ExportFormat = 'pdf' | 'xlsx' | 'dwg' | 'pptx'

interface ExportOption {
  id: ExportFormat
  label: string
  description: string
  icon: React.ElementType
  color: string
}

const EXPORTS: ExportOption[] = [
  { id: 'pdf', label: 'Plan Commercial PDF', description: 'Plan annote avec couleurs par statut + etiquettes enseignes. Format A1 vectoriel.', icon: FileText, color: '#ef4444' },
  { id: 'xlsx', label: 'Tableau Occupancy XLSX', description: 'Tableau complet des cellules : reference, surface, preneur, loyer, statut, dates bail.', icon: Table2, color: '#22c55e' },
  { id: 'dwg', label: 'DWG Annote', description: 'Plan AutoCAD retourne avec calques mis a jour (occupancy, enseignes, surfaces).', icon: FileImage, color: '#38bdf8' },
  { id: 'pptx', label: 'Presentation DG', description: 'PowerPoint cle en main : dashboard occupancy, mix enseigne, alertes, recommandations Proph3t.', icon: Presentation, color: '#f59e0b' },
]

export default function ExportCommercialSection() {
  const tenants = useVol1Store(s => s.tenants)
  const spaces = useVol1Store(s => s.spaces)
  const occupancy = useVol1Store(s => s.occupancy)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [done, setDone] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)
    setDone(null)
    // Simulate export
    await new Promise(r => setTimeout(r, 1500))
    setExporting(null)
    setDone(format)
    setTimeout(() => setDone(null), 3000)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 1 — PLAN COMMERCIAL</p>
        <h1 className="text-[28px] font-light text-white mb-2">Exports</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>
          Generez les livrables du plan commercial — {spaces.length} cellules, {tenants.length} preneurs, {occupancy.occupancyRate}% d'occupation.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Cellules', value: spaces.length },
          { label: 'Preneurs', value: tenants.filter(t => t.status === 'actif').length },
          { label: 'Occupation', value: `${occupancy.occupancyRate}%` },
          { label: 'GLA totale', value: `${formatFcfa(occupancy.totalGla)} m²` },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[10px]" style={{ color: '#4a5568' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-2 gap-4">
        {EXPORTS.map((exp) => {
          const Icon = exp.icon
          const isExporting = exporting === exp.id
          const isDone = done === exp.id
          return (
            <div key={exp.id} className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center gap-3 mb-3">
                <Icon size={20} style={{ color: exp.color }} />
                <h3 className="text-white font-semibold text-[14px]">{exp.label}</h3>
              </div>
              <p className="text-[12px] text-slate-400 mb-4">{exp.description}</p>
              <button
                onClick={() => handleExport(exp.id)}
                disabled={isExporting}
                className="flex items-center gap-2 text-[12px] font-medium px-4 py-2 rounded-lg transition-all"
                style={{
                  background: isDone ? 'rgba(34,197,94,0.1)' : `${exp.color}15`,
                  border: `1px solid ${isDone ? 'rgba(34,197,94,0.3)' : `${exp.color}40`}`,
                  color: isDone ? '#22c55e' : exp.color,
                  opacity: isExporting ? 0.6 : 1,
                }}
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : isDone ? <CheckCircle size={14} /> : <Download size={14} />}
                {isExporting ? 'Generation...' : isDone ? 'Telecharge !' : 'Exporter'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
