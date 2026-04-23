// ═══ COORDINATES — Branded types for coordinate-system safety ═══
// Empêche les conversions accidentelles entre systèmes de coordonnées.
// - MetricXY    : mètres, origine plan (Y bas→haut, standard DXF)
// - NormalizedXY: mètres, origine top-left, Y inversé (pour SVG/canvas 2D)
// - PixelXY     : pixels écran (après viewport scale + offset)

// ─── Branded numeric types ──────────────────────────────────

declare const __brand: unique symbol
type Brand<T, B> = T & { readonly [__brand]: B }

export type Meters = Brand<number, 'Meters'>
export type Pixels = Brand<number, 'Pixels'>

export const m = (n: number): Meters => n as Meters
export const px = (n: number): Pixels => n as Pixels

// ─── Branded 2D points ──────────────────────────────────────

export interface MetricXY {
  readonly x: Meters
  readonly y: Meters
  readonly __system: 'metric'
}

export interface NormalizedXY {
  readonly x: Meters
  readonly y: Meters
  readonly __system: 'normalized'
}

export interface PixelXY {
  readonly x: Pixels
  readonly y: Pixels
  readonly __system: 'pixel'
}

export type AnyXY = MetricXY | NormalizedXY | PixelXY

// ─── Constructors (explicit, no implicit casts) ─────────────

export function metric(x: number, y: number): MetricXY {
  return { x: x as Meters, y: y as Meters, __system: 'metric' }
}

export function normalized(x: number, y: number): NormalizedXY {
  return { x: x as Meters, y: y as Meters, __system: 'normalized' }
}

export function pixel(x: number, y: number): PixelXY {
  return { x: x as Pixels, y: y as Pixels, __system: 'pixel' }
}

// ─── Plan bounds for normalization ──────────────────────────

export interface PlanBoundsM {
  minX: Meters; minY: Meters
  maxX: Meters; maxY: Meters
  width: Meters; height: Meters
}

export function boundsM(minX: number, minY: number, maxX: number, maxY: number): PlanBoundsM {
  return {
    minX: minX as Meters, minY: minY as Meters,
    maxX: maxX as Meters, maxY: maxY as Meters,
    width: (maxX - minX) as Meters,
    height: (maxY - minY) as Meters,
  }
}

// ─── Conversions ────────────────────────────────────────────

/** DXF (Y bas→haut) → Normalized (origine top-left, Y inversé). */
export function metricToNormalized(p: MetricXY, bounds: PlanBoundsM): NormalizedXY {
  return {
    x: (p.x - bounds.minX) as Meters,
    y: (bounds.maxY - p.y) as Meters,
    __system: 'normalized',
  }
}

/** Normalized → DXF brut. */
export function normalizedToMetric(p: NormalizedXY, bounds: PlanBoundsM): MetricXY {
  return {
    x: (p.x + bounds.minX) as Meters,
    y: (bounds.maxY - p.y) as Meters,
    __system: 'metric',
  }
}

/** Normalized (mètres top-left) → Pixels écran. */
export function normalizedToPixel(
  p: NormalizedXY,
  viewport: { scale: number; offsetX: number; offsetY: number },
): PixelXY {
  return {
    x: (p.x * viewport.scale + viewport.offsetX) as Pixels,
    y: (p.y * viewport.scale + viewport.offsetY) as Pixels,
    __system: 'pixel',
  }
}

/** Pixels écran → Normalized. */
export function pixelToNormalized(
  p: PixelXY,
  viewport: { scale: number; offsetX: number; offsetY: number },
): NormalizedXY {
  return {
    x: ((p.x - viewport.offsetX) / viewport.scale) as Meters,
    y: ((p.y - viewport.offsetY) / viewport.scale) as Meters,
    __system: 'normalized',
  }
}

// ─── Unit detection & conversion ────────────────────────────

export type RawUnit = 'mm' | 'cm' | 'm' | 'ft' | 'in' | 'unknown'

/** Facteur de conversion vers mètres. */
export const UNIT_TO_M: Record<RawUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  ft: 0.3048,
  in: 0.0254,
  unknown: 1,
}

/** Détecte l'unité probable en fonction de la taille du plan.
 *  Hypothèse : centre commercial 50-300 m de diagonale.
 *  - > 50 000 → millimètres (50 000 mm = 50 m, tranche typique 50-500 m)
 *  - 3 000 – 50 000 → centimètres (ex: 15 000 cm = 150 m)
 *  - 30 – 3 000 → mètres (ex: 150 m)
 *  - 10 – 30 → feet (bâtiments anciens US)
 *  - < 10 → unknown */
export function detectUnit(rawMaxDim: number): RawUnit {
  const d = Math.abs(rawMaxDim)
  if (d > 50_000) return 'mm'
  if (d > 3_000) return 'cm'
  if (d > 30) return 'm'
  if (d > 10) return 'ft'
  return 'unknown'
}

/** Convertit un scalaire brut en mètres via facteur d'unité. */
export function toMeters(raw: number, unit: RawUnit): Meters {
  return (raw * UNIT_TO_M[unit]) as Meters
}

// ─── Helpers géométriques ───────────────────────────────────

export function distanceM(a: MetricXY | NormalizedXY, b: MetricXY | NormalizedXY): Meters {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy) as Meters
}

/** Tuple brut (éviter quand possible) → MetricXY. */
export function fromTuple(t: [number, number]): MetricXY {
  return metric(t[0], t[1])
}

/** MetricXY → tuple brut (interop existant). */
export function toTuple(p: AnyXY): [number, number] {
  return [p.x as number, p.y as number]
}
