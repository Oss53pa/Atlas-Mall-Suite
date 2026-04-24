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

// ─── Palette type "planimetria" — tous types couverts ───

/** Couleur par catégorie/type, inspirée des plans architecturaux
 *  (aplats pastels bien saturés pour distinguer les usages). */
const CATEGORY_COLOR: Record<string, string> = {
  // Commerces & galerie
  commerce:          '#f9a8d4',  // rose pastel (mode)
  mode:              '#f9a8d4',
  bijouterie:        '#fbcfe8',
  beaute:            '#fda4af',
  tech:              '#a5b4fc',
  grande_surface:    '#93c5fd',
  big_box:           '#60a5fa',
  epicerie:          '#fde68a',
  // Restauration
  restaurant:        '#fdba74',  // orange pêche
  restauration:      '#fdba74',
  food:              '#fdba74',
  cafe:              '#fcd34d',
  bar:               '#fca5a5',
  cuisine:           '#fca5a5',
  // Loisirs
  loisirs:           '#c4b5fd',  // violet pastel
  cinema:            '#a78bfa',
  fitness:           '#f9a8d4',
  enfants:           '#fef3c7',
  aire_jeu:          '#fef3c7',
  // Santé / Services
  sante:             '#86efac',  // vert pastel
  pharmacie:         '#86efac',
  medical:           '#86efac',
  services:          '#99f6e4',  // cyan
  service:           '#99f6e4',
  banque:            '#99f6e4',
  atm:               '#99f6e4',
  bank:              '#99f6e4',
  admin:             '#e0e7ff',
  reception:         '#fef3c7',
  // Circulation & extérieur
  circulation:       '#f5f5f4',  // presque blanc
  mail_central:      '#e8d9b8',  // beige mall
  atrium:            '#e8d9b8',
  galerie:           '#f5f5f4',
  couloir:           '#f5f5f4',
  promenade:         '#e8d9b8',
  escalier:          '#cbd5e1',
  ascenseur:         '#cbd5e1',
  parking:           '#d6d3d1',
  entree:            '#bbf7d0',
  sortie:            '#fecaca',
  porte_entree:      '#bbf7d0',
  porte_automatique: '#bbf7d0',
  porte_secours:     '#fca5a5',
  porte_interieure:  '#e7e5e4',
  porte_service:     '#d6d3d1',
  sortie_secours:    '#fca5a5',
  // Sanitaires / technique / stockage
  wc:                '#a7f3d0',  // vert d'eau
  sanitaire:         '#a7f3d0',
  vestiaire:         '#d8b4fe',
  technique:         '#d1d5db',  // gris froid
  electrique:        '#d1d5db',
  chaufferie:        '#d1d5db',
  vmc:               '#d1d5db',
  tgbt:              '#d1d5db',
  ssi:               '#d1d5db',
  local_technique:   '#d1d5db',
  stockage:          '#fed7aa',  // beige orange
  reserve:           '#fed7aa',
  depot:             '#fed7aa',
  archive:           '#fed7aa',
  livraison:         '#fdba74',
  quai:              '#fdba74',
  // Atelier / culturel / exposition
  atelier:           '#fca5a5',
  workshop:          '#fca5a5',
  salle:             '#fbcfe8',
  exposition:        '#fecaca',
  culturel:          '#ddd6fe',
  amphitheatre:      '#ddd6fe',
  auditorium:        '#ddd6fe',
  bibliotheque:      '#fed7aa',
  // Info
  info:              '#bae6fd',
  kiosk:             '#bae6fd',
  // Fallbacks
  autre:             '#e7e5e4',
  other:             '#e7e5e4',
}

const DEFAULT_COLOR = '#e7e5e4'

function categoryColor(type: string): string {
  const t = type.toLowerCase()
  if (CATEGORY_COLOR[t]) return CATEGORY_COLOR[t]
  for (const key of Object.keys(CATEGORY_COLOR)) {
    if (t.includes(key)) return CATEGORY_COLOR[key]
  }
  return DEFAULT_COLOR
}

/** Filtre uniquement le pur bruit DXF (contour global, trames fines,
 *  annotations points). Par défaut on garde TOUS les autres espaces
 *  (techniques, sanitaires, stockage, ateliers...) — ils doivent être
 *  visibles pour un plan architectural complet. */
function isUsefulPolygon(s: DetectedSpace, planArea: number): boolean {
  if (s.areaSqm <= 0) return false
  // Rejette si > 85 % du plan (contour global — pas un espace utilisable)
  if (s.areaSqm > planArea * 0.85) return false
  // Rejette si < 0.5 m² (point d'annotation DXF)
  if (s.areaSqm < 0.5) return false
  // Rejette les polygones très effilés (murs, trames) — seuil strict
  const w = s.bounds.width, h = s.bounds.height
  if (w > 0 && h > 0) {
    const ratio = Math.min(w, h) / Math.max(w, h)
    if (ratio < 0.02) return false  // ultra fin → trait/mur
  }
  return true
}

// ─── Regroupement pour la légende ─────────────────────────

/** Réduit un type détaillé à une clé de catégorie pour la légende. */
function resolveLegendKey(t: string): string {
  if (/commerce|mode|bijou|beaute|tech|epicerie/.test(t)) return 'commerce'
  if (/grande_surface|big_box|anchor/.test(t))            return 'grande_surface'
  if (/restau|food|cafe|bar|cuisine/.test(t))             return 'restauration'
  if (/cinema/.test(t))                                    return 'cinema'
  if (/loisirs|enfants|aire_jeu|fitness/.test(t))          return 'loisirs'
  if (/sante|pharma|medical/.test(t))                      return 'sante'
  if (/banque|atm|services|service\b/.test(t))             return 'services'
  if (/admin|reception|bureau/.test(t))                    return 'admin'
  if (/wc|sanitaire|vestiaire/.test(t))                    return 'sanitaire'
  if (/technique|tgbt|ssi|vmc|chaufferie|electr/.test(t))  return 'technique'
  if (/stockage|reserve|depot|archive|livraison|quai/.test(t)) return 'stockage'
  if (/atelier|workshop/.test(t))                          return 'atelier'
  if (/exposition|culturel|amphi|auditorium|bibliotheque|salle/.test(t)) return 'culturel'
  if (/escalier|ascenseur/.test(t))                        return 'transit_vertical'
  if (/mail_central|atrium|promenade/.test(t))             return 'mail'
  if (/circulation|couloir|galerie/.test(t))               return 'circulation'
  if (/parking/.test(t))                                    return 'parking'
  if (/entree|porte_entree|porte_auto/.test(t))            return 'entree'
  if (/sortie|porte_secours|sortie_secours/.test(t))       return 'sortie'
  if (/porte/.test(t))                                      return 'porte'
  if (/info|kiosk/.test(t))                                return 'info'
  return 'autre'
}

const LEGEND_LABELS: Record<string, string> = {
  commerce:         'Commerces / Mode',
  grande_surface:   'Grande surface',
  restauration:     'Restauration',
  cinema:           'Cinéma',
  loisirs:          'Loisirs / Enfants',
  sante:            'Santé / Pharmacie',
  services:         'Services / Banque',
  admin:            'Administration',
  sanitaire:        'Sanitaires / Vestiaires',
  technique:        'Locaux techniques',
  stockage:         'Stockage / Livraison',
  atelier:          'Ateliers',
  culturel:         'Culturel / Exposition',
  transit_vertical: 'Escaliers / Ascenseurs',
  mail:             'Mail / Atrium',
  circulation:      'Circulation',
  parking:          'Parking',
  entree:           'Entrée',
  sortie:           'Sortie / Secours',
  porte:            'Porte',
  info:             'Point Info',
  autre:            'Autres',
}

function legendLabelFor(key: string): string {
  return LEGEND_LABELS[key] ?? key
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

  // Filtrage des espaces (strictement bruit DXF ; on garde tout le reste)
  const { visibleSpaces, parasiteSpaces } = useMemo(() => {
    const visible: DetectedSpace[] = []
    const parasite: DetectedSpace[] = []
    for (const s of plan.spaces) {
      if (isUsefulPolygon(s, planArea)) visible.push(s)
      else parasite.push(s)
    }
    // Trier par surface décroissante : les plus grands en premier →
    // les petits (WC, techniques) se superposent dessus pour rester visibles
    visible.sort((a, b) => b.areaSqm - a.areaSqm)
    return { visibleSpaces: visible, parasiteSpaces: parasite }
  }, [plan.spaces, planArea])

  // Légende dynamique : que les types réellement présents dans le plan
  const legendItems = useMemo(() => {
    const seen = new Map<string, { color: string; label: string; count: number }>()
    for (const s of visibleSpaces) {
      const t = String(s.type).toLowerCase()
      const color = s.color && s.color !== '' ? s.color : categoryColor(t)
      const groupKey = resolveLegendKey(t)
      const existing = seen.get(groupKey)
      if (existing) existing.count++
      else seen.set(groupKey, { color, label: legendLabelFor(groupKey), count: 1 })
    }
    return Array.from(seen.entries())
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.count - a.count)
  }, [visibleSpaces])

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

        {/* Murs (wallSegments) — traits foncés par-dessus les aplats */}
        {plan.wallSegments && plan.wallSegments.length > 0 && plan.wallSegments.slice(0, 5000).map((w, i) => (
          <line key={`wall-${i}`}
            x1={toX(w.x1)} y1={toY(w.y1)}
            x2={toX(w.x2)} y2={toY(w.y2)}
            stroke={theme === 'light' ? '#0f172a' : '#f5f5f4'}
            strokeWidth={Math.max(0.4, (w.thickness ?? 0.2) * viewport.scale * 0.5)}
            strokeOpacity={0.55}
            strokeLinecap="round"
          />
        ))}

        {/* Espaces — rendu architectural (aplat + contour sombre épais) */}
        {visibleSpaces.map(s => {
          const color = s.color && s.color !== '' ? s.color : categoryColor(String(s.type))
          const d = s.polygon.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p[0])} ${toY(p[1])}`).join(' ') + ' Z'
          const meta = (s.metadata ?? {}) as { tenant?: string; localNumber?: string; vacant?: boolean }
          const cx = toX(s.bounds.centerX)
          const cy = toY(s.bounds.centerY)
          const wPx = s.bounds.width * viewport.scale
          const hPx = s.bounds.height * viewport.scale
          const isHover = hoveredId === s.id
          const isTiny = Math.min(wPx, hPx) < 14
          const isSmall = Math.min(wPx, hPx) < 26
          // Label : tenant > localNumber > label du type
          const tenant = meta.tenant?.trim()
          const localN = meta.localNumber?.trim()
          const primaryLabel = tenant || localN || s.label || ''
          const secondaryLabel = (tenant && localN) ? `#${localN}` : ''
          const t = String(s.type).toLowerCase()
          const isServiceIcon = ['wc', 'sanitaire', 'atm', 'bank', 'info', 'kiosk', 'pharma'].some(k => t.includes(k))
          const fillOpacity = meta.vacant ? 0.35 : isHover ? 0.95 : 0.78
          const strokeDark = theme === 'light' ? '#1f2937' : '#f8fafc'
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
                stroke={isHover ? '#c9a068' : strokeDark}
                strokeWidth={isHover ? 1.8 : 0.8}
                strokeOpacity={isHover ? 1 : 0.55}
                strokeLinejoin="round"
              />
              {/* Hachure diagonale si vacant */}
              {meta.vacant && wPx > 30 && hPx > 30 && (
                <path d={d} fill="url(#vacantHatch)" opacity={0.35} style={{ pointerEvents: 'none' }} />
              )}
              {/* Icône service pour les petits espaces utilitaires */}
              {!isTiny && isServiceIcon && (
                <ServiceIcon type={String(s.type)} x={cx} y={cy} size={Math.min(20, Math.max(10, wPx * 0.35))} />
              )}
              {/* Label pour les espaces visibles (pas tiny et pas service-icon) */}
              {!isTiny && !isServiceIcon && primaryLabel && (() => {
                // Taille de police adaptative
                const maxByWidth = wPx / Math.max(1, primaryLabel.length) * 1.6
                const maxByHeight = hPx / 2.5
                const fontSize = Math.min(14, Math.max(6, Math.min(maxByWidth, maxByHeight)))
                const shown = primaryLabel.length > 22 ? primaryLabel.slice(0, 21) + '…' : primaryLabel
                return (
                  <>
                    <text x={cx} y={cy - (secondaryLabel ? 5 : 0)}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={fontSize}
                      fill={strokeDark}
                      fontWeight={isSmall ? 500 : 600}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}>
                      {shown}
                    </text>
                    {secondaryLabel && fontSize >= 8 && (
                      <text x={cx} y={cy + fontSize * 0.7}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize={Math.max(6, fontSize - 3)}
                        fill={mutedColor}
                        style={{ userSelect: 'none', pointerEvents: 'none' }}>
                        {secondaryLabel}
                      </text>
                    )}
                  </>
                )
              })()}
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
        style={{ background: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.5)', color: textColor, border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}` }}>
        <strong>{visibleSpaces.length}</strong> espaces · <strong>{legendItems.length}</strong> catégories
        {parasiteSpaces.length > 0 && (
          <span style={{ color: mutedColor }}> · {parasiteSpaces.length} trait/annotation</span>
        )}
        {plan.wallSegments && plan.wallSegments.length > 0 && (
          <span style={{ color: mutedColor }}> · {plan.wallSegments.length} murs</span>
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

      {/* Légende dynamique — liste uniquement les types présents dans le plan */}
      <div className="absolute bottom-3 left-3 rounded-lg p-2.5 text-[10px] max-h-[50%] overflow-y-auto"
        style={{
          background: theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.65)',
          color: textColor,
          border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}`,
          minWidth: 200,
        }}>
        <div className="text-[9px] uppercase tracking-widest font-semibold mb-2 border-b pb-1"
          style={{ color: mutedColor, borderColor: theme === 'light' ? '#e2e8f0' : '#1f2937' }}>
          Légende ({legendItems.length} catégories)
        </div>
        <div className="grid grid-cols-1 gap-y-1">
          {legendItems.map(item => (
            <div key={item.key} className="flex items-center gap-2">
              <span className="w-4 h-3 rounded-sm flex-shrink-0" style={{ background: item.color, border: `1px solid ${textColor}22` }} />
              <span className="flex-1 truncate">{item.label}</span>
              <span className="text-[9px] font-mono" style={{ color: mutedColor }}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Échelle graphique */}
      {viewport.scale > 0 && (
        <div className="absolute top-3 right-3 rounded-lg px-3 py-2 text-[10px] font-mono"
          style={{ background: theme === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.6)', color: textColor, border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}` }}>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-start">
              <div className="h-2 flex items-stretch">
                <div style={{ width: 5 * viewport.scale, background: textColor }} />
                <div style={{ width: 5 * viewport.scale, background: theme === 'light' ? '#fff' : '#000', borderTop: `1px solid ${textColor}`, borderBottom: `1px solid ${textColor}` }} />
              </div>
              <div className="flex justify-between w-full mt-0.5" style={{ fontSize: 8, color: mutedColor }}>
                <span>0</span><span>10 m</span>
              </div>
            </div>
            <div className="text-[9px]" style={{ color: mutedColor }}>
              1:{Math.round(100 / viewport.scale * 10) / 10}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MallMap2D
