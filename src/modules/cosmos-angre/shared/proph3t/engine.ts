import type {
  Camera, Zone, Door, BlindSpot, SecurityScore,
  CameraModel, SpaceType, POI, MomentCle,
  DoorRecommendation
} from './types'

// ═══ CONSTANTES CAMÉRAS ═══

export const CAMERA_SPECS: Record<CameraModel, {
  resolution: string; fov: number; rangeM: number; priceFcfa: number
  brand: string; type: string; norm: string; ip: string
}> = {
  'XNV-8080R':        { resolution: '5MP', fov: 109, rangeM: 12, priceFcfa: 850_000,   brand: 'Wisenet', type: 'Dome interieur',      norm: 'EN 62676', ip: 'IP52' },
  'QNV-8080R':        { resolution: '5MP', fov: 109, rangeM: 10, priceFcfa: 920_000,   brand: 'Wisenet', type: 'Dome vandal-proof',    norm: 'EN 62676', ip: 'IK10' },
  'PTZ QNP-9300RWB':  { resolution: '4K',  fov: 120, rangeM: 30, priceFcfa: 2_800_000, brand: 'Wisenet', type: 'PTZ exterieur',        norm: 'EN 62676', ip: 'IP66' },
  'PNM-9000VQ':       { resolution: '4x2MP', fov: 270, rangeM: 8, priceFcfa: 1_280_000, brand: 'Wisenet', type: 'Multi-directionnel', norm: 'EN 62676', ip: 'IP52' },
  'QNO-8080R':        { resolution: '5MP', fov: 90,  rangeM: 14, priceFcfa: 780_000,   brand: 'Wisenet', type: 'Bullet exterieur',     norm: 'IP66/IK10', ip: 'IP66' },
  'XNF-9300RV':       { resolution: '12MP', fov: 360, rangeM: 6, priceFcfa: 1_150_000, brand: 'Wisenet', type: 'Fisheye 360',         norm: 'EN 62676', ip: 'IP52' },
  'DS-2CD2T47G2':     { resolution: '4MP', fov: 86,  rangeM: 16, priceFcfa: 620_000,   brand: 'Hikvision', type: 'Bullet 4MP',        norm: 'IP67',     ip: 'IP67' },
  'IPC-HDW3849H':     { resolution: '8MP', fov: 102, rangeM: 10, priceFcfa: 580_000,   brand: 'Dahua',   type: 'Dome eye-ball',       norm: 'IK10',     ip: 'IK10' },
  'PTZ-P3':           { resolution: '4K',  fov: 360, rangeM: 50, priceFcfa: 3_500_000, brand: 'Wisenet', type: 'PTZ panoramique',     norm: 'EN 62676', ip: 'IP66' },
}

// ═══ RÈGLES DE PLACEMENT PAR TYPE DE ZONE ═══

export const ZONE_CAMERA_RULES: Record<SpaceType, {
  recommendedModels: CameraModel[]
  densityPer100m2: number
  minOverlapPercent: number
  notes: string
}> = {
  parking:        { recommendedModels: ['PTZ QNP-9300RWB', 'QNO-8080R'],  densityPer100m2: 0.25, minOverlapPercent: 20, notes: 'PTZ obligatoire, 1 camera / 400m2' },
  commerce:       { recommendedModels: ['XNV-8080R', 'IPC-HDW3849H'],     densityPer100m2: 0.5,  minOverlapPercent: 15, notes: 'Dome interieur standard' },
  restauration:   { recommendedModels: ['PNM-9000VQ', 'XNV-8080R'],       densityPer100m2: 0.6,  minOverlapPercent: 15, notes: 'Multi-directionnel plafond + domes perimetre' },
  circulation:    { recommendedModels: ['QNO-8080R', 'XNV-8080R'],        densityPer100m2: 0.4,  minOverlapPercent: 10, notes: 'Bullet lateral couvrant longueur couloir' },
  technique:      { recommendedModels: ['QNV-8080R'],                      densityPer100m2: 0.3,  minOverlapPercent: 10, notes: 'Vandal-proof requis' },
  backoffice:     { recommendedModels: ['QNV-8080R', 'XNV-8080R'],        densityPer100m2: 0.4,  minOverlapPercent: 10, notes: 'Dome vandal-proof recommande' },
  financier:      { recommendedModels: ['QNV-8080R', 'XNF-9300RV'],       densityPer100m2: 0.8,  minOverlapPercent: 25, notes: 'Couverture redondante obligatoire, zone N4-N5' },
  sortie_secours: { recommendedModels: ['QNO-8080R'],                      densityPer100m2: 0.5,  minOverlapPercent: 10, notes: 'Face reconnaissable angle < 15 deg' },
  loisirs:        { recommendedModels: ['PNM-9000VQ', 'XNV-8080R'],       densityPer100m2: 0.5,  minOverlapPercent: 15, notes: 'Multi-directionnel en plafond' },
  services:       { recommendedModels: ['XNV-8080R'],                      densityPer100m2: 0.4,  minOverlapPercent: 10, notes: 'Standard dome interieur' },
  hotel:          { recommendedModels: ['XNV-8080R', 'QNV-8080R'],        densityPer100m2: 0.3,  minOverlapPercent: 15, notes: 'Dome standard + vandal-proof halls' },
  bureaux:        { recommendedModels: ['XNV-8080R'],                      densityPer100m2: 0.3,  minOverlapPercent: 10, notes: 'Dome interieur entrees' },
  exterieur:      { recommendedModels: ['PTZ QNP-9300RWB', 'QNO-8080R'],  densityPer100m2: 0.2,  minOverlapPercent: 20, notes: 'PTZ + bullet perimetre' },
}

// ═══ FONCTIONS DE CALCUL GÉOMÉTRIQUE ═══

/**
 * Calcul de distance en metres entre deux points normalises (0-1)
 * @param realWidthM - largeur reelle du plan en metres (optionnel, defaut 100)
 * @param realHeightM - hauteur reelle du plan en metres (optionnel, defaut 100)
 */
export function calcDistance(
  x1: number, y1: number, x2: number, y2: number,
  realWidthM?: number, realHeightM?: number
): number {
  const wM = realWidthM ?? 100
  const hM = realHeightM ?? 100
  const dx = (x2 - x1) * wM
  const dy = (y2 - y1) * hM
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calcul de surface en m2 d'une zone normalisee
 * @param realWidthM - largeur reelle du plan en metres (optionnel, defaut 100)
 * @param realHeightM - hauteur reelle du plan en metres (optionnel, defaut 100)
 */
export function calcArea(zone: Zone, realWidthM?: number, realHeightM?: number): number {
  const wM = realWidthM ?? 100
  const hM = realHeightM ?? 100
  return zone.w * wM * zone.h * hM
}

export function normalizeToMeters(val: number, axisLengthM: number): number {
  return val * axisLengthM
}

// ═══ COUVERTURE CAMÉRA ═══

/** Verifie si un point (px, py) est couvert par une camera */
export function isCovered(
  px: number, py: number,
  cam: Camera,
  floorWidthM: number, floorHeightM: number
): boolean {
  const dist = calcDistance(px, py, cam.x, cam.y, floorWidthM, floorHeightM)
  if (dist > cam.rangeM) return false

  // Fisheye et panoramique : couverture omnidirectionnelle dans le rayon
  if (cam.fov >= 360) return true

  const angleToPoint = Math.atan2(
    (py - cam.y) * floorHeightM,
    (px - cam.x) * floorWidthM
  ) * (180 / Math.PI)

  const normalizedAngle = ((angleToPoint - cam.angle + 540) % 360) - 180
  return Math.abs(normalizedAngle) <= cam.fov / 2
}

/** Calcul de la couverture d'un etage en pourcentage */
export function computeFloorCoverage(
  zones: Zone[],
  cameras: Camera[],
  floorId: string,
  widthM: number,
  heightM: number,
  resolution: number = 50
): number {
  const floorZones = zones.filter(z => z.floorId === floorId)
  const floorCameras = cameras.filter(c => c.floorId === floorId)

  if (floorZones.length === 0) return 0

  let coveredPixels = 0
  let totalPixels = 0

  for (const zone of floorZones) {
    for (let xi = 0; xi < resolution; xi++) {
      for (let yi = 0; yi < resolution; yi++) {
        const px = zone.x + (xi / resolution) * zone.w
        const py = zone.y + (yi / resolution) * zone.h
        totalPixels++

        const covered = floorCameras.some(cam => isCovered(px, py, cam, widthM, heightM))
        if (covered) coveredPixels++
      }
    }
  }

  return totalPixels > 0 ? Math.round((coveredPixels / totalPixels) * 100) : 0
}

// ═══ SCORE SÉCURITAIRE APSAD R82 — COMPLET ═══

/**
 * Calcul du score securitaire selon la norme APSAD R82.
 * Decomposition : cameras /40, zones /20, portes /20, sorties /20
 */
export function scoreSecurite(
  zones: Zone[],
  cameras: Camera[],
  doors: Door[],
  exits: Door[]
): SecurityScore {
  const issues: string[] = []

  // Utilise les sorties explicitement
  const allExits = exits.length > 0 ? exits : doors.filter(d => d.isExit)

  // ── Score cameras (/40) ──
  let camScore = 40

  if (cameras.length === 0) {
    camScore = 0
    issues.push('Aucune camera installee')
  } else {
    // Penalite zones sans camera au centre
    const zonesWithoutCam = zones.filter(z => {
      return !cameras.some(c =>
        c.floorId === z.floorId &&
        c.x >= z.x && c.x <= z.x + z.w &&
        c.y >= z.y && c.y <= z.y + z.h
      )
    })
    const coverageRatio = zones.length > 0 ? (zones.length - zonesWithoutCam.length) / zones.length : 0

    if (coverageRatio < 0.8) {
      camScore -= Math.round((0.8 - coverageRatio) * 50)
      issues.push(`${zonesWithoutCam.length} zone(s) sans couverture camera`)
    }

    // Zones critiques N4-N5 non couvertes
    const criticalZones = zones.filter(z => z.niveau >= 4)
    const uncoveredCritical = criticalZones.filter(z => {
      return !cameras.some(c =>
        c.floorId === z.floorId &&
        c.x >= z.x && c.x <= z.x + z.w &&
        c.y >= z.y && c.y <= z.y + z.h
      )
    })
    if (uncoveredCritical.length > 0) {
      camScore -= uncoveredCritical.length * 5
      issues.push(`${uncoveredCritical.length} zone(s) critique(s) N4/N5 sans couverture — non-conformite APSAD R82`)
    }

    // Verification densite par zone
    for (const zone of zones) {
      const rules = ZONE_CAMERA_RULES[zone.type]
      if (!rules) continue
      const area = zone.surfaceM2 ?? (zone.w * 100 * zone.h * 100)
      const needed = Math.max(1, Math.ceil(area * rules.densityPer100m2 / 100))
      const inZone = cameras.filter(c =>
        c.floorId === zone.floorId &&
        c.x >= zone.x && c.x <= zone.x + zone.w &&
        c.y >= zone.y && c.y <= zone.y + zone.h
      )
      if (inZone.length < needed && zone.niveau >= 3) {
        camScore -= 2
        issues.push(`Zone "${zone.label}" : ${inZone.length}/${needed} camera(s) requise(s) (densite ${rules.densityPer100m2}/100m2)`)
      }
    }
  }
  camScore = Math.max(0, camScore)

  // ── Score zones (/20) ──
  let zoneScore = 20
  if (zones.length === 0) {
    zoneScore = 0
    issues.push('Aucune zone definie')
  } else {
    const zonesWithoutLevel = zones.filter(z => !z.niveau)
    if (zonesWithoutLevel.length > 0) {
      zoneScore -= 5
      issues.push(`${zonesWithoutLevel.length} zone(s) sans niveau de criticite`)
    }
    // Verification que les types critiques sont identifie
    const hasFinancial = zones.some(z => z.type === 'financier')
    const hasTechnical = zones.some(z => z.type === 'technique')
    if (!hasFinancial && zones.length > 5) {
      zoneScore -= 3
      issues.push('Aucune zone financiere identifiee — verifier la classification')
    }
    if (!hasTechnical && zones.length > 5) {
      zoneScore -= 2
      issues.push('Aucune zone technique identifiee — verifier la classification')
    }
  }
  zoneScore = Math.max(0, zoneScore)

  // ── Score portes (/20) ──
  let doorScore = 20
  const criticalDoorsWithoutBadge = doors.filter(
    d => ['technique', 'backoffice', 'financier'].includes(d.zoneType) && !d.hasBadge
  )
  if (criticalDoorsWithoutBadge.length > 0) {
    doorScore -= criticalDoorsWithoutBadge.length * 4
    issues.push(`${criticalDoorsWithoutBadge.length} acces zone sensible sans controle badge`)
  }

  const financialDoorsWithoutBio = doors.filter(
    d => d.zoneType === 'financier' && !d.hasBiometric
  )
  if (financialDoorsWithoutBio.length > 0) {
    doorScore -= financialDoorsWithoutBio.length * 5
    issues.push(`${financialDoorsWithoutBio.length} acces zone financiere sans biometrie`)
  }

  // SAS obligatoire pour zones N5
  const n5ZoneTypes: SpaceType[] = ['financier']
  const doorsN5WithoutSas = doors.filter(
    d => n5ZoneTypes.includes(d.zoneType) && !d.hasSas
  )
  if (doorsN5WithoutSas.length > 0) {
    doorScore -= doorsN5WithoutSas.length * 3
    issues.push(`${doorsN5WithoutSas.length} acces zone N5 sans SAS de securite`)
  }

  doorScore = Math.max(0, doorScore)

  // ── Score sorties (/20) ──
  let exitScore = 20
  if (allExits.length < 2) {
    exitScore -= 10
    issues.push('Moins de 2 sorties de secours — non-conformite NF S 61-938')
  }

  const exitWidthTotal = allExits.reduce((sum, d) => sum + d.widthM, 0)
  const totalSurface = zones.reduce((sum, z) => sum + (z.surfaceM2 ?? 0), 0)
  // 1 UP (0.6m) par 100 personnes, environ 1 pers/m2
  const requiredExitWidth = totalSurface / 100
  if (exitWidthTotal < requiredExitWidth && totalSurface > 0) {
    exitScore -= 5
    issues.push(`Largeur cumulee sorties (${exitWidthTotal.toFixed(1)}m) insuffisante pour ${totalSurface}m2`)
  }

  // Barres anti-panique EN 1125
  const exitsWithoutPanic = allExits.filter(d => !d.ref.includes('PB1000') && !d.ref.includes('anti-panique'))
  if (exitsWithoutPanic.length > 0) {
    exitScore -= exitsWithoutPanic.length * 2
    issues.push(`${exitsWithoutPanic.length} sortie(s) de secours sans barre anti-panique (EN 1125)`)
  }

  // Verifier repartition des sorties (au moins sur 2 facades opposees)
  if (allExits.length >= 2) {
    const avgX = allExits.reduce((s, d) => s + d.x, 0) / allExits.length
    const allSameSide = allExits.every(d => (d.x > avgX) === (allExits[0].x > avgX))
    if (allSameSide && allExits.length > 1) {
      exitScore -= 3
      issues.push('Toutes les sorties sont du meme cote — repartition non conforme')
    }
  }

  exitScore = Math.max(0, exitScore)

  // ── Couverture globale ──
  const totalCoverage = zones.length > 0 && cameras.length > 0
    ? Math.min(100, Math.round((cameras.length / Math.max(1, zones.length)) * 50))
    : 0

  const total = Math.min(100, Math.max(0, camScore + zoneScore + doorScore + exitScore))

  return {
    total,
    camScore: Math.max(0, camScore),
    zoneScore,
    doorScore,
    exitScore,
    coverage: totalCoverage,
    issues,
    norm: 'APSAD R82',
    generatedAt: new Date().toISOString(),
  }
}

// ═══ DÉTECTION ANGLES MORTS — GRILLE COMPLÈTE ═══

/**
 * Detection des angles morts par analyse en grille.
 * Chaque zone est discretisee en cellules ; les cellules non couvertes sont agregees.
 * @param gridResolution - nombre de cellules par axe (defaut 30)
 */
export function detectBlindSpots(
  zones: Zone[],
  cameras: Camera[],
  gridResolution: number = 30
): BlindSpot[] {
  const blindSpots: BlindSpot[] = []

  // Grouper par etage
  const floorIds = [...new Set(zones.map(z => z.floorId))]

  for (const floorId of floorIds) {
    const floorZones = zones.filter(z => z.floorId === floorId)
    const floorCameras = cameras.filter(c => c.floorId === floorId)

    for (const zone of floorZones) {
      const uncoveredCells: { x: number; y: number }[] = []
      // Estimer les dimensions reelles (on utilise un defaut raisonnable)
      const estimatedWidthM = 100
      const estimatedHeightM = 100

      for (let xi = 0; xi < gridResolution; xi++) {
        for (let yi = 0; yi < gridResolution; yi++) {
          const px = zone.x + (xi / gridResolution) * zone.w
          const py = zone.y + (yi / gridResolution) * zone.h

          const covered = floorCameras.some(cam =>
            isCovered(px, py, cam, estimatedWidthM, estimatedHeightM)
          )
          if (!covered) {
            uncoveredCells.push({ x: px, y: py })
          }
        }
      }

      if (uncoveredCells.length === 0) continue

      const minX = Math.min(...uncoveredCells.map(c => c.x))
      const maxX = Math.max(...uncoveredCells.map(c => c.x))
      const minY = Math.min(...uncoveredCells.map(c => c.y))
      const maxY = Math.max(...uncoveredCells.map(c => c.y))

      const uncoveredRatio = uncoveredCells.length / (gridResolution * gridResolution)
      const areaM2 = (maxX - minX) * estimatedWidthM * (maxY - minY) * estimatedHeightM

      // Severite selon le niveau de criticite de la zone et le ratio non couvert
      let severity: BlindSpot['severity'] = 'normale'
      if (zone.niveau >= 4 || uncoveredRatio > 0.5) severity = 'critique'
      else if (zone.niveau >= 3 || uncoveredRatio > 0.3) severity = 'elevee'

      blindSpots.push({
        id: `bs-${zone.id}`,
        floorId,
        x: minX,
        y: minY,
        w: maxX - minX + zone.w / gridResolution,
        h: maxY - minY + zone.h / gridResolution,
        severity,
        surfaceM2: Math.max(1, Math.round(areaM2)),
        parentZoneId: zone.id,
        sessionCount: 0,
      })
    }
  }

  return blindSpots
}

// Alias pour compatibilite
export function findBlindSpots(
  zones: Zone[],
  cameras: Camera[],
  floorId: string,
  widthM: number,
  heightM: number,
  gridSize: number = 30
): BlindSpot[] {
  const floorZones = zones.filter(z => z.floorId === floorId)
  const floorCameras = cameras.filter(c => c.floorId === floorId)
  const blindSpots: BlindSpot[] = []

  for (const zone of floorZones) {
    const uncoveredCells: { x: number; y: number }[] = []

    for (let xi = 0; xi < gridSize; xi++) {
      for (let yi = 0; yi < gridSize; yi++) {
        const px = zone.x + (xi / gridSize) * zone.w
        const py = zone.y + (yi / gridSize) * zone.h
        const covered = floorCameras.some(cam => isCovered(px, py, cam, widthM, heightM))
        if (!covered) {
          uncoveredCells.push({ x: px, y: py })
        }
      }
    }

    if (uncoveredCells.length > 0) {
      const minX = Math.min(...uncoveredCells.map(c => c.x))
      const maxX = Math.max(...uncoveredCells.map(c => c.x))
      const minY = Math.min(...uncoveredCells.map(c => c.y))
      const maxY = Math.max(...uncoveredCells.map(c => c.y))

      const uncoveredRatio = uncoveredCells.length / (gridSize * gridSize)
      const areaM2 = (maxX - minX) * widthM * (maxY - minY) * heightM

      let severity: BlindSpot['severity'] = 'normale'
      if (zone.niveau >= 4 || uncoveredRatio > 0.5) severity = 'critique'
      else if (zone.niveau >= 3 || uncoveredRatio > 0.3) severity = 'elevee'

      blindSpots.push({
        id: `bs-${zone.id}`,
        floorId,
        x: minX,
        y: minY,
        w: maxX - minX + zone.w / gridSize,
        h: maxY - minY + zone.h / gridSize,
        severity,
        surfaceM2: Math.max(1, Math.round(areaM2)),
        parentZoneId: zone.id,
        sessionCount: 0,
      })
    }
  }

  return blindSpots
}

// ═══ RECOMMANDATION PORTE — TOUS LES SpaceTypes ═══

/** Recommandation de type de porte pour une zone donnee */
export function recommendDoor(zone: Zone): DoorRecommendation {
  switch (zone.type) {
    case 'commerce':
      return {
        type: 'commerce',
        ref: 'DORMA ES200',
        hasBadge: false,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 16005',
        note: 'Coulissante automatique avec detecteur de presence',
        capexFcfa: 1_200_000,
      }
    case 'restauration':
      return {
        type: 'restauration',
        ref: 'GEZE TS4000',
        hasBadge: false,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 1154',
        note: 'Battante double vantail avec ferme-porte',
        capexFcfa: 480_000,
      }
    case 'technique':
      return {
        type: 'technique',
        ref: 'ABLOY CL100',
        hasBadge: true,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 1303',
        note: 'Blindee avec lecteur badge RFID',
        capexFcfa: 1_450_000,
      }
    case 'backoffice':
      return {
        type: 'backoffice',
        ref: 'SUPREMA BioEntry W2',
        hasBadge: true,
        hasBiometric: true,
        hasSas: true,
        normRef: 'ISO 19794',
        note: 'SAS biometrique double verification',
        capexFcfa: 2_100_000,
      }
    case 'financier':
      return {
        type: 'financier',
        ref: 'SAGEM MA500+',
        hasBadge: true,
        hasBiometric: true,
        hasSas: true,
        normRef: 'NF P 25-362',
        note: 'SAS triple verification (badge + biometrie + code)',
        capexFcfa: 3_200_000,
      }
    case 'sortie_secours':
      return {
        type: 'sortie_secours',
        ref: 'ASSA ABLOY PB1000',
        hasBadge: false,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 1125',
        note: 'Barre anti-panique conforme EN 1125',
        capexFcfa: 380_000,
      }
    case 'circulation':
      return {
        type: 'circulation',
        ref: zone.niveau >= 4 ? 'REVER CF90' : 'DORMA TS93',
        hasBadge: false,
        hasBiometric: false,
        hasSas: false,
        normRef: zone.niveau >= 4 ? 'EN 1634' : 'EN 1154',
        note: zone.niveau >= 4
          ? 'Coupe-feu pivotante EI90 pour zone critique'
          : 'Ferme-porte standard circulation',
        capexFcfa: 720_000,
      }
    case 'parking':
      return {
        type: 'parking',
        ref: 'CAME BX-800',
        hasBadge: false,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 13241',
        note: 'Barriere levante avec lecteur de ticket / badge',
        capexFcfa: 650_000,
      }
    case 'loisirs':
      return {
        type: 'loisirs',
        ref: 'DORMA ES200',
        hasBadge: false,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 16005',
        note: 'Coulissante automatique espace loisirs',
        capexFcfa: 1_200_000,
      }
    case 'services':
      return {
        type: 'services',
        ref: 'GEZE TS4000',
        hasBadge: false,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 1154',
        note: 'Battante standard pour espace services',
        capexFcfa: 280_000,
      }
    case 'hotel':
      return {
        type: 'hotel',
        ref: 'ASSA ABLOY Vingcard Essence',
        hasBadge: true,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 14846',
        note: 'Serrure electronique a carte hotel',
        capexFcfa: 540_000,
      }
    case 'bureaux':
      return {
        type: 'bureaux',
        ref: 'ABLOY CL100',
        hasBadge: true,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 1303',
        note: 'Lecteur badge RFID pour bureaux',
        capexFcfa: 1_450_000,
      }
    case 'exterieur':
      return {
        type: 'exterieur',
        ref: 'CAME BX-800',
        hasBadge: false,
        hasBiometric: false,
        hasSas: false,
        normRef: 'EN 13241',
        note: 'Barriere / portillon perimetre exterieur',
        capexFcfa: 950_000,
      }
  }
}

/** Recommandation portes pour toutes les zones d'un etage */
export function recommendDoors(zones: Zone[], floorId: string): Partial<Door>[] {
  const floorZones = zones.filter(z => z.floorId === floorId)
  const recommendations: Partial<Door>[] = []

  for (const zone of floorZones) {
    const config = recommendDoor(zone)
    const doorWidths: Record<SpaceType, number> = {
      commerce: 1.8, restauration: 1.6, technique: 0.9, backoffice: 1.0,
      financier: 1.0, sortie_secours: 1.4, circulation: 1.4, parking: 3.5,
      loisirs: 1.8, services: 1.2, hotel: 0.9, bureaux: 0.9, exterieur: 3.0,
    }
    const capexByType: Record<SpaceType, number> = {
      commerce: 1_200_000, restauration: 480_000, technique: 1_450_000,
      backoffice: 2_100_000, financier: 3_200_000, sortie_secours: 380_000,
      circulation: 720_000, parking: 650_000, loisirs: 1_200_000,
      services: 480_000, hotel: 850_000, bureaux: 1_450_000, exterieur: 650_000,
    }

    recommendations.push({
      floorId,
      label: `${config.ref} — ${zone.label}`,
      x: zone.x,
      y: zone.y + zone.h / 2,
      zoneType: zone.type,
      isExit: zone.type === 'sortie_secours',
      hasBadge: config.hasBadge,
      hasBiometric: config.hasBiometric,
      hasSas: config.hasSas,
      ref: config.ref,
      normRef: config.normRef,
      note: config.note,
      widthM: doorWidths[zone.type],
      capexFcfa: capexByType[zone.type],
    })
  }

  return recommendations
}

// ═══ RAPPORT APSAD R82 ═══

/** Generation d'un rapport texte complet norme APSAD R82 */
export function generateReportASPAD(data: {
  score: SecurityScore
  blindSpots: BlindSpot[]
  cameras: Camera[]
  doors: Door[]
  zones: Zone[]
  coverageByFloor: Record<string, number>
}): string {
  const lines: string[] = []
  const now = new Date().toISOString().split('T')[0]

  lines.push('═══════════════════════════════════════════════════')
  lines.push('  RAPPORT DE CONFORMITE APSAD R82')
  lines.push(`  Atlas Mall Suite — ${now}`)
  lines.push('═══════════════════════════════════════════════════')
  lines.push('')
  lines.push(`Score global : ${data.score.total}/100`)
  lines.push(`Norme de reference : ${data.score.norm}`)
  lines.push(`Genere le : ${data.score.generatedAt}`)
  lines.push('')
  lines.push('--- DECOMPOSITION DU SCORE ---')
  lines.push(`  Cameras      : ${data.score.camScore}/40`)
  lines.push(`  Zones        : ${data.score.zoneScore}/20`)
  lines.push(`  Portes/Acces : ${data.score.doorScore}/20`)
  lines.push(`  Sorties      : ${data.score.exitScore}/20`)
  lines.push(`  Couverture   : ${data.score.coverage}%`)
  lines.push('')

  // Couverture par etage
  lines.push('--- COUVERTURE PAR ETAGE ---')
  for (const [floorId, coverage] of Object.entries(data.coverageByFloor)) {
    const status = coverage >= 90 ? 'CONFORME' : coverage >= 70 ? 'PARTIEL' : 'NON CONFORME'
    lines.push(`  ${floorId} : ${coverage}% — ${status}`)
  }
  lines.push('')

  // Equipements
  lines.push('--- EQUIPEMENTS ---')
  lines.push(`  Cameras     : ${data.cameras.length}`)
  lines.push(`  Portes      : ${data.doors.length}`)
  lines.push(`  Zones       : ${data.zones.length}`)
  const totalCapex = data.cameras.reduce((s, c) => s + c.capexFcfa, 0) +
    data.doors.reduce((s, d) => s + d.capexFcfa, 0)
  lines.push(`  CAPEX total : ${totalCapex.toLocaleString('fr-FR')} FCFA`)
  lines.push('')

  // Angles morts
  lines.push('--- ANGLES MORTS ---')
  if (data.blindSpots.length === 0) {
    lines.push('  Aucun angle mort detecte.')
  } else {
    const critiques = data.blindSpots.filter(b => b.severity === 'critique')
    const elevees = data.blindSpots.filter(b => b.severity === 'elevee')
    lines.push(`  Total : ${data.blindSpots.length}`)
    lines.push(`  Critiques : ${critiques.length}`)
    lines.push(`  Eleves : ${elevees.length}`)
    lines.push(`  Surface non couverte : ${data.blindSpots.reduce((s, b) => s + b.surfaceM2, 0)}m2`)
  }
  lines.push('')

  // Problemes
  if (data.score.issues.length > 0) {
    lines.push('--- PROBLEMES DETECTES ---')
    for (const [i, issue] of data.score.issues.entries()) {
      lines.push(`  ${i + 1}. ${issue}`)
    }
    lines.push('')
  }

  // Normes
  lines.push('--- NORMES DE REFERENCE ---')
  lines.push('  - APSAD R82 : Videoprotection')
  lines.push('  - NF S 61-938 : Securite incendie')
  lines.push('  - EN 62676 : Systemes de videosurveillance')
  lines.push('  - EN 1125 : Fermetures anti-panique')
  lines.push('  - EN 1303 : Cylindres de serrure')
  lines.push('  - ISO 19794 : Biometrie')
  lines.push('')
  lines.push('═══════════════════════════════════════════════════')

  return lines.join('\n')
}

// ═══ RAPPORT PARCOURS CLIENT ═══

/** Generation d'un rapport texte du parcours client (7 moments cles) */
export function generateReportParcours(data: {
  parcours: MomentCle[]
  pois: POI[]
  signageItems: { id: string; type: string; ref: string; capexFcfa: number }[]
}): string {
  const lines: string[] = []
  const now = new Date().toISOString().split('T')[0]

  lines.push('═══════════════════════════════════════════════════')
  lines.push('  RAPPORT PARCOURS CLIENT — 7 MOMENTS CLES')
  lines.push(`  Atlas Mall Suite — ${now}`)
  lines.push('═══════════════════════════════════════════════════')
  lines.push('')

  const sorted = [...data.parcours].sort((a, b) => a.number - b.number)
  for (const moment of sorted) {
    lines.push(`--- MOMENT ${moment.number} : ${moment.name.toUpperCase()} ---`)
    lines.push(`  KPI          : ${moment.kpi}`)
    lines.push(`  Friction     : ${moment.friction}`)
    lines.push(`  Recomm.      : ${moment.recommendation}`)
    if (moment.cosmosClubAction) {
      lines.push(`  Cosmos Club  : ${moment.cosmosClubAction}`)
    }
    lines.push(`  Signaletique : ${moment.signageItems.length} element(s)`)
    lines.push('')
  }

  // Resume signaletique
  lines.push('--- RESUME SIGNALETIQUE ---')
  lines.push(`  Elements totaux : ${data.signageItems.length}`)
  const sigCapex = data.signageItems.reduce((s, i) => s + i.capexFcfa, 0)
  lines.push(`  CAPEX : ${sigCapex.toLocaleString('fr-FR')} FCFA`)
  lines.push('')

  // POI
  lines.push('--- POINTS D INTERET ---')
  lines.push(`  Total : ${data.pois.length}`)
  const pmrPois = data.pois.filter(p => p.pmr)
  lines.push(`  PMR compatibles : ${pmrPois.length}`)
  lines.push('')

  lines.push('--- NORMES DE REFERENCE ---')
  lines.push('  - NF X 08-003 : Signaletique')
  lines.push('  - ISO 7010 : Symboles de securite')
  lines.push('  - NF EN 1838 : Eclairage de securite')
  lines.push('  - Loi 2005-102 : Accessibilite PMR')
  lines.push('')
  lines.push('═══════════════════════════════════════════════════')

  return lines.join('\n')
}

// ═══ GÉNÉRATION DES 7 MOMENTS-CLÉS ═══

/** Generation automatique des 7 moments cles du parcours visiteur */
export function generateParcours(zones: Zone[], pois: POI[]): MomentCle[] {
  const moments: MomentCle[] = []

  // Moment 1 : Arrivee / Approche
  const parkingZone = zones.find(z => z.type === 'parking') ?? zones[0]
  const parkingPoi = pois.find(p => p.type === 'parking')
  moments.push({
    id: 'mc-1',
    number: 1,
    name: 'Arrivee et stationnement',
    floorId: parkingZone?.floorId ?? '',
    x: parkingZone?.x ?? 0.1,
    y: parkingZone?.y ?? 0.1,
    poiId: parkingPoi?.id,
    kpi: 'Temps moyen de recherche de place < 3 min',
    friction: 'Signaletique parking insuffisante, manque de jalonnement',
    recommendation: 'Totems directionnels aux entrees, marquage au sol lisible, bornes de comptage places',
    cosmosClubAction: 'SMS de bienvenue avec place reservee membres Gold',
    signageItems: [],
  })

  // Moment 2 : Entree dans le mall
  const entreeZone = zones.find(z => z.type === 'circulation') ?? zones[0]
  const entreePoi = pois.find(p => p.type === 'sortie') ?? pois.find(p => p.type === 'totem')
  moments.push({
    id: 'mc-2',
    number: 2,
    name: 'Entree et orientation',
    floorId: entreeZone?.floorId ?? '',
    x: entreeZone?.x ?? 0.2,
    y: entreeZone?.y ?? 0.2,
    poiId: entreePoi?.id,
    kpi: 'Temps d orientation < 30 sec, premier panneau visible < 5m',
    friction: 'Absence de plan d accueil, totem masque',
    recommendation: 'Totem 5m a l entree principale, borne interactive, plan retroeclaire',
    cosmosClubAction: 'Borne de scan carte Cosmos Club a l entree',
    signageItems: [],
  })

  // Moment 3 : Decouverte / Navigation
  const commerceZone = zones.find(z => z.type === 'commerce') ?? zones[0]
  const enseignePoi = pois.find(p => p.type === 'enseigne')
  moments.push({
    id: 'mc-3',
    number: 3,
    name: 'Navigation et decouverte',
    floorId: commerceZone?.floorId ?? '',
    x: commerceZone?.x ?? 0.3,
    y: commerceZone?.y ?? 0.3,
    poiId: enseignePoi?.id,
    kpi: 'Continuite visuelle < 15m entre panneaux, 0 rupture',
    friction: 'Ruptures visuelles dans les galeries, panneaux non lisibles',
    recommendation: 'Panneaux directionnels suspendus tous les 12m, bannieres d enseigne normalisees',
    cosmosClubAction: 'Notifications push offres partenaires a proximite',
    signageItems: [],
  })

  // Moment 4 : Experience en boutique
  const caissePoi = pois.find(p => p.type === 'caisse')
  moments.push({
    id: 'mc-4',
    number: 4,
    name: 'Experience en boutique',
    floorId: commerceZone?.floorId ?? '',
    x: (commerceZone?.x ?? 0.4) + 0.1,
    y: (commerceZone?.y ?? 0.4) + 0.1,
    poiId: caissePoi?.id,
    kpi: 'Temps d attente caisse < 5 min, satisfaction > 4/5',
    friction: 'Files d attente non gerees, absence de flechage vers caisses',
    recommendation: 'Marquage au sol vers caisses, gestion de file, panneaux numero de cellule',
    cosmosClubAction: 'Caisse prioritaire Cosmos Club, cumul de points automatique',
    signageItems: [],
  })

  // Moment 5 : Restauration / Pause
  const restauZone = zones.find(z => z.type === 'restauration') ?? zones[0]
  const restauPoi = pois.find(p => p.type === 'restauration')
  moments.push({
    id: 'mc-5',
    number: 5,
    name: 'Restauration et pause',
    floorId: restauZone?.floorId ?? '',
    x: restauZone?.x ?? 0.5,
    y: restauZone?.y ?? 0.5,
    poiId: restauPoi?.id,
    kpi: 'Acces food court < 2 min depuis n importe quel point, signaletique visible',
    friction: 'Flechage food court absent depuis les etages inferieurs',
    recommendation: 'Panneaux directionnels depuis chaque escalator, totem restauration, pictogrammes',
    cosmosClubAction: 'Reduction 10% food court membres, affichage menu QR',
    signageItems: [],
  })

  // Moment 6 : Services / Confort
  const servicePoi = pois.find(p => p.type === 'service_client') ?? pois.find(p => p.type === 'toilettes')
  const serviceZone = zones.find(z => z.type === 'services') ?? zones[0]
  moments.push({
    id: 'mc-6',
    number: 6,
    name: 'Services et confort',
    floorId: serviceZone?.floorId ?? '',
    x: serviceZone?.x ?? 0.6,
    y: serviceZone?.y ?? 0.6,
    poiId: servicePoi?.id,
    kpi: 'Toilettes accessibles < 60m, pictogrammes PMR visibles',
    friction: 'Toilettes difficiles a trouver, absence de pictogrammes PMR',
    recommendation: 'Pictogrammes PMR aux transitions, panneaux toilettes lumineux, plan evacuation',
    cosmosClubAction: 'Lounge Cosmos Club avec services premium',
    signageItems: [],
  })

  // Moment 7 : Sortie / Fidelisation
  const sortiePoi = pois.find(p => p.type === 'sortie')
  moments.push({
    id: 'mc-7',
    number: 7,
    name: 'Sortie et fidelisation',
    floorId: entreeZone?.floorId ?? '',
    x: entreeZone?.x ?? 0.7,
    y: entreeZone?.y ?? 0.7,
    poiId: sortiePoi?.id,
    kpi: 'Temps de sortie < 5 min, exposition derniere enseigne',
    friction: 'Sortie confuse, pas de rappel fidelite',
    recommendation: 'Signaletique sortie LED, blocs autonomes, panneau recap fidelite',
    cosmosClubAction: 'Borne de scan sortie avec cumul points + offre retour',
    signageItems: [],
  })

  return moments
}

// ═══ PLACEMENT AUTOMATIQUE CAMÉRAS ═══

/** Algorithme de placement automatique des cameras basé sur les regles APSAD R82 */
export function solveCameraPlacement(input: {
  zones: Zone[]
  floorId: string
  widthM: number
  heightM: number
  existingCameras: Camera[]
}): Camera[] {
  const { zones, floorId, widthM, heightM, existingCameras } = input
  const floorZones = zones.filter(z => z.floorId === floorId)
  const newCameras: Camera[] = []
  let camIndex = existingCameras.filter(c => c.floorId === floorId).length + 1

  for (const zone of floorZones) {
    const rules = ZONE_CAMERA_RULES[zone.type]
    if (!rules) continue

    const areaM2 = calcArea(zone, widthM, heightM)
    const needed = Math.max(1, Math.ceil(areaM2 * rules.densityPer100m2 / 100))

    // Cameras existantes dans cette zone
    const existingInZone = existingCameras.filter(c =>
      c.floorId === floorId &&
      c.x >= zone.x && c.x <= zone.x + zone.w &&
      c.y >= zone.y && c.y <= zone.y + zone.h
    )

    const toPlace = needed - existingInZone.length
    if (toPlace <= 0) continue

    // Selectionner le modele le plus adapte
    const model = rules.recommendedModels[0]
    const specs = CAMERA_SPECS[model]

    // Disposer les cameras en grille reguliere
    const cols = Math.ceil(Math.sqrt(toPlace))
    const rows = Math.ceil(toPlace / cols)

    for (let i = 0; i < toPlace; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)

      const cx = zone.x + ((col + 0.5) / cols) * zone.w
      const cy = zone.y + ((row + 0.5) / rows) * zone.h

      // Verifier que cette position n'est pas trop proche d'une camera existante
      const tooClose = [...existingCameras, ...newCameras].some(cam =>
        cam.floorId === floorId &&
        calcDistance(cx, cy, cam.x, cam.y, widthM, heightM) < specs.rangeM * 0.5
      )

      const finalX = tooClose ? cx + zone.w / (cols * 4) : cx
      const finalY = tooClose ? cy + zone.h / (rows * 4) : cy

      newCameras.push({
        id: `cam-auto-${floorId}-${camIndex}`,
        floorId,
        label: `C${String(camIndex).padStart(2, '0')}`,
        model,
        x: finalX,
        y: finalY,
        angle: 270,
        fov: specs.fov,
        range: specs.rangeM / widthM,
        rangeM: specs.rangeM,
        color: zone.niveau >= 4 ? '#ef4444' : zone.niveau >= 3 ? '#f59e0b' : '#3b82f6',
        priority: zone.niveau >= 4 ? 'critique' : zone.niveau >= 3 ? 'haute' : 'normale',
        capexFcfa: specs.priceFcfa,
        autoPlaced: true,
      })
      camIndex++
    }
  }

  return newCameras
}

// Alias pour compatibilite
export const autoPlaceCameras = (
  zones: Zone[],
  floorId: string,
  widthM: number,
  heightM: number,
  existingCameras: Camera[]
): Camera[] => solveCameraPlacement({ zones, floorId, widthM, heightM, existingCameras })

// ═══ CALCUL CAPEX ═══

export function computeCapex(cameras: Camera[], doors: Door[], signageItems?: { capexFcfa: number }[]): {
  cameras: number; doors: number; signage: number; total: number
} {
  const camTotal = cameras.reduce((s, c) => s + c.capexFcfa, 0)
  const doorTotal = doors.reduce((s, d) => s + d.capexFcfa, 0)
  const sigTotal = signageItems?.reduce((s, i) => s + i.capexFcfa, 0) ?? 0
  return { cameras: camTotal, doors: doorTotal, signage: sigTotal, total: camTotal + doorTotal + sigTotal }
}
