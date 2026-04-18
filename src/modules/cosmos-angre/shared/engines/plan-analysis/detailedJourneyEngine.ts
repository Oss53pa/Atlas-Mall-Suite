// ═══ DETAILED JOURNEY ENGINE ═══
// Calcule un parcours client DÉTAILLÉ à partir du plan réel :
// 1. Extrait les zones marchandes depuis spaces (commerce / restauration / services…)
// 2. Construit un graphe de navigation depuis les centroïdes + circulations
// 3. Pour chaque persona : sélectionne les zones attractives → A* entre chaque
// 4. Retourne les waypoints (coordonnées en mètres) pour affichage sur le plan

import { simulateJourney, type JourneyStep } from '../../engines/parcoursAgentEngine'
import { kmeans } from '../algorithms/kmeans'
import { useSpaceCorrectionsStore, type SpaceCategory } from '../../stores/spaceCorrectionsStore'

export interface Space {
  id: string
  label: string
  type?: string
  areaSqm: number
  polygon: [number, number][]
  floorId?: string
}

export interface DetailedPersona {
  id: string
  name: string
  /** Priorités (poids 0-1) par catégorie. */
  affinities: {
    mode: number
    restauration: number
    services: number
    loisirs: number
    alimentaire: number
    beaute: number
    enfants: number
  }
  walkingSpeedMps: number
  /** Durée moyenne par arrêt (minutes). */
  dwellMinutes: number
  /** Nombre d'arrêts typiques. */
  maxStops: number
  fluxPct: number
}

export interface DetailedJourney {
  personaId: string
  personaName: string
  /** Étapes du parcours avec coordonnées métriques. */
  steps: Array<{
    spaceId: string
    label: string
    category: string
    x: number
    y: number
    order: number
    dwellMinutes: number
    reason: string
  }>
  /** Waypoints A* entre les étapes (path complet en coordonnées mètres). */
  waypoints: Array<{ x: number; y: number }>
  /** Longueur totale du parcours (mètres). */
  totalDistanceM: number
  /** Durée totale (minutes) = marche + dwells. */
  totalDurationMin: number
  /** Score qualité du parcours (0-100). */
  qualityScore: number
  /** Nb de zones attractives visitées vs total disponibles. */
  coverage: { visited: number; totalAttractive: number }
}

export interface DetailedJourneyResult {
  journeys: DetailedJourney[]
  personas: DetailedPersona[]
  /** Stats agrégées. */
  aggregate: {
    avgDistanceM: number
    avgDurationMin: number
    avgStops: number
    mostVisitedSpaces: Array<{ spaceId: string; label: string; visits: number }>
    leastVisitedSpaces: Array<{ spaceId: string; label: string; visits: number }>
  }
}

// ─── Personas profils par défaut (Afrique de l'Ouest retail) ───

export const DEFAULT_PERSONAS: DetailedPersona[] = [
  {
    id: 'persona-famille',
    name: 'Famille week-end',
    affinities: { mode: 0.4, restauration: 0.8, services: 0.3, loisirs: 0.7, alimentaire: 0.5, beaute: 0.2, enfants: 0.9 },
    walkingSpeedMps: 0.9,
    dwellMinutes: 15,
    maxStops: 6,
    fluxPct: 28,
  },
  {
    id: 'persona-pro',
    name: 'Pro déjeuner / course rapide',
    affinities: { mode: 0.2, restauration: 0.9, services: 0.7, loisirs: 0.1, alimentaire: 0.8, beaute: 0.1, enfants: 0.0 },
    walkingSpeedMps: 1.5,
    dwellMinutes: 8,
    maxStops: 3,
    fluxPct: 22,
  },
  {
    id: 'persona-shopping',
    name: 'Shopping mode',
    affinities: { mode: 0.95, restauration: 0.4, services: 0.3, loisirs: 0.3, alimentaire: 0.1, beaute: 0.8, enfants: 0.1 },
    walkingSpeedMps: 1.0,
    dwellMinutes: 20,
    maxStops: 7,
    fluxPct: 20,
  },
  {
    id: 'persona-soir',
    name: 'Sortie soir / loisirs',
    affinities: { mode: 0.5, restauration: 0.9, services: 0.2, loisirs: 0.95, alimentaire: 0.2, beaute: 0.3, enfants: 0.2 },
    walkingSpeedMps: 1.1,
    dwellMinutes: 25,
    maxStops: 4,
    fluxPct: 18,
  },
  {
    id: 'persona-senior',
    name: 'Senior matinée',
    affinities: { mode: 0.3, restauration: 0.4, services: 0.8, loisirs: 0.2, alimentaire: 0.7, beaute: 0.3, enfants: 0.1 },
    walkingSpeedMps: 0.6,
    dwellMinutes: 18,
    maxStops: 4,
    fluxPct: 12,
  },
]

// ─── Catégorisation des spaces ────────────────────────────

export type ResolvedCategory = keyof DetailedPersona['affinities'] | 'circulation' | 'service-tech' | 'other'

/** Version exportée : utilise les corrections manuelles puis fallback regex. */
export function resolveSpaceCategory(space: Space): ResolvedCategory {
  return categorize(space)
}

/** Version exportée : libellé corrigé si présent. */
export function resolveSpaceLabel(space: Space): string {
  return resolveLabel(space)
}

function categorize(space: Space): ResolvedCategory {
  // PRIORITÉ 1 : correction manuelle stockée
  try {
    const manual = useSpaceCorrectionsStore.getState().getCategory(space.id)
    if (manual) return manual as SpaceCategory
  } catch {
    // store pas initialisé (contexte SSR / worker) → fallback regex
  }

  const t = String(space.type ?? '').toLowerCase()
  const label = space.label.toLowerCase()
  if (/mode|vetement|chaussure|bijou|accessoir/i.test(t + ' ' + label)) return 'mode'
  if (/restaur|cafe|bar|snack|fastfood|food|cuisine|pizza/i.test(t + ' ' + label)) return 'restauration'
  if (/service|banque|pressing|poste|atm/i.test(t + ' ' + label)) return 'services'
  if (/loisir|cinema|gym|sport|bowling|arcade|jeu/i.test(t + ' ' + label)) return 'loisirs'
  if (/aliment|supermarche|carrefour|shoprite|marina/i.test(t + ' ' + label)) return 'alimentaire'
  if (/beaute|cosmet|parfum|coiffeur|spa/i.test(t + ' ' + label)) return 'beaute'
  if (/enfant|kids|jouet|bebe/i.test(t + ' ' + label)) return 'enfants'
  if (/circul|couloir|hall|mail|passage/i.test(t)) return 'circulation'
  if (/technique|local|wc|sanitaire|electr|stockage|reserve/i.test(t + ' ' + label)) return 'service-tech'
  return 'other'
}

/** Résout le libellé d'affichage (custom > auto). */
function resolveLabel(space: Space): string {
  try {
    return useSpaceCorrectionsStore.getState().resolveLabel(space.id, space.label)
  } catch {
    return space.label
  }
}

/** true si l'utilisateur a marqué ce space comme exclu de l'analyse. */
function isManuallyExcluded(space: Space): boolean {
  try {
    return useSpaceCorrectionsStore.getState().isExcluded(space.id)
  } catch {
    return false
  }
}

function centroidOf(polygon: [number, number][]): { x: number; y: number } {
  if (polygon.length === 0) return { x: 0, y: 0 }
  let cx = 0, cy = 0
  for (const [x, y] of polygon) { cx += x; cy += y }
  return { x: cx / polygon.length, y: cy / polygon.length }
}

// ─── Scoring d'attractivité pour un persona ─────────────

function scoreSpaceForPersona(space: Space, persona: DetailedPersona): number {
  const cat = categorize(space)
  if (cat === 'circulation' || cat === 'service-tech' || cat === 'other') return 0
  const affinity = persona.affinities[cat] ?? 0
  // Bonus taille : les zones plus grandes sont souvent les ancres
  const sizeBonus = Math.min(1, space.areaSqm / 200) * 0.3
  return affinity * 0.7 + sizeBonus
}

// ─── Main ─────────────────────────────────────────────────

export interface DetailedJourneyInput {
  spaces: Space[]
  planWidth: number
  planHeight: number
  /** Entrée principale (sinon auto-détectée au bord gauche du plan). */
  entrance?: { x: number; y: number }
  /** Sortie(s) (sinon = entrée). */
  exits?: Array<{ x: number; y: number }>
  personas?: DetailedPersona[]
  /** Floor actif (filtre les spaces). */
  floorId?: string
}

export function computeDetailedJourneys(input: DetailedJourneyInput): DetailedJourneyResult {
  const personas = input.personas ?? DEFAULT_PERSONAS
  const floorSpaces = input.floorId
    ? input.spaces.filter(s => !s.floorId || s.floorId === input.floorId)
    : input.spaces

  // Détermine entrée et sortie
  const entrance = input.entrance ?? autoDetectEntrance(floorSpaces, input.planWidth, input.planHeight)
  const exit = (input.exits && input.exits[0]) ?? entrance

  // Spaces franchissables (pour A*) = circulations + commerces (on traverse entre)
  const walkableSpaces = floorSpaces
    .filter(s => {
      const cat = categorize(s)
      if (cat === 'service-tech') return false // exclut techniques
      if (isManuallyExcluded(s)) return false  // exclus manuellement
      return true
    })
    .map(s => ({ id: s.id, polygon: s.polygon }))

  const journeys: DetailedJourney[] = []
  const visitCounter = new Map<string, { label: string; visits: number }>()

  for (const persona of personas) {
    // 1. Score chaque space pour ce persona (exclut les spaces marqués exclus)
    const scored = floorSpaces
      .filter(s => !isManuallyExcluded(s))
      .map(s => ({ space: s, score: scoreSpaceForPersona(s, persona) }))
      .filter(x => x.score > 0.2) // seuil d'attractivité
      .sort((a, b) => b.score - a.score)

    // 2. Sélectionne les top N en évitant les doublons de catégorie consécutifs
    const selected: typeof scored = []
    const catsSeen = new Map<string, number>()
    for (const candidate of scored) {
      if (selected.length >= persona.maxStops) break
      const cat = categorize(candidate.space)
      const count = catsSeen.get(cat) ?? 0
      // Limite : max 2 arrêts par catégorie pour diversité
      if (count >= 2) continue
      selected.push(candidate)
      catsSeen.set(cat, count + 1)
    }

    if (selected.length === 0) {
      journeys.push({
        personaId: persona.id, personaName: persona.name,
        steps: [], waypoints: [],
        totalDistanceM: 0, totalDurationMin: 0,
        qualityScore: 0,
        coverage: { visited: 0, totalAttractive: 0 },
      })
      continue
    }

    // 3. Ordonnance : entrée → mode/alimentaire d'abord → restauration au milieu → loisirs/beauté à la fin
    const priority = (cat: string) => {
      if (cat === 'alimentaire' || cat === 'mode') return 1
      if (cat === 'services' || cat === 'beaute') return 2
      if (cat === 'enfants' || cat === 'loisirs') return 3
      if (cat === 'restauration') return 4
      return 5
    }
    selected.sort((a, b) => priority(categorize(a.space)) - priority(categorize(b.space)))

    // 4. Construit les waypoints : entrée → chaque centroïde → sortie
    const stops: Array<{ label: string; x: number; y: number; dwellMinutes: number; spaceId: string; category: string; reason: string }> = []
    for (const s of selected) {
      const c = centroidOf(s.space.polygon)
      const cat = categorize(s.space)
      const displayLabel = resolveLabel(s.space)
      stops.push({
        spaceId: s.space.id,
        label: displayLabel,
        x: c.x, y: c.y,
        dwellMinutes: persona.dwellMinutes,
        category: String(cat),
        reason: `Affinité ${cat} ${((persona.affinities[cat as keyof DetailedPersona['affinities']] ?? 0) * 100).toFixed(0)}% · surface ${s.space.areaSqm.toFixed(0)}m²`,
      })
      // Compteur de visites agrégé
      const vc = visitCounter.get(s.space.id) ?? { label: displayLabel, visits: 0 }
      vc.visits++
      visitCounter.set(s.space.id, vc)
    }

    // 5. A* entre chaque arrêt pour calculer le chemin réel (waypoints + distance)
    const sim = simulateJourney({
      walkable: walkableSpaces,
      entrance,
      exit,
      waypoints: stops as JourneyStep[],
      gridStepM: 2,
      walkingSpeedMps: persona.walkingSpeedMps,
    })

    if (!sim) {
      // Fallback : ligne droite si A* échoue
      const path: Array<{ x: number; y: number }> = [entrance, ...stops.map(s => ({ x: s.x, y: s.y })), exit]
      let dist = 0
      for (let i = 1; i < path.length; i++) {
        dist += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
      }
      journeys.push({
        personaId: persona.id,
        personaName: persona.name,
        steps: stops.map((s, i) => ({ ...s, order: i + 1 })),
        waypoints: path,
        totalDistanceM: dist,
        totalDurationMin: dist / persona.walkingSpeedMps / 60 + selected.length * persona.dwellMinutes,
        qualityScore: 50,
        coverage: { visited: selected.length, totalAttractive: scored.length },
      })
      continue
    }

    // 6. Score qualité : couverture × diversité × efficacité
    const coveragePct = selected.length / Math.max(1, scored.length)
    const diversityPct = catsSeen.size / 7
    const efficiency = Math.min(1, 1000 / (sim.totalLengthM + 1)) // moins long = mieux
    const qualityScore = Math.round((coveragePct * 0.4 + diversityPct * 0.3 + efficiency * 0.3) * 100)

    journeys.push({
      personaId: persona.id,
      personaName: persona.name,
      steps: stops.map((s, i) => ({ ...s, order: i + 1 })),
      waypoints: sim.path,
      totalDistanceM: sim.totalLengthM,
      totalDurationMin: sim.totalMinutes,
      qualityScore,
      coverage: { visited: selected.length, totalAttractive: scored.length },
    })
  }

  // ─── Stats agrégées ──────────────────────────────────
  const allVisited = Array.from(visitCounter.entries())
    .map(([id, v]) => ({ spaceId: id, label: v.label, visits: v.visits }))
    .sort((a, b) => b.visits - a.visits)

  const attractiveSpaces = floorSpaces.filter(s => {
    if (isManuallyExcluded(s)) return false
    const c = categorize(s)
    return ['mode', 'restauration', 'services', 'loisirs', 'alimentaire', 'beaute', 'enfants'].includes(c)
  })
  const unvisited = attractiveSpaces
    .filter(s => !visitCounter.has(s.id))
    .map(s => ({ spaceId: s.id, label: resolveLabel(s), visits: 0 }))

  const totalDistances = journeys.reduce((s, j) => s + j.totalDistanceM, 0)
  const totalDurations = journeys.reduce((s, j) => s + j.totalDurationMin, 0)
  const totalStops = journeys.reduce((s, j) => s + j.steps.length, 0)

  return {
    journeys,
    personas,
    aggregate: {
      avgDistanceM: journeys.length > 0 ? totalDistances / journeys.length : 0,
      avgDurationMin: journeys.length > 0 ? totalDurations / journeys.length : 0,
      avgStops: journeys.length > 0 ? totalStops / journeys.length : 0,
      mostVisitedSpaces: allVisited.slice(0, 10),
      leastVisitedSpaces: unvisited.slice(0, 10),
    },
  }
}

// ─── Auto-détection de l'entrée si non fournie ──────────

function autoDetectEntrance(
  spaces: Space[],
  planWidth: number,
  planHeight: number,
): { x: number; y: number } {
  // Cherche un space "hall", "mail", "entrée"
  const hall = spaces.find(s => /entr[ée]e|hall|mail|accueil/i.test(s.label + ' ' + (s.type ?? '')))
  if (hall) {
    return centroidOf(hall.polygon)
  }
  // Sinon : bord gauche milieu
  return { x: planWidth * 0.05, y: planHeight * 0.5 }
}
