// ═══ SVG Exporter ═══
//
// Génère un SVG vectoriel 2D à partir du ParsedPlan courant :
//   - Polygones des espaces (remplis + contour + label)
//   - Segments muraux (lignes noires)
//   - Cotes (si présentes)
//   - Cartouche bas avec date + nom projet
//
// Format imprimable A3/A4 conservant la résolution vectorielle.

import type { ParsedPlan } from '../../shared/planReader/planEngineTypes'
import { SPACE_TYPE_META, type SpaceTypeKey } from '../../shared/proph3t/libraries/spaceTypeLibrary'

export function exportPlanSvg(plan: ParsedPlan): string {
  const { bounds } = plan
  const pad = 20
  const scale = 5  // 5 px/mètre pour format impression
  const viewW = bounds.width * scale + pad * 2
  const viewH = bounds.height * scale + pad * 2 + 60  // +60 pour cartouche

  const toX = (wx: number) => (wx - bounds.minX) * scale + pad
  const toY = (wy: number) => (wy - bounds.minY) * scale + pad

  // ── Fond ──
  const bg = `<rect width="${viewW}" height="${viewH}" fill="#ffffff"/>`

  // ── Grille 1m ──
  const grid: string[] = []
  for (let x = Math.ceil(bounds.minX); x <= bounds.minX + bounds.width; x++) {
    grid.push(`<line x1="${toX(x)}" y1="${pad}" x2="${toX(x)}" y2="${bounds.height * scale + pad}" stroke="#f3f4f6" stroke-width="0.5"/>`)
  }
  for (let y = Math.ceil(bounds.minY); y <= bounds.minY + bounds.height; y++) {
    grid.push(`<line x1="${pad}" y1="${toY(y)}" x2="${bounds.width * scale + pad}" y2="${toY(y)}" stroke="#f3f4f6" stroke-width="0.5"/>`)
  }

  // ── Espaces (polygones) ──
  const spaces: string[] = []
  for (const sp of plan.spaces) {
    if (!sp.polygon || sp.polygon.length < 3) continue
    const meta = SPACE_TYPE_META[sp.type as SpaceTypeKey]
    const color = sp.color || meta?.color || '#e5e7eb'
    const d = sp.polygon.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${toX(p[0])} ${toY(p[1])}`
    ).join(' ') + ' Z'
    const cx = sp.polygon.reduce((s, p) => s + p[0], 0) / sp.polygon.length
    const cy = sp.polygon.reduce((s, p) => s + p[1], 0) / sp.polygon.length
    spaces.push(
      `<path d="${d}" fill="${color}30" stroke="${color}" stroke-width="1.2"/>`,
      `<text x="${toX(cx)}" y="${toY(cy)}" font-family="Arial" font-size="9" fill="#1f2937" text-anchor="middle" dominant-baseline="middle">${escapeXml(sp.label)}</text>`,
      `<text x="${toX(cx)}" y="${toY(cy) + 10}" font-family="Arial" font-size="7" fill="#6b7280" text-anchor="middle">${sp.areaSqm.toFixed(0)} m²</text>`,
    )
  }

  // ── Murs ──
  const walls: string[] = []
  for (const w of plan.wallSegments) {
    walls.push(`<line x1="${toX(w.x1)}" y1="${toY(w.y1)}" x2="${toX(w.x2)}" y2="${toY(w.y2)}" stroke="#111827" stroke-width="1.5"/>`)
  }

  // ── Cotes ──
  const dims: string[] = []
  if (plan.dimensions) {
    for (const d of plan.dimensions) {
      dims.push(
        `<line x1="${toX(d.p1[0])}" y1="${toY(d.p1[1])}" x2="${toX(d.p2[0])}" y2="${toY(d.p2[1])}" stroke="#f59e0b" stroke-width="0.8" stroke-dasharray="2,2"/>`,
        `<text x="${toX(d.textPos[0])}" y="${toY(d.textPos[1])}" font-family="Arial" font-size="8" fill="#f59e0b" text-anchor="middle">${d.text}</text>`,
      )
    }
  }

  // ── Échelle ──
  const scaleBar = renderScaleBar(viewW, viewH, scale, pad)

  // ── Cartouche ──
  const cartY = bounds.height * scale + pad * 2 + 20
  const cartouche = `
    <g transform="translate(${pad}, ${cartY})">
      <rect x="0" y="0" width="${viewW - pad * 2}" height="40" fill="#f9fafb" stroke="#d1d5db" stroke-width="1"/>
      <text x="10" y="15" font-family="Arial" font-size="10" font-weight="bold" fill="#111827">Atlas BIM — Plan vectoriel</text>
      <text x="10" y="30" font-family="Arial" font-size="9" fill="#6b7280">
        ${plan.spaces.length} espaces · ${plan.wallSegments.length} segments · ${bounds.width.toFixed(1)}×${bounds.height.toFixed(1)} m
      </text>
      <text x="${viewW - pad * 2 - 10}" y="15" font-family="Arial" font-size="9" fill="#6b7280" text-anchor="end">
        ${new Date().toLocaleDateString('fr-FR')}
      </text>
      <text x="${viewW - pad * 2 - 10}" y="30" font-family="Arial" font-size="8" fill="#9ca3af" text-anchor="end">
        Échelle 1:${Math.round(100 / scale)}
      </text>
    </g>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
  <title>${escapeXml(plan.planImageUrl ? 'Plan Atlas' : 'Plan')}</title>
  ${bg}
  <g id="grid">${grid.join('\n    ')}</g>
  <g id="spaces">${spaces.join('\n    ')}</g>
  <g id="walls">${walls.join('\n    ')}</g>
  <g id="dimensions">${dims.join('\n    ')}</g>
  ${scaleBar}
  ${cartouche}
</svg>`
}

function renderScaleBar(_viewW: number, _viewH: number, scale: number, pad: number): string {
  const segLen = 10 // 10 m
  const barPx = segLen * scale
  const x = pad
  const y = pad - 10
  return `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="${barPx / 2}" height="4" fill="#111827"/>
      <rect x="${barPx / 2}" y="0" width="${barPx / 2}" height="4" fill="#ffffff" stroke="#111827" stroke-width="0.5"/>
      <text x="0" y="-2" font-family="Arial" font-size="7" fill="#111827">0</text>
      <text x="${barPx / 2}" y="-2" font-family="Arial" font-size="7" fill="#111827" text-anchor="middle">${segLen / 2}m</text>
      <text x="${barPx}" y="-2" font-family="Arial" font-size="7" fill="#111827" text-anchor="end">${segLen}m</text>
    </g>`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
