import React from 'react'
import { useVol3DStore } from '../store/vol3dStore'
import type { RenderMode } from '../store/vol3dTypes'

const MODES: { id: RenderMode; label: string; desc: string; icon: string }[] = [
  { id: 'isometric', label: 'Isometrique', desc: 'Vectoriel · Export SVG/PDF', icon: '\u2B21' },
  { id: 'perspective', label: 'Perspective', desc: '3D conique · Croquis', icon: '\u2B22' },
  { id: 'realistic', label: 'Semi-realiste', desc: 'PBR · Export GLB', icon: '\u25C8' },
]

export default function ModeSwitch() {
  const mode = useVol3DStore(s => s.config.mode)
  const setMode = useVol3DStore(s => s.setMode)

  return (
    <div className="p-3">
      <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Mode de rendu</p>
      <div className="space-y-1">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${mode === m.id ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300' : 'hover:bg-white/5 text-white/60 border border-transparent'}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{m.icon}</span>
              <div><div className="text-sm font-medium">{m.label}</div><div className="text-xs text-white/30">{m.desc}</div></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
