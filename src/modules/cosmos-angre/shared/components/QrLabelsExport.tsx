// ═══ QR LABELS EXPORT ═══
// Génère une planche A4 de QR codes (un par panneau de signalétique) à imprimer
// et coller physiquement sur les panneaux. Chaque QR pointe vers /feedback
// avec les paramètres du panneau (projet, ref, position, type).

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer, QrCode, Info } from 'lucide-react'
import { buildFeedbackUrl } from '../services/signageFeedbackService'
import type { PlacedPanel } from '../engines/plan-analysis/signagePlacementEngine'

interface Props {
  panels: PlacedPanel[]
  projetId: string
  floorId?: string
  projectName: string
  onClose: () => void
}

const PANEL_KIND_LABELS: Record<PlacedPanel['kind'], string> = {
  welcome: 'Accueil',
  directional: 'Directionnel',
  'you-are-here': 'Vous êtes ici',
  information: 'Information',
  exit: 'Sortie',
  'emergency-plan': 'Plan évacuation',
  'emergency-exit': 'Sortie secours',
  'exit-direction': 'Direction secours',
  'pmr-direction': 'Direction PMR',
}

export function QrLabelsExport({ panels, projetId, floorId, projectName, onClose }: Props) {
  const [baseUrl, setBaseUrl] = useState(() =>
    typeof window !== 'undefined' ? `${window.location.origin}/feedback` : '/feedback',
  )
  const [includedKinds, setIncludedKinds] = useState<Set<PlacedPanel['kind']>>(
    new Set(Object.keys(PANEL_KIND_LABELS) as PlacedPanel['kind'][]),
  )
  const [qrSizeMm, setQrSizeMm] = useState(30)

  const filteredPanels = useMemo(
    () => panels.filter(p => includedKinds.has(p.kind)),
    [panels, includedKinds],
  )

  const toggleKind = (k: PlacedPanel['kind']) => {
    setIncludedKinds(s => {
      const next = new Set(s)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const handlePrint = () => window.print()

  const modal = (
    <div
      className="fixed inset-0 z-[9999] bg-surface-0/80 backdrop-blur-sm overflow-y-auto print:bg-white print:overflow-visible"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="min-h-screen flex items-start justify-center p-4 print:p-0">
        <div className="w-[840px] max-w-[95vw] bg-white text-slate-900 rounded-lg shadow-2xl print:w-full print:max-w-none print:shadow-none print:rounded-none">
          {/* Header (non-print) */}
          <div className="sticky top-0 flex items-center justify-between px-6 py-3 bg-surface-1 text-white rounded-t-lg print:hidden">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold">Planche QR signalétique</h2>
              <span className="text-[10px] text-slate-500">
                {filteredPanels.length}/{panels.length} panneaux
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-amber-600 hover:bg-amber-500"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer
              </button>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Options (non-print) */}
          <div className="p-5 border-b border-slate-200 bg-slate-50 print:hidden">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  URL de base
                </label>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-300 text-[11px] font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                  Taille QR imprimé : {qrSizeMm} mm
                </label>
                <input
                  type="range"
                  min={20} max={50} step={5}
                  value={qrSizeMm}
                  onChange={(e) => setQrSizeMm(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Types de panneaux à inclure
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(PANEL_KIND_LABELS) as PlacedPanel['kind'][]).map(k => {
                  const count = panels.filter(p => p.kind === k).length
                  if (count === 0) return null
                  const active = includedKinds.has(k)
                  return (
                    <button
                      key={k}
                      onClick={() => toggleKind(k)}
                      className={`px-2 py-1 rounded text-[10px] font-medium border ${
                        active
                          ? 'bg-surface-1 text-white border-slate-900'
                          : 'bg-white text-slate-500 border-slate-300'
                      }`}
                    >
                      {PANEL_KIND_LABELS[k]} ({count})
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-900">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Imprimer sur étiquettes adhésives résistantes (vinyle laminé).
                Coller chaque QR au dos du panneau ou sur sa tige. Un scan depuis un
                téléphone ouvrira le formulaire de signalement terrain.
              </span>
            </div>
          </div>

          {/* Planche de QR codes (imprimable) */}
          <div className="p-6 print:p-4">
            <div className="mb-4 pb-2 border-b border-slate-200 print:border-slate-400">
              <h1 className="text-lg font-bold m-0">Planche QR — {projectName}</h1>
              <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                Niveau {floorId ?? 'RDC'} · {filteredPanels.length} panneaux ·
                URL : <code className="font-mono">{baseUrl}</code>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 print:gap-2">
              {filteredPanels.map((p, i) => {
                const url = buildFeedbackUrl({
                  baseUrl,
                  projetId,
                  panelRef: p.id,
                  floorId,
                  panelType: p.kind,
                  x: p.x,
                  y: p.y,
                })
                return (
                  <div
                    key={p.id}
                    className="border border-slate-300 rounded p-2 break-inside-avoid print:border-black"
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    <div className="text-[9px] text-slate-500 font-semibold mb-1">
                      #{i + 1} · {PANEL_KIND_LABELS[p.kind]}
                    </div>
                    <div className="flex items-center justify-center bg-white py-2">
                      <QRCodeSVG
                        value={url}
                        size={qrSizeMm * 3.78} // approx mm → px écran (1mm ≈ 3.78px à 96dpi)
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="mt-1 text-[8px] text-slate-700 font-mono truncate" title={p.id}>
                      {p.id.slice(0, 24)}
                    </div>
                    <div className="text-[8px] text-slate-500">
                      ({p.x.toFixed(0)}, {p.y.toFixed(0)}) · {p.mount}
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredPanels.length === 0 && (
              <p className="text-center italic text-slate-500 text-sm py-12">
                Aucun panneau sélectionné.
              </p>
            )}
          </div>

          {/* Footer print */}
          <div className="text-center text-[9px] text-slate-500 pb-2 print:pb-0">
            PROPH3T · Atlas Mall Suite · Imprimé le {new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
