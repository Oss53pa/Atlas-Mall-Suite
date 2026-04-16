// ═══ WAYFINDER RENDERER — Vue publique style mall directory + exports ═══
// Génère un plan d'orientation client (style "vous êtes ici") :
//  - Polygones colorés par tenant/catégorie
//  - Labels lisibles (enseignes)
//  - POIs (sanitaires, ascenseurs, sorties)
//  - Légende compacte
//  - Exports PNG, SVG, HTML standalone (uploadable web/borne)

import React, { useMemo, useRef, useState } from 'react'

export interface WayfinderSpace {
  id: string
  label: string
  category?: string                // 'mode', 'restauration', 'services'…
  status?: 'occupied' | 'vacant' | 'reserved' | 'works' | 'negotiation'
  tenantName?: string
  brandColor?: string              // si fourni, override la couleur catégorie
  logoUrl?: string                 // si fourni, affiche le logo
  polygon: [number, number][]      // mètres, origin top-left
}

export interface WayfinderPoi {
  id: string
  label: string
  x: number
  y: number
  /** Type d'icône SVG. */
  kind: 'wc' | 'lift' | 'escalator' | 'exit' | 'info' | 'parking' | 'food' | 'youAreHere'
  color?: string
}

export interface WayfinderTheme {
  /** Préset visuel. */
  preset: 'modern' | 'minimal' | 'classic' | 'dark'
  /** Couleur fond. */
  background: string
  /** Couleur texte principale. */
  textColor: string
  /** Couleur séparateurs. */
  strokeColor: string
  /** Couleurs par catégorie. */
  categoryColors: Record<string, string>
  /** Police principale. */
  fontFamily: string
}

export const THEME_PRESETS: Record<WayfinderTheme['preset'], WayfinderTheme> = {
  modern: {
    preset: 'modern',
    background: '#fafafa',
    textColor: '#1e293b',
    strokeColor: '#cbd5e1',
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    categoryColors: {
      mode: '#ec4899', restauration: '#f59e0b', services: '#3b82f6',
      loisirs: '#8b5cf6', alimentaire: '#10b981', beaute: '#f43f5e',
      electronique: '#06b6d4', sport: '#84cc16', enfants: '#fbbf24',
      sante: '#0ea5e9', maison: '#a855f7', bijouterie: '#d946ef',
      autres: '#64748b', vacant: '#e2e8f0',
    },
  },
  minimal: {
    preset: 'minimal',
    background: '#ffffff',
    textColor: '#000000',
    strokeColor: '#e5e7eb',
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
    categoryColors: {
      mode: '#000000', restauration: '#404040', services: '#737373',
      loisirs: '#a3a3a3', alimentaire: '#525252', beaute: '#262626',
      electronique: '#737373', sport: '#404040', enfants: '#a3a3a3',
      sante: '#525252', maison: '#262626', bijouterie: '#000000',
      autres: '#d4d4d4', vacant: '#f5f5f5',
    },
  },
  classic: {
    preset: 'classic',
    background: '#fdf6e3',
    textColor: '#3a2c1a',
    strokeColor: '#a17d4a',
    fontFamily: '"Georgia", serif',
    categoryColors: {
      mode: '#8b3a3a', restauration: '#a47148', services: '#3d5a80',
      loisirs: '#7d4f9b', alimentaire: '#3a7d44', beaute: '#a4334d',
      electronique: '#365b6d', sport: '#5a7a2a', enfants: '#c89b3a',
      sante: '#2d6a85', maison: '#7a4f6a', bijouterie: '#a17d4a',
      autres: '#8a7a5a', vacant: '#e8d8b5',
    },
  },
  dark: {
    preset: 'dark',
    background: '#0f172a',
    textColor: '#f1f5f9',
    strokeColor: '#334155',
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    categoryColors: {
      mode: '#f472b6', restauration: '#fbbf24', services: '#60a5fa',
      loisirs: '#a78bfa', alimentaire: '#34d399', beaute: '#fb7185',
      electronique: '#22d3ee', sport: '#a3e635', enfants: '#fcd34d',
      sante: '#38bdf8', maison: '#c084fc', bijouterie: '#e879f9',
      autres: '#94a3b8', vacant: '#1e293b',
    },
  },
}

interface WayfinderRendererProps {
  spaces: WayfinderSpace[]
  pois?: WayfinderPoi[]
  /** Bornes du plan en mètres. */
  planBounds: { width: number; height: number }
  theme?: WayfinderTheme
  /** Titre affiché en haut (nom du centre). */
  title?: string
  /** Sous-titre (étage, date…). */
  subtitle?: string
  /** Logo URL en header. */
  logoUrl?: string
  /** Affiche les vacants en grisé ? */
  showVacant?: boolean
  /** Affiche la légende ? */
  showLegend?: boolean
  className?: string
  /** Callback clic sur un space. */
  onSpaceClick?: (space: WayfinderSpace) => void
}

// ─── POI icons (SVG paths) ──────────────────────────────────

const POI_ICONS: Record<WayfinderPoi['kind'], string> = {
  wc: 'M9 4v3M15 4v3M5 11h14l-1 9H6l-1-9z',
  lift: 'M7 4h10v16H7zM12 8l-3 3h6zM12 16l-3-3h6z',
  escalator: 'M4 6l4 14h12M16 4h4v4',
  exit: 'M14 7v10M9 12h11l-3-3M9 12l3 3M4 4h6v16H4z',
  info: 'M12 9h.01M12 13v4M12 22a10 10 0 110-20 10 10 0 010 20z',
  parking: 'M9 4h6a4 4 0 010 8h-2v8H9V4z',
  food: 'M5 3v9a3 3 0 003 3v6M5 3v18M5 8h3M16 3v18M19 3v18M16 8h3',
  youAreHere: 'M12 2a8 8 0 00-8 8c0 6 8 12 8 12s8-6 8-12a8 8 0 00-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z',
}

const POI_COLORS: Record<WayfinderPoi['kind'], string> = {
  wc: '#0ea5e9', lift: '#7c3aed', escalator: '#f59e0b', exit: '#10b981',
  info: '#3b82f6', parking: '#64748b', food: '#f97316', youAreHere: '#ef4444',
}

// ─── SVG generation (réutilisé pour render et export) ──────

function generateSvg(props: Required<Pick<WayfinderRendererProps, 'spaces' | 'planBounds' | 'theme' | 'showVacant' | 'showLegend'>> & {
  pois?: WayfinderPoi[]; title?: string; subtitle?: string; logoUrl?: string
  width: number; height: number
}): string {
  const { spaces, planBounds, theme, pois, title, subtitle, showVacant, showLegend, width, height } = props
  const headerH = title ? 60 : 0
  const legendW = showLegend ? 180 : 0
  const planAreaW = width - legendW
  const planAreaH = height - headerH
  const sx = planAreaW / planBounds.width
  const sy = planAreaH / planBounds.height
  const scale = Math.min(sx, sy) * 0.95
  const offsetX = (planAreaW - planBounds.width * scale) / 2
  const offsetY = headerH + (planAreaH - planBounds.height * scale) / 2

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="${theme.fontFamily}">`)
  parts.push(`<rect width="${width}" height="${height}" fill="${theme.background}"/>`)

  // Header
  if (title || subtitle) {
    parts.push(`<g>`)
    parts.push(`<rect x="0" y="0" width="${width}" height="${headerH}" fill="${theme.background}" stroke="${theme.strokeColor}" stroke-width="1"/>`)
    if (title) parts.push(`<text x="${width / 2}" y="32" text-anchor="middle" font-size="22" font-weight="700" fill="${theme.textColor}">${escapeXml(title)}</text>`)
    if (subtitle) parts.push(`<text x="${width / 2}" y="50" text-anchor="middle" font-size="11" fill="${theme.textColor}" opacity="0.6">${escapeXml(subtitle)}</text>`)
    parts.push(`</g>`)
  }

  // Spaces
  parts.push(`<g transform="translate(${offsetX} ${offsetY}) scale(${scale})">`)
  const usedCategories = new Set<string>()
  for (const sp of spaces) {
    const cat = sp.category ?? 'autres'
    if (sp.status === 'vacant' && !showVacant) continue
    const fillColor = sp.brandColor
      ?? (sp.status === 'vacant' ? theme.categoryColors.vacant : (theme.categoryColors[cat] ?? theme.categoryColors.autres))
    usedCategories.add(cat)
    const pts = sp.polygon.map(p => `${p[0]},${p[1]}`).join(' ')
    if (sp.polygon.length < 3) continue
    const opacity = sp.status === 'vacant' ? 0.4 : 0.92
    parts.push(`<polygon points="${pts}" fill="${fillColor}" fill-opacity="${opacity}" stroke="${theme.strokeColor}" stroke-width="${0.4 / scale}"/>`)
    // Label centré
    const cx = sp.polygon.reduce((s, p) => s + p[0], 0) / sp.polygon.length
    const cy = sp.polygon.reduce((s, p) => s + p[1], 0) / sp.polygon.length
    const text = sp.tenantName ?? sp.label
    if (text && text.length < 30) {
      const fontSize = Math.max(0.8, Math.min(2.4, 1.6 / scale * 1.2))
      parts.push(`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="600" fill="${theme.textColor}">${escapeXml(text)}</text>`)
    }
  }
  // POIs (icons)
  if (pois) {
    for (const poi of pois) {
      const color = poi.color ?? POI_COLORS[poi.kind]
      const path = POI_ICONS[poi.kind]
      const sz = 4 / scale
      parts.push(`<g transform="translate(${poi.x - sz / 2} ${poi.y - sz / 2}) scale(${sz / 24})">`)
      parts.push(`<circle cx="12" cy="12" r="13" fill="white" stroke="${color}" stroke-width="2"/>`)
      parts.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
      parts.push(`</g>`)
    }
  }
  parts.push(`</g>`)

  // Legend
  if (showLegend) {
    const lx = width - legendW + 10
    parts.push(`<g>`)
    parts.push(`<rect x="${width - legendW}" y="${headerH}" width="${legendW}" height="${height - headerH}" fill="${theme.background}" stroke="${theme.strokeColor}" stroke-width="1"/>`)
    parts.push(`<text x="${lx}" y="${headerH + 22}" font-size="13" font-weight="700" fill="${theme.textColor}">Légende</text>`)
    let ly = headerH + 42
    const cats = Array.from(usedCategories).sort()
    for (const c of cats) {
      const color = theme.categoryColors[c] ?? theme.categoryColors.autres
      parts.push(`<rect x="${lx}" y="${ly - 8}" width="12" height="12" fill="${color}" stroke="${theme.strokeColor}"/>`)
      parts.push(`<text x="${lx + 18}" y="${ly + 1}" font-size="11" fill="${theme.textColor}">${escapeXml(c)}</text>`)
      ly += 18
    }
    if (pois && pois.length > 0) {
      ly += 12
      parts.push(`<text x="${lx}" y="${ly}" font-size="11" font-weight="600" fill="${theme.textColor}">Points d'intérêt</text>`)
      ly += 18
      const seen = new Set<string>()
      for (const poi of pois) {
        if (seen.has(poi.kind)) continue
        seen.add(poi.kind)
        const color = poi.color ?? POI_COLORS[poi.kind]
        parts.push(`<g transform="translate(${lx} ${ly - 8}) scale(0.5)">`)
        parts.push(`<circle cx="12" cy="12" r="13" fill="white" stroke="${color}" stroke-width="2"/>`)
        parts.push(`<path d="${POI_ICONS[poi.kind]}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
        parts.push(`</g>`)
        parts.push(`<text x="${lx + 18}" y="${ly + 1}" font-size="11" fill="${theme.textColor}">${poi.kind}</text>`)
        ly += 18
      }
    }
    parts.push(`</g>`)
  }
  parts.push(`</svg>`)
  return parts.join('')
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[ch] ?? ch))
}

// ─── React component ───────────────────────────────────────

export function WayfinderRenderer(props: WayfinderRendererProps) {
  const theme = props.theme ?? THEME_PRESETS.modern
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1000)
  const [height, setHeight] = useState(700)

  // Mesure du conteneur
  React.useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setWidth(Math.max(400, e.contentRect.width))
        setHeight(Math.max(300, e.contentRect.height))
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const svg = useMemo(() => generateSvg({
    spaces: props.spaces,
    planBounds: props.planBounds,
    theme,
    pois: props.pois,
    title: props.title,
    subtitle: props.subtitle,
    logoUrl: props.logoUrl,
    showVacant: props.showVacant ?? true,
    showLegend: props.showLegend ?? true,
    width,
    height,
  }), [props, theme, width, height])

  return (
    <div ref={containerRef} className={`w-full h-full ${props.className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: svg }} />
  )
}

// ─── Exports ───────────────────────────────────────────────

export interface WayfinderExportInput extends Omit<WayfinderRendererProps, 'className' | 'onSpaceClick'> {
  width?: number
  height?: number
}

/** Export SVG (vector, le meilleur pour réimpression / wayfinder kiosk). */
export function exportWayfinderSvg(input: WayfinderExportInput): string {
  return generateSvg({
    spaces: input.spaces,
    planBounds: input.planBounds,
    theme: input.theme ?? THEME_PRESETS.modern,
    pois: input.pois,
    title: input.title,
    subtitle: input.subtitle,
    logoUrl: input.logoUrl,
    showVacant: input.showVacant ?? true,
    showLegend: input.showLegend ?? true,
    width: input.width ?? 1920,
    height: input.height ?? 1080,
  })
}

/** Export PNG via canvas (data URL). */
export async function exportWayfinderPng(input: WayfinderExportInput): Promise<string> {
  const svg = exportWayfinderSvg(input)
  const w = input.width ?? 1920
  const h = input.height ?? 1080
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Export HTML standalone (un seul fichier auto-contenu, uploadable web/borne). */
export function exportWayfinderHtml(input: WayfinderExportInput): string {
  const svg = exportWayfinderSvg(input)
  const title = input.title ?? 'Plan du centre'
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${escapeXml(title)} — plan d'orientation interactif">
<title>${escapeXml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; background: ${input.theme?.background ?? '#fafafa'}; }
  body { display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .wayfinder { width: 100vw; height: 100vh; }
  .wayfinder svg { width: 100%; height: 100%; display: block; }
  /* Touch-friendly hover for kiosks */
  .wayfinder polygon:hover { stroke-width: 0.8 !important; cursor: pointer; }
  /* Zoom on tap (mobile/kiosk) */
  @media (pointer: coarse) {
    body { font-size: 1.2rem; }
  }
</style>
</head>
<body>
<div class="wayfinder">${svg}</div>
<script>
  // Pan + zoom basique pour borne tactile
  (function() {
    const svg = document.querySelector('svg');
    if (!svg) return;
    let scale = 1, tx = 0, ty = 0;
    let dragging = false, lastX = 0, lastY = 0;
    const root = svg.querySelector('g');
    const apply = () => { if (root) root.setAttribute('transform-origin','center'); svg.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; };
    svg.style.transformOrigin = '50% 50%';
    svg.style.transition = 'transform 0.1s';
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      scale = Math.max(0.5, Math.min(4, scale - e.deltaY * 0.001));
      apply();
    }, { passive: false });
    svg.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', e => {
      if (!dragging) return;
      tx += e.clientX - lastX;
      ty += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      apply();
    });
    svg.addEventListener('pointerup', e => { dragging = false; });
    document.body.addEventListener('dblclick', () => { scale = 1; tx = 0; ty = 0; apply(); });
  })();
</script>
</body>
</html>`
}

/** Helpers de download. */
export function downloadString(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}
