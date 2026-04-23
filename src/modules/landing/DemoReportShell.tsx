// ═══ DEMO REPORT SHELL — Cadre commun pour toutes les démos verticales ═══

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, Share2, Sparkles } from 'lucide-react'

interface Props {
  html: string
  reportName: string
  verticalBadge: string
  verticalDescription: string
  verticalLinks?: Array<{ label: string; path: string; active?: boolean }>
  stats?: Array<{ k: string; l: string }>
}

export function DemoReportShell({
  html, reportName, verticalBadge, verticalDescription, verticalLinks, stats,
}: Props) {
  const navigate = useNavigate()
  const [showMeta, setShowMeta] = useState(true)

  const handleOpen = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `atlas-bim-demo-${verticalBadge.toLowerCase().replace(/\s/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0b0d10', color: '#e2e8f0' }}>
      <header className="sticky top-0 z-20 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: 'rgba(11,13,16,0.85)' }}>
        <div className="max-w-[1500px] mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate('/landing')}
            className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Retour landing
          </button>
          <div className="flex items-center gap-2 ml-4">
            <Sparkles size={14} className="text-atlas-400" />
            <span className="text-sm font-semibold text-white">{reportName}</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-atlas-200 bg-atlas-500/15 border border-atlas-500/30">
              {verticalBadge}
            </span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowMeta(v => !v)}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-1"
          >
            {showMeta ? 'Masquer détails' : 'Afficher détails'}
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-gray-300 hover:text-white">
            <Download size={13} /> Télécharger .html
          </button>
          <button onClick={handleOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlas-500 hover:bg-atlas-400 text-white text-sm font-medium">
            <ExternalLink size={13} /> Plein écran
          </button>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-6 py-6 space-y-4">
        {showMeta && (
          <div className="rounded-xl p-5 border border-white/[0.06] flex flex-col md:flex-row gap-6"
            style={{ background: '#15181d' }}>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-2">{reportName}</h2>
              <p className="text-[13px] text-gray-400 leading-relaxed max-w-3xl">{verticalDescription}</p>
              {verticalLinks && verticalLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider self-center mr-2">Autres démos :</span>
                  {verticalLinks.map(l => (
                    <button key={l.path}
                      onClick={() => navigate(l.path)}
                      className={`rounded px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        l.active
                          ? 'bg-atlas-500/15 text-atlas-300 border border-atlas-500/40'
                          : 'bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:text-white hover:border-white/[0.15]'
                      }`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {stats && stats.length > 0 && (
              <div className="md:w-72 grid grid-cols-2 gap-2 text-center">
                {stats.map(s => (
                  <div key={s.l} className="rounded px-3 py-2" style={{ background: '#0b0d10' }}>
                    <div className="text-xl font-bold text-atlas-300">{s.k}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl" style={{ background: '#0b0d10' }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]" style={{ background: '#0f1115' }}>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[11px] text-slate-500 font-mono ml-2 flex-1">
              atlas-bim-{verticalBadge.toLowerCase().replace(/\s/g, '-')}.html
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <Share2 size={10} /> partageable hors-ligne
            </span>
          </div>
          <iframe
            title={reportName}
            srcDoc={html}
            sandbox="allow-same-origin allow-scripts allow-modals allow-popups"
            className="w-full"
            style={{ height: '90vh', border: 0 }}
          />
        </div>
      </div>
    </div>
  )
}

export const DEMO_LINKS = [
  { label: '🛍️ Centre commercial', path: '/demo/mall' },
  { label: '🏨 Hôtel',              path: '/demo/hotel' },
  { label: '🏢 Bureaux',            path: '/demo/office' },
  { label: '🏥 Hôpital',            path: '/demo/hospital' },
  { label: '🎓 Campus',             path: '/demo/campus' },
]
