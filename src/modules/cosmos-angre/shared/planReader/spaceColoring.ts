// ═══ Space Coloring — coloration contextuelle des espaces ═══
//
// Helper pur qui retourne la couleur d'un espace selon le mode d'affichage :
//   - 'type'          : couleur par catégorie (SPACE_TYPE_META)
//   - 'vol1-revenue'  : dégradé FCFA/m²/mois (rouge→vert selon rentabilité)
//   - 'vol2-erp'      : conformité ERP (vert/ambre/orange/rouge)
//   - 'vol3-flow'     : densité flux (bleu=froid → rouge=chaud)
//   - 'floor'         : palette par étage
//
// Consomme `spaceStates[id].notes` (bloc JSON atlas) pour extraire les
// attributs détaillés (loyer, catégorie ERP…). Lit éventuellement des
// résultats d'analyse injectés via le paramètre `context`.

import type { DetectedSpace, SpaceState } from './planEngineTypes'
import { SPACE_TYPE_META, type SpaceTypeKey } from '../proph3t/libraries/spaceTypeLibrary'

export type ColorMode = 'type' | 'vol1-revenue' | 'vol2-erp' | 'vol3-flow' | 'floor'

const FLOOR_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#84cc16', '#f97316',
]

interface AtlasAttrs {
  loyerFixeFcfaM2Mois?: number
  caPrevM2An?: number
  erpCategory?: 1 | 2 | 3 | 4 | 5
  classeRisque?: 'A' | 'B' | 'C'
  issuesCount?: number
  pmrAccessible?: boolean
  pmrLargeurPorteCm?: number
}

/** Extrait les attributs structurés du bloc ```atlas``` dans les notes. */
export function extractAtlasAttrs(notes: string | undefined): AtlasAttrs {
  if (!notes) return {}
  const m = notes.match(/```atlas\n([\s\S]*?)\n```/)
  if (!m) return {}
  try { return JSON.parse(m[1]) as AtlasAttrs } catch { return {} }
}

export interface ColoringContext {
  spaceStates?: Record<string, SpaceState>
  detectedFloors?: Array<{ id: string }>
  /** Densité par space (provenant d'ABM Vol.3) : id → personnes/m² pic. */
  flowDensity?: Record<string, number>
  /** Revenu observé par space (provenant Vol.1) : id → FCFA/mois. */
  revenueObserved?: Record<string, number>
  /** Conformité ERP par space : id → 'conforme' | 'mineur' | 'majeur' | 'bloquant'. */
  erpStatus?: Record<string, 'conforme' | 'mineur' | 'majeur' | 'bloquant'>
  /** Paramètres de normalisation du dégradé revenu. */
  revenueMaxFcfaMois?: number
}

export function getSpaceColor(
  space: DetectedSpace,
  mode: ColorMode,
  ctx: ColoringContext = {},
): string {
  switch (mode) {
    case 'floor':
      return colorByFloor(space, ctx.detectedFloors ?? [])
    case 'vol1-revenue':
      return colorByRevenue(space, ctx)
    case 'vol2-erp':
      return colorByErp(space, ctx)
    case 'vol3-flow':
      return colorByFlow(space, ctx)
    case 'type':
    default:
      return colorByType(space)
  }
}

function colorByType(space: DetectedSpace): string {
  // space.color (user override) > SPACE_TYPE_META > fallback
  if (space.color) return space.color
  const meta = SPACE_TYPE_META[space.type as SpaceTypeKey]
  return meta?.color ?? '#64748b'
}

function colorByFloor(space: DetectedSpace, floors: Array<{ id: string }>): string {
  const idx = floors.findIndex(f => f.id === space.floorId)
  return FLOOR_PALETTE[(idx >= 0 ? idx : 0) % FLOOR_PALETTE.length]
}

function colorByRevenue(space: DetectedSpace, ctx: ColoringContext): string {
  // Source 1 : mesure observée (priorité)
  const observed = ctx.revenueObserved?.[space.id]
  if (observed !== undefined) {
    return gradientRedToGreen(observed, ctx.revenueMaxFcfaMois ?? 5_000_000)
  }
  // Source 2 : attrs utilisateur (loyer fixe × surface)
  const attrs = extractAtlasAttrs(ctx.spaceStates?.[space.id]?.notes)
  if (attrs.loyerFixeFcfaM2Mois && space.areaSqm) {
    const monthly = attrs.loyerFixeFcfaM2Mois * space.areaSqm
    return gradientRedToGreen(monthly, ctx.revenueMaxFcfaMois ?? 5_000_000)
  }
  // Aucune donnée → gris neutre
  return '#475569'
}

function colorByErp(space: DetectedSpace, ctx: ColoringContext): string {
  const status = ctx.erpStatus?.[space.id]
  if (status) {
    return {
      conforme: '#10b981',  // vert
      mineur:   '#f59e0b',  // ambre
      majeur:   '#f97316',  // orange
      bloquant: '#ef4444',  // rouge
    }[status]
  }
  // Fallback : heuristique sur attrs utilisateur
  const attrs = extractAtlasAttrs(ctx.spaceStates?.[space.id]?.notes)
  const meta = SPACE_TYPE_META[space.type as SpaceTypeKey]
  if (!meta?.erpRequired) return '#475569'  // non-ERP = gris

  // Score : si largeur porte < 90 cm → bloquant, si pas de category définie → mineur
  if (attrs.pmrLargeurPorteCm !== undefined && attrs.pmrLargeurPorteCm < 90) {
    return '#ef4444'
  }
  if (!attrs.erpCategory) return '#f59e0b'  // ambre (à définir)
  if (attrs.erpCategory && attrs.issuesCount !== undefined) {
    // Cat 1/2 nécessite > 2 issues
    const minIssues = attrs.erpCategory <= 2 ? 2 : 1
    if (attrs.issuesCount < minIssues) return '#f97316'  // orange
  }
  return '#10b981'  // conforme
}

function colorByFlow(space: DetectedSpace, ctx: ColoringContext): string {
  const density = ctx.flowDensity?.[space.id]
  if (density === undefined) return '#334155'
  // 0 = bleu foncé, 1 pers/m² = bleu clair, 3 = jaune, 5+ = rouge
  return gradientBlueToRed(density, 5)
}

// ─── Dégradés ────────────────────────────────────────

function gradientRedToGreen(value: number, max: number): string {
  // value: 0 → rouge, max/2 → jaune, max → vert
  const t = Math.max(0, Math.min(1, value / max))
  if (t < 0.5) {
    // rouge → jaune
    return mix('#ef4444', '#f59e0b', t * 2)
  }
  return mix('#f59e0b', '#10b981', (t - 0.5) * 2)
}

function gradientBlueToRed(value: number, max: number): string {
  const t = Math.max(0, Math.min(1, value / max))
  if (t < 0.5) return mix('#1e40af', '#facc15', t * 2)
  return mix('#facc15', '#dc2626', (t - 0.5) * 2)
}

function mix(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA), b = hexToRgb(hexB)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `#${[r, g, bl].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

// ─── Légende pour l'UI ────────────────────────────────

export function getLegendForMode(mode: ColorMode): Array<{ label: string; color: string }> {
  switch (mode) {
    case 'type':
      return [
        { label: 'Accès / circulation',  color: '#8b5cf6' },
        { label: 'Commerces & services', color: '#ec4899' },
        { label: 'Équipements',          color: '#f59e0b' },
        { label: 'Infrastructure',       color: '#64748b' },
        { label: 'Non identifié',        color: '#94a3b8' },
      ]
    case 'vol1-revenue':
      return [
        { label: 'Faible (< 1M FCFA)',  color: '#ef4444' },
        { label: 'Moyen (~2.5M)',       color: '#f59e0b' },
        { label: 'Fort (> 4M)',         color: '#10b981' },
        { label: 'Non renseigné',       color: '#475569' },
      ]
    case 'vol2-erp':
      return [
        { label: 'Conforme',            color: '#10b981' },
        { label: 'Réserves mineures',   color: '#f59e0b' },
        { label: 'Réserves majeures',   color: '#f97316' },
        { label: 'Bloquant',            color: '#ef4444' },
        { label: 'Non-ERP',             color: '#475569' },
      ]
    case 'vol3-flow':
      return [
        { label: 'Froid (< 1 pers/m²)', color: '#1e40af' },
        { label: 'Moyen (~2.5)',        color: '#facc15' },
        { label: 'Chaud (> 4)',         color: '#dc2626' },
        { label: 'Non analysé',         color: '#334155' },
      ]
    case 'floor':
      return FLOOR_PALETTE.slice(0, 4).map((c, i) => ({
        label: `Étage ${i}`, color: c,
      }))
  }
}
