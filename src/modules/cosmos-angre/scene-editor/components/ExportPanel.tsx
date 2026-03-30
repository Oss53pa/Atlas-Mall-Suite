// ═══ ExportPanel — Export PNG / PDF / JSON ═══

import { useState } from 'react'
import { Download, FileImage, FileText, FileJson, Loader2, CheckCircle } from 'lucide-react'
import { useSceneEditorStore } from '../store/sceneEditorStore'

type ExportFormat = 'png' | 'pdf' | 'json'

export function ExportPanel() {
  const scene = useSceneEditorStore(s => s.scene)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const [done, setDone] = useState<ExportFormat | null>(null)

  const handleExport = async (format: ExportFormat) => {
    setExporting(format)
    setDone(null)

    try {
      if (format === 'json') {
        const json = JSON.stringify(scene, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        downloadBlob(blob, `scene_${scene.name.replace(/\s+/g, '_')}.json`)
      }
      // PNG et PDF sont declenches via le SceneRenderer (exportPNG)
      // Le composant parent orchestre cela
    } finally {
      setExporting(null)
      setDone(format)
      setTimeout(() => setDone(null), 3000)
    }
  }

  const formats: { id: ExportFormat; label: string; desc: string; icon: typeof FileImage }[] = [
    { id: 'png',  label: 'PNG 1920x1080', desc: 'Image haute qualite du rendu 3D', icon: FileImage },
    { id: 'pdf',  label: 'PDF Plan',       desc: 'Plan avec legende et cartouche',    icon: FileText },
    { id: 'json', label: 'JSON Scene',     desc: 'Sauvegarde complete de la scene',   icon: FileJson },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Download size={16} className="text-emerald-500" />
        <h3 className="text-[13px] font-semibold text-white">Exporter</h3>
      </div>

      {formats.map(f => (
        <button
          key={f.id}
          onClick={() => handleExport(f.id)}
          disabled={exporting === f.id}
          className="w-full flex items-center gap-3 rounded-lg p-3 border border-white/[0.06] bg-surface-2 hover:bg-surface-3 transition-colors text-left"
        >
          {exporting === f.id ? (
            <Loader2 size={16} className="animate-spin text-atlas-500 flex-shrink-0" />
          ) : done === f.id ? (
            <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
          ) : (
            <f.icon size={16} className="text-slate-400 flex-shrink-0" />
          )}
          <div>
            <p className="text-[12px] text-white font-medium">{f.label}</p>
            <p className="text-[10px] text-slate-500">{f.desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
