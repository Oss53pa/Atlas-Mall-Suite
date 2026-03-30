// ═══ RenderPanel — Generation rendu (PROPH3T local + API externe optionnelle) ═══

import { useState } from 'react'
import { Sparkles, Image, RefreshCw, Loader2, Download, AlertCircle } from 'lucide-react'
import { useSceneEditorStore } from '../store/sceneEditorStore'
import { buildScenePrompt } from '../engines/promptBuilder'
import type { AmbianceTime, AmbianceStyle, RenderResult } from '../store/sceneEditorTypes'

const TIME_OPTIONS: { id: AmbianceTime; label: string }[] = [
  { id: 'morning',   label: 'Matin' },
  { id: 'afternoon', label: 'Apres-midi' },
  { id: 'evening',   label: 'Soir' },
  { id: 'night',     label: 'Nuit' },
]

const STYLE_OPTIONS: { id: AmbianceStyle; label: string }[] = [
  { id: 'moderne_tropical', label: 'Moderne tropical' },
  { id: 'epure',            label: 'Epure' },
  { id: 'luxe',             label: 'Luxe' },
]

export function RenderPanel() {
  const scene = useSceneEditorStore(s => s.scene)
  const setAmbiance = useSceneEditorStore(s => s.setAmbiance)
  const currentPrompt = useSceneEditorStore(s => s.currentPrompt)
  const setPrompt = useSceneEditorStore(s => s.setPrompt)
  const isRendering = useSceneEditorStore(s => s.isRendering)
  const setRendering = useSceneEditorStore(s => s.setRendering)
  const addRenderResult = useSceneEditorStore(s => s.addRenderResult)
  const externalApiEnabled = useSceneEditorStore(s => s.externalApiEnabled)
  const renderResults = useSceneEditorStore(s => s.renderResults)

  const [renderMode, setRenderMode] = useState<'local_threejs' | 'photo_ai'>('local_threejs')

  const handleGeneratePrompt = () => {
    const prompt = buildScenePrompt(scene)
    setPrompt(prompt)
  }

  const handleRender = async () => {
    setRendering(true)
    try {
      // Mode local : rendu Three.js haute qualite (toujours disponible)
      // Le rendu est fait via SceneCanvas3D.exportPNG() — on simule ici
      const result: RenderResult = {
        id: crypto.randomUUID(),
        mode: renderMode,
        prompt: currentPrompt || buildScenePrompt(scene),
        imageUrl: null, // sera rempli par le canvas
        thumbnailUrl: null,
        isApproved: false,
        createdAt: new Date().toISOString(),
      }

      if (renderMode === 'photo_ai' && externalApiEnabled) {
        // Appel API externe (Replicate / DALL-E) via Edge Function
        // L'implementation reelle passe par Supabase Edge Function
        result.imageUrl = null // sera rempli par l'API
      }

      addRenderResult(result)
    } finally {
      setRendering(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Image size={16} className="text-atlas-500" />
        <h3 className="text-[13px] font-semibold text-white">Generer un rendu</h3>
      </div>

      {/* Mode de rendu */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Mode</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="renderMode"
            checked={renderMode === 'local_threejs'}
            onChange={() => setRenderMode('local_threejs')}
            className="accent-atlas-500"
          />
          <span className="text-[12px] text-slate-300">Rendu 3D stylise (local, gratuit)</span>
        </label>
        <label className={`flex items-center gap-2 ${externalApiEnabled ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
          <input
            type="radio"
            name="renderMode"
            checked={renderMode === 'photo_ai'}
            onChange={() => externalApiEnabled && setRenderMode('photo_ai')}
            disabled={!externalApiEnabled}
            className="accent-atlas-500"
          />
          <span className="text-[12px] text-slate-300">Rendu photo realiste (IA externe)</span>
        </label>
      </div>

      {/* Ambiance */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Ambiance</p>
        <div className="flex gap-1">
          {TIME_OPTIONS.map(t => (
            <button
              key={t.id}
              onClick={() => setAmbiance({ timeOfDay: t.id })}
              className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                scene.ambiance.timeOfDay === t.id
                  ? 'bg-atlas-700 text-white'
                  : 'bg-surface-3 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Style architectural</p>
        <div className="flex gap-1">
          {STYLE_OPTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setAmbiance({ style: s.id })}
              className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                scene.ambiance.style === s.id
                  ? 'bg-atlas-700 text-white'
                  : 'bg-surface-3 text-slate-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Prompt PROPH3T</p>
          <button
            onClick={handleGeneratePrompt}
            className="text-[10px] text-atlas-400 hover:text-atlas-300 flex items-center gap-1"
          >
            <RefreshCw size={10} /> Regenerer
          </button>
        </div>
        <textarea
          value={currentPrompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Cliquez sur Regenerer pour generer un prompt..."
          rows={4}
          className="input-dark text-[11px] resize-none"
        />
      </div>

      {/* Bouton rendu */}
      <button
        onClick={handleRender}
        disabled={isRendering}
        className="btn-primary w-full"
      >
        {isRendering ? (
          <><Loader2 size={14} className="animate-spin" /> Rendu en cours...</>
        ) : (
          <><Sparkles size={14} /> Lancer le rendu</>
        )}
      </button>

      {/* Avertissement API externe */}
      {!externalApiEnabled && renderMode === 'local_threejs' && (
        <div className="flex items-start gap-2 text-[10px] text-slate-600 rounded-lg p-2 bg-surface-3">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>Rendu IA externe desactive. Activer dans Parametres &gt; Integrations.</span>
        </div>
      )}

      {/* Resultats */}
      {renderResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Rendus ({renderResults.length})
          </p>
          {renderResults.slice(-3).reverse().map(r => (
            <div key={r.id} className="rounded-lg p-2 bg-surface-3 border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {r.mode === 'local_threejs' ? '3D Local' : 'Photo IA'}
                </span>
                {r.imageUrl && (
                  <a href={r.imageUrl} download className="text-atlas-400 hover:text-atlas-300">
                    <Download size={12} />
                  </a>
                )}
              </div>
              <p className="text-[9px] text-slate-600 mt-1 line-clamp-2">{r.prompt.slice(0, 100)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
