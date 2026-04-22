import { useVol3DStore } from '../store/vol3dStore'

export default function ExportPanel3D() {
  const config = useVol3DStore(s => s.config)

  const exportSVG = () => {
    const svgEl = document.querySelector('#iso-scene svg')
    if (!svgEl) return
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'cosmos-angre-iso.svg'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Exports</p>
      {config.mode === 'isometric' && (
        <button onClick={exportSVG} className="w-full px-3 py-2 bg-blue-500/15 border border-blue-500/30 rounded-lg text-sm text-blue-300 hover:bg-blue-500/25 transition">
          SVG vectoriel
        </button>
      )}
      {config.mode !== 'isometric' && (
        <>
          <button className="w-full px-3 py-2 bg-teal-500/15 border border-teal-500/30 rounded-lg text-sm text-teal-300 hover:bg-teal-500/25 transition">PNG 4K</button>
          <button className="w-full px-3 py-2 bg-purple-500/15 border border-purple-500/30 rounded-lg text-sm text-purple-300 hover:bg-purple-500/25 transition">GLB (Blender/SketchUp)</button>
        </>
      )}
    </div>
  )
}
