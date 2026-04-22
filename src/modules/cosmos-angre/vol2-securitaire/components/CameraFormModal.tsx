// ═══ CAMERA FORM MODAL — Création / édition d'une caméra ═══

import React, { useState } from 'react'
import { X, Plus, Save, Camera as CameraIcon } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'
import type { Camera, CameraModel } from '../../shared/proph3t/types'

interface Props {
  mode: 'create' | 'edit'
  camera?: Camera
  onClose: () => void
}

const CAMERA_MODELS: CameraModel[] = [
  'XNV-8080R', 'QNV-8080R', 'PTZ QNP-9300RWB', 'PNM-9000VQ',
  'QNO-8080R', 'XNF-9300RV', 'DS-2CD2T47G2', 'IPC-HDW3849H', 'PTZ-P3',
]

const PRIORITIES: { value: Camera['priority']; label: string }[] = [
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'critique', label: 'Critique' },
]

export default function CameraFormModal({ mode, camera, onClose }: Props) {
  const floors = useVol2Store(s => s.floors)
  const activeFloorId = useVol2Store(s => s.activeFloorId)
  const addCamera = useVol2Store(s => s.addCamera)
  const updateCamera = useVol2Store(s => s.updateCamera)
  const deleteCamera = useVol2Store(s => s.deleteCamera)

  const [form, setForm] = useState({
    label: camera?.label ?? '',
    floorId: camera?.floorId ?? activeFloorId ?? floors[0]?.id ?? '',
    model: (camera?.model ?? 'XNV-8080R') as CameraModel,
    x: camera?.x ?? 0,
    y: camera?.y ?? 0,
    angle: camera?.angle ?? 0,
    fov: camera?.fov ?? 90,
    rangeM: camera?.rangeM ?? 15,
    priority: (camera?.priority ?? 'normale') as Camera['priority'],
    capexFcfa: camera?.capexFcfa ?? 0,
    note: camera?.note ?? '',
  })

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim() || !form.floorId) return

    if (mode === 'create') {
      const newCam: Camera = {
        id: `cam-${Date.now()}`,
        floorId: form.floorId,
        label: form.label,
        model: form.model,
        x: form.x,
        y: form.y,
        angle: form.angle,
        fov: form.fov,
        range: form.rangeM,
        rangeM: form.rangeM,
        color: '#38bdf8',
        note: form.note || undefined,
        priority: form.priority,
        capexFcfa: form.capexFcfa,
        autoPlaced: false,
      }
      addCamera(newCam)
    } else if (camera) {
      updateCamera(camera.id, {
        label: form.label,
        floorId: form.floorId,
        model: form.model,
        x: form.x,
        y: form.y,
        angle: form.angle,
        fov: form.fov,
        range: form.rangeM,
        rangeM: form.rangeM,
        priority: form.priority,
        capexFcfa: form.capexFcfa,
        note: form.note || undefined,
      })
    }
    onClose()
  }

  const handleDelete = () => {
    if (!camera) return
    if (confirm(`Supprimer la caméra ${camera.label} ?`)) {
      deleteCamera(camera.id)
      onClose()
    }
  }

  const inputCls =
    'w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none focus:border-cyan-500/50 placeholder:text-gray-600'
  const labelCls = 'text-[11px] text-gray-500 mb-1 block'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: '#262a31' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <CameraIcon size={16} className="text-cyan-400" />
            <h2 className="text-white font-semibold">
              {mode === 'create' ? 'Nouvelle caméra' : `Modifier ${camera?.label ?? ''}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Libellé *</label>
              <input
                value={form.label}
                onChange={e => set('label', e.target.value)}
                placeholder="Ex: CAM-RDC-01"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Étage *</label>
              <select
                value={form.floorId}
                onChange={e => set('floorId', e.target.value)}
                className={inputCls}
              >
                {floors.length === 0 && <option value="">Aucun étage — importer un plan</option>}
                {floors.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Modèle</label>
              <select
                value={form.model}
                onChange={e => set('model', e.target.value as CameraModel)}
                className={inputCls}
              >
                {CAMERA_MODELS.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priorité</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value as Camera['priority'])}
                className={inputCls}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>FOV (°)</label>
              <input
                type="number"
                min={1}
                max={360}
                value={form.fov}
                onChange={e => set('fov', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Portée (m)</label>
              <input
                type="number"
                min={0}
                value={form.rangeM}
                onChange={e => set('rangeM', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Angle (°)</label>
              <input
                type="number"
                min={0}
                max={360}
                value={form.angle}
                onChange={e => set('angle', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>X</label>
              <input
                type="number"
                value={form.x}
                onChange={e => set('x', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Y</label>
              <input
                type="number"
                value={form.y}
                onChange={e => set('y', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>CAPEX (FCFA)</label>
              <input
                type="number"
                min={0}
                value={form.capexFcfa}
                onChange={e => set('capexFcfa', parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Note</label>
            <textarea
              value={form.note}
              onChange={e => set('note', e.target.value)}
              rows={2}
              placeholder="Contexte, mission, remarque…"
              className={inputCls + ' resize-none'}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-[12px] text-red-400 hover:text-red-300"
              >
                Supprimer la caméra
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                {mode === 'create' ? <Plus size={14} /> : <Save size={14} />}
                {mode === 'create' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
