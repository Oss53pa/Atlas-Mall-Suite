// ═══ MALL MAP 2D — Rendu "carte d'orientation" propre ═══
//
// Remplace l'affichage DXF brut (fouillis de polygones techniques empilés)
// par une carte type "mall directory" lisible :
//   • Fond clair
//   • Filtrage automatique des layers parasites (murs, annotations CAD,
//     trames techniques) — on ne garde que les espaces avec un type
//     utile (commerces, food, services, circulation, entrées...)
//   • Couleur pleine par catégorie (mode/resto/santé/loisirs...)
//   • Étiquette : numéro de local + nom enseigne (tenant) ou fonction
//   • Icônes service (WC, parking, info, ATM)
//   • Aucune donnée mockée — tout vient de `plan.spaces` + metadata
//     utilisateur issue de l'éditeur Atlas Studio.

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import type { ParsedPlan, DetectedSpace } from '../planReader/planEngineTypes'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// ─── Classification de types "utiles" vs "bruit" ─────────

/** Types qu'on AFFICHE dans la vue modélisée. Le reste est filtré. */
const VISIBLE_TYPES = new Set<string>([
  'commerce', 'restaurant', 'grande_surface', 'big_box',
  'loisirs', 'cinema', 'fitness',
  'services', 'service', 'atm', 'bank',
  'sante', 'pharmacie',
  'wc', 'sanitaire',
  'entree', 'sortie', 'porte_entree', 'porte_automatique',
  'parking',
  'circulation', 'mail_central', 'atrium', 'galerie',
  'info', 'kiosk',
])

/** Couleur par défaut par catégorie de type. */
const CATEGORY_COLOR: Record<string, string> = {
  commerce:         '#ec4899',  // rose vif (mode)
  restaurant:       '#f59e0b',  // orange (food)
  grande_surface:   '#3b82f6',  // bleu (anchor)
  big_box:          '#2563eb',
  loisirs:          '#8b5cf6',  // violet
  cinema:           '#8b5cf6',
  fitness:          '#f97316',
  services:         '#14b8a6',  // cyan (banques, admin)
  service:          '#14b8a6',
  atm:              '#14b8a6',
  bank:             '#14b8a6',
  sante:            '#22c55e',  // vert (pharma/santé)
  pharmacie:        '#22c55e',
  wc:               '#94a3b8',  // gris neutre
  sanitaire:        '#94a3b8',
  entree:           '#10b981',  // vert portail
  sortie:           '#10b981',
  porte_entree:     '#10b981',
  porte_automatique:'#10b981',
  parking:          '#a3a3a3',
  circulation:      '#d4c9b6',  // beige mall
  mail_central:     '#c9a068',  // bronze mall central
  atrium:           '#c9a068',
  galerie:          '#d4c9b6',
  info:             '#0ea5e9',
  kiosk:            '#0ea5e9',
}

const DEFAULT_COLOR = '#cbd5e1'

function categoryColor(type: string): string {
  const t = type.toLowerCase()
  for (const key of Object.keys(CATEGORY_COLOR)) {
    if (t.includes(key)) return CATEGORY_COLOR[key]
  }
  return DEFAULT_COLOR
}

function isVisibleType(type: string): boolean {
  const t = type.toLowerCase()
  if (VISIBLE_TYPES.has(t)) return true
  // Match partiel (ex "commerce_mode" contient "commerce")
  for (const v of VISIBLE_TYPES) if (t.includes(v)) return true
  return false
}

/** Filtre un polygone "parasite" : trop grand (≈ le plan entier), trop
 *  fin (mur), trop petit (annotation ponctuelle). */
function isUsefulPolygon(s: DetectedSpace, planArea: number): boolean {
  if (!isVisibleType(String(s.type))) return false
  if (s.areaSqm <= 0) return false
  // Rejette si > 70 % du plan (c'est souvent le contour global)
  if (s.areaSqm > planArea * 0.7) return false
  // Rejette si < 1.5 m² (annotations, points)
  if (s.areaSqm < 1.5) return false
  // Rejette si très fin (mur) — ratio largeur / longueur
  const w = s.bounds.width, h = s.bounds.height
  if (w > 0 && h > 0) {
    const ratio = Math.min(w, h) / Math.max(w, h)
    if (ratio < 0.04) return false  // très effilé → mur
  }
  return true
}

// ─── Icônes de service (SVG inline, pas de dép externe) ──

function ServiceIcon({ type, x, y, size = 12 }: { type: string; x: number; y: number; size?: number }) {
  const t = type.toLowerCase()
  // Choisir glyph simple
  let glyph = ''
  if (t.includes('wc') || t.includes('sanitaire')) glyph = '🚻'
  else if (t.includes('atm') || t.includes('bank')) glyph = '💵'
  else if (t.includes('info') || t.includes('kiosk')) glyph = 'ℹ'
  else if (t.includes('pharma') || t.includes('sante')) glyph = '⚕'
  else if (t.includes('parking')) glyph = 'P'
  else if (t.includes('restaurant') || t.includes('food')) glyph = '🍴'
  else if (t.includes('entree') || t.includes('sortie') || t.includes('porte')) glyph = '➤'
  else return null
  return (
    <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
      fontSize={size} style={{ userSelect: 'none', pointerEvents: 'none' }}>
      {glyph}
    </text>
  )
}

// ─── Composant principal ──────────────────────────────────

export interface MallMap2DProps {
  plan: ParsedPlan
  /** Affiche le contour des espaces non-filtrés en grisé (pour debug). */
  showFiltered?: boolean
  onSpaceClick?: (space: DetectedSpace) => void
  className?: string
  /** Theme clair (défaut) ou sombre. */
  theme?: 'light' | 'dark'
}

export function MallMap2D({
  plan,
  showFiltered = false,
  onSpaceClick,
  className = '',
  theme = 'light',
}: MallMap2DProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Resize
  useEffect(() => {
    const el = svgRef.current?.parentElement
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Bounds du plan
  const bounds = plan.bounds
  const planW = bounds.width
  const planH = bounds.height
  const planArea = planW * planH

  // Filtrage des espaces
  const { visibleSpaces, parasiteSpaces } = useMemo(() => {
    const visible: DetectedSpace[] = []
    const parasite: DetectedSpace[] = []
    for (const s of plan.spaces) {
      if (isUsefulPolygon(s, planArea)) visible.push(s)
      else parasite.push(s)
    }
    return { visibleSpaces: visible, parasiteSpaces: parasite }
  }, [plan.spaces, planArea])

  // Viewport : fit initial + zoom/pan state
  const [viewport, setViewport] = useState<{ scale: number; ox: number; oy: number }>({ scale: 1, ox: 0, oy: 0 })
  useEffect(() => {
    if (size.w === 0 || planW === 0) return
    const padding = 40
    const scale = Math.min(
      (size.w - padding * 2) / Math.max(1, planW),
      (size.h - padding * 2) / Math.max(1, planH),
    )
    setViewport({
      scale,
      ox: (size.w - planW * scale) / 2 - bounds.minX * scale,
      oy: (size.h - planH * scale) / 2 - bounds.minY * scale,
    })
  }, [size, planW, planH, bounds.minX, bounds.minY])

  const zoomBy = useCallback((factor: number) => {
    setViewport(v => ({ ...v, scale: Math.max(0.1, Math.min(80, v.scale * factor)) }))
  }, [])

  const resetView = useCallback(() => {
    if (size.w === 0 || planW === 0) return
    const padding = 40
    const scale = Math.min(
      (size.w - padding * 2) / Math.max(1, planW),
      (size.h - padding * 2) / Math.max(1, planH),
    )
    setViewport({
      scale,
      ox: (size.w - planW * scale) / 2 - bounds.minX * scale,
      oy: (size.h - planH * scale) / 2 - bounds.minY * scale,
    })
  }, [size, planW, planH, bounds.minX, bounds.minY])

  // Pan
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    panStart.current = { x: e.clientX, y: e.clientY, ox: viewport.ox, oy: viewport.oy }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!panStart.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setViewport(v => ({ ...v, ox: (panStart.current?.ox ?? 0) + dx, oy: (panStart.current?.oy ?? 0) + dy }))
  }
  const handleMouseUp = () => { panStart.current = null }
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)
  }

  // Helpers world → screen
  const toX = (x: number) => x * viewport.scale + viewport.ox
  const toY = (y: number) => y * viewport.scale + viewport.oy

  const bg = theme === 'light' ? '#f5f3ef' : '#0f1115'
  const textColor = theme === 'light' ? '#0f172a' : '#f5f5f4'
  const mutedColor = theme === 'light' ? '#64748b' : '#94a3b8'

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: bg }}>
      <svg
        ref={svgRef}
        width="100%" height="100%"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: panStart.current ? 'grabbing' : 'grab' }}
      >
        {/* Fond grille très discret */}
        <defs>
          <pattern id="mallgrid" width={20 * viewport.scale} height={20 * viewport.scale}
            patternUnits="userSpaceOnUse" patternTransform={`translate(${viewport.ox}, ${viewport.oy})`}>
            <rect width="100%" height="100%" fill="none" />
            <path d={`M ${20 * viewport.scale} 0 L 0 0 0 ${20 * viewport.scale}`} fill="none"
              stroke={theme === 'light' ? '#e5e0d4' : '#1f232a'}
              strokeWidth={0.5} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mallgrid)" />

        {/* Contour du plan */}
        <rect
          x={toX(bounds.minX)} y={toY(bounds.minY)}
          width={planW * viewport.scale} height={planH * viewport.scale}
          fill="none"
          stroke={theme === 'light' ? '#cbd5e1' : '#334155'}
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />

        {/* Parasites (si activé debug) */}
        {showFiltered && parasiteSpaces.map(s => {
          const d = s.polygon.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p[0])} ${toY(p[1])}`).join(' ') + ' Z'
          return <path key={s.id} d={d} fill="none" stroke={mutedColor} strokeWidth={0.5} strokeOpacity={0.2} />
        })}

        {/* Espaces utiles */}
        {visibleSpaces.map(s => {
          const color = s.color && s.color !== '' ? s.color : categoryColor(String(s.type))
          const d = s.polygon.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p[0])} ${toY(p[1])}`).join(' ') + ' Z'
          const meta = (s.metadata ?? {}) as { tenant?: string; localNumber?: string; vacant?: boolean }
          const cx = toX(s.bounds.centerX)
          const cy = toY(s.bounds.centerY)
          const wPx = s.bounds.width * viewport.scale
          const hPx = s.bounds.height * viewport.scale
          const isHover = hoveredId === s.id
          const isSmall = Math.min(wPx, hPx) < 26
          // Label : tenant > localNumber > label type
          const tenant = meta.tenant?.trim()
          const localN = meta.localNumber?.trim()
          const primaryLabel = tenant || localN || s.label || ''
          const secondaryLabel = (tenant && localN) ? `#${localN}` : ''
          const t = String(s.type).toLowerCase()
          const isServiceIcon = ['wc', 'sanitaire', 'atm', 'bank', 'info', 'kiosk', 'pharma', 'sante', 'entree', 'sortie', 'porte'].some(k => t.includes(k))
          const fillOpacity = meta.vacant ? 0.25 : isHover ? 0.75 : 0.6
          return (
            <g key={s.id}
              onMouseEnter={() => setHoveredId(s.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSpaceClick?.(s)}
              style={{ cursor: onSpaceClick ? 'pointer' : 'default' }}
            >
              <path
                d={d}
                fill={color}
                fillOpacity={fillOpacity}
                stroke={isHover ? textColor : color}
                strokeWidth={isHover ? 2 : 1}
                strokeLinejoin="round"
              />
              {/* Hachure diagonale si vacant */}
              {meta.vacant && wPx > 30 && hPx > 30 && (
                <path d={d} fill="url(#vacantHatch)" opacity={0.3} />
              )}
              {/* Icône service ou label */}
              {!isSmall && isServiceIcon && (
                <ServiceIcon type={String(s.type)} x={cx} y={cy} size={Math.min(22, Math.max(10, wPx * 0.4))} />
              )}
              {!isSmall && !isServiceIcon && primaryLabel && (
                <>
                  <text x={cx} y={cy - (secondaryLabel ? 6 : 0)}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={Math.min(14, Math.max(8, wPx / Math.max(1, primaryLabel.length) * 0.9))}
                    fill={textColor}
                    fontWeight={600}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}>
                    {primaryLabel.length > 18 ? primaryLabel.slice(0, 17) + '…' : primaryLabel}
                  </text>
                  {secondaryLabel && (
                    <text x={cx} y={cy + 8}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={Math.min(10, Math.max(7, wPx / 12))}
                      fill={mutedColor}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      {secondaryLabel}
                    </text>
                  )}
                </>
              )}
            </g>
          )
        })}

        <defs>
          <pattern id="vacantHatch" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 0 6 L 6 0" stroke={textColor} strokeWidth={0.6} strokeOpacity={0.4} />
          </pattern>
        </defs>
      </svg>

      {/* Stats + contrôles */}
      <div className="absolute top-3 left-3 rounded-lg px-3 py-1.5 text-[11px] font-mono"
        style={{ background: theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.5)', color: textColor, border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}` }}>
        <span>{visibleSpaces.length}</span> espaces
        {parasiteSpaces.length > 0 && (
          <span className="text-gray-500"> · {parasiteSpaces.length} bruit filtré</span>
        )}
      </div>

      <div className="absolute bottom-3 right-3 flex gap-1 rounded-lg p-1"
        style={{ background: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.6)', border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}` }}>
        <button onClick={() => zoomBy(1.25)} className="p-1.5 hover:bg-black/5 rounded" title="Zoom +">
          <ZoomIn size={14} style={{ color: textColor }} />
        </button>
        <button onClick={() => zoomBy(0.8)} className="p-1.5 hover:bg-black/5 rounded" title="Zoom −">
          <ZoomOut size={14} style={{ color: textColor }} />
        </button>
        <button onClick={resetView} className="p-1.5 hover:bg-black/5 rounded" title="Recadrer">
          <Maximize2 size={14} style={{ color: textColor }} />
        </button>
      </div>

      {/* Légende */}
      <div className="absolute bottom-3 left-3 rounded-lg p-2 text-[10px] grid grid-cols-2 gap-x-3 gap-y-1"
        style={{ background: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.6)', color: textColor, border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}` }}>
        {[
          { c: '#ec4899', l: 'Mode / Commerce' },
          { c: '#f59e0b', l: 'Restauration' },
          { c: '#3b82f6', l: 'Grande surface' },
          { c: '#8b5cf6', l: 'Loisirs / Cinéma' },
          { c: '#22c55e', l: 'Santé' },
          { c: '#14b8a6', l: 'Services / Banque' },
          { c: '#10b981', l: 'Entrée / Sortie' },
          { c: '#c9a068', l: 'Mail / Atrium' },
        ].map(x => (
          <div key={x.l} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: x.c, opacity: 0.7 }} />
            <span>{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MallMap2D
