// ═══ MapRenderer — composant SVG partagé entre templates ═══
//
// Renderer pur qui dessine le plan Vol.3 en SVG vectoriel natif
// (pas de screenshot bitmap). Respecte §07 du CDC :
//   "Le plan Vol.3 doit être re-rendu en SVG vectoriel natif pour les exports
//    print. Implémenter un MapSVGExporter qui parcourt le graphe Vol.3 et
//    génère un SVG propre : chemins vectoriels pour les murs, icônes SVG
//    pour les POI, labels en texte (pas d'image)."
//
// Composant React pur (pas d'effets de bord) → SSR safe.

import React from 'react'
import type { DesignerConfig, InjectedFloor, InjectedPlanData, InjectedPoi } from '../../types'

export interface MapRendererProps {
  config: DesignerConfig
  planData: InjectedPlanData
  /** Rectangle d'affichage en pixels. */
  width: number
  height: number
  /** Affiche toutes les étages superposés ou un seul (défaut). */
  floorId?: string
  /** Trace un itinéraire en surbrillance (pour runtime borne). */
  routeWaypoints?: Array<{ x: number; y: number }>
  /** Position "vous êtes ici" (borne). */
  youAreHere?: { x: number; y: number; floorId?: string }
  /** Callback clic sur POI (runtime). */
  onPoiClick?: (poi: InjectedPoi) => void
  /** Désactive les interactions (mode export headless). */
  readOnly?: boolean
  /** id SVG unique (pour multiples instances). */
  svgId?: string
}

// ─── Helpers géométriques ─────────────────────────

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

// ─── Couleurs par type d'espace (cohérent Vol.3) ─

const SPACE_COLORS: Record<string, string> = {
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
  escalier_fixe: '#e2e8f0',
  parking_vehicule: '#e7e5e4',
  zone_technique: '#d1d5db',
  local_poubelles: '#d1d5db',
  exterieur_parvis: '#f5f5f4',
  exterieur_voirie: '#d6d3d1',
  entree_principale: '#86efac',
  entree_secondaire: '#a7f3d0',
  entree_parking: '#bae6fd',
  entree_service: '#d1d5db',
  sortie_secours: '#fca5a5',
  point_information: '#bbf7d0',
  borne_wayfinder: '#c7d2fe',
}

// ═══ Renderer ══════════════════════════════════════

export const MapRenderer: React.FC<MapRendererProps> = ({
  config, planData, width, height, floorId, routeWaypoints,
  youAreHere, onPoiClick, readOnly = false, svgId = 'wdr-map',
}) => {
  // Sélection étage (si planData.floors vide, rien à dessiner)
  const floors: InjectedFloor[] = floorId
    ? planData.floors.filter(f => f.id === floorId)
    : planData.floors.length > 0
      ? [planData.floors[0]]
      : []

  if (floors.length === 0) {
    return (
      <svg id={svgId} viewBox={`0 0 ${width} ${height}`} width={width} height={height}
        xmlns="http://www.w3.org/2000/svg" role="img"
        aria-label="Plan indisponible">
        <rect width={width} height={height} fill="#f8fafc" />
        <text x={width / 2} y={height / 2} textAnchor="middle"
          fontFamily="sans-serif" fontSize={16} fill="#94a3b8">
          Plan non disponible
        </text>
      </svg>
    )
  }

  const floor = floors[0]
  const bounds = floor.bounds
  const scale = Math.min(width / bounds.width, height / bounds.height) * 0.92
  const planW = bounds.width * scale
  const planH = bounds.height * scale
  const offsetX = (width - planW) / 2
  const offsetY = (height - planH) / 2
  const wx = (x: number) => offsetX + x * scale
  const wy = (y: number) => offsetY + y * scale

  const palette = config.brand.palette
  const isDark = config.previewMode === 'dark'
  const bg = isDark ? palette.backgroundDark : palette.background
  const fg = isDark ? palette.foregroundDark : palette.foreground
  const visiblePois = planData.pois.filter(p => !p.floorId || p.floorId === floor.id)

  return (
    <svg
      id={svgId}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Plan ${planData.projectName} — niveau ${floor.label}`}
      style={{ background: bg }}
    >
      <defs>
        {/* Motif grille (optionnel selon config.map.showGrid) */}
        <pattern id={`${svgId}-grid`} width={20} height={20} patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={palette.neutral} strokeOpacity={0.15} strokeWidth={0.5} />
        </pattern>

        {/* Marqueur flèche directionnelle */}
        <marker id={`${svgId}-arrow`} viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={palette.primary} />
        </marker>

        {/* Pictogramme POI (cercle + initiale) */}
        {visiblePois.map(p => (
          <symbol key={p.id} id={`${svgId}-poi-${p.id}`} viewBox="-10 -10 20 20">
            <circle r={8} fill={p.color ?? palette.primary} stroke="#fff" strokeWidth={1.5} />
            <text textAnchor="middle" y={3} fontSize={9} fontWeight="bold" fill="#fff">
              {p.label.charAt(0).toUpperCase()}
            </text>
          </symbol>
        ))}
      </defs>

      {/* Grille */}
      {config.map.showGrid && (
        <rect x={offsetX} y={offsetY} width={planW} height={planH} fill={`url(#${svgId}-grid)`} />
      )}

      {/* Espaces (polygones) */}
      {config.map.showSpaces && floor.spaces.map(sp => {
        const screenPts = sp.polygon.map(([x, y]) => `${wx(x).toFixed(1)},${wy(y).toFixed(1)}`).join(' ')
        const center = polyCentroid(sp.polygon)
        const area = polyArea(sp.polygon)
        const color = SPACE_COLORS[sp.type] ?? '#f1f5f9'
        const opacity = config.map.opacityBySpaceType?.[sp.type] ?? 0.85
        return (
          <g key={sp.id}>
            <polygon
              points={screenPts}
              fill={isDark ? mixDark(color, 0.15) : color}
              fillOpacity={opacity}
              stroke={palette.neutral}
              strokeOpacity={0.35}
              strokeWidth={0.8}
            />
            {area > 20 && (
              <text
                x={wx(center.x)}
                y={wy(center.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(8, Math.min(11, scale * 0.8))}
                fontFamily="var(--wdr-font-body, sans-serif)"
                fill={fg}
                fillOpacity={0.75}
                style={{ pointerEvents: 'none' }}
              >
                {truncate(sp.label, 14)}
              </text>
            )}
          </g>
        )
      })}

      {/* Murs */}
      {config.map.showWalls && floor.walls.map((w, i) => (
        <line
          key={i}
          x1={wx(w.x1)} y1={wy(w.y1)}
          x2={wx(w.x2)} y2={wy(w.y2)}
          stroke={isDark ? palette.neutral : '#334155'}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}

      {/* Itinéraire animé */}
      {routeWaypoints && routeWaypoints.length > 1 && (
        <g>
          <path
            d={routeWaypoints.map((p, i) =>
              `${i === 0 ? 'M' : 'L'} ${wx(p.x).toFixed(1)} ${wy(p.y).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={palette.primary}
            strokeOpacity={0.25}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={routeWaypoints.map((p, i) =>
              `${i === 0 ? 'M' : 'L'} ${wx(p.x).toFixed(1)} ${wy(p.y).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={palette.primary}
            strokeWidth={4}
            strokeDasharray="10 6"
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={`url(#${svgId}-arrow)`}
          >
            {!readOnly && (
              <animate
                attributeName="stroke-dashoffset"
                from="0" to="-16"
                dur="1.2s"
                repeatCount="indefinite"
              />
            )}
          </path>
        </g>
      )}

      {/* Entrées */}
      {config.map.showEntrances && planData.entrances
        .filter(e => !e.floorId || e.floorId === floor.id)
        .map(e => (
          <g key={e.id}>
            <circle cx={wx(e.x)} cy={wy(e.y)} r={6}
              fill={palette.primary} stroke="#fff" strokeWidth={2} />
            <text x={wx(e.x)} y={wy(e.y) - 10}
              textAnchor="middle" fontSize={9} fontWeight="600"
              fill={fg}>
              {truncate(e.label, 12)}
            </text>
          </g>
        ))}

      {/* POIs */}
      {config.map.showPOIs && visiblePois.map(p => {
        const highlighted = config.highlightedPois.find(h => h.poiId === p.id)
        const sz = highlighted ? 14 : 9
        return (
          <g key={p.id} style={{ cursor: readOnly ? 'default' : 'pointer' }}
            onClick={() => !readOnly && onPoiClick?.(p)}>
            <circle cx={wx(p.x)} cy={wy(p.y)} r={sz}
              fill={p.color ?? palette.accent}
              stroke="#fff" strokeWidth={2} />
            {highlighted && (
              <circle cx={wx(p.x)} cy={wy(p.y)} r={sz + 4}
                fill="none" stroke={p.color ?? palette.accent}
                strokeOpacity={0.4} strokeWidth={2}>
                <animate attributeName="r" from={sz + 2} to={sz + 10}
                  dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.4" to="0"
                  dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <text x={wx(p.x)} y={wy(p.y) + sz + 10}
              textAnchor="middle"
              fontSize={Math.max(9, scale * 0.4)}
              fontFamily="var(--wdr-font-body, sans-serif)"
              fill={fg}
              fontWeight={highlighted ? 700 : 500}>
              {truncate(p.label, 16)}
            </text>
          </g>
        )
      })}

      {/* Position "vous êtes ici" */}
      {youAreHere && (!youAreHere.floorId || youAreHere.floorId === floor.id) && (
        <g>
          <circle cx={wx(youAreHere.x)} cy={wy(youAreHere.y)} r={16}
            fill={palette.primary} fillOpacity={0.2}>
            <animate attributeName="r" from="12" to="22"
              dur="2s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" from="0.3" to="0.1"
              dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={wx(youAreHere.x)} cy={wy(youAreHere.y)} r={8}
            fill={palette.primary} stroke="#fff" strokeWidth={3} />
          <text x={wx(youAreHere.x)} y={wy(youAreHere.y) - 22}
            textAnchor="middle" fontSize={11} fontWeight="700"
            fill={palette.primary}>
            {config.i18nStrings[config.project.activeLocale]?.wayYouAreHere ?? 'Vous êtes ici'}
          </text>
        </g>
      )}
    </svg>
  )
}

// ─── Helpers ──────────────────────────────────────

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function mixDark(hex: string, factor: number): string {
  // Simple : multiplie les composantes RGB par factor
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n * factor))).toString(16).padStart(2, '0')
  return '#' + to(r) + to(g) + to(b)
}

// ─── Rendu headless pour export print SVG/PDF ────

/**
 * Version "string SVG" pour export print (pas de React runtime requis).
 * Utilisée par MapSVGExporter du LOT 3.
 */
export function renderMapToSvgString(props: MapRendererProps): string {
  // Utilise renderToStaticMarkup de react-dom/server (déjà inclus dans React)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { renderToStaticMarkup } = require('react-dom/server') as typeof import('react-dom/server')
  return renderToStaticMarkup(<MapRenderer {...props} readOnly />)
}
