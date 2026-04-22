// ═══ SPACE FORM MODAL — Création / édition d'une cellule commerciale ═══

import React, { useState } from 'react'
import { X, Plus, Save, Building2 } from 'lucide-react'
import { useVol1Store } from '../store/vol1Store'
import type { CommercialSpace, SpaceStatus } from '../store/vol1Types'

interface Props {
  mode: 'create' | 'edit'
  space?: CommercialSpace
  defaultFloorId?: string
  onClose: () => void
}

const FLOORS: { id: string; level: string; label: string }[] = [
  { id: 'floor-b1', level: 'B1', label: 'B1 — Sous-sol' },
  { id: 'floor-rdc', level: 'RDC', label: 'RDC — Rez-de-chaussée' },
  { id: 'floor-r1', level: 'R+1', label: 'R+1 — Étage 1' },
]

const STATUS_OPTIONS: { value: SpaceStatus; label: string }[] = [
  { value: 'vacant', label: 'Vacante' },
  { value: 'occupied', label: 'Occupée' },
  { value: 'reserved', label: 'Réservée' },
  { value: 'under_works', label: 'En travaux' },
]

export default function SpaceFormModal({ mode, space, defaultFloorId, onClose }: Props) {
  const addSpace = useVol1Store(s => s.addSpace)
  const updateSpace = useVol1Store(s => s.updateSpace)
  const deleteSpace = useVol1Store(s => s.deleteSpace)

  const initFloor = space?.floorId ?? defaultFloorId ?? 'floor-rdc'
  const initLevel = FLOORS.find(f => f.id === initFloor)?.level ?? 'RDC'

  const [form, setForm] = useState({
    reference: space?.reference ?? '',
    floorId: initFloor,
    floorLevel: space?.floorLevel ?? initLevel,
    wing: space?.wing ?? '',
    areaSqm: space?.areaSqm ?? 100,
    status: (space?.status ?? 'vacant') as SpaceStatus,
    x: space?.x ?? 0,
    y: space?.y ?? 0,
    w: space?.w ?? 20,
    h: space?.h ?? 15,
  })

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reference.trim()) return

    const floor = FLOORS.find(f => f.id === form.floorId)!

    if (mode === 'create') {
      const newSpace: CommercialSpace = {
        id: `s-${Date.now()}`,
        reference: form.reference,
        floorId: form.floorId,
        floorLevel: floor.level,
        x: form.x,
        y: form.y,
        w: form.w,
        h: form.h,
        areaSqm: form.areaSqm,
        status: form.status,
        tenantId: null,
        wing: form.wing,
      }
      addSpace(newSpace)
    } else if (space) {
      updateSpace(space.id, {
        reference: form.reference,
        floorId: form.floorId,
        floorLevel: floor.level,
        x: form.x,
        y: form.y,
        w: form.w,
        h: form.h,
        areaSqm: form.areaSqm,
        status: form.status,
        wing: form.wing,
      })
    }
    onClose()
  }

  const handleDelete = () => {
    if (!space) return
    if (confirm(`Supprimer la cellule ${space.reference} ?`)) {
      deleteSpace(space.id)
      onClose()
    }
  }

  const inputCls =
    'w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none focus:border-amber-500/50 placeholder:text-gray-600'
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
            <Building2 size={16} className="text-amber-400" />
            <h2 className="text-white font-semibold">
              {mode === 'create' ? 'Nouvelle cellule commerciale' : `Modifier ${space?.reference ?? ''}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Référence *</label>
              <input
                value={form.reference}
                onChange={e => set('reference', e.target.value)}
                placeholder="Ex: RDC-A01"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Aile / Zone</label>
              <input
                value={form.wing}
                onChange={e => set('wing', e.target.value)}
                placeholder="Ex: Galerie Ouest"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Étage</label>
              <select
                value={form.floorId}
                onChange={e => set('floorId', e.target.value)}
                className={inputCls}
              >
                {FLOORS.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as SpaceStatus)}
                className={inputCls}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Surface (m²)</label>
            <input
              type="number"
              min={0}
              value={form.areaSqm}
              onChange={e => set('areaSqm', Math.max(0, parseFloat(e.target.value) || 0))}
              className={inputCls}
            />
          </div>

          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">
              Position sur le plan (facultatif — renseigné automatiquement via import DXF)
            </p>
            <div className="grid grid-cols-4 gap-3">
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
                <label className={labelCls}>Largeur</label>
                <input
                  type="number"
                  value={form.w}
                  onChange={e => set('w', parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Hauteur</label>
                <input
                  type="number"
                  value={form.h}
                  onChange={e => set('h', parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-[12px] text-red-400 hover:text-red-300"
              >
                Supprimer la cellule
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
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
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
