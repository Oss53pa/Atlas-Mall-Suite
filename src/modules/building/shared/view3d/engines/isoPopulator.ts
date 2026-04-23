// ═══ ISO POPULATOR — Auto-populate zones with symbols ═══

import type { Zone, Floor } from '../../../proph3t/types'
import type { SymbolInstance, SymbolType } from './isoSymbolLibrary'

interface PopulationRule {
  symbols: { type: SymbolType; weight: number; color?: string }[]
  density: number   // objects per 100m2
  minCount: number
  maxCount: number
}

const POPULATION_RULES: Record<string, PopulationRule> = {
  commerce: {
    symbols: [
      { type: 'person_walking', weight: 3 }, { type: 'person_standing', weight: 2 },
      { type: 'clothing_rack', weight: 3, color: '#b8d44a' }, { type: 'mannequin', weight: 2, color: '#ddd' },
      { type: 'plant_small', weight: 1 },
    ],
    density: 4, minCount: 3, maxCount: 12,
  },
  restauration: {
    symbols: [
      { type: 'person_sitting', weight: 4 }, { type: 'person_standing', weight: 2 },
      { type: 'table_round', weight: 4 }, { type: 'chair', weight: 5 },
      { type: 'plant_small', weight: 1 },
    ],
    density: 5, minCount: 4, maxCount: 15,
  },
  circulation: {
    symbols: [
      { type: 'person_walking', weight: 5 }, { type: 'person_standing', weight: 2 },
      { type: 'bench', weight: 3 }, { type: 'plant_large', weight: 2 },
      { type: 'signage_totem', weight: 2 }, { type: 'trash_bin', weight: 1 },
    ],
    density: 2, minCount: 2, maxCount: 8,
  },
  loisirs: {
    symbols: [
      { type: 'person_walking', weight: 3 }, { type: 'person_sitting', weight: 3 },
      { type: 'bench', weight: 3 }, { type: 'plant_large', weight: 2 },
      { type: 'info_kiosk', weight: 1 },
    ],
    density: 3, minCount: 3, maxCount: 10,
  },
  services: {
    symbols: [
      { type: 'person_standing', weight: 3 }, { type: 'person_walking', weight: 2 },
      { type: 'info_kiosk', weight: 2 }, { type: 'plant_small', weight: 1 },
    ],
    density: 2, minCount: 1, maxCount: 6,
  },
  parking: {
    symbols: [
      { type: 'shopping_cart', weight: 3 }, { type: 'person_walking', weight: 2 },
    ],
    density: 1, minCount: 1, maxCount: 4,
  },
  hotel: {
    symbols: [
      { type: 'person_walking', weight: 2 }, { type: 'bench', weight: 2 },
      { type: 'plant_large', weight: 3 }, { type: 'plant_small', weight: 2 },
    ],
    density: 2, minCount: 2, maxCount: 6,
  },
}

// Deterministic seeded RNG
function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  return () => {
    h = Math.imul(h ^ h >>> 16, 0x45d9f3b)
    h = Math.imul(h ^ h >>> 16, 0x45d9f3b)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function weightedChoice<T extends { weight: number }>(items: T[], rng: () => number): T {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let r = rng() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

export function populateZone(zone: Zone, floor: Floor): SymbolInstance[] {
  const rule = POPULATION_RULES[zone.type]
  if (!rule) return []

  const rng = seededRandom(zone.id)
  const surfaceM2 = (zone.w * floor.widthM) * (zone.h * floor.heightM)
  const count = Math.min(rule.maxCount, Math.max(rule.minCount, Math.round(surfaceM2 * rule.density / 100)))

  const instances: SymbolInstance[] = []

  while (instances.length < count) {
    const chosen = weightedChoice(rule.symbols, rng)
    instances.push({
      id: `${zone.id}-sym-${instances.length}`,
      type: chosen.type,
      zoneId: zone.id,
      relX: 0.08 + rng() * 0.84,
      relY: 0.08 + rng() * 0.84,
      color: chosen.color,
      scale: 0.8 + rng() * 0.4,
      mirror: rng() > 0.5,
    })
  }

  return instances
}

export function populateAllZones(zones: Zone[], floor: Floor): SymbolInstance[] {
  return zones.flatMap(z => populateZone(z, floor))
}
