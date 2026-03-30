// ═══ SceneEditor — Editeur de scene 3D & Rendu photo ═══
// Composant principal : FurnitureLibrary + SceneCanvas3D + SceneInspector
// PROPH3T local en priorite absolue — API externe optionnelle

import { useState } from 'react'
import { FurnitureLibrary } from './components/FurnitureLibrary'
import { SceneCanvas3D } from './components/SceneCanvas3D'
import { SceneInspector } from './components/SceneInspector'
import { SceneToolbar } from './components/SceneToolbar'
import { RenderPanel } from './components/RenderPanel'
import { ExportPanel } from './components/ExportPanel'
import { useSceneEditorStore } from './store/sceneEditorStore'
import { Image, Download, Settings } from 'lucide-react'

type RightTab = 'inspector' | 'render' | 'export'

export default function SceneEditor() {
  const [rightTab, setRightTab] = useState<RightTab>('inspector')
  const isDirty = useSceneEditorStore(s => s.isDirty)
  const sceneName = useSceneEditorStore(s => s.scene.name)

  const rightTabs: { id: RightTab; label: string; icon: typeof Image }[] = [
    { id: 'inspector', label: 'Inspecteur', icon: Settings },
    { id: 'render',    label: 'Rendu',      icon: Image },
    { id: 'export',    label: 'Export',      icon: Download },
  ]

  return (
    <div className="flex flex-col h-screen bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-surface-1">
        <div className="flex items-center gap-3">
          <p className="text-[11px] tracking-[0.2em] font-medium text-purple-400">EDITEUR DE SCENE 3D</p>
          <span className="text-[13px] text-white font-semibold">{sceneName}</span>
          {isDirty && <span className="text-[10px] text-amber-400">Non sauvegarde</span>}
        </div>
      </div>

      {/* Toolbar */}
      <SceneToolbar />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Library */}
        <FurnitureLibrary />

        {/* Center — 3D Canvas */}
        <SceneCanvas3D />

        {/* Right — Inspector / Render / Export */}
        <div className="w-72 flex-shrink-0 border-l border-white/[0.06] bg-surface-1 flex flex-col h-full overflow-hidden">
          {/* Right tabs */}
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

          {/* Right content */}
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
