import type { View3DConfig, View3DData, RenderMode, UsageContext } from './types/view3dTypes'

const MODES: { id: RenderMode; label: string; icon: string }[] = [
  { id: 'isometric',      label: 'Iso',      icon: '\u2B21' },
  { id: 'perspective',    label: 'Persp.',   icon: '\u2B22' },
  { id: 'realistic',      label: 'Réaliste', icon: '\u25C8' },
  { id: 'photorealistic', label: 'Photo',    icon: '\u25C9' },
]

const CONTEXTS: { id: UsageContext; label: string }[] = [
  { id: 'conception',   label: 'Conception' },
  { id: 'presentation', label: 'Présentation' },
]

interface Props {
  config: View3DConfig
  data: View3DData
  onSetMode: (m: RenderMode) => void
  onSetContext: (c: UsageContext) => void
}

export default function View3DToolbar({ config, data, onSetMode, onSetContext }: Props) {
  const exportSVG = () => {
    const svg = document.getElementById('iso-scene')
    if (!svg) return
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `cosmos-angre-${data.sourceVolume}-iso.svg`,
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const volumeLabel = data.sourceVolume === 'vol1' ? 'Plan Commercial'
    : data.sourceVolume === 'vol2' ? 'Plan Sécuritaire' : 'Parcours Client'

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#0a0f1a] flex-wrap">
      {/* Modes */}
      <div className="flex gap-1 rounded-lg border border-white/10 p-0.5">
        {MODES.map(m => (
          <button key={m.id} onClick={() => onSetMode(m.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              config.mode === m.id
                ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
                : 'text-white/40 hover:text-white/70'
            }`}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Context */}
      <div className="flex gap-1 rounded-lg border border-white/10 p-0.5">
        {CONTEXTS.map(ctx => (
          <button key={ctx.id} onClick={() => onSetContext(ctx.id)}
            className={`px-3 py-1.5 rounded-md text-xs transition-all ${
              config.context === ctx.id
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-white/40 hover:text-white/70'
            }`}>
            {ctx.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10" />

      {/* Exports */}
      {config.mode === 'isometric' && (
        <button onClick={exportSVG}
          className="px-3 py-1.5 rounded-md text-xs bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition">
          ↓ SVG
        </button>
      )}

      <div className="ml-auto text-xs text-white/20 uppercase tracking-widest">
        {volumeLabel} · Vue 3D
      </div>
    </div>
  )
}
