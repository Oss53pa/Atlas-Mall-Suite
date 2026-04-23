import type { Zone, SpaceType, DXFEntity, LayerClassification } from './types'

// ═══ CLASSIFICATION SÉMANTIQUE DES CALQUES DXF ═══

/** Patterns de reconnaissance des calques DXF avec poids de confiance */
const LAYER_PATTERNS: {
  pattern: RegExp
  type: SpaceType
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  entityType: LayerClassification['entityType']
  confidence: number
}[] = [
  { pattern: /park/i,                                  type: 'parking',        niveau: 3, color: '#64748b', entityType: 'zone', confidence: 0.90 },
  { pattern: /commerc|shop|retail|boutique|magasin/i,  type: 'commerce',       niveau: 2, color: '#3b82f6', entityType: 'zone', confidence: 0.92 },
  { pattern: /restau|food|cuisine|cafe/i,              type: 'restauration',   niveau: 2, color: '#f59e0b', entityType: 'zone', confidence: 0.88 },
  { pattern: /circul|corridor|couloir|hall|galerie/i,  type: 'circulation',    niveau: 1, color: '#e5e7eb', entityType: 'zone', confidence: 0.85 },
  { pattern: /tech|elec|cvc|plomb|meca/i,              type: 'technique',      niveau: 4, color: '#ef4444', entityType: 'zone', confidence: 0.87 },
  { pattern: /back.?off|admin/i,                       type: 'backoffice',     niveau: 4, color: '#a77d4c', entityType: 'zone', confidence: 0.86 },
  { pattern: /financ|compt|caiss|banqu|tresor/i,       type: 'financier',      niveau: 5, color: '#dc2626', entityType: 'zone', confidence: 0.91 },
  { pattern: /secours|urgence|exit|evacu/i,            type: 'sortie_secours', niveau: 3, color: '#22c55e', entityType: 'zone', confidence: 0.93 },
  { pattern: /loisir|cinema|jeu|entertain/i,           type: 'loisirs',        niveau: 2, color: '#06b6d4', entityType: 'zone', confidence: 0.84 },
  { pattern: /service|info|client/i,                   type: 'services',       niveau: 2, color: '#14b8a6', entityType: 'zone', confidence: 0.80 },
  { pattern: /hotel|heberge/i,                         type: 'hotel',          niveau: 3, color: '#b38a5a', entityType: 'zone', confidence: 0.89 },
  { pattern: /bureau|office/i,                         type: 'bureaux',        niveau: 3, color: '#b38a5a', entityType: 'zone', confidence: 0.82 },
  { pattern: /ext|jardin|terrass|facade/i,             type: 'exterieur',      niveau: 1, color: '#84cc16', entityType: 'zone', confidence: 0.78 },
]

/** Patterns pour la detection d'equipements dans les blocs DXF */
const BLOCK_PATTERNS: {
  pattern: RegExp
  type: 'camera' | 'door' | 'transition'
  confidence: number
}[] = [
  { pattern: /cam|cctv|video|surv/i,            type: 'camera',     confidence: 0.90 },
  { pattern: /door|porte|acces|entree/i,        type: 'door',       confidence: 0.88 },
  { pattern: /stair|escalier|ascen|elev|ramp/i, type: 'transition', confidence: 0.85 },
]

export interface DXFParseResult {
  entities: DXFEntity[]
  layers: string[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export interface DXFBlock {
  name: string
  x: number
  y: number
  layer: string
  suggestedType: 'camera' | 'door' | 'transition' | 'unknown'
  confidence: number
}

// ═══ CLASSIFICATION D'UN CALQUE AVEC SCORE DE CONFIANCE ═══

/**
 * Classifie un calque DXF en analysant son nom et les entites qu'il contient.
 * Retourne un LayerClassification avec un score de confiance [0-1].
 */
export function classifyDXFLayer(
  layerName: string,
  entities: DXFEntity[]
): LayerClassification {
  // Chercher dans les patterns de zone
  for (const entry of LAYER_PATTERNS) {
    if (entry.pattern.test(layerName)) {
      // Ajuster la confiance selon le nombre d'entites
      const entityBonus = Math.min(0.05, entities.length * 0.005)
      // Verifier si les entites contiennent des polygones fermes (plus probable d'etre une zone)
      const hasPolygons = entities.some(
        e => (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices && e.vertices.length >= 3
      )
      const polygonBonus = hasPolygons ? 0.05 : 0

      return {
        layerName,
        entityType: entry.entityType,
        confidence: Math.min(1, entry.confidence + entityBonus + polygonBonus),
        spaceType: entry.type,
        reason: `Pattern "${entry.pattern.source}" match sur le nom de calque "${layerName}"`,
      }
    }
  }

  // Chercher dans les patterns d'equipement
  for (const bp of BLOCK_PATTERNS) {
    if (bp.pattern.test(layerName)) {
      return {
        layerName,
        entityType: bp.type,
        confidence: bp.confidence,
        reason: `Pattern equipement "${bp.pattern.source}" match sur le calque "${layerName}"`,
      }
    }
  }

  // Analyse heuristique basee sur les entites
  const hasInserts = entities.some(e => e.type === 'INSERT')
  const hasPolygons = entities.some(
    e => (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices && e.vertices.length >= 3
  )

  if (hasPolygons && !hasInserts) {
    return {
      layerName,
      entityType: 'zone',
      confidence: 0.40,
      spaceType: 'circulation',
      reason: `Calque "${layerName}" contient des polygones fermes — classifie comme zone par defaut`,
    }
  }

  if (hasInserts && !hasPolygons) {
    return {
      layerName,
      entityType: 'unknown',
      confidence: 0.30,
      reason: `Calque "${layerName}" contient des blocs INSERT — type d'equipement indetermine`,
    }
  }

  // Defaut
  return {
    layerName,
    entityType: 'unknown',
    confidence: 0.20,
    reason: `Calque "${layerName}" non reconnu — classification manuelle recommandee`,
  }
}

// ═══ EXTRACTION ZONES DEPUIS POLYLIGNES FERMÉES ═══

/**
 * Extrait les zones depuis les polylignes fermees du DXF.
 * Les coordonnees sont normalisees en [0-1] par rapport aux limites du DXF.
 */
export function extractZonesFromDXF(
  entities: DXFEntity[],
  floorId?: string,
  floorWidthM?: number,
  floorHeightM?: number
): Zone[] {
  const zones: Zone[] = []
  const effectiveFloorId = floorId ?? 'floor-default'
  const widthM = floorWidthM ?? 100
  const heightM = floorHeightM ?? 100

  // Calculer les limites globales
  const allPoints: { x: number; y: number }[] = []
  for (const entity of entities) {
    if (entity.vertices) allPoints.push(...entity.vertices)
    if (entity.position) allPoints.push(entity.position)
    if (entity.insertionPoint) allPoints.push(entity.insertionPoint)
  }

  if (allPoints.length === 0) return zones

  const bounds = {
    minX: Math.min(...allPoints.map(p => p.x)),
    maxX: Math.max(...allPoints.map(p => p.x)),
    minY: Math.min(...allPoints.map(p => p.y)),
    maxY: Math.max(...allPoints.map(p => p.y)),
  }
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY

  if (dxfWidth <= 0 || dxfHeight <= 0) return zones

  // Grouper les entites par calque
  const layerEntities = new Map<string, DXFEntity[]>()
  for (const entity of entities) {
    const list = layerEntities.get(entity.layer) ?? []
    list.push(entity)
    layerEntities.set(entity.layer, list)
  }

  let zoneIndex = 0
  for (const [layerName, layerEnts] of layerEntities) {
    const classification = classifyDXFLayer(layerName, layerEnts)

    // Ne traiter que les calques classifies comme zones
    if (classification.entityType !== 'zone' && classification.entityType !== 'unknown') continue

    const spaceType = classification.spaceType ?? 'circulation'

    // Trouver les polygones fermes (LWPOLYLINE, POLYLINE)
    const closedPolygons = layerEnts.filter(
      e => (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') && e.vertices && e.vertices.length >= 3
    )

    for (const poly of closedPolygons) {
      if (!poly.vertices || poly.vertices.length < 3) continue

      const xs = poly.vertices.map(v => v.x)
      const ys = poly.vertices.map(v => v.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      // Normaliser vers 0-1
      const nx = (minX - bounds.minX) / dxfWidth
      const ny = (minY - bounds.minY) / dxfHeight
      const nw = (maxX - minX) / dxfWidth
      const nh = (maxY - minY) / dxfHeight

      const surfaceM2 = nw * widthM * nh * heightM

      if (surfaceM2 < 2) continue // Ignorer les tres petites zones

      const niveauMap: Record<SpaceType, 1 | 2 | 3 | 4 | 5> = {
        parking: 3, commerce: 2, restauration: 2, circulation: 1,
        technique: 4, backoffice: 4, financier: 5, sortie_secours: 3,
        loisirs: 2, services: 2, hotel: 3, bureaux: 3, exterieur: 1,
      }

      const colorMap: Record<SpaceType, string> = {
        parking: '#64748b', commerce: '#3b82f6', restauration: '#f59e0b',
        circulation: '#e5e7eb', technique: '#ef4444', backoffice: '#a77d4c',
        financier: '#dc2626', sortie_secours: '#22c55e', loisirs: '#06b6d4',
        services: '#14b8a6', hotel: '#b38a5a', bureaux: '#b38a5a', exterieur: '#84cc16',
      }

      zones.push({
        id: `zone-dxf-${effectiveFloorId}-${zoneIndex++}`,
        floorId: effectiveFloorId,
        label: `${layerName} ${zoneIndex}`,
        type: spaceType,
        x: nx,
        y: ny,
        w: nw,
        h: nh,
        niveau: niveauMap[spaceType],
        color: colorMap[spaceType],
        surfaceM2: Math.round(surfaceM2),
        description: `Zone importee depuis calque DXF "${layerName}" (confiance: ${Math.round(classification.confidence * 100)}%)`,
      })
    }

    // Si pas de polygones mais des entites, creer une zone englobante
    if (closedPolygons.length === 0 && layerEnts.length > 0) {
      const layerPoints: { x: number; y: number }[] = []
      for (const e of layerEnts) {
        if (e.vertices) layerPoints.push(...e.vertices)
        if (e.position) layerPoints.push(e.position)
        if (e.insertionPoint) layerPoints.push(e.insertionPoint)
      }

      if (layerPoints.length >= 2) {
        const xs = layerPoints.map(p => p.x)
        const ys = layerPoints.map(p => p.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)

        const nx = (minX - bounds.minX) / dxfWidth
        const ny = (minY - bounds.minY) / dxfHeight
        const nw = Math.max(0.01, (maxX - minX) / dxfWidth)
        const nh = Math.max(0.01, (maxY - minY) / dxfHeight)

        const surfaceM2 = nw * widthM * nh * heightM
        if (surfaceM2 >= 2) {
          const niveauMap: Record<SpaceType, 1 | 2 | 3 | 4 | 5> = {
            parking: 3, commerce: 2, restauration: 2, circulation: 1,
            technique: 4, backoffice: 4, financier: 5, sortie_secours: 3,
            loisirs: 2, services: 2, hotel: 3, bureaux: 3, exterieur: 1,
          }
          const colorMap: Record<SpaceType, string> = {
            parking: '#64748b', commerce: '#3b82f6', restauration: '#f59e0b',
            circulation: '#e5e7eb', technique: '#ef4444', backoffice: '#a77d4c',
            financier: '#dc2626', sortie_secours: '#22c55e', loisirs: '#06b6d4',
            services: '#14b8a6', hotel: '#b38a5a', bureaux: '#b38a5a', exterieur: '#84cc16',
          }

          zones.push({
            id: `zone-dxf-${effectiveFloorId}-${zoneIndex++}`,
            floorId: effectiveFloorId,
            label: `${layerName}`,
            type: spaceType,
            x: nx,
            y: ny,
            w: nw,
            h: nh,
            niveau: niveauMap[spaceType],
            color: colorMap[spaceType],
            surfaceM2: Math.round(surfaceM2),
            description: `Zone englobante calque "${layerName}" (confiance: ${Math.round(classification.confidence * 100)}%)`,
          })
        }
      }
    }
  }

  return zones
}

// ═══ EXTRACTION BLOCS (CAMÉRAS, PORTES) AVEC CLASSIFICATIONS ═══

/**
 * Extrait les positions de cameras et portes depuis les blocs INSERT du DXF.
 * Utilise les classifications pour affiner la detection.
 */
export function extractBlocksFromDXF(
  entities: DXFEntity[],
  classifications: LayerClassification[]
): DXFBlock[] {
  const blocks: DXFBlock[] = []

  // Calculer les limites
  const allPoints: { x: number; y: number }[] = []
  for (const entity of entities) {
    if (entity.vertices) allPoints.push(...entity.vertices)
    if (entity.position) allPoints.push(entity.position)
    if (entity.insertionPoint) allPoints.push(entity.insertionPoint)
  }

  if (allPoints.length === 0) return blocks

  const bounds = {
    minX: Math.min(...allPoints.map(p => p.x)),
    maxX: Math.max(...allPoints.map(p => p.x)),
    minY: Math.min(...allPoints.map(p => p.y)),
    maxY: Math.max(...allPoints.map(p => p.y)),
  }
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY

  if (dxfWidth <= 0 || dxfHeight <= 0) return blocks

  // Creer un index des classifications par calque
  const classificationIndex = new Map<string, LayerClassification>()
  for (const c of classifications) {
    classificationIndex.set(c.layerName, c)
  }

  const insertEntities = entities.filter(e => e.type === 'INSERT')

  for (const entity of insertEntities) {
    const point = entity.insertionPoint ?? entity.position
    if (!point) continue

    // Chercher d'abord dans les classifications fournies
    const layerClass = classificationIndex.get(entity.layer)

    let suggestedType: DXFBlock['suggestedType'] = 'unknown'
    let confidence = 0.30

    if (layerClass && layerClass.entityType !== 'zone' && layerClass.entityType !== 'unknown') {
      suggestedType = layerClass.entityType
      confidence = layerClass.confidence
    } else {
      // Fallback sur les patterns de blocs
      const nameToCheck = `${entity.name ?? ''} ${entity.layer}`
      for (const bp of BLOCK_PATTERNS) {
        if (bp.pattern.test(nameToCheck)) {
          suggestedType = bp.type
          confidence = bp.confidence
          break
        }
      }
    }

    blocks.push({
      name: entity.name ?? entity.layer,
      x: (point.x - bounds.minX) / dxfWidth,
      y: (point.y - bounds.minY) / dxfHeight,
      layer: entity.layer,
      suggestedType,
      confidence,
    })
  }

  return blocks
}

// ═══ GÉNÉRATION SVG DEPUIS DXF ═══

export function generateSVGFromDXF(
  parseResult: DXFParseResult,
  width: number = 1200,
  height: number = 800
): string {
  const { bounds, entities } = parseResult
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY

  if (dxfWidth <= 0 || dxfHeight <= 0) return '<svg></svg>'

  const scale = Math.min(width / dxfWidth, height / dxfHeight)
  const paths: string[] = []

  // Grouper par calque pour appliquer les couleurs
  const layerEntities = new Map<string, DXFEntity[]>()
  for (const entity of entities) {
    const list = layerEntities.get(entity.layer) ?? []
    list.push(entity)
    layerEntities.set(entity.layer, list)
  }

  for (const [layerName, layerEnts] of layerEntities) {
    const classification = classifyDXFLayer(layerName, layerEnts)
    const color = classification.spaceType
      ? LAYER_PATTERNS.find(p => p.type === classification.spaceType)?.color ?? '#999999'
      : '#999999'

    for (const entity of layerEnts) {
      if (!entity.vertices || entity.vertices.length < 2) continue

      const points = entity.vertices.map(v => {
        const x = (v.x - bounds.minX) * scale
        const y = height - (v.y - bounds.minY) * scale // Flip Y
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })

      const d = `M ${points.join(' L ')} Z`
      paths.push(`<path d="${d}" fill="${color}20" stroke="${color}" stroke-width="0.5"/>`)
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${paths.join('')}</svg>`
}

// ═══ CLASSIFICATION GLOBALE D'UN FICHIER DXF ═══

/** Classifie tous les calques d'un fichier DXF parse */
export function classifyAllLayers(parseResult: DXFParseResult): LayerClassification[] {
  const classifications: LayerClassification[] = []

  const layerEntities = new Map<string, DXFEntity[]>()
  for (const entity of parseResult.entities) {
    const list = layerEntities.get(entity.layer) ?? []
    list.push(entity)
    layerEntities.set(entity.layer, list)
  }

  for (const [layerName, layerEnts] of layerEntities) {
    classifications.push(classifyDXFLayer(layerName, layerEnts))
  }

  // Trier par confiance decroissante
  classifications.sort((a, b) => b.confidence - a.confidence)

  return classifications
}
