// ═══ SPACE INFO OVERLAY — affiche type + dimensions pour chaque espace ═══
// SVG overlay au-dessus du plan. Pour chaque space :
//   - Polygone teinté par catégorie
//   - Badge central : icône + label + m²
//   - Clic = ouvre SpaceLabelEditor pour corriger
// Respecte les corrections manuelles via detailedJourneyEngine.resolveSpaceCategory/Label.

import { useMemo, useState } from 'react'
import {
  resolveSpaceCategory,
  resolveSpaceLabel,
} from '../engines/plan-analysis/detailedJourneyEngine'
import {
  CATEGORY_META,
  useSpaceCorrectionsStore,
  type SpaceCategory,
} from '../stores/spaceCorrectionsStore'
import { SpaceLabelEditor, type EditableSpace } from './SpaceLabelEditor'

interface Props {
  spaces: EditableSpace[]
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  width: number
  height: number
  /** Filtre par étage (si défini). */
  floorId?: string | null
  /** Catégories affichées (si défini, filtre). */
  filterCategories?: Set<SpaceCategory>
  /** Taille minimale affichée (en m²). Par défaut 5. */
  minAreaSqm?: number
  /** Zoom facteur (pour adapter la taille du texte). Par défaut 1. */
  zoom?: number
  className?: string
}

function bboxOf(poly: [number, number][]): { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number } {
  if (!poly.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

function centroidOf(poly: [number, number][]): { x: number; y: number } {
  if (!poly.length) return { x: 0, y: 0 }
  let cx = 0, cy = 0
  for (const [x, y] of poly) { cx += x; cy += y }
  return { x: cx / poly.length, y: cy / poly.length }
}

export function SpaceInfoOverlay({
  spaces,
  worldToScreen,
  width,
  height,
  floorId,
  filterCategories,
  minAreaSqm = 5,
  zoom = 1,
  className = '',
}: Props) {
  const [editing, setEditing] = useState<EditableSpace | null>(null)
  const [editAutoCat, setEditAutoCat] = useState<SpaceCategory | undefined>(undefined)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Force re-render quand corrections bougent
  const corrVersion = useSpaceCorrectionsStore(s => s.version)

  const items = useMemo(() => {
    return spaces
      .filter(s => s.areaSqm >= minAreaSqm)
      .filter(s => !floorId || !s.floorId || s.floorId === floorId)
      .map(s => {
        const cat = resolveSpaceCategory(s) as SpaceCategory
        return { space: s, cat, label: resolveSpaceLabel(s) }
      })
      .filter(it => !filterCategories || filterCategories.has(it.cat))
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces, floorId, minAreaSqm, filterCategories, corrVersion])

  const store = useSpaceCorrectionsStore()

  const handleClick = (space: EditableSpace, autoCat: SpaceCategory) => {
    setEditAutoCat(autoCat)
    setEditing(space)
  }

  return (
    <>
      <svg
        className={`absolute inset-0 pointer-events-none ${className}`}
        width={width}
        height={height}
        style={{ zIndex: 12 }}
      >
        {items.map(({ space, cat, label }) => {
          const meta = CATEGORY_META[cat]
          const bb = bboxOf(space.polygon)
          const c = centroidOf(space.polygon)
          const topLeft = worldToScreen(bb.minX, bb.minY)
          const bottomRight = worldToScreen(bb.maxX, bb.maxY)
          const screenW = Math.abs(bottomRight.x - topLeft.x)
          const screenH = Math.abs(bottomRight.y - topLeft.y)
          const cp = worldToScreen(c.x, c.y)

          const isHovered = hoveredId === space.id
          const isExcluded = store.isExcluded(space.id)
          const isCorrected = !!store.get(space.id)

          // Polygone en coords écran
          const screenPts = space.polygon
            .map(([x, y]) => { const p = worldToScreen(x, y); return `${p.x},${p.y}` })
            .join(' ')

          // Texte adapté à la taille
          const showText = screenW > 60 && screenH > 30
          const showFullInfo = screenW > 100 && screenH > 50
          const fontSize = Math.max(8, Math.min(13, Math.min(screenW, screenH) / 8)) / zoom

          return (
            <g
              key={space.id}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => setHoveredId(space.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleClick(space, cat)}
            >
              {/* Polygone teinté par catégorie */}
              <polygon
                points={screenPts}
                fill={meta.color}
                fillOpacity={isHovered ? 0.35 : isExcluded ? 0.08 : 0.18}
                stroke={meta.color}
                strokeOpacity={isHovered ? 0.9 : 0.5}
                strokeWidth={isHovered ? 2 : 1}
                strokeDasharray={isExcluded ? '4 3' : 'none'}
              />

              {/* Badge corrigé (étoile en haut-droite) */}
              {isCorrected && !isExcluded && (
                <circle
                  cx={bottomRight.x - 6}
                  cy={topLeft.y + 6}
                  r={4}
                  fill="#b38a5a"
                  stroke="#fff"
                  strokeWidth={1}
                />
              )}

              {/* Info centrale */}
              {showText && (
                <g>
                  {/* Fond lisibilité */}
                  <rect
                    x={cp.x - Math.min(screenW * 0.45, 80)}
                    y={cp.y - (showFullInfo ? 18 : 9)}
                    width={Math.min(screenW * 0.9, 160)}
                    height={showFullInfo ? 36 : 18}
                    fill="rgba(15, 23, 42, 0.85)"
                    rx={3}
                  />
                  {/* Label principal */}
                  <text
                    x={cp.x}
                    y={cp.y - (showFullInfo ? 4 : -3)}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight="600"
                    fill="#f1f5f9"
                    style={{ pointerEvents: 'none' }}
                  >
                    {truncate(label || 'Espace', 18)}
                  </text>
                  {showFullInfo && (
                    <>
                      <text
                        x={cp.x}
                        y={cp.y + 8}
                        textAnchor="middle"
                        fontSize={Math.max(7, fontSize * 0.8)}
                        fill={meta.color}
                        style={{ pointerEvents: 'none' }}
                      >
                        {meta.icon} {meta.label}
                      </text>
                      <text
                        x={cp.x}
                        y={cp.y + 19}
                        textAnchor="middle"
                        fontSize={Math.max(7, fontSize * 0.7)}
                        fill="#94a3b8"
                        style={{ pointerEvents: 'none' }}
                      >
                        {space.areaSqm.toFixed(0)} m² · {bb.w.toFixed(0)}×{bb.h.toFixed(0)}m
                      </text>
                    </>
                  )}
                </g>
              )}

              {/* Hover tooltip (détail) */}
              {isHovered && (
                <g>
                  <rect
                    x={cp.x + 10}
                    y={cp.y - 50}
                    width={180}
                    height={90}
                    fill="rgba(2, 6, 23, 0.95)"
                    stroke={meta.color}
                    strokeOpacity={0.6}
                    rx={4}
                  />
                  <text x={cp.x + 18} y={cp.y - 32} fontSize={10} fontWeight="bold" fill="#f1f5f9">
                    {truncate(label || 'Espace', 22)}
                  </text>
                  <text x={cp.x + 18} y={cp.y - 18} fontSize={9} fill={meta.color}>
                    {meta.icon} {meta.label}
                  </text>
                  <text x={cp.x + 18} y={cp.y - 4} fontSize={9} fill="#94a3b8">
                    Surface : {space.areaSqm.toFixed(1)} m²
                  </text>
                  <text x={cp.x + 18} y={cp.y + 10} fontSize={9} fill="#94a3b8">
                    Dimensions : {bb.w.toFixed(1)} × {bb.h.toFixed(1)} m
                  </text>
                  <text x={cp.x + 18} y={cp.y + 24} fontSize={9} fill={isCorrected ? '#b38a5a' : '#64748b'} fontStyle="italic">
                    {isExcluded ? '⊗ Exclu des parcours' : isCorrected ? '✓ Corrigé manuellement' : 'Clic = corriger'}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>

      {/* Modale d'édition */}
      <SpaceLabelEditor
        space={editing}
        autoCategory={editAutoCat}
        onClose={() => setEditing(null)}
      />
    </>
  )
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}
