// ═══ SceneEditor — Editeur unifié 2D + 3D ═══
//
// Studio d'édition avec :
//   - Vue 2D (PlanDrawEditor) : dessin polygones, places parking, édition sommets
//   - Vue 3D (SceneCanvas3D)  : rendu volumétrique, coloring sync par volume
//   - Vue Split (2D + 3D côte à côte)
//   - Bibliothèque mobilier (drag vers 2D ou 3D)
//   - Inspector, rendu photo, exports multi-formats

import React, { useState } from 'react'
import { FurnitureLibrary } from './components/FurnitureLibrary'
import { SceneCanvas3D } from './components/SceneCanvas3D'
import { SceneInspector } from './components/SceneInspector'
import { SceneToolbar } from './components/SceneToolbar'
import { RenderPanel } from './components/RenderPanel'
import { ExportPanel } from './components/ExportPanel'
import { useSceneEditorStore } from './store/sceneEditorStore'
import {
  Image, Download, Settings, Square, Box, LayoutPanelTop, Palette,
} from 'lucide-react'

const PlanDrawEditor = React.lazy(() =>
  import('../shared/components/PlanDrawEditor').then(m => ({ default: m.PlanDrawEditor }))
)

type RightTab = 'inspector' | 'render' | 'export'
type ViewMode = '2d' | '3d' | 'split'
export type ColorMode = 'type' | 'vol1-revenue' | 'vol2-erp' | 'vol3-flow' | 'floor'

const COLOR_MODE_META: Record<ColorMode, { label: string; icon: string; desc: string }> = {
  type:           { label: 'Par type',           icon: '🏷', desc: 'Couleur par catégorie d\'espace (boutique, parking, sanitaires…)' },
  'vol1-revenue': { label: 'Revenus (Vol.1)',    icon: '💰', desc: 'Dégradé FCFA/m²/mois — enseignes les plus rentables en vert' },
  'vol2-erp':     { label: 'Conformité ERP',     icon: '🛡', desc: 'Conforme = vert · réserves mineures = ambre · majeures = orange · bloquant = rouge' },
  'vol3-flow':    { label: 'Flux (Vol.3)',       icon: '👣', desc: 'Densité visiteurs — zones chaudes en rouge, froides en bleu' },
  floor:          { label: 'Par étage',          icon: '▤', desc: 'Une couleur par niveau (B1, RDC, R+1…)' },
}

export default function SceneEditor() {
  const [rightTab, setRightTab] = useState<RightTab>('inspector')
  const [colorMenuOpen, setColorMenuOpen] = useState(false)

  const viewMode = useSceneEditorStore(s => s.viewMode) as ViewMode
  const setViewMode = useSceneEditorStore(s => s.setViewMode)
  const colorMode = useSceneEditorStore(s => s.colorMode) as ColorMode
  const setColorMode = useSceneEditorStore(s => s.setColorMode)

  const isDirty = useSceneEditorStore(s => s.isDirty)
  const sceneName = useSceneEditorStore(s => s.scene.name)

  const rightTabs: { id: RightTab; label: string; icon: typeof Image }[] = [
    { id: 'inspector', label: 'Inspecteur', icon: Settings },
    { id: 'render',    label: 'Rendu',      icon: Image },
    { id: 'export',    label: 'Export',     icon: Download },
  ]

  const viewModes: { id: ViewMode; label: string; icon: typeof Square }[] = [
    { id: '2d',    label: '2D',    icon: Square },
    { id: '3d',    label: '3D',    icon: Box },
    { id: 'split', label: 'Split', icon: LayoutPanelTop },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-surface-1">
        <div className="flex items-center gap-3">
          <p className="text-[11px] tracking-[0.2em] font-medium text-purple-400">ÉDITEUR DE SCÈNE</p>
          <span className="text-[13px] text-white font-semibold">{sceneName}</span>
          {isDirty && <span className="text-[10px] text-amber-400">Non sauvegardé</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] p-0.5">
            {viewModes.map(m => {
              const Icon = m.icon
              const active = viewMode === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setViewMode(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition ${
                    active ? 'bg-purple-600/30 text-purple-200' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={12} />
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Color mode — visible en 3D et Split */}
          {(viewMode === '3d' || viewMode === 'split') && (
            <div className="relative">
              <button
                onClick={() => setColorMenuOpen(!colorMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-slate-800 border border-white/[0.08] text-slate-300 hover:text-white"
                title={COLOR_MODE_META[colorMode].desc}
              >
                <Palette size={12} />
                {COLOR_MODE_META[colorMode].icon} {COLOR_MODE_META[colorMode].label}
              </button>
              {colorMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-72 rounded-lg bg-slate-900 border border-white/[0.1] shadow-2xl z-50 overflow-hidden">
                  {(Object.keys(COLOR_MODE_META) as ColorMode[]).map(k => {
                    const meta = COLOR_MODE_META[k]
                    const active = colorMode === k
                    return (
                      <button
                        key={k}
                        onClick={() => { setColorMode(k); setColorMenuOpen(false) }}
                        className={`w-full text-left px-3 py-2 text-[11px] transition border-b border-white/[0.04] last:border-0 ${
                          active ? 'bg-purple-600/20 text-purple-200' : 'text-slate-300 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-base">{meta.icon}</span>
                          {meta.label}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 m-0 ml-7 leading-tight">
                          {meta.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => window.history.back()}
            className="text-[11px] text-slate-500 hover:text-white px-3 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <SceneToolbar />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Library (toujours visible) */}
        <FurnitureLibrary />

        {/* Center — Canvas selon viewMode */}
        <div className="flex-1 flex min-w-0 relative">
          {viewMode === '2d' && (
            <div className="flex-1 relative bg-slate-900">
              <React.Suspense fallback={<LoadingBlock label="Chargement éditeur 2D…" />}>
                <PlanDrawEditor onClose={() => setViewMode('3d')} />
              </React.Suspense>
            </div>
          )}
          {viewMode === '3d' && (
            <div className="flex-1 relative">
              <SceneCanvas3D />
            </div>
          )}
          {viewMode === 'split' && (
            <>
              <div className="flex-1 relative border-r border-white/[0.08] bg-slate-900">
                <React.Suspense fallback={<LoadingBlock label="Chargement 2D…" />}>
                  <PlanDrawEditor onClose={() => setViewMode('3d')} />
                </React.Suspense>
              </div>
              <div className="flex-1 relative">
                <SceneCanvas3D />
              </div>
            </>
          )}
        </div>

        {/* Right — Inspector / Render / Export */}
        <div className="w-72 flex-shrink-0 border-l border-white/[0.06] bg-surface-1 flex flex-col h-full overflow-hidden">
          <div className="flex border-b border-white/[0.06]">
            {rightTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setRightTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
                  rightTab === t.id ? 'text-white border-b-2 border-atlas-500' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {rightTab === 'inspector' && <SceneInspector />}
            {rightTab === 'render' && <RenderPanel />}
            {rightTab === 'export' && <ExportPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
      <div className="w-4 h-4 border-2 border-slate-600 border-t-purple-500 rounded-full animate-spin mr-2" />
      {label}
    </div>
  )
}
