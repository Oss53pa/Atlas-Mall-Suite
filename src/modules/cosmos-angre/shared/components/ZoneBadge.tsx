import React from 'react'
import {
  Car,
  Store,
  UtensilsCrossed,
  Footprints,
  Wrench,
  Briefcase,
  Landmark,
  DoorOpen,
  Gamepad2,
  Handshake,
  Hotel,
  Building2,
  TreePine,
  type LucideIcon,
} from 'lucide-react'
import type { Zone, SpaceType } from '../../shared/proph3t/types'

const ICON_MAP: Record<SpaceType, LucideIcon> = {
  parking: Car,
  commerce: Store,
  restauration: UtensilsCrossed,
  circulation: Footprints,
  technique: Wrench,
  backoffice: Briefcase,
  financier: Landmark,
  sortie_secours: DoorOpen,
  loisirs: Gamepad2,
  services: Handshake,
  hotel: Hotel,
  bureaux: Building2,
  exterieur: TreePine,
}

const COLOR_MAP: Record<SpaceType, { bg: string; text: string; border: string }> = {
  parking: { bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-600/40' },
  commerce: { bg: 'bg-blue-900/40', text: 'text-blue-300', border: 'border-blue-600/40' },
  restauration: { bg: 'bg-amber-900/40', text: 'text-amber-300', border: 'border-amber-600/40' },
  circulation: { bg: 'bg-gray-800/60', text: 'text-gray-300', border: 'border-gray-600/40' },
  technique: { bg: 'bg-orange-900/40', text: 'text-orange-300', border: 'border-orange-600/40' },
  backoffice: { bg: 'bg-zinc-800/60', text: 'text-zinc-300', border: 'border-zinc-600/40' },
  financier: { bg: 'bg-emerald-900/40', text: 'text-emerald-300', border: 'border-emerald-600/40' },
  sortie_secours: { bg: 'bg-red-900/40', text: 'text-red-300', border: 'border-red-600/40' },
  loisirs: { bg: 'bg-purple-900/40', text: 'text-purple-300', border: 'border-purple-600/40' },
  services: { bg: 'bg-cyan-900/40', text: 'text-cyan-300', border: 'border-cyan-600/40' },
  hotel: { bg: 'bg-rose-900/40', text: 'text-rose-300', border: 'border-rose-600/40' },
  bureaux: { bg: 'bg-indigo-900/40', text: 'text-indigo-300', border: 'border-indigo-600/40' },
  exterieur: { bg: 'bg-green-900/40', text: 'text-green-300', border: 'border-green-600/40' },
}

const NIVEAU_COLORS: Record<number, string> = {
  1: 'bg-green-600 text-white',
  2: 'bg-lime-600 text-white',
  3: 'bg-yellow-600 text-white',
  4: 'bg-orange-600 text-white',
  5: 'bg-red-600 text-white',
}

interface ZoneBadgeProps {
  zone: Zone
  compact?: boolean
}

export default function ZoneBadge({ zone, compact = false }: ZoneBadgeProps) {
  const Icon = ICON_MAP[zone.type] || Store
  const colors = COLOR_MAP[zone.type] || COLOR_MAP.commerce
  const niveauClass = NIVEAU_COLORS[zone.niveau] || NIVEAU_COLORS[3]

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
      >
        <Icon size={10} />
        {zone.type.replace(/_/g, ' ')}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <Icon size={12} />
      <span className="capitalize">{zone.type.replace(/_/g, ' ')}</span>
      <span className="ml-0.5">
        <span
          className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${niveauClass}`}
        >
          N{zone.niveau}
        </span>
      </span>
    </span>
  )
}
