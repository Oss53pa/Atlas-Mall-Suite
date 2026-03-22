import type {
  Camera, Zone, Door, Floor, TransitionNode, BlindSpot,
  SecurityScore, POI, SignageItem, MomentCle,
  ChatAnswer, ProjectMemorySummary
} from './types'
import { CAMERA_SPECS, ZONE_CAMERA_RULES, computeCapex, scoreSecurite, calcDistance, calcArea, computeFloorCoverage } from './engine'
import { SIGNAGE_CATALOG, detectVisualBreaks } from './signaleticsEngine'
import { generateMemoryNarrative } from './memoryEngine'
import { MALL_BENCHMARKS } from './benchmarkData'

// ═══ CONTEXTE PROJET COMPLET ═══

export interface FullProjectContext {
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  pois: POI[]
  signageItems: SignageItem[]
  transitions: TransitionNode[]
  floors: Floor[]
  score: SecurityScore | null
  blindSpots: BlindSpot[]
  parcours: MomentCle[]
  memory: ProjectMemorySummary | null
  volume: 'vol2' | 'vol3'
  activeFloorId: string
}

// ═══ NORMALISATION ═══

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalize(q: string): string {
  return stripAccents(q.toLowerCase().trim())
}

function matches(q: string, keywords: string[]): boolean {
  return keywords.some(k => q.includes(k))
}

function matchesCameraModel(q: string): boolean {
  return Object.keys(CAMERA_SPECS).some(k => q.includes(k.toLowerCase()))
}

// ═══ CONSTRUCTEUR ChatAnswer ═══

function answer(
  text: string,
  type: ChatAnswer['type'],
  opts?: { references?: string[]; suggestions?: string[]; affectedEntities?: string[] }
): ChatAnswer {
  return {
    text,
    type,
    references: opts?.references ?? [],
    suggestions: opts?.suggestions ?? [],
    affectedEntities: opts?.affectedEntities,
  }
}

// ═══ MOTEUR CHAT PROPH3T — EXPERT VIVANT (35+ patterns) ═══

export function proph3tAnswer(question: string, ctx: FullProjectContext): ChatAnswer {
  const q = normalize(question)
  const activeFloor = ctx.floors.find(f => f.id === ctx.activeFloorId)

  // 1. Simulation "si j'ajoute X cameras"
  if (q.includes("si j'ajoute") || q.includes('si on ajoute') || q.includes("si j ajoute")) {
    return answerSimulateAdd(q, ctx, activeFloor)
  }

  // 2. Comparaison avant/apres
  if (matches(q, ['avant/apres', 'avant apres', 'comparaison'])) {
    return answerComparison(ctx)
  }

  // 3. Distance entre deux entites
  if (matches(q, ['distance entre'])) {
    return answerDistance(q, ctx, activeFloor)
  }

  // 4. Zone specifique par label
  const zoneMatch = ctx.zones.find(z => q.includes(normalize(z.label)))
  if (zoneMatch) {
    return answerZoneSpecific(zoneMatch, ctx, activeFloor)
  }

  // 5. Score / conformite APSAD
  if (matches(q, ['score', 'conformi', 'apsad'])) {
    return answerScore(ctx)
  }

  // 6. Cameras / couverture
  if (matches(q, ['camer', 'couverture'])) {
    return answerCameras(ctx, activeFloor)
  }

  // 7. Zones listing
  if (matches(q, ['zone', 'espace'])) {
    return answerZones(ctx)
  }

  // 8. Portes & acces
  if (matches(q, ['porte', 'acces', 'badge', 'biometrie'])) {
    return answerDoors(ctx)
  }

  // 9. Angles morts
  if (matches(q, ['angle mort', 'blind', 'zone morte'])) {
    return answerBlindSpots(ctx)
  }

  // 10. Evacuation
  if (matches(q, ['evacuation', 'sortie secours', 'incendie'])) {
    return answerEvacuation(ctx)
  }

  // 11. Parcours client
  if (matches(q, ['parcours', 'visiteur', 'moment'])) {
    return answerParcours(ctx)
  }

  // 12. Surface / superficie
  if (matches(q, ['surface', 'superficie', 'm2', 'metre carre'])) {
    return answerSurface(ctx)
  }

  // 13. Recommandations prioritaires
  if (matches(q, ['recommand', 'que faire', 'priorite', 'action'])) {
    return answerRecommendations(ctx)
  }

  // 14. Modeles Wisenet / catalogues cameras
  if (matches(q, ['wisenet', 'modele', 'hikvision', 'dahua']) || matchesCameraModel(q)) {
    return answerCameraModels(q)
  }

  // 15. Budget / CAPEX
  if (matches(q, ['budget', 'capex', 'cout', 'prix', 'fcfa'])) {
    return answerBudget(ctx)
  }

  // 16. Signaletique
  if (matches(q, ['signaletique', 'panneau', 'affiche', 'totem'])) {
    return answerSignaletics(ctx, activeFloor)
  }

  // 17. Hauteur / taille texte
  if (matches(q, ['hauteur', 'taille texte', 'caractere', 'lisibilite'])) {
    return answerSignageCalc(q)
  }

  // 18. Etages
  if (matches(q, ['etage', 'niveau', 'b1', 'b2', 'rdc', 'r+1', 'r+2', 'r+3'])) {
    return answerFloors(ctx)
  }

  // 19. Wayfinding / itineraire
  if (matches(q, ['itineraire', 'wayfinding', 'chemin', 'aller'])) {
    return answerWayfinding(ctx)
  }

  // 20. PMR / accessibilite
  if (matches(q, ['pmr', 'accessibilite', 'handicap', 'fauteuil'])) {
    return answerPMR(ctx)
  }

  // 21. Memoire
  if (matches(q, ['memoire', 'historique', 'session', 'souviens'])) {
    return answerMemory(ctx)
  }

  // 22. Benchmark
  if (matches(q, ['benchmark', 'comparatif', 'moyenne', 'malls africains'])) {
    return answerBenchmark(ctx)
  }

  // Default : help message
  return answerHelp(ctx)
}

// ═══ FONCTIONS RÉPONSE ═══

function answerSimulateAdd(q: string, ctx: FullProjectContext, floor: Floor | undefined): ChatAnswer {
  const numMatch = q.match(/(\d+)\s*cam/)
  const num = numMatch ? parseInt(numMatch[1], 10) : 3

  const currentCov = ctx.score?.coverage ?? 0
  // Estimation ~8% de gain par camera, plafonne a 100
  const estimatedGain = Math.min(100 - currentCov, num * 8)
  const projected = currentCov + estimatedGain

  const currentScore = ctx.score?.total ?? 0
  const estimatedScoreGain = Math.min(100 - currentScore, num * 3)

  const capexPerCam = 850_000 // moyenne dome Wisenet
  const additionalCapex = num * capexPerCam

  let text = `Simulation : ajout de ${num} camera(s)\n\n`
  text += `| Metrique | Actuel | Projete |\n|----------|--------|---------|\n`
  text += `| Couverture | ${currentCov}% | ~${projected}% |\n`
  text += `| Score APSAD | ${currentScore}/100 | ~${currentScore + estimatedScoreGain}/100 |\n`
  text += `| CAPEX additionnel | — | ${additionalCapex.toLocaleString('fr-FR')} FCFA |\n`

  if (floor) {
    text += `\nEtage actif : ${floor.level}`
  }

  text += `\n\nPour un resultat precis, utilisez le placement automatique.`

  return answer(text, 'simulation', {
    references: ctx.cameras.map(c => c.id),
    suggestions: ['Placer automatiquement', 'Choisir les modeles', 'Voir le budget impact'],
    affectedEntities: floor ? ctx.cameras.filter(c => c.floorId === floor.id).map(c => c.id) : [],
  })
}

function answerComparison(ctx: FullProjectContext): ChatAnswer {
  const score = ctx.score
  const blindCount = ctx.blindSpots.length
  const criticalBlinds = ctx.blindSpots.filter(b => b.severity === 'critique').length

  let text = `Comparaison actuel vs cible\n\n`
  text += `| Critere | Actuel | Cible APSAD R82 |\n|---------|--------|----------------|\n`
  text += `| Score securitaire | ${score?.total ?? 0}/100 | >= 80/100 |\n`
  text += `| Couverture camera | ${score?.coverage ?? 0}% | >= 90% |\n`
  text += `| Angles morts critiques | ${criticalBlinds} | 0 |\n`
  text += `| Angles morts totaux | ${blindCount} | <= 2 |\n`

  const exits = ctx.doors.filter(d => d.isExit)
  const totalSurface = ctx.zones.reduce((s, z) => s + (z.surfaceM2 ?? 0), 0)
  const exitWidth = exits.reduce((s, d) => s + d.widthM, 0)
  const requiredExitWidth = totalSurface > 0 ? totalSurface / 100 : 0

  text += `| Sorties de secours | ${exits.length} | >= 2 |\n`
  text += `| Largeur cumulee sorties | ${exitWidth.toFixed(1)}m | >= ${requiredExitWidth.toFixed(1)}m |\n`

  return answer(text, 'rapport', {
    references: ['APSAD R82', 'NF S 61-938'],
    suggestions: ['Recommandations prioritaires', 'Lancer analyse complete', 'Exporter rapport'],
  })
}

function answerDistance(q: string, ctx: FullProjectContext, floor: Floor | undefined): ChatAnswer {
  const distMatch = q.match(/distance entre\s+(.+?)\s+et\s+(.+?)(?:\s*\?|$)/)
  if (!distMatch) {
    return answer(
      'Utilisez le format : "distance entre [POI A] et [POI B]".',
      'aide',
      { suggestions: ctx.pois.slice(0, 3).map(p => `Distance entre ${p.label} et ...`) }
    )
  }

  const nameA = normalize(distMatch[1])
  const nameB = normalize(distMatch[2])

  const poiA = ctx.pois.find(p => normalize(p.label).includes(nameA) || nameA.includes(normalize(p.label)))
  const poiB = ctx.pois.find(p => normalize(p.label).includes(nameB) || nameB.includes(normalize(p.label)))

  if (!poiA || !poiB) {
    const missing = !poiA ? distMatch[1] : distMatch[2]
    return answer(
      `POI "${missing}" non trouve. POI disponibles : ${ctx.pois.map(p => p.label).join(', ')}.`,
      'info',
      { suggestions: ctx.pois.slice(0, 3).map(p => `Distance entre ${p.label} et ...`) }
    )
  }

  const floorA = ctx.floors.find(f => f.id === poiA.floorId)
  const floorB = ctx.floors.find(f => f.id === poiB.floorId)

  if (poiA.floorId !== poiB.floorId) {
    return answer(
      `${poiA.label} est au ${floorA?.level ?? '?'} et ${poiB.label} au ${floorB?.level ?? '?'}. La distance directe n'est pas significative pour des POI sur des etages differents. Utilisez le calcul d'itineraire multi-etages.`,
      'info',
      { references: [poiA.id, poiB.id], suggestions: ['Calculer itineraire', 'Itineraire PMR'] }
    )
  }

  const refFloor = floorA ?? floor
  const widthM = refFloor?.widthM ?? 100
  const heightM = refFloor?.heightM ?? 100
  const dist = calcDistance(poiA.x, poiA.y, poiB.x, poiB.y, widthM, heightM)

  return answer(
    `Distance entre "${poiA.label}" et "${poiB.label}" : ${dist.toFixed(1)}m (etage ${floorA?.level ?? '?'}).`,
    'info',
    { references: [poiA.id, poiB.id], suggestions: ['Calculer itineraire entre ces deux points', 'Distance vers sortie la plus proche'] }
  )
}

function answerZoneSpecific(zone: Zone, ctx: FullProjectContext, floor: Floor | undefined): ChatAnswer {
  const zoneFloor = ctx.floors.find(f => f.id === zone.floorId) ?? floor
  const zoneCameras = ctx.cameras.filter(c => c.floorId === zone.floorId)
  const zoneDoors = ctx.doors.filter(d => d.floorId === zone.floorId)
  const zoneSignage = ctx.signageItems.filter(s => s.floorId === zone.floorId)
  const zonePois = ctx.pois.filter(p => p.floorId === zone.floorId)
  const zoneBlinds = ctx.blindSpots.filter(b => b.parentZoneId === zone.id)

  const area = zone.surfaceM2 ?? (zoneFloor ? calcArea(zone, zoneFloor.widthM, zoneFloor.heightM) : 0)
  const rules = ZONE_CAMERA_RULES[zone.type]

  let text = `Zone : ${zone.label}\n\n`
  text += `| Propriete | Valeur |\n|-----------|--------|\n`
  text += `| Type | ${zone.type} |\n`
  text += `| Niveau criticite | N${zone.niveau} |\n`
  text += `| Etage | ${zoneFloor?.level ?? '?'} |\n`
  text += `| Surface | ${Math.round(area)}m2 |\n`
  text += `| Cameras a proximite | ${zoneCameras.length} |\n`
  text += `| Portes | ${zoneDoors.length} |\n`
  text += `| Signaletique | ${zoneSignage.length} |\n`
  text += `| POI | ${zonePois.length} |\n`
  text += `| Angles morts | ${zoneBlinds.length} |\n`

  if (rules) {
    const recommendedCount = Math.max(1, Math.ceil(area * rules.densityPer100m2 / 100))
    text += `\nRecommandation APSAD :\n`
    text += `  Modeles : ${rules.recommendedModels.join(', ')}\n`
    text += `  Densite : ${rules.densityPer100m2} cam/100m2\n`
    text += `  Cameras necessaires : ${recommendedCount}\n`
    text += `  Note : ${rules.notes}`
  }

  return answer(text, 'info', {
    references: [zone.id, ...zoneCameras.map(c => c.id)],
    suggestions: [`Cameras pour ${zone.label}`, `Angles morts ${zone.label}`, `Budget ${zone.label}`],
    affectedEntities: [zone.id],
  })
}

function answerScore(ctx: FullProjectContext): ChatAnswer {
  const s = ctx.score ?? scoreSecurite(
    ctx.zones, ctx.cameras, ctx.doors,
    ctx.doors.filter(d => d.isExit)
  )
  return formatScoreAnswer(s)
}

function formatScoreAnswer(s: SecurityScore): ChatAnswer {
  let text = `Score securitaire APSAD R82 : ${s.total}/100\n\n`
  text += `| Critere | Score |\n|---------|-------|\n`
  text += `| Cameras | ${s.camScore}/40 |\n`
  text += `| Zones | ${s.zoneScore}/20 |\n`
  text += `| Portes/Acces | ${s.doorScore}/20 |\n`
  text += `| Sorties secours | ${s.exitScore}/20 |\n`
  text += `| Couverture globale | ${s.coverage}% |\n\n`

  if (s.issues.length > 0) {
    text += `Problemes detectes :\n`
    for (const issue of s.issues) {
      text += `- ${issue}\n`
    }
  } else {
    text += 'Aucun probleme critique detecte.'
  }

  const type: ChatAnswer['type'] = s.total < 60 ? 'alerte' : 'info'

  return answer(text, type, {
    references: ['APSAD R82', 'NF S 61-938', 'EN 62676'],
    suggestions: ['Detailler les angles morts', 'Recommandations prioritaires', 'Exporter le rapport'],
  })
}

function answerCameras(ctx: FullProjectContext, floor: Floor | undefined): ChatAnswer {
  const cams = floor ? ctx.cameras.filter(c => c.floorId === floor.id) : ctx.cameras
  const floorLabel = floor ? ` (${floor.level})` : ''

  let text = `${cams.length} camera(s)${floorLabel}\n\n`

  const byModel = new Map<string, number>()
  for (const c of cams) byModel.set(c.model, (byModel.get(c.model) ?? 0) + 1)

  text += `| Modele | Qte | Marque | FOV | Portee |\n|--------|-----|--------|-----|--------|\n`
  for (const [model, count] of byModel) {
    const specs = CAMERA_SPECS[model as keyof typeof CAMERA_SPECS]
    if (specs) {
      text += `| ${model} | ${count} | ${specs.brand} | ${specs.fov}deg | ${specs.rangeM}m |\n`
    }
  }

  if (floor) {
    const coverage = computeFloorCoverage(
      ctx.zones.filter(z => z.floorId === floor.id),
      cams, floor.id, floor.widthM, floor.heightM, 20
    )
    text += `\nCouverture ${floor.level} : ${coverage}%`
  }

  const autoCount = cams.filter(c => c.autoPlaced).length
  if (autoCount > 0) text += `\n${autoCount} camera(s) placee(s) automatiquement par Proph3t.`

  const capexCam = cams.reduce((s, c) => s + c.capexFcfa, 0)
  text += `\nCAPEX cameras : ${capexCam.toLocaleString('fr-FR')} FCFA`

  return answer(text, 'info', {
    references: cams.map(c => c.id),
    suggestions: ['Ajouter des cameras automatiquement', 'Voir les angles morts', 'Budget cameras'],
  })
}

function answerZones(ctx: FullProjectContext): ChatAnswer {
  let text = `${ctx.zones.length} zone(s) sur ${ctx.floors.length} etage(s)\n\n`

  for (const floor of ctx.floors) {
    const floorZones = ctx.zones.filter(z => z.floorId === floor.id)
    text += `${floor.level} : ${floorZones.length} zone(s)\n`
    for (const z of floorZones) {
      const area = z.surfaceM2 ?? calcArea(z, floor.widthM, floor.heightM)
      text += `  - ${z.label} (${z.type}, N${z.niveau}) — ${Math.round(area)}m2\n`
    }
  }

  const totalSurface = ctx.zones.reduce((s, z) => {
    const floor = ctx.floors.find(f => f.id === z.floorId)
    return s + (z.surfaceM2 ?? (floor ? calcArea(z, floor.widthM, floor.heightM) : 0))
  }, 0)
  text += `\nSurface totale : ${Math.round(totalSurface).toLocaleString('fr-FR')} m2`

  return answer(text, 'info', {
    references: ctx.zones.map(z => z.id),
    suggestions: ['Couverture par zone', 'Zones critiques N4-N5', 'Ajouter une zone'],
  })
}

function answerDoors(ctx: FullProjectContext): ChatAnswer {
  let text = `${ctx.doors.length} porte(s)/acces\n\n`

  const withBadge = ctx.doors.filter(d => d.hasBadge).length
  const withBio = ctx.doors.filter(d => d.hasBiometric).length
  const withSas = ctx.doors.filter(d => d.hasSas).length
  const exits = ctx.doors.filter(d => d.isExit).length

  text += `| Caracteristique | Nombre |\n|----------------|--------|\n`
  text += `| Avec badge | ${withBadge} |\n`
  text += `| Avec biometrie | ${withBio} |\n`
  text += `| Avec SAS | ${withSas} |\n`
  text += `| Sorties de secours | ${exits} |\n\n`

  text += `CAPEX portes : ${ctx.doors.reduce((s, d) => s + d.capexFcfa, 0).toLocaleString('fr-FR')} FCFA`

  // Verification zones sensibles sans badge
  const criticalWithoutBadge = ctx.doors.filter(
    d => ['technique', 'backoffice', 'financier'].includes(d.zoneType) && !d.hasBadge
  )
  if (criticalWithoutBadge.length > 0) {
    text += `\n\nAlerte : ${criticalWithoutBadge.length} acces zone sensible sans controle badge.`
  }

  return answer(text, criticalWithoutBadge.length > 0 ? 'alerte' : 'info', {
    references: ctx.doors.map(d => d.id),
    suggestions: ['Recommandations portes', 'Portes zones sensibles', 'Budget portes'],
  })
}

function answerBlindSpots(ctx: FullProjectContext): ChatAnswer {
  const bs = ctx.blindSpots
  if (bs.length === 0) {
    return answer(
      'Aucun angle mort detecte. Couverture complete.',
      'info',
      { suggestions: ['Verifier apres modification', 'Lancer simulation Monte Carlo'] }
    )
  }

  let text = `${bs.length} angle(s) mort(s) detecte(s)\n\n`
  const critiques = bs.filter(b => b.severity === 'critique')
  const elevees = bs.filter(b => b.severity === 'elevee')
  const normales = bs.filter(b => b.severity === 'normale')

  if (critiques.length > 0) text += `CRITIQUE : ${critiques.length} — couverture obligatoire APSAD R82\n`
  if (elevees.length > 0) text += `ELEVEE : ${elevees.length}\n`
  if (normales.length > 0) text += `NORMALE : ${normales.length}\n`

  text += `\nSurface non couverte totale : ${bs.reduce((s, b) => s + b.surfaceM2, 0)}m2`

  const persistent = bs.filter(b => b.sessionCount > 0)
  if (persistent.length > 0) {
    text += `\n${persistent.length} angle(s) mort(s) signale(s) depuis plus d'une session.`
  }

  // Par etage
  const byFloor = new Map<string, BlindSpot[]>()
  for (const b of bs) {
    const arr = byFloor.get(b.floorId) ?? []
    arr.push(b)
    byFloor.set(b.floorId, arr)
  }
  text += '\n\nPar etage :'
  for (const [floorId, spots] of byFloor) {
    const floor = ctx.floors.find(f => f.id === floorId)
    text += `\n  ${floor?.level ?? floorId} : ${spots.length} (${spots.filter(s => s.severity === 'critique').length} critique(s))`
  }

  return answer(text, critiques.length > 0 ? 'alerte' : 'info', {
    references: bs.map(b => b.id),
    suggestions: ['Placer des cameras automatiquement', 'Detailler les critiques', 'Simuler correction'],
  })
}

function answerEvacuation(ctx: FullProjectContext): ChatAnswer {
  const exits = ctx.doors.filter(d => d.isExit)
  let text = `${exits.length} sortie(s) de secours\n\n`

  for (const exit of exits) {
    const floor = ctx.floors.find(f => f.id === exit.floorId)
    text += `- ${exit.label} (${floor?.level ?? '?'}) — largeur ${exit.widthM}m — ${exit.ref}\n`
  }

  const totalSurface = ctx.zones.reduce((s, z) => s + (z.surfaceM2 ?? 0), 0)
  const exitWidthTotal = exits.reduce((s, d) => s + d.widthM, 0)
  const occupancy = Math.ceil(totalSurface) // ~1 pers/m2
  const requiredUP = Math.ceil(occupancy / 100) // 1 UP per 100 persons
  const requiredWidth = requiredUP * 0.6

  text += `\nAnalyse NF S 61-938 :\n`
  text += `  Surface totale : ${totalSurface.toLocaleString('fr-FR')} m2\n`
  text += `  Capacite estimee : ${occupancy} personnes\n`
  text += `  UP necessaires : ${requiredUP} (largeur ${requiredWidth.toFixed(1)}m)\n`
  text += `  Largeur cumulee sorties : ${exitWidthTotal.toFixed(1)}m\n`
  text += `  Conformite : ${exitWidthTotal >= requiredWidth ? 'OUI' : 'NON — largeur insuffisante'}`

  if (exits.length < 2) {
    text += `\n\nAlerte : moins de 2 sorties de secours. Non-conforme NF S 61-938.`
  }

  const isAlert = exits.length < 2 || exitWidthTotal < requiredWidth

  return answer(text, isAlert ? 'alerte' : 'info', {
    references: exits.map(e => e.id),
    suggestions: ['Lancer simulation evacuation', 'Ajouter une sortie', 'Rapport evacuation'],
  })
}

function answerParcours(ctx: FullProjectContext): ChatAnswer {
  if (ctx.parcours.length === 0) {
    return answer(
      'Les 7 moments cles n\'ont pas encore ete generes.',
      'info',
      { suggestions: ['Generer le parcours'] }
    )
  }

  let text = `7 Moments Cles du Parcours Client\n\n`
  for (const m of [...ctx.parcours].sort((a, b) => a.number - b.number)) {
    text += `${m.number}. ${m.name}\n`
    text += `  KPI : ${m.kpi}\n`
    text += `  Friction : ${m.friction}\n`
    text += `  Recommandation : ${m.recommendation}\n`
    if (m.cosmosClubAction) text += `  Cosmos Club : ${m.cosmosClubAction}\n`
    text += `  Signaletique associee : ${m.signageItems.length} element(s)\n\n`
  }

  return answer(text, 'rapport', {
    references: ctx.parcours.map(m => m.id),
    suggestions: ['Detailler un moment', 'Signaletique par moment', 'Cosmos Club actions'],
  })
}

function answerSurface(ctx: FullProjectContext): ChatAnswer {
  let text = `Surface par etage :\n\n`
  let totalSurface = 0

  for (const floor of ctx.floors) {
    const floorZones = ctx.zones.filter(z => z.floorId === floor.id)
    const floorSurface = floorZones.reduce((s, z) => {
      return s + (z.surfaceM2 ?? calcArea(z, floor.widthM, floor.heightM))
    }, 0)
    totalSurface += floorSurface
    text += `  ${floor.level} : ${Math.round(floorSurface).toLocaleString('fr-FR')} m2 (${floorZones.length} zones)\n`
  }

  text += `\nSurface totale : ${Math.round(totalSurface).toLocaleString('fr-FR')} m2`

  // Par type d'espace
  const byType = new Map<string, number>()
  for (const z of ctx.zones) {
    const area = z.surfaceM2 ?? 0
    byType.set(z.type, (byType.get(z.type) ?? 0) + area)
  }

  if (byType.size > 0) {
    text += '\n\nPar type d\'espace :\n'
    for (const [type, area] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
      const pct = totalSurface > 0 ? Math.round((area / totalSurface) * 100) : 0
      text += `  ${type} : ${Math.round(area).toLocaleString('fr-FR')} m2 (${pct}%)\n`
    }
  }

  return answer(text, 'info', {
    references: ctx.zones.map(z => z.id),
    suggestions: ['Densite camera par m2', 'Benchmark surface', 'Zones les plus grandes'],
  })
}

function answerRecommendations(ctx: FullProjectContext): ChatAnswer {
  const recs: { priority: 'critique' | 'haute' | 'moyenne'; text: string }[] = []

  // Critique
  if (ctx.score && ctx.score.total < 60) {
    recs.push({ priority: 'critique', text: 'Score securitaire critique — actions correctives urgentes' })
  }
  const criticalBlinds = ctx.blindSpots.filter(b => b.severity === 'critique')
  if (criticalBlinds.length > 0) {
    recs.push({ priority: 'critique', text: `Eliminer ${criticalBlinds.length} angle(s) mort(s) critique(s)` })
  }

  const criticalDoorsNoBadge = ctx.doors.filter(
    d => ['technique', 'backoffice', 'financier'].includes(d.zoneType) && !d.hasBadge
  )
  if (criticalDoorsNoBadge.length > 0) {
    recs.push({ priority: 'critique', text: `${criticalDoorsNoBadge.length} acces zone sensible sans controle badge` })
  }

  // Haute
  if (ctx.transitions.filter(t => t.pmr).length === 0 && ctx.floors.length > 1) {
    recs.push({ priority: 'haute', text: 'Ajouter au moins un acces PMR (ascenseur/rampe)' })
  }

  const exits = ctx.doors.filter(d => d.isExit)
  if (exits.length < 2) {
    recs.push({ priority: 'haute', text: 'Moins de 2 sorties de secours — non-conformite NF S 61-938' })
  }

  if (ctx.signageItems.length === 0 && ctx.volume === 'vol3') {
    recs.push({ priority: 'haute', text: 'Aucune signaletique — lancer le placement automatique' })
  }

  // Moyenne
  if (ctx.pois.length === 0 && ctx.volume === 'vol3') {
    recs.push({ priority: 'moyenne', text: 'Aucun POI defini — configurer les points d\'interet' })
  }
  if (ctx.parcours.length === 0 && ctx.volume === 'vol3') {
    recs.push({ priority: 'moyenne', text: 'Generer les 7 moments cles du parcours client' })
  }
  if (ctx.cameras.length < 5) {
    recs.push({ priority: 'moyenne', text: 'Considerer un placement automatique de cameras' })
  }

  if (recs.length === 0) {
    recs.push({ priority: 'moyenne', text: 'Tout semble en ordre. Consultez le benchmark pour des pistes d\'amelioration.' })
  }

  // Trier par priorite
  const priorityOrder: Record<string, number> = { critique: 0, haute: 1, moyenne: 2 }
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  let text = `Recommandations prioritaires\n\n`
  for (const [i, rec] of recs.entries()) {
    const tag = rec.priority === 'critique' ? '[CRITIQUE]' : rec.priority === 'haute' ? '[HAUTE]' : '[MOYENNE]'
    text += `${i + 1}. ${tag} ${rec.text}\n`
  }

  const hasCritique = recs.some(r => r.priority === 'critique')

  return answer(text, hasCritique ? 'alerte' : 'info', {
    suggestions: ['Detailler une recommandation', 'Lancer analyse complete', 'Exporter rapport'],
  })
}

function answerCameraModels(q: string): ChatAnswer {
  const specs = Object.entries(CAMERA_SPECS)

  // Chercher un modele specifique
  const found = specs.find(([k]) => q.includes(k.toLowerCase())) ??
    specs.find(([, v]) => q.includes(v.brand.toLowerCase()))

  if (found) {
    const [model, spec] = found
    return answer(
      `${model} (${spec.brand})\n\n| Spec | Valeur |\n|------|--------|\n| Type | ${spec.type} |\n| Resolution | ${spec.resolution} |\n| FOV | ${spec.fov}deg |\n| Portee | ${spec.rangeM}m |\n| Protection | ${spec.ip} |\n| Norme | ${spec.norm} |\n| Prix | ${spec.priceFcfa.toLocaleString('fr-FR')} FCFA |`,
      'info',
      { references: [spec.norm], suggestions: ['Comparer avec un autre modele', 'Placer cette camera', 'Zones recommandees'] }
    )
  }

  // Catalogue complet
  let text = `Catalogue cameras\n\n`
  text += `| Modele | Marque | Resolution | FOV | Portee | Prix FCFA |\n`
  text += `|--------|--------|-----------|-----|--------|----------|\n`
  for (const [model, spec] of specs) {
    text += `| ${model} | ${spec.brand} | ${spec.resolution} | ${spec.fov}deg | ${spec.rangeM}m | ${spec.priceFcfa.toLocaleString('fr-FR')} |\n`
  }

  return answer(text, 'info', {
    references: ['EN 62676'],
    suggestions: ['Detail d\'un modele', 'Recommandation par zone', 'Comparer deux modeles'],
  })
}

function answerBudget(ctx: FullProjectContext): ChatAnswer {
  const capex = computeCapex(ctx.cameras, ctx.doors, ctx.signageItems)

  let text = `Budget CAPEX equipements\n\n`
  text += `| Categorie | Montant FCFA |\n|-----------|-------------|\n`
  text += `| Cameras (${ctx.cameras.length}) | ${capex.cameras.toLocaleString('fr-FR')} |\n`
  text += `| Portes/Acces (${ctx.doors.length}) | ${capex.doors.toLocaleString('fr-FR')} |\n`
  text += `| Signaletique (${ctx.signageItems.length}) | ${capex.signage.toLocaleString('fr-FR')} |\n`
  text += `| **TOTAL** | **${capex.total.toLocaleString('fr-FR')}** |\n`

  const totalSurface = ctx.zones.reduce((s, z) => s + (z.surfaceM2 ?? 0), 0)
  if (totalSurface > 0) {
    const costPerM2 = Math.round(capex.total / totalSurface)
    text += `\nCout au m2 : ${costPerM2.toLocaleString('fr-FR')} FCFA/m2 (sur ${totalSurface.toLocaleString('fr-FR')} m2)`
  }

  return answer(text, 'info', {
    suggestions: ['Detail par fabricant', 'Optimiser le budget', 'Exporter en Excel'],
  })
}

function answerSignaletics(ctx: FullProjectContext, floor: Floor | undefined): ChatAnswer {
  const items = floor ? ctx.signageItems.filter(s => s.floorId === floor.id) : ctx.signageItems
  const floorLabel = floor ? ` (${floor.level})` : ''

  let text = `${items.length} element(s) de signaletique${floorLabel}\n\n`

  const byType = new Map<string, number>()
  for (const s of items) byType.set(s.type, (byType.get(s.type) ?? 0) + 1)

  text += `| Type | Qte | Norme |\n|------|-----|-------|\n`
  for (const [type, count] of byType) {
    const cat = SIGNAGE_CATALOG[type as keyof typeof SIGNAGE_CATALOG]
    text += `| ${cat?.name ?? type} | ${count} | ${cat?.norm ?? '—'} |\n`
  }

  const capexSig = items.reduce((s, i) => s + i.capexFcfa, 0)
  text += `\nCAPEX signaletique : ${capexSig.toLocaleString('fr-FR')} FCFA`

  const autoCount = items.filter(s => s.autoPlaced).length
  if (autoCount > 0) text += `\n${autoCount} element(s) place(s) automatiquement par Proph3t.`

  // Ruptures visuelles
  if (floor) {
    const breaks = detectVisualBreaks(ctx.signageItems, floor.id, floor.widthM, floor.heightM)
    if (breaks.length > 0) {
      text += `\n\nRuptures de continuite visuelle : ${breaks.length}`
      for (const b of breaks.slice(0, 3)) {
        text += `\n  - ${b.from.ref} -> ${b.to.ref} : ${b.distanceM}m (max: ${b.maxAllowedM}m)`
      }
    }
  }

  return answer(text, 'info', {
    references: ['NF X 08-003', 'ISO 7010', 'NF EN 60598-2-22'],
    suggestions: ['Optimiser le placement', 'Detecter les ruptures visuelles', 'Calculer les specs'],
  })
}

function answerSignageCalc(q: string): ChatAnswer {
  const distMatch = q.match(/(\d+(?:[.,]\d+)?)\s*m/)
  const dist = distMatch ? parseFloat(distMatch[1].replace(',', '.')) : 10

  // Formule D / 0.2 (equivalent a D * 1000 / 200)
  const textHeightMm = Math.ceil(dist / 0.2)

  // Hauteur de pose : H_regard (1.60m) + D * tan(15deg)
  const poseHeight = 1.60 + dist * 0.268
  const clampedPose = Math.max(2.20, Math.min(poseHeight, 4.50))

  let text = `Calcul signaletique (NF X 08-003)\n\n`
  text += `Distance de lecture : ${dist}m\n\n`
  text += `Formule D / 0.2 :\n`
  text += `  Taille texte min = ${dist} / 0.2 = ${textHeightMm}mm\n\n`
  text += `Hauteur de pose :\n`
  text += `  H_pose = 1.60 + (${dist} x 0.268) = ${poseHeight.toFixed(2)}m\n`
  text += `  Recommandee : ${clampedPose.toFixed(2)}m (min 2.20m, max plafond - 0.30m)\n\n`
  text += `Tableau de reference :\n`
  text += `| Distance | Taille min | Pose |\n|----------|------------|------|\n`
  for (const d of [5, 10, 15, 20, 30]) {
    const txt = Math.ceil(d / 0.2)
    const pose = Math.max(2.20, Math.min(1.60 + d * 0.268, 4.50))
    text += `| ${d}m | ${txt}mm | ${pose.toFixed(2)}m |\n`
  }

  return answer(text, 'info', {
    references: ['NF X 08-003', 'ISO 9241-303'],
    suggestions: ['Calculer pour une autre distance', 'Verifier tous les panneaux', 'Appliquer au panneau selectionne'],
  })
}

function answerFloors(ctx: FullProjectContext): ChatAnswer {
  let text = `${ctx.floors.length} etage(s)\n\n`
  text += `| Niveau | Dimensions | Zones | Cameras | Portes | POI | Signale. |\n`
  text += `|--------|-----------|-------|---------|--------|-----|----------|\n`

  for (const f of ctx.floors.sort((a, b) => b.order - a.order)) {
    const zCount = ctx.zones.filter(z => z.floorId === f.id).length
    const cCount = ctx.cameras.filter(c => c.floorId === f.id).length
    const dCount = ctx.doors.filter(d => d.floorId === f.id).length
    const pCount = ctx.pois.filter(p => p.floorId === f.id).length
    const sCount = ctx.signageItems.filter(s => s.floorId === f.id).length
    text += `| ${f.level} | ${f.widthM}x${f.heightM}m | ${zCount} | ${cCount} | ${dCount} | ${pCount} | ${sCount} |\n`
  }

  // Couverture par etage
  text += '\nCouverture par etage :\n'
  for (const f of ctx.floors) {
    const floorZones = ctx.zones.filter(z => z.floorId === f.id)
    const floorCams = ctx.cameras.filter(c => c.floorId === f.id)
    if (floorZones.length > 0) {
      const cov = computeFloorCoverage(floorZones, floorCams, f.id, f.widthM, f.heightM, 20)
      text += `  - ${f.level} : ${cov}%\n`
    }
  }

  return answer(text, 'info', {
    references: ctx.floors.map(f => f.id),
    suggestions: ['Ajouter un etage', 'Vue coupe verticale', 'Transitions entre etages'],
  })
}

function answerWayfinding(ctx: FullProjectContext): ChatAnswer {
  const poiCount = ctx.pois.length
  const transCount = ctx.transitions.length
  const pmrTrans = ctx.transitions.filter(t => t.pmr).length

  let text = `Wayfinding — ${poiCount} POI, ${transCount} transitions\n\n`
  text += `Transitions inter-etages :\n`

  const byType = new Map<string, number>()
  for (const t of ctx.transitions) byType.set(t.type, (byType.get(t.type) ?? 0) + 1)

  text += `| Type | Qte | PMR |\n|------|-----|-----|\n`
  for (const [type, count] of byType) {
    const pmrCount = ctx.transitions.filter(t => t.type === type && t.pmr).length
    text += `| ${type} | ${count} | ${pmrCount} |\n`
  }

  text += `\nAccessibilite PMR : ${pmrTrans}/${transCount} transitions`

  if (pmrTrans === 0) {
    text += `\n\nAlerte : aucune transition PMR. Non-conforme Loi 2005-102.`
  }

  return answer(text, pmrTrans === 0 ? 'alerte' : 'info', {
    references: ctx.pois.map(p => p.id),
    suggestions: ['Calculer un itineraire', 'Itineraire PMR', 'Exporter wayfinding'],
  })
}

function answerPMR(ctx: FullProjectContext): ChatAnswer {
  const pmrPois = ctx.pois.filter(p => p.pmr)
  const pmrTransitions = ctx.transitions.filter(t => t.pmr)
  const pmrSignage = ctx.signageItems.filter(s => s.type === 'pictogramme_pmr')
  const ramps = ctx.transitions.filter(t => t.type === 'rampe_pmr')
  const elevators = ctx.transitions.filter(t => t.type === 'ascenseur')

  let text = `Audit accessibilite PMR\n\n`
  text += `| Critere | Valeur |\n|---------|--------|\n`
  text += `| POI accessibles PMR | ${pmrPois.length}/${ctx.pois.length} |\n`
  text += `| Transitions PMR | ${pmrTransitions.length}/${ctx.transitions.length} |\n`
  text += `| Ascenseurs | ${elevators.length} |\n`
  text += `| Rampes PMR | ${ramps.length} |\n`
  text += `| Pictogrammes PMR | ${pmrSignage.length} |\n`

  const issues: string[] = []
  if (pmrTransitions.length === 0) issues.push('Aucune transition PMR (ascenseur/rampe). Non-conforme Loi 2005-102.')
  if (pmrSignage.length === 0) issues.push('Aucun pictogramme PMR installe.')

  for (const floor of ctx.floors) {
    const hasPmr = ctx.transitions.some(
      t => t.pmr && (t.fromFloor === floor.level || t.toFloor === floor.level)
    )
    if (!hasPmr && ctx.floors.length > 1) {
      issues.push(`Etage ${floor.level} sans acces PMR.`)
    }
  }

  if (issues.length > 0) {
    text += '\n\nProblemes :\n'
    for (const issue of issues) {
      text += `- ${issue}\n`
    }
  } else {
    text += '\n\nAudit PMR conforme.'
  }

  return answer(text, issues.length > 0 ? 'alerte' : 'info', {
    references: [...pmrPois.map(p => p.id), ...pmrTransitions.map(t => t.id)],
    suggestions: ['Ajouter une rampe PMR', 'Itineraire PMR', 'Signaletique PMR'],
  })
}

function answerMemory(ctx: FullProjectContext): ChatAnswer {
  if (!ctx.memory) {
    return answer(
      'Aucune memoire projet disponible. C\'est votre premiere session.',
      'info',
      { suggestions: ['Commencer l\'analyse', 'Placer des cameras'] }
    )
  }

  const narrative = ctx.memory.proph3tNarrative || generateMemoryNarrative(ctx.memory)

  let text = `Memoire Proph3t\n\n${narrative}\n\n`
  text += `Sessions : ${ctx.memory.totalSessions}\n`
  text += `Derniere activite : ${ctx.memory.lastActivity}\n`
  text += `Decisions cles : ${ctx.memory.keyDecisions.length}\n`
  text += `Alertes non resolues : ${ctx.memory.unresolvedAlerts.length}`

  if (ctx.memory.progressMetrics.coverageEvolution.length >= 2) {
    const evol = ctx.memory.progressMetrics.coverageEvolution
    const first = evol[0]
    const last = evol[evol.length - 1]
    text += `\n\nEvolution couverture : ${first.coverage}% -> ${last.coverage}%`
  }

  return answer(text, 'info', {
    references: ctx.memory.keyDecisions.map(d => d.entityId),
    suggestions: ['Historique detaille', 'Alertes non resolues', 'Evolution couverture'],
  })
}

function answerBenchmark(ctx: FullProjectContext): ChatAnswer {
  const benchmarks = MALL_BENCHMARKS.filter(b => b.classe === 'A').slice(0, 6)
  let text = `Benchmark vs malls africains Classe A\n\n`

  const totalSurface = ctx.zones.reduce((s, z) => s + (z.surfaceM2 ?? 0), 0)
  const cameraDensity = totalSurface > 0 ? (ctx.cameras.length / totalSurface) * 100 : 0
  const signageDensity = totalSurface > 0 ? (ctx.signageItems.length / totalSurface) * 100 : 0

  text += `| Mall | Ville | Cam/100m2 | Sign/100m2 | Score |\n|------|-------|-----------|------------|-------|\n`
  for (const b of benchmarks) {
    text += `| ${b.name} | ${b.city} | ${b.cameraDensityPer100m2} | ${b.signageDensityPer100m2} | ${b.securityScore}/100 |\n`
  }
  text += `| **Cosmos Angre** | **Abidjan** | **${cameraDensity.toFixed(2)}** | **${signageDensity.toFixed(2)}** | **${ctx.score?.total ?? '—'}/100** |\n`

  const avgDensity = benchmarks.reduce((s, b) => s + b.cameraDensityPer100m2, 0) / benchmarks.length
  const avgScore = benchmarks.reduce((s, b) => s + b.securityScore, 0) / benchmarks.length

  text += `\nMoyenne Classe A : ${avgDensity.toFixed(2)} cam/100m2, score ${avgScore.toFixed(0)}/100`

  if (cameraDensity < avgDensity * 0.7) {
    text += `\n\nAlerte : densite camera ${Math.round((1 - cameraDensity / avgDensity) * 100)}% sous la moyenne Classe A.`
  }

  return answer(text, 'rapport', {
    suggestions: ['Detail par pays', 'Aligner sur Classe A', 'Exporter benchmark'],
  })
}

function answerHelp(ctx: FullProjectContext): ChatAnswer {
  const floorCount = ctx.floors.length
  const camCount = ctx.cameras.length
  const doorCount = ctx.doors.length
  const poiCount = ctx.pois.length
  const sigCount = ctx.signageItems.length

  let text = `Je suis Proph3t, votre expert vivant. `
  text += `Votre projet compte ${floorCount} etage(s), ${camCount} camera(s), ${doorCount} porte(s), ${poiCount} POI et ${sigCount} elements de signaletique.\n\n`
  text += `Commandes disponibles :\n`
  text += `- "score" — Score APSAD R82\n`
  text += `- "cameras" / "couverture" — Etat des cameras\n`
  text += `- "zones" — Inventaire des zones\n`
  text += `- "portes" / "badge" / "biometrie" — Controle d'acces\n`
  text += `- "angles morts" — Zones non couvertes\n`
  text += `- "evacuation" / "incendie" — Simulation NF S 61-938\n`
  text += `- "signaletique" — Inventaire ISO 7010\n`
  text += `- "hauteur" / "taille texte" — Calcul D/0.2\n`
  text += `- "parcours" — 7 moments cles\n`
  text += `- "wayfinding" / "itineraire" — Navigation\n`
  text += `- "pmr" / "accessibilite" — Audit PMR\n`
  text += `- "surface" / "superficie" — Surfaces par zone\n`
  text += `- "benchmark" — Comparaison malls africains\n`
  text += `- "budget" / "capex" — Budget complet\n`
  text += `- "memoire" / "historique" — Memoire projet\n`
  text += `- "wisenet" / "hikvision" / "dahua" — Catalogue cameras\n`
  text += `- "distance entre A et B" — Calcul de distance\n`
  text += `- "si j'ajoute X cameras" — Simulation\n`
  text += `- "avant/apres" — Comparaison actuel vs cible\n`
  text += `- "recommandations" — Actions prioritaires\n`
  text += `- Nom de zone — Fiche detaillee\n`

  return answer(text, 'aide', {
    suggestions: ['Quel est le score de securite ?', 'Montre les angles morts', 'Rapport signaletique', 'Benchmark malls'],
  })
}
