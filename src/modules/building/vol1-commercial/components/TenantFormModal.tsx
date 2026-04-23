// ═══ TENANT FORM MODAL — Planification des enseignes ═══

import React, { useState } from 'react'
import { X, Plus, UserPlus } from 'lucide-react'
import { useVol1Store } from '../store/vol1Store'
import type { Tenant, Sector } from '../store/vol1Types'
import { SECTOR_LABELS } from '../../shared/constants/sectorConfig'

interface Props {
  mode: 'create' | 'edit'
  tenant?: Tenant
  cellId?: string
  onClose: () => void
}

const SECTORS = Object.entries(SECTOR_LABELS) as [Sector, string][]

export default function TenantFormModal({ mode, tenant, cellId, onClose }: Props) {
  const spaces = useVol1Store(s => s.spaces)
  const addTenant = useVol1Store(s => s.addTenant)
  const updateTenant = useVol1Store(s => s.updateTenant)
  const assignTenant = useVol1Store(s => s.assignTenant)

  const vacantSpaces = spaces.filter(s => s.status === 'vacant')

  const [form, setForm] = useState({
    brandName: tenant?.brandName ?? '',
    companyName: tenant?.companyName ?? '',
    sector: (tenant?.sector ?? 'mode') as Sector,
    contactName: tenant?.contact.name ?? '',
    contactEmail: tenant?.contact.email ?? '',
    contactPhone: tenant?.contact.phone ?? '',
    baseRentFcfa: tenant?.baseRentFcfa ?? 18000,
    serviceCharges: tenant?.serviceCharges ?? 3500,
    depositFcfa: tenant?.depositFcfa ?? 5000000,
    leaseStart: tenant?.leaseStart ?? '2026-10-01',
    leaseEnd: tenant?.leaseEnd ?? '2032-09-30',
    status: (tenant?.status ?? 'en_negociation') as Tenant['status'],
    targetCellId: cellId ?? '',
  })

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brandName.trim()) return

    if (mode === 'create') {
      const id = `t-${Date.now()}`
      const newTenant: Tenant = {
        id,
        brandName: form.brandName,
        companyName: form.companyName || form.brandName,
        sector: form.sector,
        contact: { name: form.contactName, email: form.contactEmail, phone: form.contactPhone },
        baseRentFcfa: form.baseRentFcfa,
        serviceCharges: form.serviceCharges,
        depositFcfa: form.depositFcfa,
        leaseStart: form.leaseStart,
        leaseEnd: form.leaseEnd,
        status: form.status,
      }
      addTenant(newTenant)
      if (form.targetCellId) {
        assignTenant(form.targetCellId, id)
      }
    } else if (tenant) {
      updateTenant(tenant.id, {
        brandName: form.brandName,
        companyName: form.companyName,
        sector: form.sector,
        contact: { name: form.contactName, email: form.contactEmail, phone: form.contactPhone },
        baseRentFcfa: form.baseRentFcfa,
        serviceCharges: form.serviceCharges,
        depositFcfa: form.depositFcfa,
        leaseStart: form.leaseStart,
        leaseEnd: form.leaseEnd,
        status: form.status,
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] overflow-hidden" style={{ background: '#262a31' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-amber-400" />
            <h2 className="text-white font-semibold">{mode === 'create' ? 'Planifier une enseigne' : 'Modifier l\'enseigne'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Enseigne */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Nom enseigne *</label>
              <input value={form.brandName} onChange={e => set('brandName', e.target.value)} placeholder="Ex: Zara"
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none focus:border-amber-500/50 placeholder:text-gray-600" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Société</label>
              <input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Zara CI SARL"
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none placeholder:text-gray-600" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Secteur</label>
              <select value={form.sector} onChange={e => set('sector', e.target.value)}
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none">
                {SECTORS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Statut</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none">
                <option value="en_negociation">En négociation</option>
                <option value="actif">Confirmé / Signé</option>
                <option value="sortant">Sortant</option>
              </select>
            </div>
          </div>

          {/* Cellule cible */}
          {mode === 'create' && (
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Assigner à une cellule</label>
              <select value={form.targetCellId} onChange={e => set('targetCellId', e.target.value)}
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none">
                <option value="">— Non assigné —</option>
                {vacantSpaces.map(s => (
                  <option key={s.id} value={s.id}>{s.reference} — {s.areaSqm} m² — {s.wing} ({s.floorLevel})</option>
                ))}
              </select>
            </div>
          )}

          {/* Contact */}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Contact commercial</p>
            <div className="grid grid-cols-3 gap-3">
              <input value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Nom"
                className="bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none placeholder:text-gray-600" />
              <input value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="Email" type="email"
                className="bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none placeholder:text-gray-600" />
              <input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+225 07..."
                className="bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none placeholder:text-gray-600" />
            </div>
          </div>

          {/* Financier */}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Conditions financières</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Loyer cible (FCFA/m²/an)</label>
                <input type="number" value={form.baseRentFcfa} onChange={e => set('baseRentFcfa', +e.target.value)}
                  className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Charges (FCFA/m²/an)</label>
                <input type="number" value={form.serviceCharges} onChange={e => set('serviceCharges', +e.target.value)}
                  className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Dépôt (FCFA)</label>
                <input type="number" value={form.depositFcfa} onChange={e => set('depositFcfa', +e.target.value)}
                  className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none" />
              </div>
            </div>
          </div>

          {/* Dates bail */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Début bail prévu</label>
              <input type="date" value={form.leaseStart} onChange={e => set('leaseStart', e.target.value)}
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Fin bail prévue</label>
              <input type="date" value={form.leaseEnd} onChange={e => set('leaseEnd', e.target.value)}
                className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.04]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Annuler</button>
            <button type="submit"
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors">
              <Plus size={14} /> {mode === 'create' ? 'Planifier' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
