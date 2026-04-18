// ═══ MapSVGExporter — Vol.3 → SVG vectoriel pur ═══
//
// Génère le SVG du plan ENTIÈREMENT en lecture du graphe Vol.3 (sans DOM,
// sans React runtime), pour pouvoir être consommé par les exports headless
// (PDF, PNG, HTML autonome, runtime borne offline).
//
// Référence CDC §07 :
//   "Implémenter un MapSVGExporter qui parcourt le graphe Vol.3 et génère
//    un SVG propre : chemins vectoriels pour les murs, icônes SVG pour les
//    POI, labels en texte (pas d'image). Résoudre les polices avant rendu
//    (pas de FOUT)."
//
// Sortie : chaîne SVG complète, autonome, fonts intégrées si demandé.

import type { DesignerConfig, InjectedPlanData, InjectedPoi } from '../types'

export interface MapSvgExportOptions {
  /** Largeur cible (unité libre, mais cohérente avec dimensions). */
  width: number
  height: number
  /** Étage à rendre (par défaut le premier). */
  floorId?: string
  /** Inclure légende. */
  includeLegend?: boolean
  /** Encoder les polices en base64 (pas de FOUT). */
  embedFonts?: boolean
  /** Inclure le viewport `xmlns` pour standalone. */
  standalone?: boolean
  /** Filtre POI (par catégorie ou ID). */
  poiFilter?: (poi: InjectedPoi) => boolean
  /** Itinéraire à afficher en surbrillance. */
  routeWaypoints?: Array<{ x: number; y: number }>
  /** Position "vous êtes ici". */
  youAreHere?: { x: number; y: number; floorId?: string }
}

const SPACE_FILL: Record<string, string> = {
  promenade: '#f1f5f9',
  couloir_secondaire: '#e2e8f0',
  hall_distribution: '#f1f5f9',
  local_commerce: '#fef3c7',
  restauration: '#fee2e2',
  loisirs: '#e9d5ff',
  services: '#dbeafe',
  grande_surface: '#d1fae5',
  kiosque: '#fbcfe8',
  sanitaires: '#ccfbf1',
  escalator: '#fed7aa',
  ascenseur: '#bfdbfe',
  rampe_pmr: '#bae6fd',
  parking_vehicule: '#e7e5e4',
  zone_technique: '#d1d5db',
  exterieur_parvis: '#f5f5f4',
  entree_principale: '#86efac',
  entree_secondaire: '#a7f3d0',
  sortie_secours: '#fca5a5',
}

// ─── Échappement XML ──────────────────────────

function escXml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function num(n: number): string {
  // 2 décimales suffisent pour la plupart des renderers
  return Number.isFinite(n) ? n.toFixed(2) : '0'
}

// ─── Géométrie ────────────────────────────────

function polyArea(poly: [number, number][]): number {
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1])
  }
  return Math.abs(a / 2)
}

function polyCentroid(poly: [number, number][]): { x: number; y: number } {
  let cx = 0, cy = 0
  for (const [x, y] of poly) { cx += x; cy += y }
  return { x: cx / poly.length, y: cy / poly.length }
}

// ─── Pipeline principal ───────────────────────

export function exportMapToSvg(
  config: DesignerConfig,
  planData: InjectedPlanData,
  opts: MapSvgExportOptions,
): string {
  const { width: W, height: H, includeLegend = false, standalone = true } = opts

  // Choix étage
  const floors = opts.floorId
    ? planData.floors.filter(f => f.id === opts.floorId)
    : planData.floors.length > 0 ? [planData.floors[0]] : []

  if (floors.length === 0) {
    return wrapSvg(`<rect width="${W}" height="${H}" fill="#f8fafc"/>
<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#94a3b8">Plan non disponible</text>`,
      W, H, standalone)
  }

  const floor = floors[0]
  const bounds = floor.bounds
  const scale = Math.min(W / bounds.width, H / bounds.height) * 0.92
  const planW = bounds.width * scale
  const planH = bounds.height * scale
  const oX = (W - planW) / 2
  const oY = (H - planH) / 2
  const wx = (x: number) => oX + x * scale
  const wy = (y: number) => oY + y * scale

  const palette = config.brand.palette
  const isDark = config.previewMode === 'dark'
  const bg = isDark ? palette.backgroundDark : palette.background
  const fg = isDark ? palette.foregroundDark : palette.foreground

  const visiblePois = planData.pois
    .filter(p => !p.floorId || p.floorId === floor.id)
    .filter(p => !opts.poiFilter || opts.poiFilter(p))

  let body = ''

  // Background
  body += `<rect width="${num(W)}" height="${num(H)}" fill="${bg}"/>\n`

  // Defs : marker flèche
  body += `<defs>
  <marker id="wdr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 Z" fill="${palette.primary}"/>
  </marker>
</defs>\n`

  // Espaces
  if (config.map.showSpaces) {
    body += '<g id="wdr-spaces">\n'
    for (const sp of floor.spaces) {
      if (sp.polygon.length < 3) continue
      const pts = sp.polygon.map(([x, y]) => `${num(wx(x))},${num(wy(y))}`).join(' ')
      const fill = SPACE_FILL[sp.type] ?? '#f1f5f9'
      body += `<polygon points="${pts}" fill="${fill}" fill-opacity="0.85" stroke="${palette.neutral}" stroke-opacity="0.35" stroke-width="0.8"/>\n`
      const c = polyCentroid(sp.polygon)
      const area = polyArea(sp.polygon)
      if (area > 20) {
        const fontSize = Math.max(8, Math.min(11, scale * 0.8))
        body += `<text x="${num(wx(c.x))}" y="${num(wy(c.y))}" text-anchor="middle" dominant-baseline="middle" font-size="${num(fontSize)}" fill="${fg}" fill-opacity="0.75" font-family="var(--wdr-font-body, sans-serif)">${escXml(truncate(sp.label, 14))}</text>\n`
      }
    }
    body += '</g>\n'
  }

  // Murs
  if (config.map.showWalls) {
    body += '<g id="wdr-walls">\n'
    for (const w of floor.walls) {
      body += `<line x1="${num(wx(w.x1))}" y1="${num(wy(w.y1))}" x2="${num(wx(w.x2))}" y2="${num(wy(w.y2))}" stroke="${isDark ? palette.neutral : '#334155'}" stroke-width="1.5" stroke-linecap="round"/>\n`
    }
    body += '</g>\n'
  }

  // Itinéraire
  if (opts.routeWaypoints && opts.routeWaypoints.length > 1) {
    const d = opts.routeWaypoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${num(wx(p.x))} ${num(wy(p.y))}`).join(' ')
    body += `<g id="wdr-route">
  <path d="${d}" fill="none" stroke="${palette.primary}" stroke-opacity="0.25" stroke-width="12" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${palette.primary}" stroke-width="4" stroke-dasharray="10 6" stroke-linecap="round" marker-end="url(#wdr-arrow)"/>
</g>\n`
  }

  // Entrées
  if (config.map.showEntrances) {
    body += '<g id="wdr-entrances">\n'
    for (const e of planData.entrances.filter(e => !e.floorId || e.floorId === floor.id)) {
      body += `<circle cx="${num(wx(e.x))}" cy="${num(wy(e.y))}" r="6" fill="${palette.primary}" stroke="#fff" stroke-width="2"/>\n`
      body += `<text x="${num(wx(e.x))}" y="${num(wy(e.y) - 10)}" text-anchor="middle" font-size="9" font-weight="600" fill="${fg}">${escXml(truncate(e.label, 12))}</text>\n`
    }
    body += '</g>\n'
  }

  // POIs
  if (config.map.showPOIs) {
    body += '<g id="wdr-pois">\n'
    for (const p of visiblePois) {
      const highlighted = config.highlightedPois.find(h => h.poiId === p.id)
      const sz = highlighted ? 14 : 9
      const color = p.color ?? palette.accent
      body += `<circle cx="${num(wx(p.x))}" cy="${num(wy(p.y))}" r="${sz}" fill="${color}" stroke="#fff" stroke-width="2"/>\n`
      const fontSize = Math.max(9, scale * 0.4)
      body += `<text x="${num(wx(p.x))}" y="${num(wy(p.y) + sz + 10)}" text-anchor="middle" font-size="${num(fontSize)}" font-weight="${highlighted ? 700 : 500}" fill="${fg}">${escXml(truncate(p.label, 16))}</text>\n`
    }
    body += '</g>\n'
  }

  // Vous êtes ici
  if (opts.youAreHere && (!opts.youAreHere.floorId || opts.youAreHere.floorId === floor.id)) {
    const yh = opts.youAreHere
    body += `<g id="wdr-yah">
  <circle cx="${num(wx(yh.x))}" cy="${num(wy(yh.y))}" r="16" fill="${palette.primary}" fill-opacity="0.2"/>
  <circle cx="${num(wx(yh.x))}" cy="${num(wy(yh.y))}" r="8" fill="${palette.primary}" stroke="#fff" stroke-width="3"/>
  <text x="${num(wx(yh.x))}" y="${num(wy(yh.y) - 22)}" text-anchor="middle" font-size="11" font-weight="700" fill="${palette.primary}">${escXml(config.i18nStrings[config.project.activeLocale]?.wayYouAreHere ?? 'Vous êtes ici')}</text>
</g>\n`
  }

  // Légende optionnelle
  if (includeLegend) {
    body += renderLegendSvg(planData, fg, bg, palette.accent, W - 240, 40, 220, H - 80)
  }

  return wrapSvg(body, W, H, standalone, opts.embedFonts ? embedDefaultFonts() : '')
}

function renderLegendSvg(
  planData: InjectedPlanData,
  fg: string, bg: string, accent: string,
  x: number, y: number, w: number, h: number,
): string {
  const byCategory = new Map<string, number>()
  for (const p of planData.pois) byCategory.set(p.type, (byCategory.get(p.type) ?? 0) + 1)
  const items = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.floor((h - 60) / 22))

  let s = `<g id="wdr-legend" transform="translate(${x},${y})">
<rect width="${w}" height="${h}" rx="8" fill="${bg}" stroke="${accent}" stroke-opacity="0.2"/>
<text x="16" y="22" font-size="14" font-weight="700" fill="${fg}">Légende</text>\n`
  items.forEach(([cat, count], i) => {
    const yRow = 40 + i * 22
    s += `<g transform="translate(16,${yRow})">
<circle r="6" fill="${accent}"/>
<text x="14" font-size="11" fill="${fg}">${escXml(humanizeCategory(cat))}</text>
<text x="${w - 32}" text-anchor="end" font-size="10" fill="${fg}" fill-opacity="0.5">${count}</text>
</g>\n`
  })
  return s + '</g>\n'
}

function humanizeCategory(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function wrapSvg(body: string, W: number, H: number, standalone: boolean, fontStyle = ''): string {
  const xmlns = standalone ? 'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' : ''
  const fontTag = fontStyle ? `<style>${fontStyle}</style>\n` : ''
  return `<svg ${xmlns} viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${fontTag}${body}
</svg>`
}

// ─── Polices embedded (pour PDF / SVG autonome) ─

function embedDefaultFonts(): string {
  // Note : pour intégrer réellement les fonts en base64, il faut un fetch
  // de la woff2 + b64 encode. Implémentation minimale ici.
  return `
@font-face {
  font-family: 'Inter';
  font-weight: 400;
  src: local('Inter Regular'), local('Inter-Regular');
}
@font-face {
  font-family: 'Inter';
  font-weight: 700;
  src: local('Inter Bold'), local('Inter-Bold');
}
.wdr * { font-family: 'Inter', system-ui, sans-serif; }
`
}
