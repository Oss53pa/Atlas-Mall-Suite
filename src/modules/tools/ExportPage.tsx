// ═══ EXPORT / RAPPORTS — Hub centralisé ═══

import React, { useState } from 'react'
import { FileText, Download, Clock, File, FileSpreadsheet, Presentation, Code2, QrCode, Image } from 'lucide-react'
import toast from 'react-hot-toast'

interface ExportItem {
  id: string; title: string; format: string; formatColor: string; volume: string; size: string; icon: React.ComponentType<any>
}

const EXPORTS: Record<string, ExportItem[]> = {
  'Vol.1 — Commercial': [
    { id: 'e1', title: 'Plan commercial complet', format: 'PDF', formatColor: '#ef4444', volume: 'vol1', size: '~4 Mo', icon: FileText },
    { id: 'e2', title: 'Tableau des preneurs', format: 'XLSX', formatColor: '#22c55e', volume: 'vol1', size: '~800 Ko', icon: FileSpreadsheet },
    { id: 'e3', title: 'Analyse mix enseigne', format: 'PPTX', formatColor: '#f59e0b', volume: 'vol1', size: '~12 Mo', icon: Presentation },
  ],
  'Vol.2 — Sécurité': [
    { id: 'e4', title: 'Rapport APSAD R82', format: 'PDF', formatColor: '#ef4444', volume: 'vol2', size: '~8 Mo', icon: FileText },
    { id: 'e5', title: 'Budget CAPEX détaillé', format: 'XLSX', formatColor: '#22c55e', volume: 'vol2', size: '~1.2 Mo', icon: FileSpreadsheet },
    { id: 'e6', title: 'Plan DXF / DWG', format: 'DWG', formatColor: '#38bdf8', volume: 'vol2', size: '~15 Mo', icon: File },
    { id: 'e7', title: 'QR Codes équipements', format: 'PDF', formatColor: '#ef4444', volume: 'vol2', size: '~2 Mo', icon: QrCode },
  ],
  'Vol.3 — Parcours': [
    { id: 'e8', title: 'Rapport signalétique ISO 7010', format: 'PDF', formatColor: '#ef4444', volume: 'vol3', size: '~6 Mo', icon: FileText },
    { id: 'e9', title: 'Carte des touchpoints', format: 'PDF', formatColor: '#ef4444', volume: 'vol3', size: '~3 Mo', icon: FileText },
    { id: 'e10', title: 'Analyse flux visiteurs', format: 'PPTX', formatColor: '#f59e0b', volume: 'vol3', size: '~18 Mo', icon: Presentation },
  ],
  'Transversal': [
    { id: 'e11', title: 'Rapport de synthèse global', format: 'PDF', formatColor: '#ef4444', volume: 'all', size: '~25 Mo', icon: FileText },
    { id: 'e12', title: 'Export données complètes', format: 'JSON', formatColor: '#b38a5a', volume: 'all', size: '~5 Mo', icon: Code2 },
    { id: 'e13', title: 'Présentation investisseurs', format: 'PPTX', formatColor: '#f59e0b', volume: 'all', size: '~30 Mo', icon: Presentation },
    { id: 'e14', title: 'Rendu 3D isométrique', format: 'SVG', formatColor: '#38bdf8', volume: 'all', size: '~2 Mo', icon: Image },
  ],
}

interface RecentExport { title: string; format: string; date: string; size: string; status: 'ready' | 'generating' }

const RECENT: RecentExport[] = [
  { title: 'Rapport APSAD R82 v2.1', format: 'PDF', date: '28/03/2026 14:30', size: '7.8 Mo', status: 'ready' },
  { title: 'Budget CAPEX Sécurité', format: 'XLSX', date: '25/03/2026 10:15', size: '1.1 Mo', status: 'ready' },
  { title: 'Présentation Vol.1', format: 'PPTX', date: '22/03/2026 16:45', size: '14.2 Mo', status: 'ready' },
  { title: 'Plan DXF RDC', format: 'DWG', date: '20/03/2026 09:00', size: '12.5 Mo', status: 'ready' },
  { title: 'Export JSON complet', format: 'JSON', date: '18/03/2026 11:30', size: '4.3 Mo', status: 'ready' },
]

export default function ExportPage() {
  const [generating, setGenerating] = useState<string | null>(null)

  const handleGenerate = (item: ExportItem) => {
    setGenerating(item.id)
    toast.loading(`Génération de "${item.title}"...`, { id: item.id })
    setTimeout(() => {
      setGenerating(null)
      toast.success(`${item.title} prêt au téléchargement`, { id: item.id })
    }, 2000)
  }

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: '#1a1d23', color: '#e2e8f0' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileText size={20} className="text-amber-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Export / Rapports</h1>
            <p className="text-sm text-gray-500">Générez et téléchargez les documents de votre projet</p>
          </div>
        </div>

        {/* Export cards by volume */}
        {Object.entries(EXPORTS).map(([section, items]) => (
          <div key={section} className="mb-8">
            <h2 className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold mb-3">{section}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map(item => {
                const Icon = item.icon
                const isGen = generating === item.id
                return (
                  <div key={item.id} className="rounded-xl p-4 border border-white/[0.06] flex flex-col" style={{ background: '#262a31' }}>
                    <div className="flex items-start justify-between mb-3">
                      <Icon size={18} className="text-gray-400" />
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${item.formatColor}15`, color: item.formatColor }}>
                        {item.format}
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-white mb-1">{item.title}</p>
                    <p className="text-[10px] text-gray-600 mb-3">{item.size}</p>
                    <button onClick={() => handleGenerate(item)} disabled={isGen}
                      className="mt-auto flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[11px] font-medium text-gray-300 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-50">
                      <Download size={12} /> {isGen ? 'Génération...' : 'Générer'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Recent exports */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#262a31' }}>
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <Clock size={14} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-white">Exports récents</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {RECENT.map((r, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-white font-medium">{r.title}</td>
                  <td className="px-3 py-3"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400">{r.format}</span></td>
                  <td className="px-3 py-3 text-[11px] text-gray-500">{r.date}</td>
                  <td className="px-3 py-3 text-[11px] text-gray-500">{r.size}</td>
                  <td className="px-3 py-3 text-right">
                    <button className="flex items-center gap-1 text-[11px] text-atlas-400 hover:text-atlas-300 transition-colors ml-auto">
                      <Download size={11} /> Télécharger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
