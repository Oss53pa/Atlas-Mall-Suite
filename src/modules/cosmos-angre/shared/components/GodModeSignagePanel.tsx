// ═══ GOD MODE SIGNAGE PANEL — UI de pilotage de la signalétique ═══
//
// Module unifié pour :
//   • Gérer les campagnes publicitaires (CRUD)
//   • Lancer la génération automatique du plan complet (institutionnel + pub)
//   • Visualiser le résultat (liste + carte)
//   • Filtrer par famille institutionnelle vs publicitaire
//   • Consulter les conflits et les alertes
//   • Exporter le plan de signalétique (JSON)

import React, { useMemo, useState } from 'react'
import {
  Sparkles, Megaphone, Signpost, AlertTriangle, Download, Plus, Trash2,
  Building2, Briefcase, Monitor, Wand2, CheckCircle2, Layers, Ruler,
} from 'lucide-react'
import { useAdvertisingCampaignStore } from '../stores/advertisingCampaignStore'
import {
  computeGodModeSignagePlan, exportSignagePlan,
  type GodModeInput, type GodModeResult, type GodModeSignagePlacement,
  type AdvertisingCampaign, type SignageFamily,
} from '../engines/godModeSignageEngine'

interface Props {
  /** Input préparé par le volume hôte (Vol.3 ou Vol.4). */
  buildInput: () => GodModeInput
  /** Couleur du volume (thème). */
  volumeColor?: string
  /** Callback quand le plan est généré. */
  onPlanGenerated?: (result: GodModeResult) => void
}

export default function GodModeSignagePanel({ buildInput, volumeColor = '#b38a5a', onPlanGenerated }: Props) {
  const campaigns = useAdvertisingCampaignStore((s) => s.campaigns)
  const addCampaign = useAdvertisingCampaignStore((s) => s.addCampaign)
  const updateCampaign = useAdvertisingCampaignStore((s) => s.updateCampaign)
  const deleteCampaign = useAdvertisingCampaignStore((s) => s.deleteCampaign)

  const [result, setResult] = useState<GodModeResult | null>(null)
  const [filter, setFilter] = useState<SignageFamily | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [computing, setComputing] = useState(false)

  const activeCampaigns = useMemo(() => {
    const now = new Date().toISOString()
    return campaigns.filter(c => c.startDate <= now && c.endDate >= now)
  }, [campaigns])

  const handleCompute = () => {
    setComputing(true)
    setTimeout(() => {
      try {
        const input = buildInput()
        const r = computeGodModeSignagePlan({
          ...input,
          activeCampaigns,
        })
        setResult(r)
        onPlanGenerated?.(r)
      } finally {
        setComputing(false)
      }
    }, 50) // laisse l'UI afficher le loader
  }

  const handleExport = () => {
    if (!result) return
    const exp = exportSignagePlan(result)
    const blob = new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `signage-plan-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredPlacements = useMemo(() => {
    if (!result) return []
    if (filter === 'all') return result.placements
    return result.placements.filter(p => p.family === filter)
  }, [result, filter])

  const selectedPlacement = result?.placements.find(p => p.id === selectedId) ?? null

  return (
    <div className="flex flex-col h-full bg-surface-0 text-slate-200">
      {/* Header */}
      <div className="border-b border-white/[0.06] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `${volumeColor}18`, border: `1px solid ${volumeColor}40` }}>
              <Sparkles size={16} style={{ color: volumeColor }} />
            </div>
            <div>
              <h2 className="text-white text-sm font-semibold flex items-center gap-2">
                GOD MODE Signalétique
                <span className="text-[9px] font-bold bg-atlas-600/20 text-atlas-300 px-2 py-0.5 rounded uppercase tracking-wider">
                  PROPH3T
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Institutionnel ⟂ publicitaire · dimensions auto · règles de cohabitation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCompute}
              disabled={computing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlas-500/15 border border-atlas-500/40 text-atlas-300 text-[11px] hover:bg-atlas-500/25 disabled:opacity-40"
            >
              <Wand2 size={12} />
              {computing ? 'Calcul…' : 'Générer le plan'}
            </button>
            {result && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/[0.06] text-[11px] text-slate-300 hover:bg-slate-700"
              >
                <Download size={12} />
                Exporter JSON
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Split : Campagnes | Plan généré */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-0">

        {/* ─── Panel campagnes ─── */}
        <aside className="lg:col-span-4 border-r border-white/[0.06] overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-[12px] font-semibold flex items-center gap-1.5">
              <Megaphone size={12} />
              Campagnes publicitaires
            </h3>
            <span className="text-[10px] text-slate-500">
              {activeCampaigns.length} active{activeCampaigns.length > 1 ? 's' : ''} · {campaigns.length} total
            </span>
          </div>

          <CampaignForm onAdd={addCampaign} />

          {campaigns.length === 0 ? (
            <div className="mt-3 rounded-lg bg-surface-1/30 border border-dashed border-white/[0.06] p-6 text-center text-[11px] text-slate-500">
              Aucune campagne enregistrée
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {campaigns.map(c => (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  onUpdate={(patch) => updateCampaign(c.id, patch)}
                  onDelete={() => deleteCampaign(c.id)}
                />
              ))}
            </ul>
          )}
        </aside>

        {/* ─── Panel résultat ─── */}
        <main className="lg:col-span-8 flex flex-col overflow-hidden">

          {/* Filtres + stats */}
          {result && (
            <div className="p-4 border-b border-white/[0.06] bg-surface-1/30">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  {(['all', 'institutional', 'advertising'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-medium border transition ${
                        filter === f
                          ? f === 'institutional' ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                            : f === 'advertising' ? 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                            : 'bg-atlas-500/15 border-atlas-500/30 text-atlas-300'
                          : 'bg-surface-1 border-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'all' ? 'Tous' : f === 'institutional' ? 'Institutionnel' : 'Publicitaire'}
                    </button>
                  ))}
                </div>

                <div className="h-5 w-px bg-white/[0.08]" />

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <Stat icon={<Signpost size={10} />} label="Institutionnel" value={result.summary.institutionalCount} color="#38bdf8" />
                  <Stat icon={<Megaphone size={10} />} label="Publicitaire" value={result.summary.advertisingCount} color="#f472b6" />
                  <Stat icon={<CheckCircle2 size={10} />} label="Visibilité moy." value={`${(result.summary.avgVisibility * 100).toFixed(0)}%`} color="#34d399" />
                  {result.summary.totalConflicts > 0 && (
                    <Stat icon={<AlertTriangle size={10} />} label="Conflits" value={result.summary.totalConflicts} color="#f87171" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Liste des placements */}
          <div className="flex-1 overflow-y-auto p-4">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Layers size={40} strokeWidth={1.3} />
                <p className="text-[13px] mt-3">Aucun plan généré</p>
                <p className="text-[11px] mt-1">Cliquez sur « Générer le plan » pour lancer l'analyse PROPH3T</p>
              </div>
            ) : filteredPlacements.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-[12px]">
                Aucun panneau pour ce filtre.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPlacements.map(p => (
                  <PlacementRow
                    key={p.id}
                    placement={p}
                    selected={selectedId === p.id}
                    onSelect={() => setSelectedId(p.id === selectedId ? null : p.id)}
                  />
                ))}
              </div>
            )}

            {/* Détails du panneau sélectionné */}
            {selectedPlacement && (
              <div className="mt-4 rounded-lg border border-atlas-500/30 bg-atlas-500/[0.05] p-4">
                <h4 className="text-white text-[13px] font-semibold flex items-center gap-2 mb-2">
                  <Sparkles size={12} className="text-atlas-400" />
                  Justification PROPH3T
                </h4>
                <p className="text-[12px] text-slate-300 leading-relaxed">{selectedPlacement.rationale}</p>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-400">
                  <div><strong className="text-slate-300">Support :</strong> {selectedPlacement.support}</div>
                  <div><strong className="text-slate-300">Dimensions :</strong> {selectedPlacement.dimensions.widthM.toFixed(2)}×{selectedPlacement.dimensions.heightM.toFixed(2)} m</div>
                  <div><strong className="text-slate-300">Hauteur texte :</strong> {selectedPlacement.dimensions.textHeightMm} mm</div>
                  <div><strong className="text-slate-300">Lecture à :</strong> {selectedPlacement.maxReadingDistanceM} m</div>
                  <div><strong className="text-slate-300">Position :</strong> ({selectedPlacement.x.toFixed(1)}, {selectedPlacement.y.toFixed(1)})</div>
                  <div><strong className="text-slate-300">Flux attendu :</strong> {selectedPlacement.expectedFootfall.toFixed(0)} pax/h</div>
                </div>

                {selectedPlacement.conflicts.length > 0 && (
                  <div className="mt-3 rounded bg-red-500/10 border border-red-500/30 p-2 text-[11px] text-red-300">
                    <div className="flex items-center gap-1 font-semibold mb-1">
                      <AlertTriangle size={11} /> Conflits détectés ({selectedPlacement.conflicts.length})
                    </div>
                    <ul className="space-y-0.5 text-red-200/90">
                      {selectedPlacement.conflicts.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Warnings globaux */}
            {result && result.warnings.length > 0 && (
              <div className="mt-4 rounded-lg bg-amber-500/[0.08] border border-amber-500/25 p-3">
                <h4 className="text-amber-300 text-[12px] font-semibold flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle size={11} />
                  Avertissements
                </h4>
                <ul className="space-y-1 text-[11px] text-amber-200/90">
                  {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ─── Campaign form ────────────────────────────────────────

function CampaignForm({ onAdd }: { onAdd: (c: Omit<AdvertisingCampaign, 'id'>) => string }) {
  const [form, setForm] = useState<Partial<AdvertisingCampaign>>({
    priority: 3, requestedPanels: 2, category: 'mode',
  })

  const submit = () => {
    if (!form.advertiser || !form.title || !form.startDate || !form.endDate) return
    onAdd({
      advertiser: form.advertiser,
      title: form.title,
      category: form.category ?? 'mode',
      priority: form.priority ?? 3,
      startDate: form.startDate,
      endDate: form.endDate,
      requestedPanels: form.requestedPanels ?? 1,
      budgetFcfa: form.budgetFcfa,
    })
    setForm({ priority: 3, requestedPanels: 2, category: 'mode' })
  }

  return (
    <div className="rounded-lg bg-surface-1/40 border border-white/[0.05] p-3 space-y-2">
      <div className="text-[11px] font-semibold text-slate-300 mb-1">Nouvelle campagne</div>
      <input
        placeholder="Annonceur"
        value={form.advertiser ?? ''}
        onChange={e => setForm({ ...form, advertiser: e.target.value })}
        className="w-full px-2 py-1 rounded bg-surface-0 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600"
      />
      <input
        placeholder="Titre (ex : Soldes été 2026)"
        value={form.title ?? ''}
        onChange={e => setForm({ ...form, title: e.target.value })}
        className="w-full px-2 py-1 rounded bg-surface-0 border border-white/[0.06] text-[11px] text-white placeholder:text-slate-600"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={form.startDate ?? ''}
          onChange={e => setForm({ ...form, startDate: e.target.value })}
          className="px-2 py-1 rounded bg-surface-0 border border-white/[0.06] text-[11px] text-white"
        />
        <input
          type="date"
          value={form.endDate ?? ''}
          onChange={e => setForm({ ...form, endDate: e.target.value })}
          className="px-2 py-1 rounded bg-surface-0 border border-white/[0.06] text-[11px] text-white"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={form.category ?? 'mode'}
          onChange={e => setForm({ ...form, category: e.target.value })}
          className="px-2 py-1 rounded bg-surface-0 border border-white/[0.06] text-[11px] text-white"
        >
          {['mode', 'restauration', 'tech', 'loisirs', 'beaute', 'sante'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="number" min="1" max="10" placeholder="Panneaux"
          value={form.requestedPanels ?? 2}
          onChange={e => setForm({ ...form, requestedPanels: parseInt(e.target.value) || 1 })}
          className="px-2 py-1 rounded bg-surface-0 border border-white/[0.06] text-[11px] text-white"
        />
        <select
          value={form.priority ?? 3}
          onChange={e => setForm({ ...form, priority: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
          className="px-2 py-1 rounded bg-surface-0 border border-white/[0.06] text-[11px] text-white"
        >
          {[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>Prio {p}</option>)}
        </select>
      </div>
      <button
        onClick={submit}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] hover:bg-emerald-500/25"
      >
        <Plus size={11} />
        Ajouter
      </button>
    </div>
  )
}

// ─── Campaign row ─────────────────────────────────────────

function CampaignRow({
  campaign, onUpdate, onDelete,
}: {
  campaign: AdvertisingCampaign
  onUpdate: (patch: Partial<AdvertisingCampaign>) => void
  onDelete: () => void
}) {
  const now = new Date().toISOString()
  const active = campaign.startDate <= now && campaign.endDate >= now

  return (
    <li className={`rounded-lg border p-2.5 ${active ? 'border-emerald-500/25 bg-emerald-500/[0.05]' : 'border-white/[0.05] bg-surface-1/30'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-white truncate">{campaign.title}</span>
            {active && (
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded uppercase tracking-wider">
                live
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {campaign.advertiser} · {campaign.category} · prio {campaign.priority} · {campaign.requestedPanels} panneau{campaign.requestedPanels > 1 ? 'x' : ''}
          </div>
          <div className="text-[9px] text-slate-600 mt-1">
            {campaign.startDate} → {campaign.endDate}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-slate-600 hover:text-red-400 p-1"
          title="Supprimer"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </li>
  )
}

// ─── Placement row ───────────────────────────────────────

function PlacementRow({
  placement, selected, onSelect,
}: {
  placement: GodModeSignagePlacement
  selected: boolean
  onSelect: () => void
}) {
  const familyColor = placement.family === 'institutional' ? '#38bdf8' : '#f472b6'
  const familyIcon = placement.family === 'institutional' ? <Signpost size={12} /> : <Megaphone size={12} />
  const hasConflict = placement.conflicts.length > 0

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-2.5 transition ${
        selected ? 'border-white/20 bg-surface-1/70' : 'border-white/[0.05] bg-surface-1/30 hover:border-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-8 h-8 rounded flex items-center justify-center"
          style={{ background: `${familyColor}18`, color: familyColor, border: `1px solid ${familyColor}30` }}
        >
          {familyIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-semibold text-white">{placement.id}</span>
            <span className="text-[9px] text-slate-500">{placement.support}</span>
            {hasConflict && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">
                <AlertTriangle size={9} /> {placement.conflicts.length}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-300 truncate">{placement.content}</div>
          <div className="flex items-center gap-2 text-[9px] text-slate-600 mt-0.5">
            <Ruler size={8} />
            {placement.dimensions.widthM.toFixed(1)}×{placement.dimensions.heightM.toFixed(1)}m
            <span>·</span>
            lisible à {placement.maxReadingDistanceM}m
            <span>·</span>
            vis. {(placement.visibilityScore * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Stat chip ────────────────────────────────────────────

function Stat({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color }}>{icon}</span>
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  )
}
