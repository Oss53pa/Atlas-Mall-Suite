// ═══ VOL.1 — Gestion des Preneurs (F1.3) ═══

import React, { useState, useMemo } from 'react'
import { Search, Users, Calendar, DollarSign, Phone, Mail, ChevronDown, ChevronUp, Filter, BarChart2 } from 'lucide-react'
import { useVol1Store } from '../store/vol1Store'
import type { Tenant, TenantStatus, Sector } from '../store/vol1Types'
import GanttChart, { type GanttTask } from '../../shared/components/GanttChart'

const statusConfig: Record<TenantStatus, { color: string; label: string }> = {
  actif: { color: '#22c55e', label: 'Actif' },
  en_negociation: { color: '#f59e0b', label: 'En negociation' },
  en_contentieux: { color: '#ef4444', label: 'En contentieux' },
  sortant: { color: '#6b7280', label: 'Sortant' },
}

const sectorLabels: Record<Sector, string> = {
  mode: 'Mode', restauration: 'Restauration', services: 'Services', loisirs: 'Loisirs',
  alimentaire: 'Alimentaire', beaute: 'Beauté', electronique: 'Electronique', bijouterie: 'Bijouterie',
  banque: 'Banque', sante: 'Santé', enfants: 'Enfants', maison: 'Maison', sport: 'Sport',
}

const formatFcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export default function TenantsSection() {
  const tenants = useVol1Store(s => s.tenants)
  const spaces = useVol1Store(s => s.spaces)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'all'>('all')
  const [sectorFilter, setSectorFilter] = useState<Sector | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return tenants.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (sectorFilter !== 'all' && t.sector !== sectorFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return t.brandName.toLowerCase().includes(q) || t.companyName.toLowerCase().includes(q) || t.contact.name.toLowerCase().includes(q)
      }
      return true
    })
  }, [tenants, search, statusFilter, sectorFilter])

  const getSpaceForTenant = (tenantId: string) => spaces.find(s => s.tenantId === tenantId)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 1 — PLAN COMMERCIAL</p>
        <h1 className="text-[28px] font-light text-white mb-2">Gestion des Preneurs</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>{tenants.length} preneurs references — fiches completes, baux et contacts.</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-lg px-3 py-2" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <Search size={14} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher enseigne, societe, contact..."
            className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-slate-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TenantStatus | 'all')}
            className="text-[11px] bg-[#141e2e] text-slate-300 border border-[#1e2a3a] rounded px-2 py-1 outline-none"
          >
            <option value="all">Tous statuts</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value as Sector | 'all')}
            className="text-[11px] bg-[#141e2e] text-slate-300 border border-[#1e2a3a] rounded px-2 py-1 outline-none"
          >
            <option value="all">Tous secteurs</option>
            {Object.entries(sectorLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Tenant cards */}
      <div className="space-y-3">
        {filtered.map((t) => {
          const isOpen = expanded === t.id
          const space = getSpaceForTenant(t.id)
          const sCfg = statusConfig[t.status]
          const daysToEnd = Math.floor((new Date(t.leaseEnd).getTime() - Date.now()) / 86_400_000)

          return (
            <div key={t.id} className="rounded-xl overflow-hidden" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <button onClick={() => setExpanded(isOpen ? null : t.id)} className="w-full flex items-center gap-4 p-4 text-left">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold text-[13px]" style={{ background: `${sCfg.color}20`, border: `1px solid ${sCfg.color}40` }}>
                  {t.brandName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-white">{t.brandName}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${sCfg.color}15`, color: sCfg.color }}>{sCfg.label}</span>
                  </div>
                  <p className="text-[11px]" style={{ color: '#4a5568' }}>{t.companyName} · {sectorLabels[t.sector]} {space ? `· ${space.reference}` : ''}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-[11px]">
                  {space && <span className="text-slate-400">{space.areaSqm} m²</span>}
                  <span style={{ color: daysToEnd <= 90 ? '#ef4444' : '#4a5568' }}>{daysToEnd > 0 ? `${daysToEnd}j restants` : 'Expiré'}</span>
                  {isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t grid grid-cols-2 gap-4" style={{ borderColor: '#1e2a3a' }}>
                  {/* Contact */}
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-slate-500 mb-2">CONTACT</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[12px] text-slate-300">
                        <Users size={12} className="text-slate-500" />
                        {t.contact.name}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-slate-300">
                        <Mail size={12} className="text-slate-500" />
                        {t.contact.email}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-slate-300">
                        <Phone size={12} className="text-slate-500" />
                        {t.contact.phone}
                      </div>
                    </div>
                  </div>
                  {/* Bail */}
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-slate-500 mb-2">BAIL</p>
                    <div className="space-y-1 text-[12px] text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-slate-500" />
                        {t.leaseStart} → {t.leaseEnd}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={12} className="text-slate-500" />
                        Loyer : {formatFcfa(t.baseRentFcfa)} FCFA/m²/an
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={12} className="text-slate-500" />
                        Charges : {formatFcfa(t.serviceCharges)} FCFA/m²/an
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={12} className="text-slate-500" />
                        Depot : {formatFcfa(t.depositFcfa)} FCFA
                      </div>
                      {space && (
                        <div className="text-[11px] mt-1" style={{ color: '#f59e0b' }}>
                          Loyer annuel total : {formatFcfa(t.baseRentFcfa * space.areaSqm)} FCFA
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-slate-500 py-8 text-[13px]">Aucun preneur ne correspond aux filtres.</p>
        )}
      </div>

      {/* Lease Timeline Gantt */}
      <LeaseTimeline tenants={filtered} statusConfig={statusConfig} />
    </div>
  )
}

// ── Lease Timeline sub-component ─────────────────────────────

function LeaseTimeline({ tenants, statusConfig }: { tenants: Tenant[]; statusConfig: Record<TenantStatus, { color: string; label: string }> }) {
  const [showGantt, setShowGantt] = useState(false)

  const ganttTasks: GanttTask[] = useMemo(() => {
    return tenants
      .filter(t => t.leaseStart && t.leaseEnd)
      .map(t => {
        const now = Date.now()
        const start = new Date(t.leaseStart).getTime()
        const end = new Date(t.leaseEnd).getTime()
        const total = end - start
        const elapsed = Math.max(0, now - start)
        const progress = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0

        return {
          id: t.id,
          label: t.brandName,
          startDate: t.leaseStart,
          endDate: t.leaseEnd,
          progress,
          color: statusConfig[t.status]?.color ?? '#6b7280',
          group: t.sector,
        }
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [tenants, statusConfig])

  if (tenants.length === 0) return null

  return (
    <div className="rounded-xl border" style={{ background: '#0b1120', borderColor: '#1e2a3a' }}>
      <button
        onClick={() => setShowGantt(!showGantt)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <BarChart2 size={14} style={{ color: '#f59e0b' }} />
        <span className="text-[12px] font-medium text-white flex-1">Timeline des baux</span>
        <span className="text-[10px] text-slate-500">{ganttTasks.length} baux</span>
        {showGantt ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      {showGantt && (
        <div className="px-4 pb-4 overflow-x-auto">
          <GanttChart tasks={ganttTasks} todayLine height={ganttTasks.length * 32 + 80} />
        </div>
      )}
    </div>
  )
}
