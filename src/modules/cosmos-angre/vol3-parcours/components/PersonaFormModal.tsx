// ═══ PERSONA FORM MODAL — Création / édition d'un profil visiteur ═══

import React, { useState } from 'react'
import { X, Plus, Save, User } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'
import type { VisitorProfile, POIType } from '../../shared/proph3t/types'

interface Props {
  mode: 'create' | 'edit'
  profile?: VisitorProfile
  onClose: () => void
}

const POI_TYPES: POIType[] = [
  'enseigne', 'sortie', 'sortie_secours', 'toilettes', 'ascenseur',
  'escalator', 'parking', 'cosmos_club', 'restauration', 'totem',
  'caisse', 'service_client', 'pharmacie', 'banque', 'hotel',
]

export default function PersonaFormModal({ mode, profile, onClose }: Props) {
  const addProfile = useVol3Store(s => s.addProfile)
  const updateProfile = useVol3Store(s => s.updateProfile)
  const deleteProfile = useVol3Store(s => s.deleteProfile)

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    speed: profile?.speed ?? 1.2,
    pmrRequired: profile?.pmrRequired ?? false,
    dwellMultiplier: profile?.dwellMultiplier ?? 1.0,
    attractors: profile?.attractors ?? [],
  })

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const toggleAttractor = (t: POIType) => {
    setForm(f => ({
      ...f,
      attractors: f.attractors.includes(t)
        ? f.attractors.filter(a => a !== t)
        : [...f.attractors, t],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    if (mode === 'create') {
      const newProfile: VisitorProfile = {
        id: `persona-${Date.now()}`,
        name: form.name,
        speed: form.speed,
        pmrRequired: form.pmrRequired,
        dwellMultiplier: form.dwellMultiplier,
        attractors: form.attractors,
      }
      addProfile(newProfile)
    } else if (profile) {
      updateProfile(profile.id, {
        name: form.name,
        speed: form.speed,
        pmrRequired: form.pmrRequired,
        dwellMultiplier: form.dwellMultiplier,
        attractors: form.attractors,
      })
    }
    onClose()
  }

  const handleDelete = () => {
    if (!profile) return
    if (confirm(`Supprimer le persona ${profile.name} ?`)) {
      deleteProfile(profile.id)
      onClose()
    }
  }

  const inputCls =
    'w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none focus:border-violet-500/50 placeholder:text-gray-600'
  const labelCls = 'text-[11px] text-gray-500 mb-1 block'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: '#0e1629' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <User size={16} className="text-violet-400" />
            <h2 className="text-white font-semibold">
              {mode === 'create' ? 'Nouveau persona' : `Modifier ${profile?.name ?? ''}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className={labelCls}>Nom *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Famille CSP+, Jeune professionnel…"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Vitesse (m/s)</label>
              <input
                type="number"
                step="0.1"
                min={0.1}
                value={form.speed}
                onChange={e => set('speed', parseFloat(e.target.value) || 1)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Dwell × (multiplicateur)</label>
              <input
                type="number"
                step="0.1"
                min={0.1}
                value={form.dwellMultiplier}
                onChange={e => set('dwellMultiplier', parseFloat(e.target.value) || 1)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>PMR requis</label>
              <select
                value={form.pmrRequired ? 'oui' : 'non'}
                onChange={e => set('pmrRequired', e.target.value === 'oui')}
                className={inputCls}
              >
                <option value="non">Non</option>
                <option value="oui">Oui</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Points d'intérêt attracteurs</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {POI_TYPES.map(t => {
                const active = form.attractors.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleAttractor(t)}
                    className="text-[10px] px-2 py-1 rounded-full border transition-colors"
                    style={{
                      background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                      borderColor: active ? 'rgba(139,92,246,0.4)' : '#1e2a3a',
                      color: active ? '#a78bfa' : '#64748b',
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-[12px] text-red-400 hover:text-red-300"
              >
                Supprimer le persona
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
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
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
