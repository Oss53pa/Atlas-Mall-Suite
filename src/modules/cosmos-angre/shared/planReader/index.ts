// ═══ POINT D'ENTRÉE UNIFIÉ — LECTURE DE PLANS ═══

import type {
  PlanSourceType, PlanImportState, CalibrationResult, DimEntity,
  PDFPlanPage, RasterRecognitionResult, RecognizedZone,
} from './planReaderTypes'
import type { Zone } from '../proph3t/types'
import type { PlanEntity, DetectedSpace, WallSegment, Bounds } from './planEngineTypes'
import { extractDimEntities, calibratePlanFromDims, linkDimsToZones } from './dimParser'
import { readPDFPlan, convertPDFToZones } from './pdfPlanReader'
import { recognizeRasterPlan, convertVisionToAtlasZones } from './rasterRecognizer'
import { normalizeGeometry, validateZones } from './geometryNormalizer'
import { generateCotationSpecs, renderCotationsOnPDF } from './cotationEngine'
import { computeBoundsFromPoints, normalizeAllEntities, detectUnitScale, computeBounds } from './coordinateEngine'
import { buildParsedPlanFromEntities } from './planBridge'

// ─── LAYER CATEGORY CLASSIFICATION ───

function classifyLayerCategory(layer: string): import('./planEngineTypes').LayerCategory {
  const l = layer.toLowerCase()
  if (/mur|wall|struct|beton|facade|maconn/i.test(l)) return 'structure'
  if (/clois|door|porte|fenetre|window|partition/i.test(l)) return 'partition'
  if (/local|space|zone|room|boutique|commerce/i.test(l)) return 'space'
  if (/dim|cot|dimension|measure/i.test(l)) return 'dimension'
  if (/text|annot|label/i.test(l)) return 'text'
  if (/equip|mobilier|furni/i.test(l)) return 'equipment'
  if (/hatch/i.test(l)) return 'hatch'
  return 'other'
}

// ─── DEFAULT LAYER VISIBILITY ───

function getDefaultLayerVisibility(layerName: string): boolean {
  const name = layerName.toUpperCase()

  // Always HIDDEN — too noisy at first render
  const OFF_KEYWORDS = [
    'CVC', 'CLIM', 'HVAC', 'CHAUFF', 'VENTIL',
    'ELEC', 'ELECT', 'COURANT', 'CABLE',
    'PLOMB', 'SANITAIRE', 'EAU', 'ASSAIN',
    'INCENDIE', 'SSI', 'SPRINKL', 'DESENFUM',
    'TELECOM', 'VDI', 'RESEAU',
    'HATCH', 'PATTERN',
    'COTE', 'DIM', 'COTATION',
    'REPERE', 'AXE',
    'DEFPOINTS',
  ]

  for (const kw of OFF_KEYWORDS) {
    if (name.includes(kw)) return false
  }
  return true
}

// ─── DÉTECTION TYPE DE FICHIER ───

export function detectPlanSourceType(file: File): PlanSourceType {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = file.type.toLowerCase()

  if (ext === 'dxf') return 'dxf'
  if (ext === 'dwg') return 'dwg'
  if (ext === 'ifc') return 'ifc'
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf'
  if (ext === 'svg') return 'svg'
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) return 'image_raster'
  if (mime.startsWith('image/')) return 'image_raster'

  return 'dxf' // fallback
}

// ─── ORCHESTRATEUR PRINCIPAL ───

export async function importPlan(
  file: File,
  floorId: string,
  options: {
    onProgress?: (state: PlanImportState) => void
  } = {}
): Promise<PlanImportState> {
  const sourceType = detectPlanSourceType(file)
  const { onProgress } = options

  const state: PlanImportState = {
    step: 'detecting',
    sourceType,
    fileName: file.name,
    fileSize: file.size,
    progress: 0,
    currentOperation: 'Detection du type de fichier...',
    detectedZones: [],
    detectedDims: [],
    calibration: null,
    errors: [],
    warnings: [],
  }

  const emit = () => onProgress?.({ ...state })
  emit()

  try {
    switch (sourceType) {
      case 'dwg': {
        state.currentOperation = 'Chargement du moteur LibreDWG (WASM)...'
        state.progress = 5
        emit()

        const { Dwg_File_Type, LibreDwg } = await import('@mlightcad/libredwg-web')
        // Path empty string → locateFile returns `/libredwg-web.wasm` (served from public/)
        const libredwg = await LibreDwg.create('')

        state.currentOperation = 'Lecture du fichier DWG...'
        state.progress = 20
        emit()

        const dwgBuffer = await file.arrayBuffer()
        const dwgData = libredwg.dwg_read_data(dwgBuffer, Dwg_File_Type.DWG)
        if (!dwgData) {
          state.step = 'error'
          state.errors.push('Impossible de lire le fichier DWG. Verifiez que le fichier est valide.')
          emit()
          return state
        }

        state.currentOperation = 'Conversion des entites DWG...'
        state.progress = 40
        emit()

        const db = libredwg.convert(dwgData)
        libredwg.dwg_free(dwgData)

        // Generate SVG preview
        state.currentOperation = 'Generation du rendu SVG...'
        state.progress = 60
        emit()

        // We build our own SVG after entity extraction (below) for accurate rendering

        // Extract layers
        const layers = db.tables.LAYER.entries.map(l => l.name).filter(n => n && n !== '0')

        // Extract entities and compute bounds
        state.currentOperation = 'Extraction des zones et cotes...'
        state.progress = 75
        emit()

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        const dwgZones: typeof state.detectedZones = []
        const dwgDims: typeof state.detectedDims = []
        let zIdx = 0, dIdx = 0

        // Layers that represent structure/construction — NOT usable spaces
        const isStructuralLayer = (layer: string): boolean => {
          const l = layer.toLowerCase()
          return /maconn|hatch|beton|facade|acier|coupe|axes|cotation|dim|texte|text|vent|volet|drain|tab|corriger|contour|ligne|stylo|hide|defpoint|handle|marquage|pdf|geom/i.test(l)
        }

        // Classify space type from its NAME (text label from the plan) or layer name
        const classifySpace = (name: string): { type: string; niveau: number; color: string } => {
          const l = name.toLowerCase()

          // Parking
          if (/park|garage|sous.?sol/i.test(l)) return { type: 'parking', niveau: 3, color: '#64748b' }

          // Restauration
          if (/restaurant|food.?court|cuisine|cafe|caf[eé]|brasserie|snack|kfc|mcdonald|brioche|boulang|p[aâ]tiss|glacier|bar\b|pizz|sushi|grill|cantine|fast|traiteur/i.test(l)) return { type: 'restauration', niveau: 2, color: '#f59e0b' }

          // Commerce / Boutiques
          if (/boutique|magasin|shop|cell|zara|h&m|sephora|fnac|nike|adidas|carrefour|auchan|leclerc|monoprix|bershka|pull.?bear|mango|celio|kiabi|decathlon|darty|micromania|orange|mtn|moov|apple|samsung|huawei|optique|lunette|bijou|joaill|horlog|parfum|cosm[eé]tique|mode|v[eê]tement|chaussur|maroquin|lingerie|sport|jean|textile|tissus|mercerie|couture|librairie|papeterie|tabac|fleur|pharmacie|para.?pharmac/i.test(l)) return { type: 'commerce', niveau: 2, color: '#3b82f6' }

          // Services
          if (/wc|toilette|sanitaire|lavabo|douche|vestiaire|infirm|premier.?secours|consigne|accueil|info|r[eé]ception|guichet|banque|change|dab|atm|distributeur|pressing|cordonnerie|cl[eé]|serrurier|retouche|coiffeur|coiffure|beaut[eé]|spa|onglerie|tatou|bien.?[eê]tre|agence|assurance|notaire|avocat|cabinet|salle.?d.?attente|client/i.test(l)) return { type: 'services', niveau: 2, color: '#14b8a6' }

          // Loisirs
          if (/cin[eé]ma|path[eé]|bowling|arcade|jeu|game|salle.?de.?jeu|kid|enfant|aire.?de.?jeu|man[eè]ge|karting|laser|escape|fitness|gym|muscul|piscine|aqua|spectacle|th[eé][aâ]tre|concert|[eé]v[eé]nement|animation/i.test(l)) return { type: 'loisirs', niveau: 2, color: '#06b6d4' }

          // Technique
          if (/tech|local.?tech|tgbt|transfo|electri|cvc|clim|ventil|chauff|plomb|pompe|surpress|sprinkl|group[eé].?[eé]lectro|onduleur|serveur|informatique|compt[eé]|compteur|machin|maintenance|entreti|d[eé]chet|poubelle|vide.?ordure|charge|d[eé]p[oô]t|stock|r[eé]serve|entrep[oô]t|livraison|quai|monte.?charge/i.test(l)) return { type: 'technique', niveau: 4, color: '#ef4444' }

          // Back-office / Administration
          if (/bureau|office|back.?off|admin|direction|g[eé]rance|gestion|comptab|secr[eé]tari|r[eé]union|conf[eé]rence|salle.?de.?r[eé]union|open.?space|co.?working|archive/i.test(l)) return { type: 'backoffice', niveau: 4, color: '#8b5cf6' }

          // Securite / Finance
          if (/s[eé]curit|surveillance|contr[oô]le|vigil|poste.?de.?garde|coffre|valeur|trésor|chambre.?forte|financ|caiss/i.test(l)) return { type: 'financier', niveau: 5, color: '#dc2626' }

          // Sorties de secours
          if (/secours|sortie|[eé]vacuation|issue|urgence|d[eé]senfumage|pompier/i.test(l)) return { type: 'sortie_secours', niveau: 3, color: '#22c55e' }

          // Circulation
          if (/hall|circul|couloir|corridor|galerie|passage|d[eé]ambul|atrium|escalier|stair|ascens[eé]|escalat|rampe|passerelle|entr[eé]e|foyer|palier|sas/i.test(l)) return { type: 'circulation', niveau: 1, color: '#e5e7eb' }

          // Hotel
          if (/h[oô]tel|chambre|suite|r[eé]ception.?h[oô]tel|lobby|h[eé]berg/i.test(l)) return { type: 'hotel', niveau: 3, color: '#a855f7' }

          // Exterieur
          if (/ext[eé]rieur|terrass|jardin|parvis|esplanade|fa[cç]ade|toit|toiture/i.test(l)) return { type: 'exterieur', niveau: 1, color: '#84cc16' }

          // Fallback: try layer name
          if (/maconn|mur|cloison|beton/i.test(l)) return { type: 'circulation', niveau: 1, color: '#94a3b8' }
          if (/porte|door|fenetre|window/i.test(l)) return { type: 'circulation', niveau: 1, color: '#e5e7eb' }

          return { type: 'commerce', niveau: 2, color: '#3b82f6' }
        }
        // Alias for backward compat
        const classifyLayerType = classifySpace

        for (const entity of db.entities) {
          const e = entity as any

          // Collect bounds from LINE
          if (entity.type === 'LINE' && e.start && e.end) {
            minX = Math.min(minX, e.start.x, e.end.x); minY = Math.min(minY, e.start.y, e.end.y)
            maxX = Math.max(maxX, e.start.x, e.end.x); maxY = Math.max(maxY, e.start.y, e.end.y)
          }

          // LWPOLYLINE / POLYLINE2D — zone candidates from ALL layers
          if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE2D') {
            const verts: { x: number; y: number }[] = e.vertices ?? []
            for (const v of verts) {
              minX = Math.min(minX, v.x); minY = Math.min(minY, v.y)
              maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y)
            }

            if (verts.length >= 3) {
              const flagClosed = (e.flag & 1) !== 0
              const first = verts[0], last = verts[verts.length - 1]
              // More tolerant snap-close: 0.1% of bounding box diagonal
              const xs = verts.map(v => v.x), ys = verts.map(v => v.y)
              const zMinX = Math.min(...xs), zMaxX = Math.max(...xs)
              const zMinY = Math.min(...ys), zMaxY = Math.max(...ys)
              const diag = Math.sqrt((zMaxX - zMinX) ** 2 + (zMaxY - zMinY) ** 2)
              const snapTol = Math.max(50, diag * 0.02) // 2% of diagonal or 50 units
              const snapClosed = Math.abs(first.x - last.x) < snapTol && Math.abs(first.y - last.y) < snapTol

              if (flagClosed || snapClosed) {
                const w = zMaxX - zMinX, h = zMaxY - zMinY
                // Keep zones > 0.5m² (500,000 mm²) — lower threshold to catch small rooms
                const areaMM2 = w * h
                if (areaMM2 > 500_000 && areaMM2 < 500_000_000_000) {
                  const aspect = Math.min(w, h) / Math.max(w, h)
                  if (aspect > 0.03) {
                    const cls = classifyLayerType(entity.layer)
                    dwgZones.push({
                      id: `dwg-zone-${zIdx++}`,
                      label: entity.layer || `Zone ${zIdx}`,
                      estimatedType: cls.type as any,
                      boundingBox: { x: zMinX, y: zMinY, w, h },
                      confidence: flagClosed ? 0.85 : 0.7,
                    })
                  }
                }
              }
            }
          }

          // HATCH — boundaryPaths = zone outlines
          if (entity.type === 'HATCH') {
            const bPaths: any[] = e.boundaryPaths ?? []
            for (const bp of bPaths) {
              // Each boundaryPath has edges (line/arc segments) or polyline vertices
              const edges: any[] = bp.edges ?? []
              const polyVerts: any[] = bp.polyline ?? []
              const pts: { x: number; y: number }[] = []

              // Polyline-type boundary path
              for (const pv of polyVerts) {
                if (pv.x != null && pv.y != null) pts.push(pv)
              }
              // Edge-type boundary path
              for (const edge of edges) {
                if (edge.start) pts.push(edge.start)
                if (edge.end) pts.push(edge.end)
                if (edge.center && edge.radius != null) {
                  pts.push({ x: edge.center.x + edge.radius, y: edge.center.y })
                  pts.push({ x: edge.center.x - edge.radius, y: edge.center.y })
                }
              }

              if (pts.length >= 3) {
                const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
                const hMinX = Math.min(...xs), hMaxX = Math.max(...xs)
                const hMinY = Math.min(...ys), hMaxY = Math.max(...ys)
                const w = hMaxX - hMinX, h = hMaxY - hMinY
                const areaMM2 = w * h
                if (areaMM2 > 1_000_000 && areaMM2 < 500_000_000_000) {
                  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y) }
                  const cls = classifyLayerType(entity.layer)
                  dwgZones.push({
                    id: `dwg-zone-${zIdx++}`,
                    label: entity.layer || `Zone ${zIdx}`,
                    estimatedType: cls.type as any,
                    boundingBox: { x: hMinX, y: hMinY, w, h },
                    confidence: 0.9,
                  })
                }
              }
            }
          }

          // CIRCLE / ARC — bounds
          if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
            const cx = e.center?.x ?? 0, cy = e.center?.y ?? 0, r = e.radius ?? 0
            minX = Math.min(minX, cx - r); minY = Math.min(minY, cy - r)
            maxX = Math.max(maxX, cx + r); maxY = Math.max(maxY, cy + r)
          }

          // DIMENSION — real measurements with definitionPoint, subDefinitionPoint1/2, measurement
          if (entity.type === 'DIMENSION') {
            const measurement = e.measurement ?? 0
            if (measurement > 0) {
              const dp = e.definitionPoint ?? { x: 0, y: 0 }
              const tp = e.textPoint ?? dp
              const sp1 = e.subDefinitionPoint1 ?? dp
              const sp2 = e.subDefinitionPoint2 ?? dp
              dwgDims.push({
                id: `dwg-dim-${dIdx++}`,
                type: 'lineaire' as const,
                value: measurement / 1000, // mm → m
                valueText: e.text || `${(measurement / 1000).toFixed(2)} m`,
                unit: 'mm' as any,
                confidence: 0.9,
                defPoint1: [sp1.x, sp1.y] as [number, number],
                defPoint2: [sp2.x, sp2.y] as [number, number],
                textPosition: [tp.x, tp.y] as [number, number],
                layer: entity.layer,
              })
            }
          }

          // TEXT / MTEXT — dimension text labels
          if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
            const text = (e.text ?? e.contents ?? '').trim()
            const dimMatch = text.match(/^(\d+[.,]?\d*)\s*(mm|cm|m)?$/i)
            if (dimMatch && text.length <= 12) {
              const val = parseFloat(dimMatch[1].replace(',', '.'))
              const unit = (dimMatch[2] ?? '').toLowerCase()
              if (val > 0 && val < 100000) {
                const pos = e.insertionPoint ?? { x: 0, y: 0 }
                dwgDims.push({
                  id: `dwg-dim-${dIdx++}`,
                  type: 'lineaire' as const,
                  value: unit === 'mm' || (!unit && val > 200) ? val / 1000 : unit === 'cm' ? val / 100 : val,
                  valueText: text,
                  unit: (unit || 'mm') as any,
                  confidence: unit ? 0.9 : 0.7,
                  defPoint1: [pos.x, pos.y] as [number, number],
                  defPoint2: [pos.x, pos.y] as [number, number],
                  textPosition: [pos.x, pos.y] as [number, number],
                  layer: entity.layer,
                })
              }
            }
          }
        }

        // Collect coordinates from LINE and POLYLINE entities ONLY (skip INSERT)
        // to compute robust bounds using percentile filtering
        const allXs: number[] = [], allYs: number[] = []
        for (const entity of db.entities) {
          // Skip INSERT entities entirely — they cause duplicate fragments
          if (entity.type === 'INSERT' || entity.type === 'VIEWPORT') continue
          const e = entity as any
          if (entity.type === 'LINE' && e.start && e.end) {
            allXs.push(e.start.x, e.end.x); allYs.push(e.start.y, e.end.y)
          }
          if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE2D') && e.vertices) {
            for (const v of e.vertices) { allXs.push(v.x); allYs.push(v.y) }
          }
          if (entity.type === 'CIRCLE' && e.center) {
            allXs.push(e.center.x); allYs.push(e.center.y)
          }
        }

        // Log entity sample for debugging
        if (db.entities.length > 0) {
          const sample = db.entities[0] as any
          console.log('[DWG] Entity sample keys:', Object.keys(sample))
        }

        if (allXs.length > 10) {
          allXs.sort((a, b) => a - b)
          allYs.sort((a, b) => a - b)

          // Percentile 2%-98% — simple and robust against outliers/XREFs
          const p2x = allXs[Math.floor(allXs.length * 0.02)]
          const p98x = allXs[Math.floor(allXs.length * 0.98)]
          const p2y = allYs[Math.floor(allYs.length * 0.02)]
          const p98y = allYs[Math.floor(allYs.length * 0.98)]

          // 5% margin
          const mx = (p98x - p2x) * 0.05
          const my = (p98y - p2y) * 0.05

          minX = p2x - mx
          maxX = p98x + mx
          minY = p2y - my
          maxY = p98y + my

          console.log(`[DWG] Bounds (percentile 2-98): X=${minX.toFixed(0)}..${maxX.toFixed(0)}, Y=${minY.toFixed(0)}..${maxY.toFixed(0)} (raw: X=${allXs[0].toFixed(0)}..${allXs[allXs.length-1].toFixed(0)}, Y=${allYs[0].toFixed(0)}..${allYs[allYs.length-1].toFixed(0)})`)
        }

        // Generate custom SVG from entities
        const bW = maxX - minX, bH = maxY - minY
        if (bW > 0 && bH > 0) {
          const svgW = 4000, svgH = Math.round(svgW * (bH / bW))
          const sx = svgW / bW, sy = svgH / bH
          const tx = (x: number) => (x - minX) * sx
          const ty = (y: number) => svgH - (y - minY) * sy // flip Y axis (DWG Y is up)
          const paths: string[] = []

          // Helper: check if a raw DWG point is within the IQR-filtered plan bounds
          const svgInBounds = (x: number, y: number) =>
            x >= minX - (maxX - minX) * 0.02 && x <= maxX + (maxX - minX) * 0.02 &&
            y >= minY - (maxY - minY) * 0.02 && y <= maxY + (maxY - minY) * 0.02

          for (const entity of db.entities) {
            const e = entity as any
            if (!entity.isVisible && entity.isVisible !== undefined) continue
            // Skip INSERT and VIEWPORT — they cause fragment duplication
            if (entity.type === 'INSERT' || entity.type === 'VIEWPORT') continue
            if (e.inPaperSpace === true || e.paperSpace === true) continue

            if (entity.type === 'LINE' && e.start && e.end) {
              if (!svgInBounds(e.start.x, e.start.y) && !svgInBounds(e.end.x, e.end.y)) continue
              paths.push(`<line x1="${tx(e.start.x).toFixed(1)}" y1="${ty(e.start.y).toFixed(1)}" x2="${tx(e.end.x).toFixed(1)}" y2="${ty(e.end.y).toFixed(1)}" stroke="#94a3b8" stroke-width="1"/>`)
            }

            if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE2D') {
              const verts = e.vertices ?? []
              if (verts.length >= 2) {
                // Skip if no vertex is in bounds
                if (!verts.some((v: any) => svgInBounds(v.x, v.y))) continue
                const pts = verts.map((v: any) => `${tx(v.x).toFixed(1)},${ty(v.y).toFixed(1)}`).join(' ')
                const closed = (e.flag & 1) !== 0
                const tag = closed ? 'polygon' : 'polyline'
                paths.push(`<${tag} points="${pts}" fill="none" stroke="#64748b" stroke-width="1.2"/>`)
              }
            }

            if (entity.type === 'CIRCLE') {
              if (!svgInBounds(e.center?.x ?? 0, e.center?.y ?? 0)) continue
              const cx = tx(e.center?.x ?? 0), cy = ty(e.center?.y ?? 0), r = (e.radius ?? 0) * sx
              paths.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#64748b" stroke-width="0.8"/>`)
            }

            if (entity.type === 'ARC') {
              const cx = e.center?.x ?? 0, cy = e.center?.y ?? 0, r = e.radius ?? 0
              if (!svgInBounds(cx, cy)) continue
              const sa = (e.startAngle ?? 0) * Math.PI / 180
              const ea = (e.endAngle ?? 360) * Math.PI / 180
              const x1 = tx(cx + r * Math.cos(sa)), y1 = ty(cy + r * Math.sin(sa))
              const x2 = tx(cx + r * Math.cos(ea)), y2 = ty(cy + r * Math.sin(ea))
              const largeArc = (ea - sa + 2 * Math.PI) % (2 * Math.PI) > Math.PI ? 1 : 0
              paths.push(`<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${(r * sx).toFixed(1)} ${(r * sy).toFixed(1)} 0 ${largeArc} 0 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#64748b" stroke-width="0.8"/>`)
            }
          }

          // Add TEXT/MTEXT labels to SVG (room names, boutique names)
          for (const entity of db.entities) {
            if (entity.type !== 'TEXT' && entity.type !== 'MTEXT') continue
            const e = entity as any
            if (e.inPaperSpace === true || e.paperSpace === true) continue
            let text = (e.text ?? e.contents ?? '').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}\\]/g, '').trim()
            if (!text || text.length < 2) continue
            // Skip pure dimension numbers
            if (/^\d+[.,]?\d*\s*(mm|cm|m)?$/.test(text)) continue
            const pos = e.insertionPoint ?? e.position ?? { x: 0, y: 0 }
            if (!svgInBounds(pos.x, pos.y)) continue
            const px = tx(pos.x), py = ty(pos.y)
            if (px < 0 || px > svgW || py < 0 || py > svgH) continue
            const fontSize = Math.max(6, Math.min(12, (e.height ?? 200) * sx * 0.8))
            paths.push(`<text x="${px.toFixed(0)}" y="${py.toFixed(0)}" fill="#e2e8f0" font-size="${fontSize.toFixed(0)}" font-family="sans-serif" opacity="0.9">${text.replace(/</g, '&lt;')}</text>`)
          }

          // Add DIMENSION lines and text to SVG
          for (const entity of db.entities) {
            if (entity.type !== 'DIMENSION') continue
            const e = entity as any
            if (e.inPaperSpace === true || e.paperSpace === true) continue
            const sp1 = e.subDefinitionPoint1, sp2 = e.subDefinitionPoint2
            if (!sp1 || !sp2) continue
            if (!svgInBounds(sp1.x, sp1.y) && !svgInBounds(sp2.x, sp2.y)) continue
            const m = e.measurement ?? 0
            if (m <= 0) continue
            const x1 = tx(sp1.x), y1 = ty(sp1.y), x2 = tx(sp2.x), y2 = ty(sp2.y)
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
            const label = e.text || `${(m / 1000).toFixed(2)}`
            paths.push(`<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="#ef4444" stroke-width="0.8" opacity="0.6"/>`)
            paths.push(`<text x="${mx.toFixed(0)}" y="${(my - 3).toFixed(0)}" fill="#ef4444" font-size="8" text-anchor="middle" opacity="0.8">${label}</text>`)
          }

          // Add door/porte markers
          for (const entity of db.entities) {
            const l = entity.layer.toLowerCase()
            if (!l.includes('porte') && !l.includes('fenetre')) continue
            const e = entity as any
            if (e.inPaperSpace === true || e.paperSpace === true) continue
            if (entity.type === 'ARC' && e.center) {
              if (!svgInBounds(e.center.x, e.center.y)) continue
              const cx = tx(e.center.x), cy = ty(e.center.y)
              const r = (e.radius ?? 500) * sx
              const color = l.includes('secours') || l.includes('sortie') ? '#22c55e' : '#3b82f6'
              paths.push(`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${Math.min(r, 8).toFixed(0)}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.7"/>`)
            }
          }

          const customSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}"><rect width="100%" height="100%" fill="#0f172a"/>${paths.join('')}</svg>`

          try {
            const pngBlob = await rasterizeSvgToPng(customSvg, svgW, svgH)
            state.planImageUrl = URL.createObjectURL(pngBlob)
          } catch {
            const svgBlob = new Blob([customSvg], { type: 'image/svg+xml' })
            state.planImageUrl = URL.createObjectURL(svgBlob)
          }
        }

        // Normalize zone coordinates to 0-1
        if (bW > 0 && bH > 0) {
          for (const z of dwgZones) {
            z.boundingBox = {
              x: (z.boundingBox.x - minX) / bW,
              y: (z.boundingBox.y - minY) / bH,
              w: z.boundingBox.w / bW,
              h: z.boundingBox.h / bH,
            }
          }
        }

        // Log extracted data for debugging
        console.log(`[DWG] Zones: ${dwgZones.length}, Dims: ${dwgDims.length}`)

        // Log zones per layer to understand what was detected
        const zonesByLayer = new Map<string, number>()
        for (const z of dwgZones) zonesByLayer.set(z.label, (zonesByLayer.get(z.label) ?? 0) + 1)
        console.log('[DWG] Zones par calque:', Object.fromEntries(zonesByLayer))

        // Log closed polylines with area stats per layer
        const closedByLayer = new Map<string, { count: number; areas: number[] }>()
        for (const entity of db.entities) {
          if (entity.type !== 'LWPOLYLINE') continue
          const e = entity as any
          const verts = e.vertices ?? []
          if (verts.length < 4) continue
          const first = verts[0], last = verts[verts.length - 1]
          const closed = (e.flag & 1) !== 0 || (Math.abs(first.x - last.x) < 10 && Math.abs(first.y - last.y) < 10)
          if (closed) {
            const xs = verts.map((v: any) => v.x), ys = verts.map((v: any) => v.y)
            const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys)
            const areaSqm = (w * h) * 0.000001 // mm² → m²
            const entry = closedByLayer.get(entity.layer) ?? { count: 0, areas: [] }
            entry.count++
            if (entry.areas.length < 5) entry.areas.push(Math.round(areaSqm * 10) / 10)
            closedByLayer.set(entity.layer, entry)
          }
        }
        const closedReport: Record<string, string> = {}
        for (const [k, v] of closedByLayer) closedReport[k] = `${v.count} (sample m²: ${v.areas.join(', ')})`
        console.log('[DWG] Polylignes fermees par calque:', closedReport)

        // Extract ALL text labels — these are room names, boutique names, etc.
        const textLabels: Array<{ text: string; x: number; y: number; layer: string }> = []
        for (const entity of db.entities) {
          if (entity.type !== 'TEXT' && entity.type !== 'MTEXT') continue
          const e = entity as any
          const text = (e.text ?? e.contents ?? '').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}\\]/g, '').trim()
          if (!text || text.length < 2 || text.length > 100) continue
          const pos = e.insertionPoint ?? e.position ?? { x: 0, y: 0 }
          textLabels.push({ text, x: pos.x, y: pos.y, layer: entity.layer })
        }
        console.log(`[DWG] ${textLabels.length} labels texte:`, textLabels.slice(0, 30).map(t => t.text))

        // Extract doors from entities on door/porte layers
        const dwgDoors: Array<{ x: number; y: number; width: number; layer: string; isExit: boolean }> = []
        for (const entity of db.entities) {
          const e = entity as any
          const l = entity.layer.toLowerCase()
          if (!l.includes('porte') && !l.includes('door') && !l.includes('fenetre')) continue
          if (entity.type === 'INSERT' || entity.type === 'LINE' || entity.type === 'ARC') {
            const pos = e.insertionPoint ?? e.position ?? e.start ?? e.center ?? { x: 0, y: 0 }
            dwgDoors.push({
              x: pos.x, y: pos.y,
              width: e.xScale ?? e.radius ?? 0.9,
              layer: entity.layer,
              isExit: l.includes('secours') || l.includes('sortie') || l.includes('exit'),
            })
          }
        }
        console.log(`[DWG] ${dwgDoors.length} portes/fenetres detectees`)

        // Build wall segments index for raycasting
        const wallSegs: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
        for (const entity of db.entities) {
          const e = entity as any
          if (entity.type === 'LINE' && e.start && e.end) {
            wallSegs.push({ x1: e.start.x, y1: e.start.y, x2: e.end.x, y2: e.end.y })
          }
          if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE2D') && e.vertices?.length >= 2) {
            const v = e.vertices
            for (let i = 0; i < v.length - 1; i++) {
              wallSegs.push({ x1: v[i].x, y1: v[i].y, x2: v[i + 1].x, y2: v[i + 1].y })
            }
          }
        }

        // Create zones from text labels by raycasting to find walls
        const isSpaceName = (text: string): boolean => {
          // Skip pure numbers, dimension annotations, codes
          if (/^\d+[.,]?\d*\s*(mm|cm|m)?$/.test(text)) return false
          if (/^\d+[PX]\d+/i.test(text)) return false // "130P130", "22X17"
          if (/^%%/.test(text)) return false // AutoCAD codes
          if (/^G\.T\b/i.test(text)) return true // "G.T desenfumage" = local technique
          if (text.length < 3) return false
          // Must contain at least one letter
          return /[a-zA-ZÀ-ÿ]/.test(text)
        }

        // Find nearest wall in a direction from a point
        const findWall = (px: number, py: number, dx: number, dy: number, maxDist: number): number => {
          let best = maxDist
          for (const seg of wallSegs) {
            // For horizontal ray (dx=1 or -1, dy=0)
            if (dy === 0 && dx !== 0) {
              const segDy = seg.y2 - seg.y1
              if (Math.abs(segDy) > Math.abs(seg.x2 - seg.x1) * 0.3) { // mostly vertical wall
                const segMinY = Math.min(seg.y1, seg.y2), segMaxY = Math.max(seg.y1, seg.y2)
                if (py >= segMinY - 100 && py <= segMaxY + 100) {
                  const segX = (seg.x1 + seg.x2) / 2
                  const dist = (segX - px) * dx
                  if (dist > 50 && dist < best) best = dist
                }
              }
            }
            // For vertical ray (dy=1 or -1, dx=0)
            if (dx === 0 && dy !== 0) {
              const segDx = seg.x2 - seg.x1
              if (Math.abs(segDx) > Math.abs(seg.y2 - seg.y1) * 0.3) { // mostly horizontal wall
                const segMinX = Math.min(seg.x1, seg.x2), segMaxX = Math.max(seg.x1, seg.x2)
                if (px >= segMinX - 100 && px <= segMaxX + 100) {
                  const segY = (seg.y1 + seg.y2) / 2
                  const dist = (segY - py) * dy
                  if (dist > 50 && dist < best) best = dist
                }
              }
            }
          }
          return best
        }

        // Create zones from meaningful text labels
        // Use plan extent to set sensible max search distance
        const planExtent = Math.max(bW, bH)
        const MAX_ZONE_HALF = Math.max(8000, planExtent * 0.15) // 15% of plan or 8m min
        const DEFAULT_ZONE_HALF = Math.max(3000, planExtent * 0.03) // fallback size when no wall found
        const textZones: typeof dwgZones = []
        for (const label of textLabels) {
          if (!isSpaceName(label.text)) continue

          const right = findWall(label.x, label.y, 1, 0, MAX_ZONE_HALF)
          const left = findWall(label.x, label.y, -1, 0, MAX_ZONE_HALF)
          const up = findWall(label.x, label.y, 0, 1, MAX_ZONE_HALF)
          const down = findWall(label.x, label.y, 0, -1, MAX_ZONE_HALF)

          // Use default half-size when no wall found in a direction
          const effRight = right < MAX_ZONE_HALF ? right : DEFAULT_ZONE_HALF
          const effLeft = left < MAX_ZONE_HALF ? left : DEFAULT_ZONE_HALF
          const effUp = up < MAX_ZONE_HALF ? up : DEFAULT_ZONE_HALF
          const effDown = down < MAX_ZONE_HALF ? down : DEFAULT_ZONE_HALF

          // Accept if at least 1 wall found (floating labels with 0 walls are still skipped)
          const wallsFound = (right < MAX_ZONE_HALF ? 1 : 0) + (left < MAX_ZONE_HALF ? 1 : 0) + (up < MAX_ZONE_HALF ? 1 : 0) + (down < MAX_ZONE_HALF ? 1 : 0)
          if (wallsFound < 1) continue

          const zx = Math.max(minX, label.x - effLeft)
          const zy = Math.max(minY, label.y - effDown)
          const zw = Math.min(effLeft + effRight, maxX - zx)
          const zh = Math.min(effDown + effUp, maxY - zy)

          const areaSqm = (zw * zh) * 0.000001
          if (areaSqm < 0.5 || areaSqm > 5000) continue

          const cls = classifySpace(label.text)
          textZones.push({
            id: `dwg-zone-${zIdx++}`,
            label: label.text,
            estimatedType: cls.type as any,
            boundingBox: { x: zx, y: zy, w: zw, h: zh },
            confidence: 0.8,
          })
        }

        console.log(`[DWG] ${textZones.length} zones creees a partir des textes du plan`)

        // Extract INSERT blocks — named blocks often represent rooms/spaces
        for (const entity of db.entities) {
          if (entity.type !== 'INSERT') continue
          const e = entity as any
          const blockName = (e.name ?? '').trim()
          if (!blockName || blockName.length < 2) continue
          // Skip common non-space blocks (furniture, symbols, titleblock)
          if (/\*|DEFPOINT|ARROW|SYMBOL|TITLE|CARTOUCHE|BORDER|FRAME|LOGO|NORTH|SCALE|LEGEND|STAMP|A[0-4]_/i.test(blockName)) continue

          const pos = e.insertionPoint ?? e.position ?? { x: 0, y: 0 }
          const xScale = Math.abs(e.xScale ?? 1)
          const yScale = Math.abs(e.yScale ?? 1)

          // Estimate block extent from scale factors (rough, but catches many cases)
          const estimatedW = xScale * 1000 // assume base block ~1m
          const estimatedH = yScale * 1000
          if (estimatedW > 200 && estimatedH > 200) {
            const cls = classifySpace(blockName)
            dwgZones.push({
              id: `dwg-zone-${zIdx++}`,
              label: blockName,
              estimatedType: cls.type as any,
              boundingBox: { x: pos.x - estimatedW / 2, y: pos.y - estimatedH / 2, w: estimatedW, h: estimatedH },
              confidence: 0.6,
            })
          }
        }

        // Merge text-based zones with geometry-based zones
        dwgZones.push(...textZones)

        // Deduplicate zones: if a text-based zone overlaps >70% with a geometry zone, keep the text one (better label)
        const deduped: typeof dwgZones = []
        for (const z of dwgZones) {
          const bb = z.boundingBox
          const isDuplicate = deduped.some(existing => {
            const ebb = existing.boundingBox
            const overlapX = Math.max(0, Math.min(bb.x + bb.w, ebb.x + ebb.w) - Math.max(bb.x, ebb.x))
            const overlapY = Math.max(0, Math.min(bb.y + bb.h, ebb.y + ebb.h) - Math.max(bb.y, ebb.y))
            const overlapArea = overlapX * overlapY
            const smallerArea = Math.min(bb.w * bb.h, ebb.w * ebb.h)
            return smallerArea > 0 && overlapArea / smallerArea > 0.7
          })
          if (!isDuplicate) deduped.push(z)
        }

        state.detectedZones = deduped
        state.detectedDims = dwgDims

        // Calibration from DIMENSION entities — most reliable source
        // DIMENSION.measurement is in drawing units (typically mm)
        // DIMENSION.subDefinitionPoint1/2 are the measured endpoints
        const maxDim = Math.max(bW, bH)
        let detectedUnit: string
        if (maxDim > 50000) detectedUnit = 'mm'
        else if (maxDim > 5000) detectedUnit = 'cm'
        else detectedUnit = 'm'

        // Use DIMENSION entities to compute precise scale factor
        // Compare measurement values to coordinate distances
        const dimScales: number[] = []
        for (const dim of dwgDims) {
          if (dim.value <= 0) continue
          const [x1, y1] = dim.defPoint1
          const [x2, y2] = dim.defPoint2
          const coordDist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
          if (coordDist > 10) { // skip zero-length dims
            // dim.value is already in metres (we converted mm→m above)
            // coordDist is in drawing units (mm)
            const scale = dim.value / coordDist // metres per drawing unit
            if (scale > 0 && scale < 1) dimScales.push(scale)
          }
        }

        let realW: number, realH: number
        if (dimScales.length >= 3) {
          // Use median scale factor for robustness
          dimScales.sort((a, b) => a - b)
          const medianScale = dimScales[Math.floor(dimScales.length / 2)]
          realW = bW * medianScale
          realH = bH * medianScale
          console.log(`[DWG] Calibration from ${dimScales.length} DIMENSION entities: scale=${medianScale.toFixed(6)}, plan=${realW.toFixed(1)}m x ${realH.toFixed(1)}m`)
        } else {
          // Fallback: heuristic from coordinate range
          if (detectedUnit === 'mm') { realW = bW / 1000; realH = bH / 1000 }
          else if (detectedUnit === 'cm') { realW = bW / 100; realH = bH / 100 }
          else { realW = bW; realH = bH }
        }

        if (dwgDims.length > 0) {
          state.calibration = {
            scaleFactorX: bW > 0 ? 1 / bW : 1,
            scaleFactorY: bH > 0 ? 1 / bH : 1,
            realWidthM: realW,
            realHeightM: realH,
            confidence: dimScales.length >= 3 ? 0.95 : 0.8,
            method: 'dim_auto',
            samplesUsed: dimScales.length,
            outlierCount: dwgDims.length - dimScales.length,
            issues: [
              `${dwgDims.length} cotes lues depuis le plan DWG`,
              `${dimScales.length} cotes utilisees pour la calibration`,
              `Dimensions reelles: ${realW.toFixed(1)}m x ${realH.toFixed(1)}m`,
              `Unite dessin: ${detectedUnit}`,
            ],
          }
        } else {
          state.calibration = {
            scaleFactorX: bW > 0 ? 1 / bW : 1,
            scaleFactorY: bH > 0 ? 1 / bH : 1,
            realWidthM: realW,
            realHeightM: realH,
            confidence: 0.85,
            method: 'dim_auto',
            samplesUsed: layers.length,
            outlierCount: 0,
            issues: [],
          }
        }
        state.calibration.issues = [
          `Unite detectee: ${detectedUnit} (coordonnees max: ${maxDim.toFixed(0)})`,
          `${layers.length} calques: ${layers.join(', ')}`,
          `${dwgZones.length} zones, ${dwgDims.length} cotes`,
        ]

        state.warnings.push(
          `DWG AutoCAD — ${layers.length} calques: ${layers.join(', ')}`,
          `Unite: ${detectedUnit} — ${realW.toFixed(1)}m x ${realH.toFixed(1)}m`,
        )

        // ── Build ParsedPlan with full PlanEntity[] for PlanCanvasV2 ──
        try {
          const unitScale = detectedUnit === 'mm' ? 0.001 : detectedUnit === 'cm' ? 0.01 : 1.0
          const planEntities: PlanEntity[] = []
          let peIdx = 0

          // Use the percentile-filtered bounds to exclude outlier entities
          const inBounds = (x: number, y: number) =>
            x >= minX && x <= maxX && y >= minY && y <= maxY

          for (const entity of db.entities) {
            const e = entity as Record<string, unknown>
            if (entity.isVisible === false) continue

            // Skip INSERT and VIEWPORT entirely — they cause fragment duplication
            if (entity.type === 'INSERT' || entity.type === 'VIEWPORT') continue

            // LINE
            if (entity.type === 'LINE' && e.start && e.end) {
              const s = e.start as { x: number; y: number }
              const en = e.end as { x: number; y: number }
              if (!inBounds(s.x, s.y) && !inBounds(en.x, en.y)) continue
              planEntities.push({
                id: `pe-${peIdx++}`,
                type: 'LINE',
                layer: entity.layer,
                geometry: { kind: 'line', x1: s.x, y1: s.y, x2: en.x, y2: en.y },
                bounds: computeBoundsFromPoints([[s.x, s.y], [en.x, en.y]]),
                visible: true,
              })
            }

            // LWPOLYLINE / POLYLINE2D
            if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE2D') && Array.isArray(e.vertices)) {
              const verts = e.vertices as Array<{ x: number; y: number; bulge?: number }>
              if (verts.length >= 2) {
                // Skip if no vertex is within bounds
                const anyInBounds = verts.some(v => inBounds(v.x, v.y))
                if (!anyInBounds) continue
                const closed = ((e.flag as number ?? 0) & 1) !== 0
                planEntities.push({
                  id: `pe-${peIdx++}`,
                  type: 'LWPOLYLINE',
                  layer: entity.layer,
                  geometry: {
                    kind: 'polyline',
                    vertices: verts.map(v => ({ x: v.x, y: v.y, bulge: v.bulge })),
                    closed,
                  },
                  bounds: computeBoundsFromPoints(verts.map(v => [v.x, v.y] as [number, number])),
                  visible: true,
                })
              }
            }

            // CIRCLE
            if (entity.type === 'CIRCLE' && e.center) {
              const c = e.center as { x: number; y: number }
              const r = (e.radius as number) ?? 0
              if (!inBounds(c.x, c.y)) continue
              planEntities.push({
                id: `pe-${peIdx++}`,
                type: 'CIRCLE',
                layer: entity.layer,
                geometry: { kind: 'circle', cx: c.x, cy: c.y, radius: r },
                bounds: computeBoundsFromPoints([[c.x - r, c.y - r], [c.x + r, c.y + r]]),
                visible: true,
              })
            }

            // ARC
            if (entity.type === 'ARC' && e.center) {
              const c = e.center as { x: number; y: number }
              const r = (e.radius as number) ?? 0
              if (!inBounds(c.x, c.y)) continue
              planEntities.push({
                id: `pe-${peIdx++}`,
                type: 'ARC',
                layer: entity.layer,
                geometry: {
                  kind: 'arc', cx: c.x, cy: c.y, radius: r,
                  startAngle: (e.startAngle as number) ?? 0,
                  endAngle: (e.endAngle as number) ?? 360,
                },
                bounds: computeBoundsFromPoints([[c.x - r, c.y - r], [c.x + r, c.y + r]]),
                visible: true,
              })
            }

            // TEXT / MTEXT
            if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
              const pos = (e.insertionPoint ?? e.position ?? { x: 0, y: 0 }) as { x: number; y: number }
              if (!inBounds(pos.x, pos.y)) continue
              const text = ((e.text ?? e.contents ?? '') as string).replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}\\]/g, '').trim()
              if (text.length >= 1) {
                planEntities.push({
                  id: `pe-${peIdx++}`,
                  type: entity.type as 'TEXT' | 'MTEXT',
                  layer: entity.layer,
                  geometry: {
                    kind: 'text', x: pos.x, y: pos.y,
                    text,
                    height: (e.height as number) ?? 200,
                    rotation: e.rotation as number | undefined,
                  },
                  bounds: computeBoundsFromPoints([[pos.x, pos.y]]),
                  visible: true,
                })
              }
            }

            // DIMENSION
            if (entity.type === 'DIMENSION') {
              const m = (e.measurement as number) ?? 0
              if (m > 0) {
                const dp = (e.definitionPoint ?? { x: 0, y: 0 }) as { x: number; y: number }
                const tp = (e.textPoint ?? dp) as { x: number; y: number }
                const sp1 = (e.subDefinitionPoint1 ?? dp) as { x: number; y: number }
                const sp2 = (e.subDefinitionPoint2 ?? dp) as { x: number; y: number }
                if (!inBounds(sp1.x, sp1.y) && !inBounds(sp2.x, sp2.y)) continue
                planEntities.push({
                  id: `pe-${peIdx++}`,
                  type: 'DIMENSION',
                  layer: entity.layer,
                  geometry: {
                    kind: 'dimension',
                    defPoint1: [sp1.x, sp1.y],
                    defPoint2: [sp2.x, sp2.y],
                    textPosition: [tp.x, tp.y],
                    measurement: m * unitScale,
                    text: (e.text as string) || `${(m * unitScale).toFixed(2)} m`,
                  },
                  bounds: computeBoundsFromPoints([[sp1.x, sp1.y], [sp2.x, sp2.y], [tp.x, tp.y]]),
                  visible: true,
                })
              }
            }
          }

          // Use the IQR-filtered bounds (minX/minY/maxX/maxY) that were computed earlier
          // for the SVG preview. These exclude outliers (cartouche, title block, etc.)
          // DO NOT use computeBounds(planEntities) — it includes all entities without filtering.
          const rawBounds: Bounds = {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
          }

          // Normalize all entities to metres starting at (0,0), flip Y axis
          // Entities were already filtered by IQR bounds during extraction above
          const normalizedEntities = normalizeAllEntities(planEntities, rawBounds, unitScale)
          const normalizedBounds: Bounds = {
            minX: 0, minY: 0,
            maxX: rawBounds.width * unitScale,
            maxY: rawBounds.height * unitScale,
            width: rawBounds.width * unitScale,
            height: rawBounds.height * unitScale,
            centerX: rawBounds.width * unitScale / 2,
            centerY: rawBounds.height * unitScale / 2,
          }

          // Build DetectedSpaces from the deduped zones (convert from normalized 0-1 to metres)
          // Y is flipped: zone coords were normalized with DWG Y-up, but SVG expects Y-down
          const planSpaces: DetectedSpace[] = deduped.map((z) => {
            const x = z.boundingBox.x * normalizedBounds.width
            const rawY = z.boundingBox.y * normalizedBounds.height
            const w = z.boundingBox.w * normalizedBounds.width
            const h = z.boundingBox.h * normalizedBounds.height
            // Flip Y: convert from bottom-up to top-down
            const y = normalizedBounds.height - rawY - h
            const polygon: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
            return {
              id: z.id,
              polygon,
              areaSqm: Math.round(w * h * 10) / 10,
              label: z.label,
              layer: 'import',
              type: (z.estimatedType ?? 'commerce') as import('../proph3t/types').SpaceType,
              bounds: computeBoundsFromPoints(polygon),
              color: z.color ?? null,
              metadata: {},
            }
          })

          // Build wall segments from structure lines (with Y-flip)
          const planWalls: WallSegment[] = wallSegs
            .filter(s => {
              const len = Math.sqrt((s.x2 - s.x1) ** 2 + (s.y2 - s.y1) ** 2)
              return len > 100 // skip tiny segments
            })
            .map(s => ({
              x1: (s.x1 - rawBounds.minX) * unitScale,
              y1: (rawBounds.maxY - s.y1) * unitScale,
              x2: (s.x2 - rawBounds.minX) * unitScale,
              y2: (rawBounds.maxY - s.y2) * unitScale,
              layer: 'structure',
            }))

          state.parsedPlan = {
            entities: normalizedEntities,
            layers: layers.map(name => ({
              name,
              visible: getDefaultLayerVisibility(name),
              locked: false,
              category: classifyLayerCategory(name),
            })),
            spaces: planSpaces,
            bounds: normalizedBounds,
            unitScale,
            detectedUnit: detectedUnit as 'mm' | 'cm' | 'm',
            wallSegments: planWalls,
            planImageUrl: state.planImageUrl,
          }

          console.log(`[DWG] ParsedPlan built: ${normalizedEntities.length} entities, ${planSpaces.length} spaces, ${planWalls.length} walls`)
        } catch (err) {
          console.error('[DWG] ERREUR ParsedPlan:', err)
          console.error('[DWG] Stack:', err instanceof Error ? err.stack : '')
        }

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Analyse DWG terminee'
        emit()
        break
      }

      case 'dxf': {
        state.currentOperation = 'Analyse du fichier DXF...'
        state.progress = 10
        emit()

        const text = await file.text()
        const { default: DxfParser } = await import('dxf-parser')
        const parser = new DxfParser()
        const dxf = parser.parseSync(text)

        if (!dxf) {
          state.step = 'error'
          state.errors.push('Impossible de parser le fichier DXF')
          emit()
          return state
        }

        state.currentOperation = 'Extraction des cotes...'
        state.progress = 15
        emit()

        const dims = extractDimEntities(dxf.entities ?? [])
        state.detectedDims = dims

        // Filter model-space entities only, skip INSERT/VIEWPORT (cause duplication)
        type DxfEnt = Record<string, unknown> & {
          type?: string
          layer?: string
          vertices?: { x: number; y: number; bulge?: number }[]
          startPoint?: { x: number; y: number }
          endPoint?: { x: number; y: number }
          center?: { x: number; y: number }
          radius?: number
          startAngle?: number
          endAngle?: number
          position?: { x: number; y: number }
          textHeight?: number
          text?: string
          shape?: boolean
          inPaperSpace?: boolean
          paperSpace?: boolean
        }
        const modelEntities = ((dxf.entities ?? []) as DxfEnt[]).filter(
          e => e.inPaperSpace !== true && e.paperSpace !== true
            && e.type !== 'INSERT' && e.type !== 'VIEWPORT'
        )

        state.currentOperation = 'Calcul des limites du plan...'
        state.progress = 25
        emit()

        // ── Percentile-based bounds (like DWG) to exclude outliers/XREFs/cartouche ──
        const allXs: number[] = [], allYs: number[] = []
        for (const e of modelEntities) {
          if (e.type === 'LINE' && e.startPoint && e.endPoint) {
            allXs.push(e.startPoint.x, e.endPoint.x)
            allYs.push(e.startPoint.y, e.endPoint.y)
          }
          if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices) {
            for (const v of e.vertices) { allXs.push(v.x); allYs.push(v.y) }
          }
          if (e.type === 'CIRCLE' && e.center) {
            allXs.push(e.center.x); allYs.push(e.center.y)
          }
          if (e.type === 'ARC' && e.center) {
            allXs.push(e.center.x); allYs.push(e.center.y)
          }
        }

        let minX: number, minY: number, maxX: number, maxY: number
        const hasVerts = allXs.length > 0

        if (allXs.length > 10) {
          allXs.sort((a, b) => a - b)
          allYs.sort((a, b) => a - b)
          // Percentile 2%-98% — robust against outliers
          const p2x = allXs[Math.floor(allXs.length * 0.02)]
          const p98x = allXs[Math.floor(allXs.length * 0.98)]
          const p2y = allYs[Math.floor(allYs.length * 0.02)]
          const p98y = allYs[Math.floor(allYs.length * 0.98)]
          const mx = (p98x - p2x) * 0.05
          const my = (p98y - p2y) * 0.05
          minX = p2x - mx; maxX = p98x + mx
          minY = p2y - my; maxY = p98y + my
          console.log(`[DXF] Bounds (percentile 2-98): X=${minX.toFixed(0)}..${maxX.toFixed(0)}, Y=${minY.toFixed(0)}..${maxY.toFixed(0)}`)
        } else if (hasVerts) {
          minX = Math.min(...allXs); maxX = Math.max(...allXs)
          minY = Math.min(...allYs); maxY = Math.max(...allYs)
        } else {
          minX = 0; minY = 0; maxX = 1000; maxY = 1000
        }

        state.currentOperation = 'Calibration automatique...'
        state.progress = 35
        emit()

        const bW = maxX - minX || 1
        const bH = maxY - minY || 1
        const dxfBoundsRaw: Bounds = {
          minX, minY, maxX, maxY,
          width: bW, height: bH,
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2,
        }

        // Detect unit scale from DXF header $INSUNITS or heuristic
        const insunits = (dxf as Record<string, unknown>).header
          ? ((dxf as Record<string, unknown>).header as Record<string, unknown>)?.$INSUNITS as number | undefined
          : undefined
        const { scaleFactor: unitScale, detectedUnit } = detectUnitScale(insunits, dxfBoundsRaw)

        state.calibration = calibratePlanFromDims(dims, { minX, minY, maxX, maxY })

        state.currentOperation = 'Construction des entites vectorielles...'
        state.progress = 45
        emit()

        // ── Build PlanEntity[] from DXF entities for PlanCanvasV2 ──
        const planEntities: PlanEntity[] = []
        const dxfLayers = new Set<string>()
        let peIdx = 0

        const inBounds = (x: number, y: number) =>
          x >= minX - bW * 0.02 && x <= maxX + bW * 0.02 &&
          y >= minY - bH * 0.02 && y <= maxY + bH * 0.02

        for (const entity of modelEntities) {
          const layerName = entity.layer ?? '0'
          dxfLayers.add(layerName)

          // LINE
          if (entity.type === 'LINE' && entity.startPoint && entity.endPoint) {
            const s = entity.startPoint
            const en = entity.endPoint
            if (!inBounds(s.x, s.y) && !inBounds(en.x, en.y)) continue
            planEntities.push({
              id: `pe-${peIdx++}`,
              type: 'LINE',
              layer: layerName,
              geometry: { kind: 'line', x1: s.x, y1: s.y, x2: en.x, y2: en.y },
              bounds: computeBoundsFromPoints([[s.x, s.y], [en.x, en.y]]),
              visible: true,
            })
          }

          // LWPOLYLINE / POLYLINE
          if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices && entity.vertices.length >= 2) {
            const verts = entity.vertices
            const anyInBounds = verts.some(v => inBounds(v.x, v.y))
            if (!anyInBounds) continue
            const closed = entity.shape === true || ((entity as Record<string, unknown>).closed as boolean) === true
            planEntities.push({
              id: `pe-${peIdx++}`,
              type: 'LWPOLYLINE',
              layer: layerName,
              geometry: {
                kind: 'polyline',
                vertices: verts.map(v => ({ x: v.x, y: v.y, bulge: v.bulge })),
                closed,
              },
              bounds: computeBoundsFromPoints(verts.map(v => [v.x, v.y] as [number, number])),
              visible: true,
            })
          }

          // CIRCLE
          if (entity.type === 'CIRCLE' && entity.center) {
            const c = entity.center
            const r = entity.radius ?? 0
            if (!inBounds(c.x, c.y)) continue
            planEntities.push({
              id: `pe-${peIdx++}`,
              type: 'CIRCLE',
              layer: layerName,
              geometry: { kind: 'circle', cx: c.x, cy: c.y, radius: r },
              bounds: computeBoundsFromPoints([[c.x - r, c.y - r], [c.x + r, c.y + r]]),
              visible: true,
            })
          }

          // ARC
          if (entity.type === 'ARC' && entity.center) {
            const c = entity.center
            const r = entity.radius ?? 0
            if (!inBounds(c.x, c.y)) continue
            planEntities.push({
              id: `pe-${peIdx++}`,
              type: 'ARC',
              layer: layerName,
              geometry: {
                kind: 'arc', cx: c.x, cy: c.y, radius: r,
                startAngle: entity.startAngle ?? 0,
                endAngle: entity.endAngle ?? 360,
              },
              bounds: computeBoundsFromPoints([[c.x - r, c.y - r], [c.x + r, c.y + r]]),
              visible: true,
            })
          }

          // TEXT / MTEXT
          if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
            const pos = (entity.startPoint ?? entity.position ?? { x: 0, y: 0 }) as { x: number; y: number }
            if (!inBounds(pos.x, pos.y)) continue
            const rawText = ((entity.text ?? '') as string).replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}\\]/g, '').trim()
            if (rawText.length >= 1) {
              planEntities.push({
                id: `pe-${peIdx++}`,
                type: entity.type as 'TEXT' | 'MTEXT',
                layer: layerName,
                geometry: {
                  kind: 'text', x: pos.x, y: pos.y,
                  text: rawText,
                  height: entity.textHeight ?? 200,
                  rotation: entity.startAngle,
                },
                bounds: computeBoundsFromPoints([[pos.x, pos.y]]),
                visible: true,
              })
            }
          }

          // DIMENSION
          if (entity.type === 'DIMENSION') {
            const m = (entity as Record<string, unknown>).measurement as number | undefined
            if (m && m > 0) {
              const anchorPt = (entity.startPoint ?? entity.position ?? { x: 0, y: 0 }) as { x: number; y: number }
              const endPt = (entity.endPoint ?? anchorPt) as { x: number; y: number }
              const textPt = (entity.position ?? anchorPt) as { x: number; y: number }
              if (!inBounds(anchorPt.x, anchorPt.y) && !inBounds(endPt.x, endPt.y)) continue
              planEntities.push({
                id: `pe-${peIdx++}`,
                type: 'DIMENSION',
                layer: layerName,
                geometry: {
                  kind: 'dimension',
                  defPoint1: [anchorPt.x, anchorPt.y],
                  defPoint2: [endPt.x, endPt.y],
                  textPosition: [textPt.x, textPt.y],
                  measurement: m * unitScale,
                  text: (entity.text as string) || `${(m * unitScale).toFixed(2)} m`,
                },
                bounds: computeBoundsFromPoints([[anchorPt.x, anchorPt.y], [endPt.x, endPt.y], [textPt.x, textPt.y]]),
                visible: true,
              })
            }
          }
        }

        state.currentOperation = 'Detection des zones...'
        state.progress = 60
        emit()

        // ── Extract ALL text labels from the plan ──
        // Source 1: top-level TEXT/MTEXT entities
        // Source 2: TEXT/MTEXT/ATTRIB inside block definitions referenced by INSERT
        const dxfTextLabels: Array<{ text: string; x: number; y: number; layer: string }> = []

        const addTextLabel = (rawText: string, x: number, y: number, layer: string) => {
          const clean = rawText.replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}\\]/g, '').replace(/\\P/g, ' ').trim()
          if (!clean || clean.length < 2 || clean.length > 100) return
          if (/^\d+[.,]?\d*\s*(mm|cm|m)?$/.test(clean)) return
          if (/^%%/.test(clean)) return
          if (!inBounds(x, y)) return
          dxfTextLabels.push({ text: clean, x, y, layer })
        }

        // Source 1: top-level entities
        for (const entity of modelEntities) {
          if (entity.type !== 'TEXT' && entity.type !== 'MTEXT') continue
          const rawText = (entity.text ?? '') as string
          const pos = (entity.startPoint ?? entity.position ?? { x: 0, y: 0 }) as { x: number; y: number }
          addTextLabel(rawText, pos.x, pos.y, entity.layer ?? '0')
        }

        // Source 2: INSERT → resolve block definitions and extract text with transformed coords
        const allEntities = ((dxf.entities ?? []) as DxfEnt[]).filter(
          e => e.inPaperSpace !== true && e.paperSpace !== true
        )
        const blocks = (dxf as Record<string, unknown>).blocks as Record<string, { entities?: DxfEnt[] }> | undefined

        if (blocks) {
          for (const entity of allEntities) {
            if (entity.type !== 'INSERT') continue
            const blockName = ((entity as Record<string, unknown>).name as string) ?? ''
            const block = blocks[blockName]
            if (!block?.entities) continue

            const insertX = ((entity as Record<string, unknown>).position as { x: number; y: number })?.x
              ?? ((entity as Record<string, unknown>).x as number) ?? 0
            const insertY = ((entity as Record<string, unknown>).position as { x: number; y: number })?.y
              ?? ((entity as Record<string, unknown>).y as number) ?? 0
            const scaleX = ((entity as Record<string, unknown>).xScale as number) ?? 1
            const scaleY = ((entity as Record<string, unknown>).yScale as number) ?? 1
            const rotation = (((entity as Record<string, unknown>).rotation as number) ?? 0) * Math.PI / 180

            for (const be of (block.entities as DxfEnt[])) {
              if (be.type !== 'TEXT' && be.type !== 'MTEXT' && be.type !== 'ATTRIB' && be.type !== 'ATTDEF') continue
              const rawText = (be.text ?? (be as Record<string, unknown>).textString ?? '') as string
              const localPos = (be.startPoint ?? be.position ?? { x: 0, y: 0 }) as { x: number; y: number }
              // Transform: scale then rotate then translate
              const sx = localPos.x * scaleX, sy = localPos.y * scaleY
              const rx = sx * Math.cos(rotation) - sy * Math.sin(rotation)
              const ry = sx * Math.sin(rotation) + sy * Math.cos(rotation)
              addTextLabel(rawText, insertX + rx, insertY + ry, be.layer ?? entity.layer ?? '0')
            }

            // Also check INSERT attributes (ATTRIB entities attached to the INSERT itself)
            const attribs = (entity as Record<string, unknown>).attributes as DxfEnt[] | undefined
            if (attribs) {
              for (const attr of attribs) {
                const rawText = ((attr as Record<string, unknown>).textString ?? (attr as Record<string, unknown>).text ?? '') as string
                const attrPos = ((attr as Record<string, unknown>).startPoint ?? (attr as Record<string, unknown>).position ?? { x: 0, y: 0 }) as { x: number; y: number }
                addTextLabel(rawText, attrPos.x, attrPos.y, (attr as Record<string, unknown>).layer as string ?? entity.layer ?? '0')
              }
            }
          }
        }

        // Log entity type distribution for diagnostics
        const typeCounts = new Map<string, number>()
        for (const e of allEntities) typeCounts.set(e.type ?? '?', (typeCounts.get(e.type ?? '?') ?? 0) + 1)
        console.log(`[DXF] Entity types:`, Object.fromEntries(typeCounts))
        console.log(`[DXF] Blocks:`, blocks ? Object.keys(blocks).length : 0)
        console.log(`[DXF] ${dxfTextLabels.length} labels texte trouves:`, dxfTextLabels.slice(0, 50).map(t => t.text))

        // ── Classify a text/layer name into a space type ──
        const classifyZoneType = (name: string): { type: string; confidence: number } => {
          const l = name.toLowerCase()
          if (/park|garage|sous.?sol|stationnement/i.test(l)) return { type: 'parking', confidence: 0.95 }
          if (/restaurant|food.?court|cuisine|cafe|caf[eé]|brasserie|snack|boulang|p[aâ]tiss|glacier|bar\b|pizz|grill|traiteur/i.test(l)) return { type: 'restauration', confidence: 0.95 }
          if (/boutique|magasin|shop|cell|commerce|local\s*\d|lot\s*\d|bail|enseigne|mode|chaussur|bijou|optique|parfum|librairie|pharmacie/i.test(l)) return { type: 'commerce', confidence: 0.9 }
          if (/wc|toilette|sanitaire|lavabo|douche|vestiaire|infirm/i.test(l)) return { type: 'services', confidence: 0.9 }
          if (/tech|local.?tech|tgbt|transfo|electri|cvc|clim|ventil|plomb|pompe|sprinkl|onduleur|serveur|compt|machin|maintenance|d[eé]chet|stock|r[eé]serve|livraison|quai|monte.?charge/i.test(l)) return { type: 'technique', confidence: 0.9 }
          if (/bureau|office|back.?off|admin|direction|g[eé]rance|gestion|comptab|secr[eé]tar|r[eé]union|conf[eé]rence/i.test(l)) return { type: 'backoffice', confidence: 0.9 }
          if (/s[eé]curit|surveillance|contr[oô]le|vigil|poste.?de.?garde|coffre/i.test(l)) return { type: 'financier', confidence: 0.85 }
          if (/secours|sortie|[eé]vacuation|issue|urgence|d[eé]senfumage|pompier/i.test(l)) return { type: 'sortie_secours', confidence: 0.9 }
          if (/hall|circul|couloir|corridor|galerie|passage|d[eé]ambul|atrium|escalier|ascens|escalat|rampe|passerelle|entr[eé]e|foyer|palier|sas/i.test(l)) return { type: 'circulation', confidence: 0.85 }
          if (/cin[eé]ma|bowling|arcade|jeu|game|kid|enfant|fitness|gym/i.test(l)) return { type: 'loisirs', confidence: 0.85 }
          if (/accueil|info|r[eé]ception|guichet|banque|change|pressing|coiffeur|beaut[eé]|spa/i.test(l)) return { type: 'services', confidence: 0.8 }
          // Fallback: if contains at least a letter → generic commerce
          if (/[a-zA-ZÀ-ÿ]/.test(l)) return { type: 'commerce', confidence: 0.6 }
          return { type: 'circulation', confidence: 0.5 }
        }

        // ── Zone detection: closed polylines with text label matching ──
        const dxfZones: RecognizedZone[] = []
        let zIdx = 0
        // Min area in drawing units² — a room is at least 2m²
        const minAreaDU = unitScale < 0.005 ? 2_000_000 : unitScale < 0.05 ? 20_000 : 2
        // Max area: no more than 80% of plan area
        const maxAreaDU = bW * bH * 0.8

        // Collect all closed polylines as zone candidates with bounding boxes
        interface ZoneCandidate {
          verts: { x: number; y: number }[]
          minX: number; minY: number; maxX: number; maxY: number
          area: number
          layer: string
        }
        const zoneCandidates: ZoneCandidate[] = []

        for (const entity of modelEntities) {
          if (entity.type !== 'LWPOLYLINE' && entity.type !== 'POLYLINE') continue
          const verts = entity.vertices ?? []
          if (verts.length < 3) continue

          // Check if closed
          const isClosed = entity.shape === true
            || ((entity as Record<string, unknown>).closed as boolean) === true
            || (verts.length >= 3 && Math.abs(verts[0].x - verts[verts.length - 1].x) < bW * 0.002
                && Math.abs(verts[0].y - verts[verts.length - 1].y) < bH * 0.002)
          if (!isClosed) continue

          let zMinX = Infinity, zMinY = Infinity, zMaxX = -Infinity, zMaxY = -Infinity
          for (const v of verts) {
            if (v.x < zMinX) zMinX = v.x
            if (v.y < zMinY) zMinY = v.y
            if (v.x > zMaxX) zMaxX = v.x
            if (v.y > zMaxY) zMaxY = v.y
          }
          const zW = zMaxX - zMinX, zH = zMaxY - zMinY
          const area = zW * zH
          if (area < minAreaDU || area > maxAreaDU) continue
          if (zMaxX < minX || zMinX > maxX || zMaxY < minY || zMinY > maxY) continue

          const layerName = entity.layer ?? '0'
          const cls = classifyLayerCategory(layerName)
          if (cls === 'dimension' || cls === 'hatch') continue

          zoneCandidates.push({ verts, minX: zMinX, minY: zMinY, maxX: zMaxX, maxY: zMaxY, area, layer: layerName })
        }

        // Point-in-polygon test (ray casting)
        const pointInPoly = (px: number, py: number, poly: { x: number; y: number }[]): boolean => {
          let inside = false
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y
            const xj = poly[j].x, yj = poly[j].y
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
              inside = !inside
            }
          }
          return inside
        }

        // For each zone candidate, find the best text label INSIDE its polygon
        const usedTextIndices = new Set<number>()

        for (const cand of zoneCandidates) {
          // Quick bbox check + precise point-in-polygon for text labels
          let bestLabel: { text: string; idx: number } | null = null
          for (let ti = 0; ti < dxfTextLabels.length; ti++) {
            if (usedTextIndices.has(ti)) continue
            const t = dxfTextLabels[ti]
            // Bbox check
            if (t.x < cand.minX || t.x > cand.maxX || t.y < cand.minY || t.y > cand.maxY) continue
            // Point-in-polygon check
            if (!pointInPoly(t.x, t.y, cand.verts)) continue
            // Prefer longer labels (more descriptive) and skip pure numbers
            if (!bestLabel || t.text.length > bestLabel.text.length) {
              bestLabel = { text: t.text, idx: ti }
            }
          }

          // Mark text as used
          if (bestLabel) usedTextIndices.add(bestLabel.idx)

          const label = bestLabel?.text ?? ''
          const { type: zoneType, confidence } = classifyZoneType(label || cand.layer)

          const normX = (cand.minX - minX) / bW
          const normY = (cand.minY - minY) / bH
          const normW = (cand.maxX - cand.minX) / bW
          const normH = (cand.maxY - cand.minY) / bH

          dxfZones.push({
            id: `dxf-zone-${floorId}-${zIdx++}`,
            label: label || `Zone ${zIdx}`,
            estimatedType: zoneType as any,
            boundingBox: { x: normX, y: normY, w: normW, h: normH },
            confidence: bestLabel ? Math.max(confidence, 0.85) : 0.75,
          })
        }

        // ── Text-only zones: labels NOT inside any polygon → raycast to walls ──
        const dxfWallSegs: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
        for (const entity of modelEntities) {
          if (entity.type === 'LINE' && entity.startPoint && entity.endPoint) {
            dxfWallSegs.push({ x1: entity.startPoint.x, y1: entity.startPoint.y, x2: entity.endPoint.x, y2: entity.endPoint.y })
          }
          if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices && entity.vertices.length >= 2) {
            const v = entity.vertices
            for (let i = 0; i < v.length - 1; i++) {
              dxfWallSegs.push({ x1: v[i].x, y1: v[i].y, x2: v[i + 1].x, y2: v[i + 1].y })
            }
          }
        }

        const planExtent = Math.max(bW, bH)
        const MAX_ZONE_HALF = Math.max(8000 / (unitScale || 1), planExtent * 0.15)
        const DEFAULT_ZONE_HALF = Math.max(3000 / (unitScale || 1), planExtent * 0.03)

        const findDxfWall = (px: number, py: number, dx: number, dy: number, maxDist: number): number => {
          let best = maxDist
          for (const seg of dxfWallSegs) {
            if (dy === 0 && dx !== 0) {
              const segDy = seg.y2 - seg.y1
              if (Math.abs(segDy) > Math.abs(seg.x2 - seg.x1) * 0.3) {
                const segMinY = Math.min(seg.y1, seg.y2), segMaxY = Math.max(seg.y1, seg.y2)
                if (py >= segMinY - bH * 0.005 && py <= segMaxY + bH * 0.005) {
                  const segX = (seg.x1 + seg.x2) / 2
                  const dist = (segX - px) * dx
                  if (dist > bW * 0.002 && dist < best) best = dist
                }
              }
            }
            if (dx === 0 && dy !== 0) {
              const segDx = seg.x2 - seg.x1
              if (Math.abs(segDx) > Math.abs(seg.y2 - seg.y1) * 0.3) {
                const segMinX = Math.min(seg.x1, seg.x2), segMaxX = Math.max(seg.x1, seg.x2)
                if (px >= segMinX - bW * 0.005 && px <= segMaxX + bW * 0.005) {
                  const segY = (seg.y1 + seg.y2) / 2
                  const dist = (segY - py) * dy
                  if (dist > bH * 0.002 && dist < best) best = dist
                }
              }
            }
          }
          return best
        }

        // Only process text labels that are NOT inside any detected polygon
        const isSpaceName = (text: string): boolean => {
          if (/^\d+[.,]?\d*\s*(mm|cm|m)?$/.test(text)) return false
          if (text.length < 3) return false
          return /[a-zA-ZÀ-ÿ]/.test(text)
        }

        const textZones: RecognizedZone[] = []
        for (let ti = 0; ti < dxfTextLabels.length; ti++) {
          if (usedTextIndices.has(ti)) continue
          const label = dxfTextLabels[ti]
          if (!isSpaceName(label.text)) continue

          const right = findDxfWall(label.x, label.y, 1, 0, MAX_ZONE_HALF)
          const left = findDxfWall(label.x, label.y, -1, 0, MAX_ZONE_HALF)
          const up = findDxfWall(label.x, label.y, 0, 1, MAX_ZONE_HALF)
          const down = findDxfWall(label.x, label.y, 0, -1, MAX_ZONE_HALF)

          const effRight = right < MAX_ZONE_HALF ? right : DEFAULT_ZONE_HALF
          const effLeft = left < MAX_ZONE_HALF ? left : DEFAULT_ZONE_HALF
          const effUp = up < MAX_ZONE_HALF ? up : DEFAULT_ZONE_HALF
          const effDown = down < MAX_ZONE_HALF ? down : DEFAULT_ZONE_HALF

          const wallsFound = (right < MAX_ZONE_HALF ? 1 : 0) + (left < MAX_ZONE_HALF ? 1 : 0) + (up < MAX_ZONE_HALF ? 1 : 0) + (down < MAX_ZONE_HALF ? 1 : 0)
          if (wallsFound < 1) continue

          const zx = Math.max(minX, label.x - effLeft)
          const zy = Math.max(minY, label.y - effDown)
          const zw = Math.min(effLeft + effRight, maxX - zx)
          const zh = Math.min(effDown + effUp, maxY - zy)

          const areaSqm = zw * zh * unitScale * unitScale
          if (areaSqm < 0.5 || areaSqm > 50000) continue

          const { type: zoneType } = classifyZoneType(label.text)

          textZones.push({
            id: `dxf-zone-${floorId}-${zIdx++}`,
            label: label.text,
            estimatedType: zoneType as any,
            boundingBox: {
              x: (zx - minX) / bW,
              y: (zy - minY) / bH,
              w: zw / bW,
              h: zh / bH,
            },
            confidence: 0.8,
          })
        }

        // Merge geometry and text zones, deduplicate
        const allDxfZones = [...dxfZones, ...textZones]
        const dedupedZones: RecognizedZone[] = []
        for (const z of allDxfZones) {
          const bb = z.boundingBox
          const isDuplicate = dedupedZones.some(existing => {
            const ebb = existing.boundingBox
            const overlapX = Math.max(0, Math.min(bb.x + bb.w, ebb.x + ebb.w) - Math.max(bb.x, ebb.x))
            const overlapY = Math.max(0, Math.min(bb.y + bb.h, ebb.y + ebb.h) - Math.max(bb.y, ebb.y))
            const overlapArea = overlapX * overlapY
            const smallerArea = Math.min(bb.w * bb.h, ebb.w * ebb.h)
            return smallerArea > 0 && overlapArea / smallerArea > 0.7
          })
          if (!isDuplicate) dedupedZones.push(z)
        }

        // Log zone stats
        const labeled = dedupedZones.filter(z => !z.label.startsWith('Zone '))
        const byType = new Map<string, number>()
        for (const z of dedupedZones) byType.set(z.estimatedType, (byType.get(z.estimatedType) ?? 0) + 1)
        state.detectedZones = dedupedZones
        console.log(`[DXF] ${zoneCandidates.length} polylignes fermees, ${dxfTextLabels.length} textes, ${usedTextIndices.size} textes associes a des polygones`)
        console.log(`[DXF] Zones: ${dxfZones.length} geometrie + ${textZones.length} texte → ${dedupedZones.length} apres dedup (${labeled.length} avec label)`)
        console.log(`[DXF] Types:`, Object.fromEntries(byType))

        // ── Generate SVG preview image for the wizard ──
        state.currentOperation = 'Generation de la preview...'
        state.progress = 75
        emit()

        if (hasVerts) {
          const W = 2400, H = Math.round(2400 * (bH / bW))
          const svgScale = W / bW
          const svgTx = (x: number) => ((x - minX) * svgScale).toFixed(1)
          const svgTy = (y: number) => (H - (y - minY) * svgScale).toFixed(1)
          const svgParts: string[] = []
          let svgCount = 0
          const MAX_SVG = 300_000
          for (const e of modelEntities) {
            if (svgCount >= MAX_SVG) break
            if (e.type === 'LINE' && e.startPoint && e.endPoint) {
              if (!inBounds(e.startPoint.x, e.startPoint.y) && !inBounds(e.endPoint.x, e.endPoint.y)) continue
              svgParts.push(`<line x1="${svgTx(e.startPoint.x)}" y1="${svgTy(e.startPoint.y)}" x2="${svgTx(e.endPoint.x)}" y2="${svgTy(e.endPoint.y)}"/>`)
              svgCount++
            } else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices && e.vertices.length >= 2) {
              if (!e.vertices.some(v => inBounds(v.x, v.y))) continue
              const pts = e.vertices.map(v => `${svgTx(v.x)},${svgTy(v.y)}`).join(' ')
              svgParts.push(`<polyline points="${pts}"/>`)
              svgCount++
            } else if (e.type === 'CIRCLE' && e.center && inBounds(e.center.x, e.center.y)) {
              const r = (e.radius ?? 0) * svgScale
              svgParts.push(`<circle cx="${svgTx(e.center.x)}" cy="${svgTy(e.center.y)}" r="${r.toFixed(1)}"/>`)
              svgCount++
            } else if (e.type === 'ARC' && e.center && inBounds(e.center.x, e.center.y)) {
              const r = (e.radius ?? 0) * svgScale
              const sa = ((e.startAngle ?? 0) * Math.PI) / 180
              const ea = ((e.endAngle ?? 360) * Math.PI) / 180
              const x1 = parseFloat(svgTx(e.center.x)) + r * Math.cos(-sa)
              const y1 = parseFloat(svgTy(e.center.y)) + r * Math.sin(-sa)
              const x2 = parseFloat(svgTx(e.center.x)) + r * Math.cos(-ea)
              const y2 = parseFloat(svgTy(e.center.y)) + r * Math.sin(-ea)
              let sweep = ea - sa
              if (sweep < 0) sweep += 2 * Math.PI
              const largeArc = sweep > Math.PI ? 1 : 0
              svgParts.push(`<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 0 ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`)
              svgCount++
            }
          }
          const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="background:#0b0f14"><g fill="none" stroke="#7dd3fc" stroke-width="1" vector-effect="non-scaling-stroke">${svgParts.join('')}</g></svg>`
          const blob = new Blob([previewSvg], { type: 'image/svg+xml' })
          state.planImageUrl = URL.createObjectURL(blob)
          console.log(`[DXF] Preview SVG: ${svgCount} entites, ${W}x${H}px`)
        }

        state.currentOperation = 'Construction du plan interactif...'
        state.progress = 85
        emit()

        // ── Build ParsedPlan for PlanCanvasV2 vectorial rendering ──
        try {
          // Normalize all entities to metres starting at (0,0), flip Y axis
          const normalizedEntities = normalizeAllEntities(planEntities, dxfBoundsRaw, unitScale)
          const normalizedBounds: Bounds = {
            minX: 0, minY: 0,
            maxX: bW * unitScale,
            maxY: bH * unitScale,
            width: bW * unitScale,
            height: bH * unitScale,
            centerX: bW * unitScale / 2,
            centerY: bH * unitScale / 2,
          }

          // Build DetectedSpaces from deduped zones (convert from normalized 0-1 to metres, flip Y)
          const planSpaces: DetectedSpace[] = dedupedZones.map((z) => {
            const x = z.boundingBox.x * normalizedBounds.width
            const rawY = z.boundingBox.y * normalizedBounds.height
            const w = z.boundingBox.w * normalizedBounds.width
            const h = z.boundingBox.h * normalizedBounds.height
            // Flip Y: convert from bottom-up to top-down
            const y = normalizedBounds.height - rawY - h
            const polygon: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
            return {
              id: z.id,
              polygon,
              areaSqm: Math.round(w * h * 10) / 10,
              label: z.label,
              layer: 'import',
              type: (z.estimatedType ?? 'commerce') as import('../proph3t/types').SpaceType,
              bounds: computeBoundsFromPoints(polygon),
              color: z.color ?? null,
              metadata: {},
            }
          })

          // Build wall segments (structure layers)
          const planWalls: WallSegment[] = dxfWallSegs
            .filter(s => {
              const len = Math.sqrt((s.x2 - s.x1) ** 2 + (s.y2 - s.y1) ** 2)
              return len > bW * 0.005 // skip tiny segments
            })
            .map(s => ({
              x1: (s.x1 - minX) * unitScale,
              y1: (maxY - s.y1) * unitScale,
              x2: (s.x2 - minX) * unitScale,
              y2: (maxY - s.y2) * unitScale,
              layer: 'structure',
            }))

          // Build layers with default visibility
          const planLayers: PlanLayer[] = Array.from(dxfLayers).map(name => ({
            name,
            visible: getDefaultLayerVisibility(name),
            locked: false,
            category: classifyLayerCategory(name),
          }))

          state.parsedPlan = {
            entities: normalizedEntities,
            layers: planLayers,
            spaces: planSpaces,
            bounds: normalizedBounds,
            unitScale,
            detectedUnit: detectedUnit as 'mm' | 'cm' | 'm',
            wallSegments: planWalls,
            planImageUrl: state.planImageUrl,
          }

          console.log(`[DXF] ParsedPlan: ${normalizedEntities.length} entites, ${planSpaces.length} espaces, ${planLayers.length} calques, ${planWalls.length} murs, unite=${detectedUnit}, plan=${normalizedBounds.width.toFixed(1)}x${normalizedBounds.height.toFixed(1)}m`)
        } catch (err) {
          console.error('[DXF] ERREUR ParsedPlan:', err)
          // Fallback: generate static SVG preview
          if (hasVerts) {
            const W = 1600, H = 1200
            const scale = Math.min(W / bW, H / bH)
            const ox = (W - bW * scale) / 2
            const oy = (H - bH * scale) / 2
            const tx = (x: number) => ((x - minX) * scale + ox).toFixed(1)
            const ty = (y: number) => (H - ((y - minY) * scale + oy)).toFixed(1)
            const parts: string[] = []
            let count = 0
            for (const e of modelEntities) {
              if (count >= 200_000) break
              if (e.type === 'LINE' && e.startPoint && e.endPoint) {
                parts.push(`<line x1="${tx(e.startPoint.x)}" y1="${ty(e.startPoint.y)}" x2="${tx(e.endPoint.x)}" y2="${ty(e.endPoint.y)}"/>`)
                count++
              } else if ((e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices && e.vertices.length >= 2) {
                const pts = e.vertices.map(v => `${tx(v.x)},${ty(v.y)}`).join(' ')
                parts.push(`<polyline points="${pts}"/>`)
                count++
              }
            }
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="background:#0b0f14"><g fill="none" stroke="#7dd3fc" stroke-width="1" vector-effect="non-scaling-stroke">${parts.join('')}</g></svg>`
            const blob = new Blob([svg], { type: 'image/svg+xml' })
            state.planImageUrl = URL.createObjectURL(blob)
          }
        }

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Analyse DXF terminee'
        emit()
        break
      }

      case 'pdf': {
        state.currentOperation = 'Lecture du PDF...'
        state.progress = 10
        emit()

        // Tenter d'abord l'extraction vectorielle
        let pages: PDFPlanPage[] = []
        let isRasterPDF = false

        try {
          pages = await readPDFPlan(file)
          state.pdfPages = pages

          // Tenter l'extraction vectorielle
          const pdfResult = convertPDFToZones(pages)
          const extractedZones = pdfResult.zones.length

          // Detecter si le PDF est un scan : le critere principal est le nombre de zones extraites
          // Un plan architectural vectoriel produit typiquement 5+ zones
          // Un scan produit 0-2 zones meme s'il a des paths decoratifs
          if (extractedZones < 3) {
            const totalPaths = pages.reduce((s, p) => s + p.paths.length, 0)
            const totalTexts = pages.reduce((s, p) => s + p.texts.length, 0)
            isRasterPDF = true
            state.warnings.push(`PDF avec peu de contenu vectoriel exploitable (${extractedZones} zones, ${totalPaths} paths, ${totalTexts} textes). Basculement vers reconnaissance image.`)
          }
        } catch {
          // pdfjs-dist peut echouer sur certains PDFs -> fallback image
          isRasterPDF = true
          state.warnings.push('Lecture vectorielle impossible. Basculement vers reconnaissance image.')
        }

        if (isRasterPDF) {
          // Fallback : convertir la 1re page PDF en image → Proph3t Vision local
          state.currentOperation = 'Conversion PDF en image...'
          state.progress = 30
          emit()

          try {
            const imageBlob = await pdfPageToImage(file)
            const imageFile = new File([imageBlob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' })
            state.planImageUrl = URL.createObjectURL(imageBlob)

            state.currentOperation = 'Proph3t Vision — analyse locale (contours, murs, zones)...'
            state.progress = 50
            emit()

            const rasterResult = await recognizeRasterPlan(imageFile)
            state.rasterResult = rasterResult
            state.detectedZones = rasterResult.zones
            state.warnings.push(...rasterResult.proph3tNotes)

            if (rasterResult.scale) {
              state.calibration = {
                scaleFactorX: 1 / rasterResult.scale.value,
                scaleFactorY: 1 / rasterResult.scale.value,
                realWidthM: 0, realHeightM: 0,
                confidence: rasterResult.scale.confidence,
                method: 'dim_manual', samplesUsed: 1, outlierCount: 0,
                issues: [`Echelle estimee par Proph3t: ${rasterResult.scale.ratio}`],
              }
            }
          } catch (pdfImgErr) {
            state.warnings.push(`Conversion PDF→image echouee: ${pdfImgErr instanceof Error ? pdfImgErr.message : 'erreur inconnue'}. Reessayez avec un export JPG/PNG du plan.`)
          }

          state.step = 'reviewing'
          state.progress = 100
          state.currentOperation = 'Analyse terminee'
          emit()
          break
        }

        // PDF vectoriel : extraction classique
        state.currentOperation = 'Extraction des zones vectorielles...'
        state.progress = 50
        emit()

        const result = convertPDFToZones(pages)

        state.detectedZones = result.zones.map((z, i) => ({
          id: z.id ?? `pdf-zone-${i}`,
          label: z.label ?? 'Zone sans nom',
          estimatedType: z.type ?? 'circulation',
          boundingBox: { x: z.x ?? 0, y: z.y ?? 0, w: z.w ?? 0, h: z.h ?? 0 },
          confidence: 0.8,
        }))

        // Convertir les dimensions PDF en DimEntity[]
        if (result.dims && result.dims.length > 0) {
          state.detectedDims = result.dims.map((d, i) => {
            const parsed = parsePdfDimensionText(d.text)
            return {
              id: `pdf-dim-${i}`,
              type: 'lineaire' as const,
              value: parsed.value,
              valueText: d.text,
              unit: parsed.unit,
              confidence: parsed.value > 0 ? 0.7 : 0.3,
              defPoint1: [d.x, d.y] as [number, number],
              defPoint2: [d.x + 0.05, d.y] as [number, number],
              textPosition: [d.x, d.y] as [number, number],
              layer: 'pdf-text',
            }
          })

          // Tenter la calibration a partir des dims si pas encore de calibration
          if (!state.calibration && state.detectedDims.length >= 2) {
            const W = pages[0]?.width ?? 1000
            const H = pages[0]?.height ?? 1000
            const pdfBounds = { minX: 0, minY: 0, maxX: W, maxY: H }
            state.calibration = calibratePlanFromDims(state.detectedDims, pdfBounds)
          }
        }

        // Extract scale from PDF texts
        const scaleTexts = pages.flatMap(p => p.texts.filter(t => t.estimatedRole === 'scale'))
        if (scaleTexts.length > 0) {
          const scaleMatch = scaleTexts[0].content.match(/1\s*[:\/]\s*(\d+)/)
          if (scaleMatch) {
            const scaleValue = parseInt(scaleMatch[1], 10)
            state.calibration = {
              scaleFactorX: 1 / scaleValue,
              scaleFactorY: 1 / scaleValue,
              realWidthM: (pages[0]?.width ?? 1000) / scaleValue,
              realHeightM: (pages[0]?.height ?? 1000) / scaleValue,
              confidence: 0.75,
              method: 'dim_manual', samplesUsed: 1, outlierCount: 0,
              issues: [`Echelle detectee depuis le texte PDF: 1:${scaleValue}`],
            }
          }
        }

        // Si meme en mode vectoriel on trouve 0 zones, basculer vers reviewing avec warning
        if (state.detectedZones.length === 0) {
          state.warnings.push('Aucune zone detectee dans le PDF vectoriel. Verifiez que le fichier contient des tracés (pas uniquement des images). Vous pouvez reessayer en important une capture JPG/PNG du plan.')
        }

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Analyse terminee'
        emit()
        break
      }

      case 'image_raster': {
        state.currentOperation = 'Proph3t Vision — analyse locale (contours, murs, zones)...'
        state.progress = 10
        emit()

        state.planImageUrl = URL.createObjectURL(file)
        state.progress = 30
        emit()

        const rasterResult = await recognizeRasterPlan(file)

        state.rasterResult = rasterResult
        state.detectedZones = rasterResult.zones
        state.warnings.push(...rasterResult.proph3tNotes)

        // Mapper les dimensions OCR en DimEntity[]
        if (rasterResult.dimensions && rasterResult.dimensions.length > 0) {
          state.detectedDims = rasterResult.dimensions.map((d, i) => ({
            id: d.id || `raster-dim-${i}`,
            type: 'lineaire' as const,
            value: d.value ?? 0,
            valueText: d.valueText,
            unit: (d.unit as any) ?? 'unknown',
            confidence: d.confidence,
            defPoint1: [d.x, d.y] as [number, number],
            defPoint2: [d.x + 0.05, d.y] as [number, number],
            textPosition: [d.x, d.y] as [number, number],
            layer: 'ocr',
          }))
        }

        if (rasterResult.scale) {
          state.calibration = {
            scaleFactorX: 1 / rasterResult.scale.value,
            scaleFactorY: 1 / rasterResult.scale.value,
            realWidthM: 0,
            realHeightM: 0,
            confidence: rasterResult.scale.confidence,
            method: 'dim_manual',
            samplesUsed: 1,
            outlierCount: 0,
            issues: [`Echelle estimee par Proph3t: ${rasterResult.scale.ratio}`],
          }
        }

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Analyse terminee'
        emit()
        break
      }

      case 'ifc': {
        state.currentOperation = 'Lecture du fichier IFC...'
        state.progress = 10
        emit()

        // IFC uses the existing web-ifc pipeline
        state.calibration = {
          scaleFactorX: 1,
          scaleFactorY: 1,
          realWidthM: 0,
          realHeightM: 0,
          confidence: 0.95,
          method: 'ifc_native',
          samplesUsed: 0,
          outlierCount: 0,
          issues: ['IFC contient les dimensions reelles nativement'],
        }

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Analyse IFC terminee'
        emit()
        break
      }

      default: {
        state.step = 'error'
        state.errors.push(`Type de fichier non supporte: ${sourceType}`)
        emit()
      }
    }
  } catch (err) {
    state.step = 'error'
    state.errors.push(err instanceof Error ? err.message : 'Erreur inconnue')
    emit()
  }

  return state
}

// ─── PDF → IMAGE (pour fallback raster sur PDF scannés) ───

async function pdfPageToImage(file: File, pageNum = 1, scale = 2): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context non disponible')

  await page.render({ canvasContext: ctx, viewport }).promise

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Conversion PDF→image echouee'))
    }, 'image/png')
  })
}

// ─── HELPER : Parser un texte de cote PDF ───

function parsePdfDimensionText(text: string): { value: number; unit: 'mm' | 'm' | 'cm' | 'inch' | 'unknown' } {
  const cleaned = text.trim().replace(',', '.')
  const match = cleaned.match(/([0-9]+(?:\.[0-9]+)?)\s*(mm|cm|m|inch|in|"|')?/i)
  if (!match) return { value: 0, unit: 'unknown' }

  let value = parseFloat(match[1])
  let unit: 'mm' | 'm' | 'cm' | 'inch' | 'unknown' = 'unknown'

  const rawUnit = (match[2] ?? '').toLowerCase()
  if (rawUnit === 'mm') { unit = 'mm'; value = value / 1000 }
  else if (rawUnit === 'cm') { unit = 'cm'; value = value / 100 }
  else if (rawUnit === 'm') { unit = 'm' }
  else if (rawUnit === 'in' || rawUnit === 'inch' || rawUnit === '"') { unit = 'inch'; value = value * 0.0254 }
  else if (value > 200) { unit = 'mm'; value = value / 1000 } // valeurs > 200 presumees mm
  else { unit = 'm' } // valeurs raisonnables presumees metres

  return { value, unit }
}

// ─── SVG → PNG RASTERIZER ───

async function rasterizeSvgToPng(svgContent: string, targetW: number, targetH: number): Promise<Blob> {
  // Set explicit dimensions on the SVG
  let svg = svgContent
  svg = svg.replace(/width="[^"]*"/, `width="${targetW}"`)
  svg = svg.replace(/height="[^"]*"/, `height="${targetH}"`)
  if (!svg.includes(`width="${targetW}"`)) {
    svg = svg.replace('<svg', `<svg width="${targetW}" height="${targetH}"`)
  }
  // Dark background
  svg = svg.replace(/<svg([^>]*)>/, '<svg$1 style="background:#0f172a">')

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, targetW, targetH)
  ctx.drawImage(img, 0, 0, targetW, targetH)
  URL.revokeObjectURL(url)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
  })
}

// ─── RE-EXPORTS ───

export { extractDimEntities, calibratePlanFromDims, linkDimsToZones } from './dimParser'
export { readPDFPlan, convertPDFToZones, detectFloorLevelFromTexts } from './pdfPlanReader'
export { recognizeRasterPlan, convertVisionToAtlasZones } from './rasterRecognizer'
export { normalizeGeometry, mergeZonesFromMultipleSources, validateZones } from './geometryNormalizer'
export { generateCotationSpecs, renderCotationsOnPDF } from './cotationEngine'
export type * from './planReaderTypes'
