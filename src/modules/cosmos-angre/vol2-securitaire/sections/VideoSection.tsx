import { useMemo, useState } from 'react'
import { Plus, Pencil, Camera as CameraIcon } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'
import type { Camera } from '../../shared/proph3t/types'
import CameraFormModal from '../components/CameraFormModal'

const PRIORITY_COLORS: Record<Camera['priority'], { bg: string; border: string; text: string }> = {
  normale: { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#64748b' },
  haute: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  critique: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444' },
}

export default function VideoSection() {
  const cameras = useVol2Store(s => s.cameras)
  const floors = useVol2Store(s => s.floors)
  const coverageByFloor = useVol2Store(s => s.coverageByFloor)

  const [filterFloorId, setFilterFloorId] = useState<string>('all')
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Camera | null>(null)

  const filtered = useMemo(() => {
    if (filterFloorId === 'all') return cameras
    return cameras.filter(c => c.floorId === filterFloorId)
  }, [cameras, filterFloorId])

  const avgCoverage = useMemo(() => {
    const vals = Object.values(coverageByFloor)
    if (vals.length === 0) return 0
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }, [coverageByFloor])

  const floorLabel = (id: string) => floors.find(f => f.id === id)?.level ?? id

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SÉCURITAIRE</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>ZONE 03</span>
          <h1 className="text-[28px] font-light text-white">Vidéosurveillance</h1>
        </div>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Inventaire des caméras du projet — saisie manuelle ou placement depuis le plan interactif.
        </p>
      </div>

      {/* Score de couverture (calculé depuis coverageByFloor du store) */}
      <div className="rounded-[10px] p-6" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h2 className="text-sm font-semibold text-white mb-4">Score de couverture</h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold" style={{ color: '#38bdf8' }}>{avgCoverage}%</span>
            <span className="text-sm" style={{ color: '#4a5568' }}>couverture moyenne</span>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full overflow-hidden" style={{ background: '#1e2a3a' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${avgCoverage}%`, background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' }}
              />
            </div>
          </div>
          <span className="text-lg font-semibold" style={{ color: '#38bdf8' }}>{avgCoverage}/100</span>
        </div>
        {cameras.length === 0 && (
          <p className="text-[11px] text-slate-500 mt-3">
            Ajoutez des caméras pour alimenter l'analyse de couverture.
          </p>
        )}
      </div>

      {/* Inventaire caméras */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Inventaire caméras ({cameras.length})</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterFloorId}
              onChange={(e) => setFilterFloorId(e.target.value)}
              className="text-[12px] rounded px-3 py-1.5 outline-none"
              style={{ background: '#0f1623', border: '1px solid #1e2a3a', color: '#94a3b8' }}
            >
              <option value="all">Tous les étages</option>
              {floors.map(f => <option key={f.id} value={f.id}>{f.level}</option>)}
            </select>
            <button
              onClick={() => { setEditing(null); setFormMode('create') }}
              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            className="rounded-[10px] p-8 text-center"
            style={{ background: '#141e2e', border: '1px dashed #1e2a3a' }}
          >
            <CameraIcon size={24} className="mx-auto text-slate-600 mb-2" />
            <p className="text-[13px] text-slate-400 mb-1">
              {cameras.length === 0 ? 'Aucune caméra enregistrée' : 'Aucune caméra sur cet étage'}
            </p>
            <p className="text-[11px] text-slate-600">
              Utilisez le bouton « Ajouter » ou placez une caméra depuis le plan interactif.
            </p>
          </div>
        ) : (
          <div className="rounded-[10px] overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: '#0f1623' }}>
                  {['Libellé', 'Étage', 'Modèle', 'FOV', 'Portée', 'Priorité', 'CAPEX', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium" style={{ color: '#4a5568', borderBottom: '1px solid #1e2a3a' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((cam) => {
                  const sc = PRIORITY_COLORS[cam.priority]
                  return (
                    <tr key={cam.id} style={{ borderBottom: '1px solid #1e2a3a' }} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono" style={{ color: '#38bdf8' }}>{cam.label}</td>
                      <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{floorLabel(cam.floorId)}</td>
                      <td className="px-4 py-3 text-white">{cam.model}</td>
                      <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{cam.fov}°</td>
                      <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{cam.rangeM} m</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{cam.priority}</span>
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#94a3b8' }}>
                        {cam.capexFcfa ? `${(cam.capexFcfa / 1000).toFixed(0)} k` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setEditing(cam); setFormMode('edit') }}
                          className="text-slate-500 hover:text-white transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formMode && (
        <CameraFormModal
          mode={formMode}
          camera={formMode === 'edit' ? (editing ?? undefined) : undefined}
          onClose={() => { setFormMode(null); setEditing(null) }}
        />
      )}
    </div>
  )
}
