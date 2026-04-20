// ═══ ExportPanel — Exports multi-formats ═══
//
// Formats supportés :
//   - PNG  : screenshot rendu 3D haute résolution
//   - PDF  : plan avec cartouche et légende
//   - SVG  : vectoriel 2D (impression, édition post-CAD)
//   - DXF  : compatible AutoCAD / architectes
//   - GLB  : 3D pour visualiseurs externes (Blender, SketchFab, AR/VR)
//   - JSON : sauvegarde complète du projet

import { useState } from 'react'
import {
  Download, FileImage, FileText, FileJson, Loader2, CheckCircle,
  FileCode2, FileBox, Layers,
} from 'lucide-react'
import { useSceneEditorStore } from '../store/sceneEditorStore'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import { exportPlanSvg } from '../engines/svgExporter'
import { exportPlanDxf } from '../engines/dxfExporter'
import { exportSceneGlb } from '../engines/glbExporter'

type ExportFormat = 'png' | 'pdf' | 'svg' | 'dxf' | 'glb' | 'json'

export function ExportPanel() {
  const scene = useSceneEditorStore(s => s.scene)
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [done, setDone] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)
    setDone(null)
    setError(null)

    try {
      const base = scene.name.replace(/\s+/g, '_') || 'plan'
      const date = new Date().toISOString().slice(0, 10)

      if (format === 'json') {
        const json = JSON.stringify({ scene, parsedPlan }, null, 2)
        downloadBlob(new Blob([json], { type: 'application/json' }), `${base}_${date}.json`)
      } else if (format === 'svg') {
        if (!parsedPlan) throw new Error('Aucun plan importé')
        const svg = exportPlanSvg(parsedPlan)
        downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${base}_${date}.svg`)
      } else if (format === 'dxf') {
        if (!parsedPlan) throw new Error('Aucun plan importé')
        const dxf = exportPlanDxf(parsedPlan)
        downloadBlob(new Blob([dxf], { type: 'application/dxf' }), `${base}_${date}.dxf`)
      } else if (format === 'glb') {
        if (!parsedPlan) throw new Error('Aucun plan importé')
        const blob = await exportSceneGlb(parsedPlan, scene)
        downloadBlob(blob, `${base}_${date}.glb`)
      } else if (format === 'png') {
        throw new Error('Le rendu PNG est déclenché depuis l\'onglet Rendu.')
      } else if (format === 'pdf') {
        throw new Error('Le PDF est déclenché depuis l\'onglet Rendu.')
      }

      setDone(format)
      setTimeout(() => setDone(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setExporting(null)
    }
  }

  const formats: Array<{
    id: ExportFormat; label: string; desc: string; icon: typeof FileImage; color: string
  }> = [
    { id: 'svg',  label: 'SVG 2D (vectoriel)',    desc: 'Plan vectoriel — impression haute qualité, édition graphique', icon: FileCode2, color: '#8b5cf6' },
    { id: 'dxf',  label: 'DXF (AutoCAD)',          desc: 'Compatible architectes, logiciels CAD (AutoCAD, QCAD, FreeCAD…)', icon: Layers,    color: '#0ea5e9' },
    { id: 'glb',  label: 'GLB (3D universel)',     desc: 'Modèle 3D pour Blender, SketchFab, AR/VR — usage web & mobile', icon: FileBox,   color: '#22c55e' },
    { id: 'png',  label: 'PNG rendu 3D',           desc: 'Screenshot haute résolution (onglet Rendu)', icon: FileImage, color: '#f59e0b' },
    { id: 'pdf',  label: 'PDF plan annoté',        desc: 'Plan avec légende et cartouche (onglet Rendu)', icon: FileText, color: '#ef4444' },
    { id: 'json', label: 'JSON projet complet',    desc: 'Sauvegarde scène + plan + espaces (réimport possible)', icon: FileJson, color: '#64748b' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Download size={16} className="text-emerald-500" />
        <h3 className="text-[13px] font-semibold text-white m-0">Exporter</h3>
      </div>

      {!parsedPlan && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-900/40 text-[10px] text-amber-200">
          ⚠ Aucun plan importé — SVG/DXF/GLB indisponibles.
        </div>
      )}

      {error && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-red-950/30 border border-red-900/40 text-[10px] text-red-200">
          ✕ {error}
        </div>
      )}

      {formats.map(f => {
        const needsPlan = f.id === 'svg' || f.id === 'dxf' || f.id === 'glb'
        const disabled = exporting === f.id || (needsPlan && !parsedPlan)
        const Icon = f.icon
        return (
          <button
            key={f.id}
            onClick={() => handleExport(f.id)}
            disabled={disabled}
            className="w-full flex items-center gap-3 rounded-lg p-2.5 border border-white/[0.06] bg-surface-2 hover:bg-surface-3 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting === f.id ? (
              <Loader2 size={14} className="animate-spin text-atlas-500 flex-shrink-0" />
            ) : done === f.id ? (
              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <Icon size={14} style={{ color: f.color }} className="flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-white font-medium m-0 truncate">{f.label}</p>
              <p className="text-[9px] text-slate-500 m-0 truncate">{f.desc}</p>
            </div>
          </button>
        )
      })}

      <p className="text-[9px] text-slate-600 mt-3 leading-relaxed">
        Tous les exports utilisent les espaces du plan courant (avec patches de remodelage appliqués).
        Les couleurs suivent le mode d'affichage actif.
      </p>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
