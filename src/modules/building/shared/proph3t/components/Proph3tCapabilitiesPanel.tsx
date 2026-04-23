// ═══ PROPH3T Capabilities Panel — Matrice visible dans l'app ═══
//
// Affiche la matrice complète des compétences Proph3t par volume × axe :
//   LEARN · PREDICT · SUGGEST · RECOMMEND
//
// Utilisable :
//   • dans Settings (onglet IA)
//   • dans chaque volume pour montrer "voici ce que je sais faire ici"
//   • dans le rapport consolidé

import { useMemo, useState } from 'react'
import {
  Sparkles, Brain, TrendingUp, Lightbulb, Target, CheckCircle2,
  BookOpen, Building2, ShieldCheck, Route, Navigation, Globe2,
  Filter,
} from 'lucide-react'
import {
  PROPH3T_CAPABILITIES, capabilitiesByVolume, summarizeVolumeCapabilities,
  coverageGlobalPct,
  type VolumeId, type CapabilityAxis, type Proph3tCapability,
} from '../capabilities'

const AXIS_META: Record<CapabilityAxis, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  learn:     { label: 'Apprend',    icon: Brain,       color: '#b38a5a' },
  predict:   { label: 'Prédit',     icon: TrendingUp,  color: '#c9a068' },
  suggest:   { label: 'Suggère',    icon: Lightbulb,   color: '#d4b280' },
  recommend: { label: 'Recommande', icon: Target,      color: '#a77d4c' },
}

const VOLUME_META: Record<VolumeId, { label: string; icon: React.ComponentType<{ size?: number }>; color: string; slug: string }> = {
  vol1:       { label: 'Vol.1 · Commercial',   icon: Building2,  color: '#f59e0b', slug: 'vol1' },
  vol2:       { label: 'Vol.2 · Sécurité',     icon: ShieldCheck,color: '#38bdf8', slug: 'vol2' },
  vol3:       { label: 'Vol.3 · Parcours',     icon: Route,      color: '#34d399', slug: 'vol3' },
  vol4:       { label: 'Vol.4 · Wayfinder',    icon: Navigation, color: '#0ea5e9', slug: 'vol4' },
  transverse: { label: 'Transverse',           icon: Globe2,     color: '#b38a5a', slug: 'all' },
}

interface Props {
  /** Filtre initial sur un volume spécifique. */
  initialVolume?: VolumeId | 'all'
  /** Mode compact (pour affichage in-volume). */
  compact?: boolean
}

export default function Proph3tCapabilitiesPanel({ initialVolume = 'all', compact = false }: Props) {
  const [volumeFilter, setVolumeFilter] = useState<VolumeId | 'all'>(initialVolume)
  const [axisFilter, setAxisFilter] = useState<CapabilityAxis | 'all'>('all')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let caps: Proph3tCapability[] = PROPH3T_CAPABILITIES
    if (volumeFilter !== 'all') caps = caps.filter(c => c.volume === volumeFilter)
    if (axisFilter !== 'all') caps = caps.filter(c => c.axis === axisFilter)
    return caps
  }, [volumeFilter, axisFilter])

  const selectedCap = filtered.find(c => c.id === selected) ?? null
  const globalCoverage = useMemo(() => coverageGlobalPct(), [])

  // Summary grid par volume (4 volumes × 4 axes)
  const volumes: VolumeId[] = ['vol1', 'vol2', 'vol3', 'vol4']
  const axes: CapabilityAxis[] = ['learn', 'predict', 'suggest', 'recommend']

  return (
    <div className="flex flex-col h-full bg-surface-0 text-slate-200">
      {/* Header */}
      <div className="border-b border-white/[0.06] p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-atlas-500/15 border border-atlas-500/30 flex items-center justify-center">
              <Sparkles size={18} className="text-atlas-400" />
            </div>
            <div>
              <h2 className="text-white text-sm font-semibold">Compétences PROPH3T</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Matrice exhaustive · {PROPH3T_CAPABILITIES.length} capacités · Couverture {globalCoverage.toFixed(0)} %
              </p>
            </div>
          </div>
          {!compact && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 size={10} />
              16/16 axes couverts
            </div>
          )}
        </div>

        {/* Summary grid compacte */}
        {!compact && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {volumes.map(v => {
              const sum = summarizeVolumeCapabilities(v)
              const meta = VOLUME_META[v]
              const VIcon = meta.icon
              return (
                <button key={v}
                  onClick={() => setVolumeFilter(v === volumeFilter ? 'all' : v)}
                  className="text-left rounded-lg border border-white/[0.04] p-3 transition hover:border-white/[0.1]"
                  style={{
                    background: volumeFilter === v ? `${meta.color}18` : 'transparent',
                    borderColor: volumeFilter === v ? `${meta.color}40` : undefined,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <VIcon size={11} />
                    <span className="text-[10px] font-medium" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-0.5">
                    {axes.map(a => (
                      <div key={a}
                        className="h-1 rounded-full"
                        title={`${AXIS_META[a].label} : ${sum.axes[a]}`}
                        style={{ background: sum.axes[a] > 0 ? AXIS_META[a].color : 'rgba(255,255,255,0.05)' }}
                      />
                    ))}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1.5">
                    {sum.total} capacités
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-white/[0.04] px-5 py-3 flex items-center gap-3 flex-wrap">
        <Filter size={12} className="text-slate-500" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Volume</span>
        <div className="flex gap-1">
          <FilterChip active={volumeFilter === 'all'} onClick={() => setVolumeFilter('all')}>Tous</FilterChip>
          {volumes.map(v => (
            <FilterChip key={v}
              active={volumeFilter === v}
              color={VOLUME_META[v].color}
              onClick={() => setVolumeFilter(v)}
            >
              {VOLUME_META[v].label.split('·')[0].trim()}
            </FilterChip>
          ))}
          <FilterChip
            active={volumeFilter === 'transverse'}
            color={VOLUME_META.transverse.color}
            onClick={() => setVolumeFilter('transverse')}
          >
            Transverse
          </FilterChip>
        </div>

        <div className="h-4 w-px bg-white/[0.08] mx-1" />

        <span className="text-[10px] uppercase tracking-wider text-slate-500">Axe</span>
        <div className="flex gap-1">
          <FilterChip active={axisFilter === 'all'} onClick={() => setAxisFilter('all')}>Tous</FilterChip>
          {(['learn', 'predict', 'suggest', 'recommend'] as CapabilityAxis[]).map(a => {
            const meta = AXIS_META[a]
            const AIcon = meta.icon
            return (
              <FilterChip key={a}
                active={axisFilter === a}
                color={meta.color}
                onClick={() => setAxisFilter(a)}
              >
                <AIcon size={10} />
                {meta.label}
              </FilterChip>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 min-h-0 overflow-hidden">
        {/* Liste */}
        <div className="lg:col-span-2 overflow-y-auto p-3">
          <ul className="space-y-1.5">
            {filtered.map(cap => (
              <CapabilityRow
                key={cap.id}
                cap={cap}
                selected={selected === cap.id}
                onClick={() => setSelected(selected === cap.id ? null : cap.id)}
              />
            ))}
          </ul>
          {filtered.length === 0 && (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Aucune capacité pour ce filtre.
            </div>
          )}
        </div>

        {/* Détail */}
        <div className="border-l border-white/[0.06] overflow-y-auto p-5 bg-surface-1/30">
          {selectedCap ? (
            <CapabilityDetail cap={selectedCap} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center px-4">
              <BookOpen size={40} strokeWidth={1.3} />
              <p className="text-[13px] mt-3">Sélectionner une capacité</p>
              <p className="text-[11px] mt-1">Détails : skill, moteur, norme, exemple concret</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────

function FilterChip({
  children, active, color, onClick,
}: {
  children: React.ReactNode
  active: boolean
  color?: string
  onClick: () => void
}) {
  const bg = active && color ? `${color}20` : active ? 'rgba(179,138,90,0.15)' : 'transparent'
  const textColor = active && color ? color : active ? '#c9a068' : '#64748b'
  const border = active && color ? `${color}40` : active ? 'rgba(179,138,90,0.3)' : 'transparent'
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition"
      style={{ background: bg, color: textColor, border: `1px solid ${border}` }}
    >
      {children}
    </button>
  )
}

function CapabilityRow({
  cap, selected, onClick,
}: {
  cap: Proph3tCapability; selected: boolean; onClick: () => void
}) {
  const axisMeta = AXIS_META[cap.axis]
  const volMeta = VOLUME_META[cap.volume]
  const AIcon = axisMeta.icon
  const VIcon = volMeta.icon

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left rounded-lg p-3 transition border ${
          selected ? 'bg-white/[0.04] border-white/15' : 'border-transparent hover:bg-white/[0.02]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${axisMeta.color}18`, color: axisMeta.color, border: `1px solid ${axisMeta.color}30` }}
          >
            <AIcon size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: volMeta.color }}>
                <VIcon size={10} /> {volMeta.label.split('·')[0].trim()}
              </span>
              <span className="text-[9px] text-slate-600">·</span>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: axisMeta.color }}>
                {axisMeta.label}
              </span>
              {cap.maturity === 'production' && (
                <span className="ml-auto text-[8px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  ✓ PROD
                </span>
              )}
              {cap.maturity === 'beta' && (
                <span className="ml-auto text-[8px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                  BETA
                </span>
              )}
            </div>
            <div className="text-[12px] text-white font-medium">{cap.title}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{cap.description}</div>
          </div>
        </div>
      </button>
    </li>
  )
}

function CapabilityDetail({ cap }: { cap: Proph3tCapability }) {
  const axisMeta = AXIS_META[cap.axis]
  const volMeta = VOLUME_META[cap.volume]
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ background: `${volMeta.color}15`, color: volMeta.color, border: `1px solid ${volMeta.color}30` }}>
          {volMeta.label}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{ background: `${axisMeta.color}15`, color: axisMeta.color, border: `1px solid ${axisMeta.color}30` }}>
          {axisMeta.label}
        </span>
      </div>
      <h3 className="text-white text-[15px] font-semibold mb-1">{cap.title}</h3>
      <p className="text-[12px] text-slate-400 leading-relaxed mb-4">{cap.description}</p>

      <div className="space-y-2.5 text-[11px]">
        <DetailRow label="Skill" value={<code className="text-atlas-300 bg-atlas-500/10 px-1.5 py-0.5 rounded">{cap.skill}</code>} />
        <DetailRow label="Moteur" value={<code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{cap.engine}</code>} />
        {cap.normReference && (
          <DetailRow label="Référence" value={<span className="text-slate-300">{cap.normReference}</span>} />
        )}
        <DetailRow label="Maturité" value={
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            cap.maturity === 'production' ? 'text-emerald-400 bg-emerald-500/10'
            : cap.maturity === 'beta' ? 'text-amber-400 bg-amber-500/10'
            : 'text-sky-400 bg-sky-500/10'
          }`}>
            {cap.maturity.toUpperCase()}
          </span>
        } />
      </div>

      <div className="mt-5 rounded-lg bg-atlas-500/[0.06] border border-atlas-500/25 p-3">
        <div className="text-[10px] uppercase tracking-wider text-atlas-400 font-semibold mb-1.5 flex items-center gap-1">
          <Sparkles size={10} />
          Exemple concret
        </div>
        <p className="text-[12px] text-slate-200 italic leading-relaxed">« {cap.example} »</p>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-600 uppercase text-[9px] tracking-wider min-w-[70px]">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  )
}
