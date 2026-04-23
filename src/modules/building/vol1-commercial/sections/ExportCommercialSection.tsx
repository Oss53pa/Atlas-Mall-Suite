// ═══ VOL.1 — Exports réels (XLSX + PDF + PPTX + DXF) ═══

import React, { useState } from 'react'
import { FileText, Download, Table2, FileImage, Presentation, Loader2, CheckCircle } from 'lucide-react'
import { useVol1Store } from '../store/vol1Store'
import { exportToXLSX, exportToPDF, exportToPPTX, exportToDXF } from '../engines/exportService'
import { formatFcfa } from '../../shared/utils/formatting'
import toast from 'react-hot-toast'

type ExportFormat = 'pdf' | 'xlsx' | 'dwg' | 'pptx'

const EXPORTS: { id: ExportFormat; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { id: 'pdf', label: 'Plan Commercial PDF', description: 'Synthèse exécutive + tableau de commercialisation complet. Format A4 paysage.', icon: FileText, color: '#ef4444' },
  { id: 'xlsx', label: 'Tableau Commercialisation XLSX', description: '3 onglets : Commercialisation, Cellules vacantes, Synthèse par phase. Compatible Excel/Google Sheets.', icon: Table2, color: '#22c55e' },
  { id: 'dwg', label: 'DXF Annoté', description: 'Plan technique avec calques par statut (occupé/vacant/réservé), labels enseignes et cotes. Compatible AutoCAD/LibreCAD.', icon: FileImage, color: '#38bdf8' },
  { id: 'pptx', label: 'Présentation DG', description: 'PowerPoint 3 slides : KPIs synthèse, tableau des enseignes, avancement par phase avec barres de progression.', icon: Presentation, color: '#f59e0b' },
]

export default function ExportCommercialSection() {
  const tenants = useVol1Store(s => s.tenants)
  const spaces = useVol1Store(s => s.spaces)
  const occupancy = useVol1Store(s => s.occupancy)
  const phases = useVol1Store(s => s.phases)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [done, setDone] = useState<ExportFormat | null>(null)

  const mallName = 'The Mall'

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)
    setDone(null)
    try {
      switch (format) {
        case 'xlsx': await exportToXLSX(tenants, spaces, occupancy, phases, mallName); break
        case 'pdf':  await exportToPDF(tenants, spaces, occupancy, mallName); break
        case 'pptx': await exportToPPTX(tenants, spaces, occupancy, phases, mallName); break
        case 'dwg':  exportToDXF(spaces, tenants, mallName); break
      }
      setDone(format)
      toast.success(`${format.toUpperCase()} exporté avec succès`)
    } catch (err) {
      console.error('Export error:', err)
      toast.error(`Erreur lors de l'export ${format.toUpperCase()}`)
    } finally {
      setExporting(null)
      setTimeout(() => setDone(null), 4000)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 1 — PLAN COMMERCIAL</p>
        <h1 className="text-[28px] font-light text-white mb-2">Exports</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>
          Générez les livrables du plan commercial — {spaces.length} cellules, {tenants.length} preneurs, {occupancy.occupancyRate}% d'occupation.
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
                {isExporting ? 'Génération...' : isDone ? 'Téléchargé !' : 'Exporter'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
