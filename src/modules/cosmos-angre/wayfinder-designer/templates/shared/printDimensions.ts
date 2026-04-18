// ═══ Conversion mm ↔ px @ DPI ═══

export function mmToPx(mm: number, dpi: number): number {
  // 1 inch = 25.4 mm
  return Math.round((mm / 25.4) * dpi)
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * 25.4
}

/** Format ISO 216 (mm). */
export const PAPER_FORMATS_MM: Record<'A0' | 'A1' | 'A2' | 'A3' | 'A4', { w: number; h: number }> = {
  A0: { w: 841, h: 1189 },
  A1: { w: 594, h: 841 },
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
}
