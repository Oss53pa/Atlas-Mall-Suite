// ═══ ISO SYMBOL LIBRARY — SVG symbols for isometric view ═══

export type SymbolType =
  | 'person_standing' | 'person_walking' | 'person_sitting'
  | 'mannequin' | 'bench' | 'table_round' | 'clothing_rack'
  | 'plant_small' | 'plant_large' | 'escalator_up' | 'escalator_down'
  | 'fountain' | 'signage_totem' | 'info_kiosk'
  | 'trash_bin' | 'chair' | 'shopping_cart'

export interface SymbolInstance {
  id: string
  type: SymbolType
  zoneId: string
  relX: number
  relY: number
  color?: string
  scale?: number
  mirror?: boolean
}

// ── Personnages ──

export function personStanding(color = '#333', scale = 1): string {
  const s = scale
  return `<ellipse cx="0" cy="${-20*s}" rx="${4*s}" ry="${4*s}" fill="${color}"/>
    <line x1="0" y1="${-16*s}" x2="0" y2="${-4*s}" stroke="${color}" stroke-width="${2*s}" stroke-linecap="round"/>
    <line x1="${-5*s}" y1="${-12*s}" x2="${5*s}" y2="${-10*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>
    <line x1="0" y1="${-4*s}" x2="${-4*s}" y2="${8*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>
    <line x1="0" y1="${-4*s}" x2="${4*s}" y2="${7*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>`
}

export function personWalking(color = '#444', scale = 1): string {
  const s = scale
  return `<ellipse cx="0" cy="${-20*s}" rx="${4*s}" ry="${4*s}" fill="${color}"/>
    <line x1="0" y1="${-16*s}" x2="${2*s}" y2="${-4*s}" stroke="${color}" stroke-width="${2*s}" stroke-linecap="round"/>
    <line x1="${-6*s}" y1="${-13*s}" x2="${4*s}" y2="${-10*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>
    <line x1="${2*s}" y1="${-4*s}" x2="${-3*s}" y2="${9*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>
    <line x1="${2*s}" y1="${-4*s}" x2="${7*s}" y2="${6*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>`
}

export function personSitting(color = '#333', scale = 1): string {
  const s = scale
  return `<ellipse cx="0" cy="${-16*s}" rx="${4*s}" ry="${4*s}" fill="${color}"/>
    <line x1="0" y1="${-12*s}" x2="0" y2="${-2*s}" stroke="${color}" stroke-width="${2*s}" stroke-linecap="round"/>
    <line x1="${-5*s}" y1="${-9*s}" x2="${5*s}" y2="${-7*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>
    <line x1="0" y1="${-2*s}" x2="${-8*s}" y2="${2*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>
    <line x1="${-8*s}" y1="${2*s}" x2="${-8*s}" y2="${10*s}" stroke="${color}" stroke-width="${1.5*s}" stroke-linecap="round"/>`
}

export function mannequin(color = '#ccc', scale = 1): string {
  const s = scale
  return `<ellipse cx="0" cy="${-22*s}" rx="${4*s}" ry="${5*s}" fill="${color}" stroke="#aaa" stroke-width="0.5"/>
    <polygon points="${-4*s},${-17*s} ${4*s},${-17*s} ${3*s},${-5*s} ${-3*s},${-5*s}" fill="${color}" stroke="#aaa" stroke-width="0.5"/>
    <line x1="0" y1="${8*s}" x2="0" y2="${14*s}" stroke="#888" stroke-width="${1.5*s}"/>
    <ellipse cx="0" cy="${15*s}" rx="${4*s}" ry="${2*s}" fill="#888"/>`
}

// ── Mobilier ──

export function bench(scale = 1): string {
  const s = scale
  return `<polygon points="${-18*s},${2*s} ${18*s},${-4*s} ${18*s},${-8*s} ${-18*s},${-2*s}" fill="#c8c4bc" stroke="#aaa" stroke-width="0.5"/>
    <line x1="${-16*s}" y1="${2*s}" x2="${-16*s}" y2="${10*s}" stroke="#888" stroke-width="${1.5*s}"/>
    <line x1="${14*s}" y1="${-4*s}" x2="${14*s}" y2="${4*s}" stroke="#888" stroke-width="${1.5*s}"/>`
}

export function tableRound(scale = 1): string {
  const s = scale
  return `<ellipse cx="0" cy="0" rx="${16*s}" ry="${8*s}" fill="#d8d4cc" stroke="#aaa" stroke-width="0.5"/>
    <line x1="0" y1="${8*s}" x2="0" y2="${18*s}" stroke="#888" stroke-width="${2*s}"/>
    <ellipse cx="0" cy="${19*s}" rx="${6*s}" ry="${3*s}" fill="#888"/>`
}

export function chair(scale = 1): string {
  const s = scale
  return `<rect x="${-4*s}" y="${-2*s}" width="${8*s}" height="${6*s}" fill="#b8b4ac" stroke="#999" stroke-width="0.5" rx="${1*s}"/>
    <line x1="${-3*s}" y1="${4*s}" x2="${-3*s}" y2="${10*s}" stroke="#888" stroke-width="${1*s}"/>
    <line x1="${3*s}" y1="${4*s}" x2="${3*s}" y2="${10*s}" stroke="#888" stroke-width="${1*s}"/>`
}

export function clothingRack(accentColor = '#b8d44a', scale = 1): string {
  const s = scale
  const items = [-14, -7, 0, 7, 14]
  const garments = items.map(offset => {
    const x = offset * s, y = offset * -0.3 * s
    return `<path d="M${x},${y} Q${x-3*s},${y+4*s} ${x-2*s},${y+12*s} Q${x},${y+14*s} ${x+2*s},${y+12*s} Q${x+3*s},${y+4*s} ${x},${y}" fill="${accentColor}" opacity="0.85"/>`
  }).join('\n')
  return `<line x1="${-20*s}" y1="0" x2="${20*s}" y2="${-6*s}" stroke="#888" stroke-width="${1.5*s}"/>
    <line x1="${-20*s}" y1="0" x2="${-20*s}" y2="${16*s}" stroke="#888" stroke-width="${1.5*s}"/>
    <line x1="${20*s}" y1="${-6*s}" x2="${20*s}" y2="${10*s}" stroke="#888" stroke-width="${1.5*s}"/>
    ${garments}`
}

export function trashBin(scale = 1): string {
  const s = scale
  return `<rect x="${-4*s}" y="${-8*s}" width="${8*s}" height="${12*s}" rx="${2*s}" fill="#666" stroke="#555" stroke-width="0.5"/>
    <rect x="${-5*s}" y="${-9*s}" width="${10*s}" height="${2*s}" rx="${1*s}" fill="#777"/>`
}

export function shoppingCart(scale = 1): string {
  const s = scale
  return `<polygon points="${-6*s},${-8*s} ${8*s},${-10*s} ${10*s},${2*s} ${-4*s},${4*s}" fill="none" stroke="#888" stroke-width="${1.2*s}"/>
    <circle cx="${-2*s}" cy="${6*s}" r="${2*s}" fill="#666"/>
    <circle cx="${8*s}" cy="${4*s}" r="${2*s}" fill="#666"/>
    <line x1="${-6*s}" y1="${-8*s}" x2="${-10*s}" y2="${-6*s}" stroke="#888" stroke-width="${1.2*s}"/>`
}

// ── Vegetation ──

export function plantSmall(scale = 1): string {
  const s = scale
  return `<rect x="${-3*s}" y="${-2*s}" width="${6*s}" height="${10*s}" rx="${1*s}" fill="#8a7060"/>
    <ellipse cx="0" cy="${-6*s}" rx="${10*s}" ry="${12*s}" fill="#6aaa30"/>
    <ellipse cx="${-5*s}" cy="${-2*s}" rx="${7*s}" ry="${9*s}" fill="#7ab840" opacity="0.9"/>
    <ellipse cx="${6*s}" cy="${-4*s}" rx="${8*s}" ry="${10*s}" fill="#5a9a28" opacity="0.8"/>`
}

export function plantLarge(scale = 1): string {
  const s = scale
  return `<polygon points="${-10*s},${8*s} ${10*s},${2*s} ${10*s},${16*s} ${-10*s},${22*s}" fill="#7a6050" stroke="#665040" stroke-width="0.5"/>
    <polygon points="${-10*s},${8*s} ${-10*s},${22*s} ${-14*s},${20*s} ${-14*s},${6*s}" fill="#6a5040"/>
    <ellipse cx="0" cy="${-6*s}" rx="${16*s}" ry="${20*s}" fill="#6aaa30"/>
    <ellipse cx="${-8*s}" cy="${-2*s}" rx="${10*s}" ry="${12*s}" fill="#7ab840" opacity="0.9"/>
    <ellipse cx="${10*s}" cy="${-5*s}" rx="${11*s}" ry="${14*s}" fill="#5a9a28" opacity="0.8"/>`
}

// ── Equipements ──

export function signageTotem(scale = 1): string {
  const s = scale
  return `<line x1="0" y1="0" x2="0" y2="${-30*s}" stroke="#444" stroke-width="${2*s}" stroke-linecap="round"/>
    <rect x="${-12*s}" y="${-38*s}" width="${24*s}" height="${10*s}" rx="${2*s}" fill="#1a3a6a" stroke="#2a5a9a" stroke-width="0.8"/>
    <rect x="${-10*s}" y="${-36*s}" width="${20*s}" height="${6*s}" rx="${1*s}" fill="#b8d44a" opacity="0.8"/>
    <ellipse cx="0" cy="${2*s}" rx="${4*s}" ry="${2*s}" fill="#333"/>`
}

export function infoKiosk(scale = 1): string {
  const s = scale
  return `<polygon points="${-6*s},0 ${6*s},${-4*s} ${6*s},${-22*s} ${-6*s},${-18*s}" fill="#2a4a6a" stroke="#3a6a9a" stroke-width="0.8"/>
    <polygon points="${-6*s},0 ${-6*s},${-18*s} ${-10*s},${-16*s} ${-10*s},${2*s}" fill="#1a3a5a"/>
    <rect x="${-4*s}" y="${-16*s}" width="${8*s}" height="${8*s}" rx="${1*s}" fill="#b8d44a" opacity="0.8"/>`
}

export function fountain(scale = 1): string {
  const s = scale
  return `<ellipse cx="0" cy="0" rx="${24*s}" ry="${12*s}" fill="#c8e0e8" stroke="#a0c0cc" stroke-width="0.8"/>
    <ellipse cx="0" cy="${-2*s}" rx="${20*s}" ry="${10*s}" fill="#d8eef8"/>
    <line x1="0" y1="${-8*s}" x2="0" y2="${-20*s}" stroke="#90c8e0" stroke-width="${2*s}"/>
    <ellipse cx="0" cy="${-20*s}" rx="${5*s}" ry="${3*s}" fill="#b0d8f0" opacity="0.7"/>`
}

export function facadeSign(text: string, width: number, scale = 1): string {
  const s = scale, w = width * s
  return `<rect x="${-w/2}" y="${-8*s}" width="${w}" height="${14*s}" rx="${2*s}" fill="#1a3a6a" stroke="#2a5aaa" stroke-width="0.8"/>
    <rect x="${-w/2+3*s}" y="${-5*s}" width="${w-6*s}" height="${8*s}" rx="${1*s}" fill="#b8d44a" opacity="0.9"/>
    <text x="0" y="${1*s}" text-anchor="middle" font-size="${6*s}" font-weight="700" fill="#1a1a1a" font-family="system-ui">${text}</text>`
}

// ── Dispatch function ──

export function renderSymbolSVG(type: SymbolType, color?: string, scale = 1): string {
  switch (type) {
    case 'person_standing': return personStanding(color ?? '#333', scale)
    case 'person_walking':  return personWalking(color ?? '#444', scale)
    case 'person_sitting':  return personSitting(color ?? '#333', scale)
    case 'mannequin':       return mannequin(color ?? '#ccc', scale)
    case 'bench':           return bench(scale)
    case 'table_round':     return tableRound(scale)
    case 'chair':           return chair(scale)
    case 'clothing_rack':   return clothingRack(color ?? '#b8d44a', scale)
    case 'plant_small':     return plantSmall(scale)
    case 'plant_large':     return plantLarge(scale)
    case 'signage_totem':   return signageTotem(scale)
    case 'info_kiosk':      return infoKiosk(scale)
    case 'fountain':        return fountain(scale)
    case 'trash_bin':       return trashBin(scale)
    case 'shopping_cart':   return shoppingCart(scale)
    default:                return personStanding(color ?? '#555', scale)
  }
}
