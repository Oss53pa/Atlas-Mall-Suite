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

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import type { ParsedPlan, DetectedSpace } from '../planReader/planEngineTypes'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useProph3tOverlaysStore } from '../stores/proph3tOverlaysStore'
import { useSignagePlacementStore } from '../stores/signagePlacementStore'
import { useSignageEditUiStore } from '../stores/signageEditUiStore'
import { resolveSignageKind } from '../proph3t/libraries/signageCatalog'
import { useActiveProjectId } from '../../../../hooks/useActiveProject'

// ─── Palette type "planimetria" — tous types couverts ───

/** Couleur par catégorie/type, inspirée des plans architecturaux
 *  (aplats pastels bien saturés pour distinguer les usages).
 *  Les circulations (mail, galerie, couloir) sont en BEIGE CRÈME
 *  clair — surtout pas rose (qui est réservé aux commerces). */
export const CATEGORY_COLOR: Record<string, string> = {
  // ─── Palette "planimetria" muted — inspirée plans architecte chinois/européens ───
  // Tous les tons sont desaturés (saturation ~35-45%) pour ressembler à un
  // plan d'architecte imprimé, pas à un écran saturé.

  // Commerces & galerie — roses/saumons/coraux poudrés
  commerce:          '#e8b4bd',  // rose poudré
  mode:              '#e8b4bd',
  bijouterie:        '#ddb0b8',  // rose salé plus clair
  beaute:            '#d9a0a9',  // corail pastel
  tech:              '#b3b8cc',  // bleu-gris doux
  grande_surface:    '#a8bcc8',  // bleu ardoise doux
  big_box:           '#95a9bb',  // bleu ardoise foncé
  epicerie:          '#e0c984',  // moutarde pastel
  // Restauration — pêche, abricot, butter
  restaurant:        '#e8a87c',  // pêche
  restauration:      '#e8a87c',
  food:              '#e8a87c',
  cafe:              '#e3b070',  // butter warm
  bar:               '#cc7b6e',  // terracotta clair
  cuisine:           '#cc7b6e',
  // Loisirs — lavande, violet doux
  loisirs:           '#b8a3c9',  // lavande
  cinema:            '#a895b8',  // violet plus profond
  fitness:           '#d9a0a9',
  enfants:           '#e6d9a2',
  aire_jeu:          '#e6d9a2',
  // Santé / Services — vert sage, bleu-vert doux
  sante:             '#a8c29a',  // sage
  pharmacie:         '#a8c29a',
  medical:           '#a8c29a',
  services:          '#9cbfbc',  // vert d'eau
  service:           '#9cbfbc',
  banque:            '#9cbfbc',
  atm:               '#9cbfbc',
  bank:              '#9cbfbc',
  admin:             '#c7ccd9',  // bleu doux
  reception:         '#e6d9a2',
  // Circulation & extérieur — BEIGE CRÈME (pas rose !)
  circulation:       '#f3ecd8',  // crème chaud — couloirs intérieurs
  mail_central:      '#e8d9b8',  // beige sable — mail principal
  mail_secondaire:   '#ece0c4',
  atrium:            '#e8d9b8',
  galerie:           '#efe5cd',  // beige galerie marchande
  couloir:           '#f3ecd8',
  couloir_secondaire:'#f3ecd8',
  promenade:         '#e8d9b8',
  escalier:          '#cbd5e1',
  ascenseur:         '#cbd5e1',
  parking:           '#6b7280',  // gris asphalte (pas beige — voitures)
  voie_circulation:  '#6b7280',
  voie_principale:   '#4b5563',  // asphalte foncé — axe majeur
  voie_secondaire:   '#64748b',  // asphalte moyen — desserte
  voie_pompier:      '#ef4444',  // rouge — voie pompier
  voie_livraison:    '#f59e0b',  // orange — voie livraison
  rond_point:        '#6b7280',
  carrefour:         '#6b7280',
  passage_pieton:    '#fbbf24',  // zébras jaunes
  voirie:            '#6b7280',
  asphalte:          '#6b7280',
  // Routes publiques hors-site — asphalte foncé (environnement urbain)
  route_autoroute:       '#334155',
  route_boulevard:       '#475569',
  route_avenue:          '#4b5563',
  route_rue_principale:  '#57606a',
  route_rue_secondaire:  '#64748b',
  route_impasse:         '#64748b',
  route_rond_point_public: '#475569',
  route_carrefour_public: '#475569',
  route_pont:            '#6b7280',
  route_tunnel:          '#374151',
  route_trottoir_public: '#a3a3a3',
  terrasse:          '#d9c9a5',
  terre_plein:       '#7fa874',
  parvis:            '#e5dcc2',
  trottoir:          '#d7cfbf',
  pedestrian:        '#d7cfbf',
  entree:            '#bbf7d0',
  sortie:            '#fecaca',
  porte_entree:      '#bbf7d0',
  porte_automatique: '#bbf7d0',
  porte_secours:     '#fca5a5',
  porte_interieure:  '#e7e5e4',
  porte_service:     '#d6d3d1',
  sortie_secours:    '#fca5a5',
  // Sanitaires / technique / stockage — tons terreux muted
  wc:                '#b8d0bf',  // vert d'eau pastel
  sanitaire:         '#b8d0bf',
  vestiaire:         '#c2b5d1',  // lavande grisée
  technique:         '#bcc0c6',  // gris froid
  electrique:        '#bcc0c6',
  chaufferie:        '#bcc0c6',
  vmc:               '#bcc0c6',
  tgbt:              '#bcc0c6',
  ssi:               '#bcc0c6',
  local_technique:   '#bcc0c6',
  stockage:          '#d9c1a0',  // beige orangé doux
  reserve:           '#d9c1a0',
  depot:             '#d9c1a0',
  archive:           '#d9c1a0',
  livraison:         '#d4a980',  // terra
  quai:              '#d4a980',
  // Atelier / culturel / exposition — coraux et lavandes muted
  atelier:           '#cc8f81',  // terracotta doux
  workshop:          '#cc8f81',
  salle:             '#ddb0b8',
  exposition:        '#d9bdb8',
  culturel:          '#c2b5d1',
  amphitheatre:      '#c2b5d1',
  auditorium:        '#c2b5d1',
  bibliotheque:      '#d9c1a0',
  // Info
  info:              '#a8c2d6',  // bleu ciel pastel
  kiosk:             '#a8c2d6',
  // Fallbacks
  autre:             '#d9d3c7',
  other:             '#d9d3c7',
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
  if (/^route_autoroute/.test(t))                           return 'route_autoroute'
  if (/^route_boulevard/.test(t))                           return 'route_boulevard'
  if (/^route_avenue/.test(t))                              return 'route_avenue'
  if (/^route_rue_principale/.test(t))                      return 'route_rue_principale'
  if (/^route_rue_secondaire|^route_impasse/.test(t))       return 'route_rue'
  if (/^route_pont|^route_tunnel/.test(t))                  return 'route_ouvrage'
  if (/^route_trottoir_public/.test(t))                     return 'route_trottoir'
  if (/^route_/.test(t))                                    return 'route_autre'
  if (/voie_principale/.test(t))                            return 'voie_principale'
  if (/voie_pompier/.test(t))                               return 'voie_pompier'
  if (/voie_livraison/.test(t))                             return 'voie_livraison'
  if (/voie_secondaire|voie_circulation|voirie|rond_point|carrefour|exterieur_voie_vehicule/.test(t)) return 'voie_secondaire'
  if (/passage_pieton/.test(t))                             return 'passage_pieton'
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
  voie_principale:  'Voie principale',
  voie_secondaire:  'Voie secondaire / voirie',
  voie_pompier:     'Voie pompiers',
  voie_livraison:   'Voie livraison',
  passage_pieton:   'Passage piéton',
  route_autoroute:      'Autoroute',
  route_boulevard:      'Boulevard',
  route_avenue:         'Avenue',
  route_rue_principale: 'Rue principale',
  route_rue:            'Rue secondaire / impasse',
  route_ouvrage:        'Pont / Tunnel',
  route_trottoir:       'Trottoir public',
  route_autre:          'Voirie publique',
  entree:           'Entrée',
  sortie:           'Sortie / Secours',
  porte:            'Porte',
  info:             'Point Info',
  autre:            'Autres',
}

function legendLabelFor(key: string): string {
  return LEGEND_LABELS[key] ?? key
}

// ─── Glyph central par catégorie ──────────────────────────

/** Emoji/glyph discret à afficher au centre de chaque espace selon son type. */
function glyphForType(t: string): string {
  const s = t.toLowerCase()
  if (/commerce|mode|bijou|beaute/.test(s))      return '🛍'
  if (/tech/.test(s))                             return '💻'
  if (/grande_surface|big_box|anchor/.test(s))   return '🏪'
  if (/epicerie/.test(s))                         return '🥖'
  if (/restau|food|cafe|bar|cuisine/.test(s))    return '🍴'
  if (/cinema/.test(s))                           return '🎬'
  if (/fitness/.test(s))                          return '🏋'
  if (/loisirs|enfants|aire_jeu/.test(s))        return '🎈'
  if (/pharma|sante|medical/.test(s))            return '⚕'
  if (/banque|atm|bank/.test(s))                  return '💵'
  if (/wc|sanitaire/.test(s))                     return '🚻'
  if (/vestiaire/.test(s))                        return '👔'
  if (/info|kiosk/.test(s))                       return 'ℹ'
  if (/escalier/.test(s))                         return '↕'
  if (/ascenseur/.test(s))                        return '▭'
  if (/technique|tgbt|ssi|vmc|chaufferie|electr/.test(s)) return '⚙'
  if (/stockage|reserve|depot|archive/.test(s))  return '📦'
  if (/livraison|quai/.test(s))                   return '🚚'
  if (/atelier|workshop/.test(s))                 return '🔨'
  if (/exposition|culturel/.test(s))              return '🖼'
  if (/amphi|auditorium/.test(s))                 return '🎤'
  if (/bibliotheque/.test(s))                     return '📚'
  if (/^route_autoroute|^route_boulevard|^route_avenue|^route_rue_principale/.test(s)) return '🛣'
  if (/^route_pont/.test(s))                      return '🌉'
  if (/^route_tunnel/.test(s))                    return '⬛'
  if (/^route_trottoir_public/.test(s))           return '🚶'
  if (/^route_/.test(s))                          return '═'
  if (/voie_pompier/.test(s))                     return '🚒'
  if (/voie_livraison/.test(s))                   return '🚚'
  if (/voie_principale|voie_secondaire|voirie|rond_point|carrefour/.test(s)) return '🛣'
  if (/passage_pieton/.test(s))                   return '🚸'
  if (/parking/.test(s))                          return 'P'
  if (/entree|porte_entree|porte_auto/.test(s))  return '↓'
  if (/sortie|porte_secours|sortie_secours/.test(s)) return '↑'
  if (/mail_central|atrium/.test(s))              return '✦'
  return ''
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
  /** @deprecated Conservé pour compat — aucune opération de lissage n'est
   *  appliquée aux polygones. Les formes sont rendues telles que dessinées. */
  smoothEdges?: boolean
}

export function MallMap2D({
  plan,
  showFiltered = false,
  onSpaceClick,
  className = '',
  theme = 'light',
  smoothEdges = false,
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
      const color = categoryColor(t)
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

  /** Zoom autour d'un point d'ancrage screen (typiquement la position curseur).
   *  Conserve le point sous le curseur fixe pendant le zoom — standard des éditeurs. */
  const zoomAt = useCallback((factor: number, anchorX: number, anchorY: number) => {
    setViewport(v => {
      const newScale = Math.max(0.1, Math.min(80, v.scale * factor))
      // Point world correspondant à l'anchor écran à l'ancien zoom
      const worldX = (anchorX - v.ox) / v.scale
      const worldY = (anchorY - v.oy) / v.scale
      // Nouvel offset pour que ce même world soit sous le curseur après zoom
      return {
        scale: newScale,
        ox: anchorX - worldX * newScale,
        oy: anchorY - worldY * newScale,
      }
    })
  }, [])

  const zoomBy = useCallback((factor: number) => {
    // Zoom centré écran (pour les boutons +/−)
    if (size.w > 0) zoomAt(factor, size.w / 2, size.h / 2)
  }, [zoomAt, size.w, size.h])

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

  // Pan — fluide, avec flag "en cours" pour cursor grabbing
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  /** Vrai si l'utilisateur a vraiment draggé (mouvement > 4 px) depuis le mouseDown.
   *  Sert à distinguer un vrai clic (sélection d'espace) d'un pan. */
  const panDraggedRef = useRef(false)
  const [isPanning, setIsPanning] = useState(false)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    // En mode ajout signalétique OU drag d'un sign : pas de pan (le clic doit
    // atteindre le rect/sign sans déclencher le panning).
    const editMode = useSignageEditUiStore.getState().mode
    if (editMode === 'add' || editMode === 'drag') return
    panStart.current = { x: e.clientX, y: e.clientY, ox: viewport.ox, oy: viewport.oy }
    panDraggedRef.current = false
    setIsPanning(true)
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!panStart.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    if (!panDraggedRef.current && Math.hypot(dx, dy) > 4) {
      panDraggedRef.current = true
    }
    setViewport(v => ({ ...v, ox: (panStart.current?.ox ?? 0) + dx, oy: (panStart.current?.oy ?? 0) + dy }))
  }
  const handleMouseUp = () => {
    panStart.current = null
    setIsPanning(false)
  }
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    // Zoom centré sur le CURSEUR (pas sur l'écran) — le point sous la souris reste fixe
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const anchorX = e.clientX - rect.left
    const anchorY = e.clientY - rect.top
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, anchorX, anchorY)
  }

  // Helpers world → screen
  const toX = (x: number) => x * viewport.scale + viewport.ox
  const toY = (y: number) => y * viewport.scale + viewport.oy

  const bg = theme === 'light' ? '#f5f0e5' : '#0f1115'  // paper cream chaud
  const textColor = theme === 'light' ? '#0f172a' : '#f5f5f4'
  const mutedColor = theme === 'light' ? '#64748b' : '#94a3b8'

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: bg }}>
      <svg
        ref={svgRef}
        data-mallmap2d="true"
        width="100%" height="100%"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* ═══ DEFS : patterns, filtres, symboles réutilisables ═══ */}
        <defs>
          {/* Grille technique de fond (très discrète) */}
          <pattern id="mallgrid" width={20 * viewport.scale} height={20 * viewport.scale}
            patternUnits="userSpaceOnUse" patternTransform={`translate(${viewport.ox}, ${viewport.oy})`}>
            <rect width="100%" height="100%" fill="none" />
            <path d={`M ${20 * viewport.scale} 0 L 0 0 0 ${20 * viewport.scale}`} fill="none"
              stroke={theme === 'light' ? '#e5e0d4' : '#1f232a'}
              strokeWidth={0.5} />
          </pattern>

          {/* Pavage de sol pour les zones de circulation (mail, galerie) */}
          <pattern id="tilingMall" width={8} height={8} patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#e8d9b8" />
            <circle cx="4" cy="4" r="0.5" fill={theme === 'light' ? '#b8a478' : '#5a4e38'} opacity="0.6" />
            <circle cx="0" cy="0" r="0.3" fill={theme === 'light' ? '#b8a478' : '#5a4e38'} opacity="0.4" />
            <circle cx="8" cy="0" r="0.3" fill={theme === 'light' ? '#b8a478' : '#5a4e38'} opacity="0.4" />
            <circle cx="0" cy="8" r="0.3" fill={theme === 'light' ? '#b8a478' : '#5a4e38'} opacity="0.4" />
            <circle cx="8" cy="8" r="0.3" fill={theme === 'light' ? '#b8a478' : '#5a4e38'} opacity="0.4" />
          </pattern>

          {/* Pavage sol pour couloirs/galeries (grille de dalles) */}
          <pattern id="tilingCorridor" width={12} height={12} patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#efe5cd" />
            <path d="M 0 0 L 12 0 M 0 6 L 12 6" stroke="#d5c59c" strokeWidth={0.3} />
            <path d="M 6 0 L 6 12" stroke="#d5c59c" strokeWidth={0.3} />
          </pattern>

          {/* Asphalte uniforme (voirie/routes) */}
          <pattern id="asphalt" width={8} height={8} patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#9aa0a6" />
          </pattern>
          {/* Parking avec lignes de places (plus lisible qu'asphalte plein) */}
          <pattern id="parkingSpots" width={20} height={40} patternUnits="userSpaceOnUse">
            <rect width="20" height="40" fill="#9aa0a6" />
            <line x1="0" y1="0" x2="20" y2="0" stroke="#ffffff" strokeWidth={0.5} strokeOpacity={0.7} />
            <line x1="10" y1="0" x2="10" y2="18" stroke="#ffffff" strokeWidth={0.4} strokeOpacity={0.5} />
            <line x1="10" y1="22" x2="10" y2="40" stroke="#ffffff" strokeWidth={0.4} strokeOpacity={0.5} />
          </pattern>

          {/* Vacant hachuré */}
          <pattern id="vacantHatch" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 0 6 L 6 0" stroke="#1f2937" strokeWidth={0.6} strokeOpacity={0.4} />
          </pattern>

          {/* Ombre portée douce pour les bâtiments */}
          <filter id="bldgShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="1.5" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.15" />
          </filter>

          {/* Symbole arbre (réutilisable pour espaces verts) */}
          <symbol id="tree" viewBox="-10 -10 20 20">
            <circle r="9" fill="#7fa874" opacity="0.85" />
            <circle r="6" fill="#8fb884" opacity="0.9" />
            <circle cx="-3" cy="-3" r="2.5" fill="#a6cd9a" opacity="0.7" />
            <circle cx="3" cy="2" r="2" fill="#a6cd9a" opacity="0.7" />
          </symbol>

          {/* Symbole voiture (petit picto pour parkings) */}
          <symbol id="car" viewBox="-5 -3 10 6">
            <rect x="-4" y="-1.8" width="8" height="3.6" rx="0.8"
              fill="#94a3b8" stroke="#475569" strokeWidth={0.3} />
            <rect x="-2.5" y="-1.2" width="5" height="2.4" rx="0.4" fill="#e2e8f0" opacity="0.6" />
          </symbol>

          {/* ─── Sprint 12.1 — Patterns enrichis ─── */}

          {/* Carrelage clair (pour commerces) — petits carrés bordurés */}
          <pattern id="carrelage" width={6} height={6} patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#e8b4bd" />
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#fff" strokeWidth={0.4} strokeOpacity={0.6} />
          </pattern>

          {/* Parquet (pour boutiques mode/luxe) — bandes horizontales */}
          <pattern id="parquet" width={20} height={6} patternUnits="userSpaceOnUse">
            <rect width="20" height="6" fill="#d9a87c" />
            <line x1="0" y1="0" x2="20" y2="0" stroke="#a07050" strokeWidth={0.3} strokeOpacity={0.5} />
            <line x1="6" y1="0" x2="6" y2="6" stroke="#a07050" strokeWidth={0.2} strokeOpacity={0.4} />
            <line x1="14" y1="0" x2="14" y2="6" stroke="#a07050" strokeWidth={0.2} strokeOpacity={0.4} />
          </pattern>

          {/* Pavés (pour places, parvis) — quasi-randoms briques */}
          <pattern id="paves" width={10} height={6} patternUnits="userSpaceOnUse">
            <rect width="10" height="6" fill="#bcb4a6" />
            <path d="M 0 3 L 10 3 M 5 0 L 5 3 M 2 3 L 2 6 M 7 3 L 7 6"
                  fill="none" stroke="#888073" strokeWidth={0.4} />
          </pattern>

          {/* Symbole flèche peinte (sens circulation sur voirie) */}
          <symbol id="roadArrow" viewBox="-5 -3 10 6">
            <polygon points="-4,-1 2,-1 2,-2.5 4,0 2,2.5 2,1 -4,1"
                     fill="#ffffff" fillOpacity={0.92}
                     stroke="#1a1a1a" strokeWidth={0.15} strokeOpacity={0.4} />
          </symbol>

          {/* Symbole zébras passage piéton */}
          <pattern id="zebraStripes" width={6} height={3} patternUnits="userSpaceOnUse">
            <rect width="6" height="3" fill="#fbbf24" />
            <rect x="0" y="0" width="3" height="3" fill="#ffffff" />
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

        {/* Murs (wallSegments) — traits foncés par-dessus les aplats.
            Filtre défensif : wallSegments peuvent contenir des coords non
            numériques (DXF corrompus ou entrées user). SVG refuse NaN. */}
        {plan.wallSegments && plan.wallSegments.length > 0 && plan.wallSegments.slice(0, 5000).filter(w =>
          Number.isFinite(w.x1) && Number.isFinite(w.y1) && Number.isFinite(w.x2) && Number.isFinite(w.y2)
        ).map((w, i) => (
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
          const color = categoryColor(String(s.type))
          // Rendu strict du polygone tel que dessiné — aucun lissage,
          // aucune altération géométrique. Les rectangles restent rectangles,
          // les formes polygonales conservent leurs angles.
          void smoothEdges  // conservé pour compat API, non utilisé
          const d = s.polygon.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p[0])} ${toY(p[1])}`).join(' ') + ' Z'
          // Détecte les types "texturés" (remplis avec un motif plutôt qu'un aplat)
          const typeStr = String(s.type).toLowerCase()
          const isMall = /mail_central|atrium|promenade/.test(typeStr)
          const isCorridor = /^circulation$|^couloir|galerie|couloir_secondaire|mail_secondaire/.test(typeStr)
          const isParking = /^parking(?!_voie)|parking_vehicule/.test(typeStr)
          const isAsphalt = /parking|voie_circulation|voie_principale|voie_secondaire|voie_pompier|voie_livraison|rond_point|carrefour|voirie|asphalte|exterieur_voie_vehicule|route_/.test(typeStr)
          const isGreen = /espace_vert|pelouse|jardin|plantation|terre_plein/.test(typeStr)
          const isBuilding = /commerce|restau|cinema|grande_surface|big_box|loisirs|fitness|beaute|bijou|mode|tech|epicerie|pharma|sante|banque|service|admin|reception|atelier|exposition|culturel|amphi|auditorium|bibliotheque|stockage|reserve|depot|livraison|technique/.test(typeStr)
          // Sprint 12.1 : différenciation visuelle commerces (parquet/carrelage)
          const isCommerceLuxe = /commerce_mode|commerce_accessoires|commerce_beaute|hotel|cinema/.test(typeStr)
          const isPaves = /parvis|exterieur_parvis|exterieur_place_forum|trottoir|exterieur_voie_pieton/.test(typeStr)
          const isZebra = /passage_pieton/.test(typeStr)
          const fillStyle = isMall            ? 'url(#tilingMall)'
                          : isCorridor        ? 'url(#tilingCorridor)'
                          : isZebra           ? 'url(#zebraStripes)'
                          : isPaves           ? 'url(#paves)'
                          : isCommerceLuxe    ? 'url(#parquet)'
                          : isBuilding        ? 'url(#carrelage)'
                          : isParking         ? 'url(#parkingSpots)'
                          : isAsphalt         ? 'url(#asphalt)'
                          : color
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
          // Opacités subtiles façon plan d'architecte imprimé
          const fillOpacity = meta.vacant ? 0.3 : isHover ? 0.75 : 0.55
          const strokeDark = theme === 'light' ? '#4a5568' : '#cbd5e1'
          return (
            <g key={s.id}
              onMouseEnter={() => { if (!isPanning) setHoveredId(s.id) }}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                // Un clic qui fait suite à un drag pan ne doit PAS déclencher la sélection
                if (panDraggedRef.current) return
                onSpaceClick?.(s)
              }}
              style={{ cursor: onSpaceClick ? 'pointer' : 'inherit' }}
            >
              <path
                d={d}
                fill={fillStyle}
                fillOpacity={isMall || isCorridor || isAsphalt ? 1 : fillOpacity}
                stroke={isHover ? '#c9a068' : strokeDark}
                strokeWidth={isHover ? 1.2 : 0.4}
                strokeOpacity={isHover ? 0.9 : 0.55}
                strokeLinejoin="miter"
              />
              {/* Arbres discrets dans les espaces verts (densité plus aérée) */}
              {isGreen && wPx > 60 && hPx > 60 && (() => {
                const nx = Math.max(1, Math.floor(wPx / 55))
                const ny = Math.max(1, Math.floor(hPx / 55))
                const treeSize = Math.min(14, Math.max(7, Math.min(wPx, hPx) / Math.max(nx, ny) * 0.35))
                const trees: React.ReactNode[] = []
                for (let ix = 0; ix < nx; ix++) {
                  for (let iy = 0; iy < ny; iy++) {
                    const tx = toX(s.bounds.minX) + (ix + 0.5) / nx * wPx
                    const ty = toY(s.bounds.minY) + (iy + 0.5) / ny * hPx
                    trees.push(<use key={`t-${ix}-${iy}`} href="#tree" x={tx - treeSize / 2} y={ty - treeSize / 2} width={treeSize} height={treeSize} />)
                  }
                }
                return <g style={{ pointerEvents: 'none', opacity: 0.7 }}>{trees}</g>
              })()}
              {/* Hachure diagonale si vacant */}
              {meta.vacant && wPx > 30 && hPx > 30 && (
                <path d={d} fill="url(#vacantHatch)" opacity={0.35} style={{ pointerEvents: 'none' }} />
              )}
              {/* Voitures stylisées sur les places parking standard */}
              {/^parking_place_(standard|pmr|ve|famille|moto|livraison)$/.test(typeStr) &&
                wPx > 14 && hPx > 14 && (() => {
                  // Sprint 12.1 : 80% de remplissage (vs 55% précédemment).
                  let h = 0
                  for (let i = 0; i < s.id.length; i++) h = ((h << 5) - h + s.id.charCodeAt(i)) | 0
                  const rand = ((h >>> 0) % 1000) / 1000
                  if (rand > 0.80) return null
                  const carW = Math.min(wPx, hPx) * 0.75
                  const carH = carW * 0.55
                  const horizontal = wPx > hPx
                  const w = horizontal ? carW : carH
                  const ho = horizontal ? carH : carW
                  return (
                    <g style={{ pointerEvents: 'none', opacity: 0.85 }}>
                      <use href="#car" x={cx - w / 2} y={cy - ho / 2} width={w} height={ho}
                        transform={horizontal ? '' : `rotate(90 ${cx} ${cy})`} />
                    </g>
                  )
                })()}
              {/* Sprint 12.1 — Flèches peintes sur voirie (sens circulation) */}
              {/^(voie_principale|voie_secondaire|voirie|route_avenue|route_boulevard|route_rue_principale|parking_voie_circulation)/.test(typeStr) &&
                wPx > 80 && hPx > 30 && (() => {
                  // Place 1 flèche tous les 12m le long de l'axe principal du polygone.
                  // Heuristique : axe = longueur > largeur du bbox.
                  const arrowSize = Math.min(wPx, hPx) * 0.5
                  const horizontal = wPx > hPx
                  const arrowSpacing = horizontal ? wPx / Math.max(1, Math.floor(wPx / 80)) : hPx / Math.max(1, Math.floor(hPx / 80))
                  const startPx = horizontal ? toX(s.bounds.minX) + arrowSpacing / 2 : toX(s.bounds.centerX)
                  const startPy = horizontal ? toY(s.bounds.centerY) : toY(s.bounds.minY) + arrowSpacing / 2
                  const arrowsCount = horizontal ? Math.floor(wPx / arrowSpacing) : Math.floor(hPx / arrowSpacing)
                  return (
                    <g style={{ pointerEvents: 'none', opacity: 0.7 }}>
                      {Array.from({ length: arrowsCount }).map((_, i) => {
                        const ax = horizontal ? startPx + i * arrowSpacing : startPx
                        const ay = horizontal ? startPy : startPy + i * arrowSpacing
                        const w = horizontal ? arrowSize : arrowSize * 0.5
                        const h = horizontal ? arrowSize * 0.5 : arrowSize
                        return (
                          <use key={`arr-${i}`} href="#roadArrow"
                               x={ax - w / 2} y={ay - h / 2} width={w} height={h}
                               transform={horizontal ? '' : `rotate(90 ${ax} ${ay})`} />
                        )
                      })}
                    </g>
                  )
                })()}
              {/* Pas de pastille ni d'icône permanente sur les aplats —
                  plan propre façon planimetria. Le détail s'ouvre en popup au survol. */}
            </g>
          )
        })}

        {/* Popup au survol — style "modal" flottant. Masqué pendant le pan. */}
        {hoveredId && !isPanning && (() => {
          const s = visibleSpaces.find(v => v.id === hoveredId)
          if (!s) return null
          const meta = (s.metadata ?? {}) as { tenant?: string; localNumber?: string; vacant?: boolean; notes?: string }
          const cx = toX(s.bounds.centerX)
          const cy = toY(s.bounds.centerY)
          const color = categoryColor(String(s.type))
          const legendKey = resolveLegendKey(String(s.type).toLowerCase())
          const typeLabel = legendLabelFor(legendKey)
          const lines: Array<{ k?: string; v: string }> = []
          if (s.label) lines.push({ v: s.label })
          if (meta.tenant)      lines.push({ k: 'Enseigne',  v: meta.tenant })
          if (meta.localNumber) lines.push({ k: 'N° local',  v: '#' + meta.localNumber })
          lines.push({ k: 'Type',      v: typeLabel })
          lines.push({ k: 'Surface',   v: `${s.areaSqm.toFixed(1)} m²` })
          if (s.floorId)        lines.push({ k: 'Niveau',    v: s.floorId })
          if (meta.vacant !== undefined) {
            lines.push({ k: 'Statut', v: meta.vacant ? '🔴 Vacant' : '🟢 Occupé' })
          }
          if (meta.notes)       lines.push({ k: 'Notes',     v: meta.notes })

          // Dimensionnement du popup
          const popupW = 230
          const lineH = 16
          const padding = 10
          const popupH = padding * 2 + lines.length * lineH + 22  // +22 pour titre catégorie
          // Placer le popup sans sortir du viewport
          let px = cx + 14
          let py = cy - popupH / 2
          if (px + popupW > size.w - 8) px = cx - 14 - popupW
          if (py < 8) py = 8
          if (py + popupH > size.h - 8) py = size.h - 8 - popupH

          return (
            <g style={{ pointerEvents: 'none' }}>
              {/* Flèche/ligne vers le centre de l'espace */}
              <line x1={cx} y1={cy} x2={px + (px < cx ? popupW : 0)} y2={py + popupH / 2}
                stroke={color} strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.4} />
              <rect x={px} y={py} width={popupW} height={popupH} rx={6}
                fill={theme === 'light' ? '#ffffff' : '#15181d'}
                stroke={color}
                strokeWidth={1.5}
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
              />
              {/* Bandeau catégorie coloré */}
              <rect x={px} y={py} width={popupW} height={4} rx={2} fill={color} />
              <text x={px + padding} y={py + padding + 8}
                fontSize={9}
                fontWeight={700}
                fill={color}
                letterSpacing="0.08em"
                style={{ textTransform: 'uppercase' }}>
                {typeLabel}
              </text>
              {lines.map((ln, i) => (
                <g key={i} transform={`translate(${px + padding}, ${py + padding + 22 + i * lineH})`}>
                  {ln.k && (
                    <text fontSize={9} fill={mutedColor}>
                      {ln.k}
                    </text>
                  )}
                  <text x={ln.k ? 58 : 0} fontSize={11}
                    fill={textColor}
                    fontWeight={ln.k ? 500 : 600}>
                    {ln.v.length > 28 ? ln.v.slice(0, 27) + '…' : ln.v}
                  </text>
                </g>
              ))}
            </g>
          )
        })()}

        <defs>
          <pattern id="vacantHatch" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 0 6 L 6 0" stroke={textColor} strokeWidth={0.6} strokeOpacity={0.4} />
          </pattern>
        </defs>

        {/* ═══ Couche PROPH3T OVERLAYS ═══
            Dessinée APRÈS les espaces, AVANT le </svg>. Affiche heatmaps
            (bottlenecks ABM), badges signalétique, flèches sens circulation
            calculées par le skill analyzeParcours / analyzeWayfinder. */}
        <Proph3tOverlaysLayer toX={toX} toY={toY} scale={viewport.scale} />
        <SignagePlacementsLayer
          toX={toX} toY={toY} scale={viewport.scale}
          ox={viewport.ox} oy={viewport.oy}
        />
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

// ─── Couche PROPH3T overlays (heatmaps, badges signalétique, flèches) ──

function Proph3tOverlaysLayer({
  toX, toY, scale,
}: {
  toX: (x: number) => number
  toY: (y: number) => number
  scale: number
}) {
  const overlays = useProph3tOverlaysStore(s => s.overlays)
  if (overlays.length === 0) return null
  return (
    <g style={{ pointerEvents: 'none' }}>
      {overlays.map((o, i) => {
        if (!o.coords) return null
        const cx = toX(o.coords[0])
        const cy = toY(o.coords[1])
        // Heatmap (bottleneck ABM) : cercle rouge dégradé
        if (o.kind === 'heatmap') {
          const r = Math.max(8, (o.intensity ?? 50) * 0.4 * scale)
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={o.color ?? '#ef4444'} fillOpacity={0.25} />
              <circle cx={cx} cy={cy} r={r * 0.5} fill={o.color ?? '#ef4444'} fillOpacity={0.45} />
              <circle cx={cx} cy={cy} r={4} fill={o.color ?? '#ef4444'} stroke="#fff" strokeWidth={1} />
            </g>
          )
        }
        // Badge signalétique : pictogramme cyan avec emoji
        if (o.kind === 'badge') {
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={11} fill={o.color ?? '#06b6d4'} stroke="#fff" strokeWidth={1.5} />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fill="#fff">
                {o.label ?? '🪧'}
              </text>
            </g>
          )
        }
        // Highlight : cercle outline
        if (o.kind === 'highlight') {
          return (
            <circle key={i} cx={cx} cy={cy} r={14}
              fill="none" stroke={o.color ?? '#fbbf24'} strokeWidth={2.5} strokeDasharray="4 2" />
          )
        }
        // Arrow : flèche dirigée
        if (o.kind === 'arrow') {
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={6} fill={o.color ?? '#10b981'} />
              <text x={cx} y={cy + 3} textAnchor="middle" fontSize={9} fill="#fff">→</text>
            </g>
          )
        }
        return null
      })}
    </g>
  )
}

// ─── Couche signalétique implémentée (PlacedSign — persistée par projet) ──
// Style résolu via SIGNAGE_CATALOG (libraries/signageCatalog.ts) qui contient
// 25+ types organisés par catégorie. Compat legacy 3-types preservée par
// resolveSignageKind().

function SignagePlacementsLayer({
  toX, toY, scale, ox, oy,
}: {
  toX: (x: number) => number
  toY: (y: number) => number
  scale: number
  ox: number
  oy: number
}) {
  const projectId = useActiveProjectId()
  const allSigns = useSignagePlacementStore(s => s.signs)
  const updatePosition = useSignagePlacementStore(s => s.updatePosition)
  const removeSign = useSignagePlacementStore(s => s.remove)
  const addOne = useSignagePlacementStore(s => s.addOne)
  const editMode = useSignageEditUiStore(s => s.mode)
  const addKind = useSignageEditUiStore(s => s.addKind)
  const draggingId = useSignageEditUiStore(s => s.draggingId)
  const startDrag = useSignageEditUiStore(s => s.startDrag)
  const endDrag = useSignageEditUiStore(s => s.endDrag)

  const signs = React.useMemo(
    () => allSigns.filter(s => s.projectId === projectId),
    [allSigns, projectId],
  )

  // Inverse de toX/toY : screen → world
  const fromX = React.useCallback((sx: number) => (sx - ox) / scale, [ox, scale])
  const fromY = React.useCallback((sy: number) => (sy - oy) / scale, [oy, scale])

  // Drag global : pointermove + pointerup window listeners
  React.useEffect(() => {
    if (!draggingId) return
    const onMove = (e: PointerEvent) => {
      const svg = document.querySelector<SVGSVGElement>('svg[data-mallmap2d]')
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const wx = fromX(e.clientX - rect.left)
      const wy = fromY(e.clientY - rect.top)
      updatePosition(draggingId, wx, wy)
    }
    const onUp = () => endDrag()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [draggingId, fromX, fromY, updatePosition, endDrag])

  const handleAddClick = React.useCallback((e: React.MouseEvent<SVGRectElement>) => {
    if (editMode !== 'add') return
    e.stopPropagation()
    e.preventDefault()
    const svgEl = e.currentTarget.ownerSVGElement as SVGSVGElement | null
    if (!svgEl) return
    const rect = svgEl.getBoundingClientRect()
    const wx = fromX(e.clientX - rect.left)
    const wy = fromY(e.clientY - rect.top)
    addOne(projectId, {
      x: wx, y: wy, kind: addKind, targets: [],
      label: 'Manuel', reason: `Placé manuellement par l'utilisateur (${addKind})`,
      source: 'manual',
    })
  }, [editMode, addKind, addOne, projectId, fromX, fromY])

  // Taille adaptative : plus de signs = plus petits pour éviter saturation
  const sizeReduction = signs.length > 100 ? 0.55 : signs.length > 50 ? 0.7 : signs.length > 20 ? 0.85 : 1
  const r = Math.max(7, 14 * Math.min(1.5, scale) * sizeReduction)

  return (
    <g>
      {/* Capture-clic plein écran quand mode 'add' actif */}
      {editMode === 'add' && (
        <rect
          x={-1e6} y={-1e6} width={2e6} height={2e6}
          fill="rgba(8, 145, 178, 0.05)"
          style={{ cursor: 'crosshair' }}
          onMouseDown={(e) => { e.stopPropagation() }}
          onClick={handleAddClick}
        />
      )}
      {/* Signs */}
      <g style={{ pointerEvents: editMode === 'add' ? 'none' : 'auto' }}>
        {signs.map((s) => {
          const cx = toX(s.x)
          const cy = toY(s.y)
          const def = resolveSignageKind(s.kind)
          const isDragging = draggingId === s.id
          const isUncertain = s.needsReview && !s.reviewed
          return (
            <g
              key={s.id}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
                startDrag(s.id)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                if (confirm(`Supprimer ce panneau ${def.label} ?`)) removeSign(s.id)
              }}
            >
              {/* Halo de visibilité — désactivé si beaucoup de signs (saturation) */}
              {signs.length < 30 && (
                <circle cx={cx} cy={cy} r={15 * scale} fill={def.color} fillOpacity={isDragging ? 0.15 : 0.04} />
              )}
              {/* Anneau extérieur — orange pulsant si à valider */}
              <circle cx={cx} cy={cy} r={r + 3}
                fill="none"
                stroke={isUncertain ? '#f59e0b' : def.color}
                strokeWidth={isDragging ? 2.5 : isUncertain ? 2.2 : 1.5}
                strokeOpacity={isUncertain ? 1 : 0.6}
                strokeDasharray={isUncertain ? '4 2' : undefined}
              />
              {/* Pastille */}
              <circle cx={cx} cy={cy} r={r} fill={def.color} stroke={isDragging ? '#fbbf24' : '#fff'} strokeWidth={isDragging ? 2.5 : 1.8} />
              {/* Pictogramme */}
              <text x={cx} y={cy + r * 0.32} textAnchor="middle" fontSize={r * 0.85} fill="#fff" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                {def.icon}
              </text>
              {/* Badge ERP si obligatoire */}
              {def.erpRequired && !isUncertain && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={cx + r * 0.85} cy={cy - r * 0.85} r={r * 0.5} fill="#dc2626" stroke="#fff" strokeWidth={1} />
                  <text x={cx + r * 0.85} y={cy - r * 0.6} textAnchor="middle" fontSize={r * 0.55} fill="#fff" fontWeight="bold">!</text>
                </g>
              )}
              {/* Badge "?" si à valider */}
              {isUncertain && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={cx + r * 0.85} cy={cy - r * 0.85} r={r * 0.55} fill="#f59e0b" stroke="#fff" strokeWidth={1.2} />
                  <text x={cx + r * 0.85} y={cy - r * 0.55} textAnchor="middle" fontSize={r * 0.7} fill="#fff" fontWeight="bold">?</text>
                </g>
              )}
              <title>{`${def.label} (${def.code})${s.label ? '\n' + s.label : ''}\n${s.reason}${def.erpRequired ? '\n\n⚠️ Obligation ERP' : ''}${def.standards.length > 0 ? `\nNormes : ${def.standards.join(', ')}` : ''}${isUncertain ? `\n\n⚠️ ${s.reviewReason ?? 'À valider par humain'}` : ''}\n\nGlisser pour déplacer · Clic-droit pour supprimer`}</title>
            </g>
          )
        })}
      </g>
    </g>
  )
}

export default MallMap2D
