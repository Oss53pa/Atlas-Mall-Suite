import type { LightingPreset } from '../types/view3dTypes'

export interface LightSetup {
  ambient: { color: string; intensity: number }
  directional: { color: string; intensity: number; x: number; y: number; z: number }
  hemisphere: { skyColor: string; groundColor: string; intensity: number }
  background: string
}

const PRESETS: Record<LightingPreset, LightSetup> = {
  day_natural: {
    ambient: { color: '#b0c4de', intensity: 0.4 },
    directional: { color: '#ffffff', intensity: 1.2, x: 50, y: 80, z: 30 },
    hemisphere: { skyColor: '#87ceeb', groundColor: '#2a1a0a', intensity: 0.3 },
    background: '#080c14',
  },
  day_overcast: {
    ambient: { color: '#c0c8d0', intensity: 0.6 },
    directional: { color: '#d0d0d0', intensity: 0.6, x: 40, y: 60, z: 20 },
    hemisphere: { skyColor: '#a0a8b0', groundColor: '#202020', intensity: 0.4 },
    background: '#0a0e16',
  },
  evening_commercial: {
    ambient: { color: '#1a0a2a', intensity: 0.2 },
    directional: { color: '#ff8844', intensity: 0.4, x: -30, y: 20, z: 50 },
    hemisphere: { skyColor: '#0a0020', groundColor: '#1a0800', intensity: 0.3 },
    background: '#060810',
  },
  night_security: {
    ambient: { color: '#0a0a1a', intensity: 0.15 },
    directional: { color: '#4488ff', intensity: 0.3, x: 0, y: 50, z: 0 },
    hemisphere: { skyColor: '#000010', groundColor: '#0a0a0a', intensity: 0.1 },
    background: '#020408',
  },
  presentation: {
    ambient: { color: '#e0e0f0', intensity: 0.5 },
    directional: { color: '#ffffff', intensity: 1.0, x: 60, y: 100, z: 40 },
    hemisphere: { skyColor: '#c0d0e0', groundColor: '#1a1a2a', intensity: 0.4 },
    background: '#0c1020',
  },
}

export function getLightSetup(preset: LightingPreset): LightSetup {
  return PRESETS[preset] ?? PRESETS.day_natural
}
