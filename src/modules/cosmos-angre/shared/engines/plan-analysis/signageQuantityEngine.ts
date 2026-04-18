// ═══ SIGNAGE QUANTITY ENGINE ═══
//
// Calcule automatiquement les quantités de chaque type de signalétique
// (du catalog 30 types) à partir de l'analyse PROPH3T du plan :
//   - nombre de nœuds de décision (squelette)
//   - nombre d'entrées / sorties / escalators / ascenseurs / sanitaires
//   - métrage total de promenade + couloirs d'évacuation
//   - surface par niveau
//   - nombre de locaux commerciaux
//
// Pour chaque type du SIGNAGE_CATALOG, applique sa QuantityRule et produit
// un SignagePlan complet avec coordonnées, modèle, priorité, prix FCFA.

import {
  SIGNAGE_CATALOG, SIGNAGE_CODES_BY_CATEGORY,
  type SignageTypeMeta, type SignageCategoryKey, type QuantityRule,
  type SignageModel,
} from '../../proph3t/libraries/signageCatalog'
import type { SpaceTypeKey, FloorLevelKey } from '../../proph3t/libraries/spaceTypeLibrary'
import type { FlowAnalysisResult, FlowEntryExit } from './flowPathEngine'

// ─── Input du moteur ──────────────────────────────────

export interface SpaceWithType {
  id: string
  label: string
  type: SpaceTypeKey
  areaSqm: number
  polygon: [number, number][]
  floorId?: string
  floorLevel?: FloorLevelKey
}

export interface QuantityInput {
  flow: FlowAnalysisResult
  spaces: SpaceWithType[]
  planBounds: { width: number; height: number }
  /** Surface totale du plan en m² (calculée depuis les espaces si non fournie). */
  totalAreaSqm?: number
  /** Niveau analysé. */
  floorLevel?: FloorLevelKey
}

// ─── Output ────────────────────────────────────────

export interface GeneratedPanel {
  /** id unique dans le plan final. */
  id: string
  /** code du catalog (ex: DIR-S, SEC-IS). */
  code: string
  /** sous-catégorie / libellé affiché. */
  label: string
  /** position monde en mètres. */
  x: number
  y: number
  /** hauteur de pose en cm. */
  heightCm: number
  /** orientation en degrés (0 = +X). */
  orientationDeg?: number
  /** contenu textuel (message imprimé). */
  content: string
  /** modèle (statique / électronique / lumineux). */
  model: SignageModel
  /** niveau d'étage. */
  floorLevel?: FloorLevelKey
  /** floorId DXF. */
  floorId?: string
  /** priorité P1/P2/P3. */
  priority: 'P1' | 'P2' | 'P3'
  /** justification du placement. */
  reason: string
  /** normes applicables. */
  standards: string[]
  /** prix unitaire indicatif FCFA. */
  priceFcfa: number
  /** zone visuelle (rayon visibilité estimée, m). */
  visibilityRadiusM: number
  /** indique si obligation ERP. */
  erpRequired: boolean
}

export interface SignageCoverageByCategory {
  category: SignageCategoryKey
  count: number
  totalFcfa: number
  p1Count: number
  p2Count: number
  p3Count: number
  erpCount: number
}

export interface QuantityPlan {
  panels: GeneratedPanel[]
  byCode: Record<string, number>
  byCategory: SignageCoverageByCategory[]
  totalPanels: number
  totalFcfa: number
  p1Count: number
  p2Count: number
  p3Count: number
  erpCount: number
  coverageScore: number // 0..100
  justifications: string[]
}

// ─── Helpers comptage depuis le plan ────────────────

interface CountsFromPlan {
  decisionNodes: number
  entrances: number
  exits: number
  elevators: number
  escalators: number
  stairs: number
  wcBlocks: number
  locals: number
  parkings: number
  vehicleAccesses: number
  evacuationPathLengthM: number
  mainPromenadeLengthM: number
  totalAreaSqm: number
}

function countsFromPlan(input: QuantityInput): CountsFromPlan {
  const flow = input.flow
  const spaces = input.spaces

  const elevators = spaces.filter(s => s.type === 'ascenseur').length
  const escalators = spaces.filter(s => s.type === 'escalator').length
  const stairs = spaces.filter(s => s.type === 'escalier_fixe').length
  const wcBlocks = spaces.filter(s => s.type === 'sanitaires').length
  const locals = spaces.filter(s =>
    s.type === 'local_commerce' || s.type === 'restauration' ||
    s.type === 'loisirs' || s.type === 'services' ||
    s.type === 'grande_surface' || s.type === 'kiosque',
  ).length
  const parkings = spaces.filter(s => s.type === 'parking_vehicule' || s.type === 'parking_moto').length
  const vehicleAccesses = spaces.filter(s =>
    s.type === 'entree_parking' || s.type === 'exterieur_voirie',
  ).length
  const evacuationPathLengthM = flow.paths.reduce((sum, p) => sum + p.distanceM, 0)
  const promenadeSpaces = spaces.filter(s => s.type === 'promenade')
  const mainPromenadeLengthM = promenadeSpaces.reduce((sum, s) => {
    // approx : côté le plus long de la bbox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of s.polygon) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
    return sum + Math.max(maxX - minX, maxY - minY)
  }, 0)
  const totalAreaSqm = input.totalAreaSqm ?? spaces.reduce((s, sp) => s + sp.areaSqm, 0)

  return {
    decisionNodes: flow.summary.decisionNodes,
    entrances: flow.summary.entrancesCount,
    exits: flow.summary.exitsCount,
    elevators, escalators, stairs, wcBlocks, locals, parkings, vehicleAccesses,
    evacuationPathLengthM,
    mainPromenadeLengthM,
    totalAreaSqm,
  }
}

function applyQuantityRule(rule: QuantityRule, counts: CountsFromPlan): number {
  switch (rule.kind) {
    case 'per-decision-node':       return counts.decisionNodes
    case 'per-entrance':            return counts.entrances
    case 'per-exit':                return counts.exits
    case 'per-local':               return counts.locals
    case 'per-elevator':            return counts.elevators
    case 'per-escalator':           return counts.escalators
    case 'per-stair':               return counts.stairs
    case 'per-wc-block':            return counts.wcBlocks
    case 'per-meters-path':         return Math.ceil(counts.evacuationPathLengthM / rule.everyM)
    case 'per-area-sqm':            return Math.max(1, Math.ceil(counts.totalAreaSqm / rule.everySqm))
    case 'per-parking-entrance':    return Math.max(counts.parkings, counts.vehicleAccesses)
    case 'per-extinguisher':        return Math.ceil(counts.totalAreaSqm / 200) * rule.defaultCount
    case 'per-floor-zone':          return Math.max(1, Math.ceil(counts.totalAreaSqm / rule.zoneSqm))
    case 'per-vehicle-access':      return Math.max(1, counts.vehicleAccesses)
    case 'fixed':                   return rule.count
    case 'per-secondary-corridor':  return Math.floor(counts.evacuationPathLengthM / 50)
    case 'per-promenade-meter':     return Math.ceil(counts.mainPromenadeLengthM / 10)
    case 'per-carrefour-promenade': return Math.max(1, Math.ceil(counts.decisionNodes / rule.divisor))
    case 'custom-event':            return 0 // événementiel : non calculé
    default:                        return 0
  }
}

// ─── Position candidate selon le type ───────────────

interface Candidate { x: number; y: number; orientationDeg?: number; floorId?: string; floorLevel?: FloorLevelKey }

function candidatesFor(code: string, input: QuantityInput, targetCount: number): Candidate[] {
  const flow = input.flow
  const spaces = input.spaces
  const candidates: Candidate[] = []

  const pushSpaceCentroids = (filter: (s: SpaceWithType) => boolean) => {
    for (const s of spaces) {
      if (!filter(s)) continue
      let cx = 0, cy = 0
      for (const [x, y] of s.polygon) { cx += x; cy += y }
      cx /= s.polygon.length; cy /= s.polygon.length
      candidates.push({ x: cx, y: cy, floorId: s.floorId, floorLevel: s.floorLevel })
    }
  }

  switch (code) {
    case 'DIR-S':
    case 'PLAN-M':
    case 'WAY-QR':
      // Positionnés aux nœuds de décision (junctions du navGraph)
      if (flow.navGraph) {
        for (const n of flow.navGraph.nodes) {
          if (n.kind === 'junction') candidates.push({ x: n.x, y: n.y })
        }
      }
      break

    case 'DIR-M':
      // Milieu des couloirs (segments les plus longs du navGraph)
      if (flow.navGraph) {
        const sorted = [...flow.navGraph.edges]
          .filter(e => e.lengthM > 15)
          .sort((a, b) => b.lengthM - a.lengthM)
        for (const e of sorted) {
          const mid = e.waypoints[Math.floor(e.waypoints.length / 2)]
          if (mid) candidates.push({ x: mid.x, y: mid.y })
        }
      }
      break

    case 'DIR-SOL':
      // Sur la promenade principale (par échantillonnage)
      for (const p of flow.paths) {
        for (let i = 0; i < p.waypoints.length; i += 3) {
          candidates.push({ x: p.waypoints[i].x, y: p.waypoints[i].y })
        }
      }
      break

    case 'TOT-EXT':
      // Entrées parking / extérieures
      pushSpaceCentroids(s => s.type === 'entree_parking' || s.type === 'exterieur_voirie')
      // Si pas assez, ajoute les entrées principales les plus extérieures
      if (candidates.length < targetCount) {
        for (const e of flow.entrances) candidates.push({ x: e.x, y: e.y, floorId: e.floorId })
      }
      break

    case 'REP':
    case 'SRV-HOR':
    case 'SRV-ACC':
    case 'WAY-BOR':
      // Aux entrées
      for (const e of flow.entrances) candidates.push({ x: e.x, y: e.y, floorId: e.floorId })
      break

    case 'LOT-N':
    case 'ENS':
    case 'COM-VIT':
      // Devant chaque local
      pushSpaceCentroids(s =>
        s.type === 'local_commerce' || s.type === 'restauration' ||
        s.type === 'services' || s.type === 'loisirs' ||
        s.type === 'grande_surface' || s.type === 'kiosque',
      )
      break

    case 'SRV-ASC':
      pushSpaceCentroids(s => s.type === 'ascenseur')
      break

    case 'SRV-WC':
      pushSpaceCentroids(s => s.type === 'sanitaires')
      break

    case 'SRV-PKG':
      pushSpaceCentroids(s => s.type === 'parking_vehicule' || s.type === 'parking_moto')
      break

    case 'SEC-IS':
    case 'SEC-BAES':
      // Cascade le long des chemins d'évacuation tous les 15/30m
      for (const p of flow.paths) {
        const everyM = code === 'SEC-IS' ? 30 : 15
        let acc = 0
        for (let i = 1; i < p.waypoints.length; i++) {
          const a = p.waypoints[i - 1], b = p.waypoints[i]
          const seg = Math.hypot(b.x - a.x, b.y - a.y)
          if (acc + seg >= everyM) {
            const t = (everyM - acc) / seg
            candidates.push({
              x: a.x + (b.x - a.x) * t,
              y: a.y + (b.y - a.y) * t,
              orientationDeg: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI,
            })
            acc = 0
          } else {
            acc += seg
          }
        }
      }
      // Déplie aussi sur les sorties directement
      for (const x of flow.exits) candidates.push({ x: x.x, y: x.y, floorId: x.floorId })
      break

    case 'SEC-EXT':
    case 'SEC-RIA':
    case 'SEC-EVA':
    case 'SEC-INT':
      // Réparties sur les zones du niveau (grille régulière)
      const step = Math.sqrt(input.planBounds.width * input.planBounds.height / Math.max(1, targetCount))
      for (let y = step / 2; y < input.planBounds.height; y += step) {
        for (let x = step / 2; x < input.planBounds.width; x += step) {
          candidates.push({ x, y })
        }
      }
      break

    case 'PMR':
      // Sur les chemins tous les 25m
      for (const p of flow.paths) {
        let acc = 0
        for (let i = 1; i < p.waypoints.length; i++) {
          const a = p.waypoints[i - 1], b = p.waypoints[i]
          const seg = Math.hypot(b.x - a.x, b.y - a.y)
          if (acc + seg >= 25) {
            const t = (25 - acc) / seg
            candidates.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
            acc = 0
          } else acc += seg
        }
      }
      break

    case 'COM-ECR':
    case 'COM-LED':
    case 'COM-KAK':
      // Positions dispersées sur la promenade
      if (flow.paths.length > 0) {
        const main = flow.paths[0]
        for (let i = 0; i < main.waypoints.length; i += Math.max(1, Math.floor(main.waypoints.length / targetCount))) {
          candidates.push({ x: main.waypoints[i].x, y: main.waypoints[i].y })
        }
      }
      break

    case 'WAY-BLE':
      // Beacons tous les 10m sur les chemins
      for (const p of flow.paths) {
        let acc = 0
        for (let i = 1; i < p.waypoints.length; i++) {
          const a = p.waypoints[i - 1], b = p.waypoints[i]
          const seg = Math.hypot(b.x - a.x, b.y - a.y)
          if (acc + seg >= 10) {
            const t = (10 - acc) / seg
            candidates.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
            acc = 0
          } else acc += seg
        }
      }
      break
  }

  return candidates
}

// ─── Messages suggérés par code ──────────────────────

function contentFor(code: string, meta: SignageTypeMeta, candidateIdx: number, flow: FlowAnalysisResult): string {
  switch (code) {
    case 'DIR-S':
      return `Flèches directionnelles · proch. zones ${candidateIdx + 1}`
    case 'DIR-M':
      return `Direction secteur ${candidateIdx + 1}`
    case 'DIR-SOL':
      return `Marquage au sol zone ${candidateIdx + 1}`
    case 'TOT-EXT':
      return `COSMOS ANGRÉ — Entrée ${candidateIdx + 1}`
    case 'PLAN-M':
      return `Plan du centre · Vous êtes ici — Niv. ${candidateIdx + 1}`
    case 'LOT-N': {
      const allee = String.fromCharCode(65 + Math.floor(candidateIdx / 12))
      const num = String(candidateIdx % 12 + 1).padStart(2, '0')
      return `${allee}${num}`
    }
    case 'ENS':     return `Enseigne locataire (à préciser)`
    case 'REP':     return `Annuaire des ${flow.summary.entrancesCount > 0 ? 'enseignes' : 'commerces'}`
    case 'SEC-IS':  return `SORTIE DE SECOURS — ${candidateIdx + 1}`
    case 'SEC-EXT': return `EXTINCTEUR`
    case 'SEC-RIA': return `RIA — Robinet Incendie Armé`
    case 'SEC-EVA': return `PLAN D'ÉVACUATION — Zone ${candidateIdx + 1}`
    case 'SEC-BAES':return `BAES balisage`
    case 'SEC-INT': return `Interdictions / obligations`
    case 'SRV-WC':  return `Toilettes H / F / PMR`
    case 'SRV-ASC': return `Ascenseur — Tous niveaux — PMR`
    case 'SRV-PKG': return `Parking — sortie / places libres`
    case 'SRV-HOR': return `Ouvert tous les jours 9h00 → 22h00`
    case 'SRV-ACC': return `Accueil / Information`
    case 'PMR':     return `Itinéraire PMR`
    case 'COM-ECR': return `Écran dynamique (contenu programmable)`
    case 'COM-KAK': return `Kakémono événementiel`
    case 'COM-VIT': return `Vitrophanie commerciale`
    case 'COM-LED': return `Média façade`
    case 'WAY-BOR': return `Borne Wayfinder interactive`
    case 'WAY-QR':  return `QR ${candidateIdx + 1} — Wayfinder mobile`
    case 'WAY-BLE': return `Beacon BLE #${candidateIdx + 1}`
    default:        return meta.label
  }
}

// ─── Pipeline principal ─────────────────────────────

export function computeSignageQuantityPlan(input: QuantityInput): QuantityPlan {
  const counts = countsFromPlan(input)
  const panels: GeneratedPanel[] = []
  const byCode: Record<string, number> = {}
  const justifications: string[] = []

  for (const [code, meta] of Object.entries(SIGNAGE_CATALOG)) {
    const target = applyQuantityRule(meta.quantityRule, counts)
    if (target <= 0) continue
    const cands = candidatesFor(code, input, target)
    // Sous-échantillonnage si trop de candidats
    let chosen: Candidate[] = []
    if (cands.length === 0) {
      // Pas de candidats trouvés → placement sur les entrées par défaut
      for (let i = 0; i < target; i++) {
        const e = input.flow.entrances[i % Math.max(1, input.flow.entrances.length)]
        if (e) chosen.push({ x: e.x, y: e.y, floorId: e.floorId })
      }
    } else if (cands.length <= target) {
      chosen = cands
    } else {
      // Répartition uniforme
      const step = cands.length / target
      for (let i = 0; i < target; i++) {
        chosen.push(cands[Math.floor(i * step)])
      }
    }

    byCode[code] = chosen.length
    chosen.forEach((c, idx) => {
      panels.push({
        id: `${code.toLowerCase()}-${panels.length.toString(36)}`,
        code,
        label: meta.label,
        x: c.x, y: c.y,
        heightCm: meta.heightCm.default,
        orientationDeg: c.orientationDeg,
        content: contentFor(code, meta, idx, input.flow),
        model: meta.defaultModel,
        floorLevel: c.floorLevel ?? input.floorLevel,
        floorId: c.floorId,
        priority: meta.priority,
        reason: describeRule(meta.quantityRule, counts, idx),
        standards: meta.standards,
        priceFcfa: meta.priceFcfa,
        visibilityRadiusM: meta.heightCm.default >= 300 ? 15 : meta.heightCm.default >= 180 ? 8 : 3,
        erpRequired: meta.erpRequired,
      })
    })

    justifications.push(
      `${code} · ${meta.label} : ${chosen.length} × ${meta.priceFcfa.toLocaleString('fr-FR')} FCFA = ${(chosen.length * meta.priceFcfa).toLocaleString('fr-FR')} FCFA — ${describeRule(meta.quantityRule, counts)}`
    )
  }

  // Agrégats
  const p1Count = panels.filter(p => p.priority === 'P1').length
  const p2Count = panels.filter(p => p.priority === 'P2').length
  const p3Count = panels.filter(p => p.priority === 'P3').length
  const erpCount = panels.filter(p => p.erpRequired).length
  const totalFcfa = panels.reduce((s, p) => s + p.priceFcfa, 0)

  const byCategory: SignageCoverageByCategory[] = (Object.keys(SIGNAGE_CODES_BY_CATEGORY) as SignageCategoryKey[]).map(cat => {
    const codes = SIGNAGE_CODES_BY_CATEGORY[cat]
    const sub = panels.filter(p => codes.includes(p.code))
    return {
      category: cat,
      count: sub.length,
      totalFcfa: sub.reduce((s, p) => s + p.priceFcfa, 0),
      p1Count: sub.filter(p => p.priority === 'P1').length,
      p2Count: sub.filter(p => p.priority === 'P2').length,
      p3Count: sub.filter(p => p.priority === 'P3').length,
      erpCount: sub.filter(p => p.erpRequired).length,
    }
  })

  // Score couverture (0..100)
  const categoriesCovered = byCategory.filter(c => c.count > 0).length
  const erpCovered = erpCount > 0 ? 1 : 0
  const ratioBasics = (panels.length / Math.max(1, counts.decisionNodes + counts.entrances + counts.exits)) / 5
  const coverageScore = Math.round(
    Math.min(100, (categoriesCovered / 6) * 50 + erpCovered * 30 + Math.min(1, ratioBasics) * 20),
  )

  return {
    panels, byCode, byCategory,
    totalPanels: panels.length,
    totalFcfa,
    p1Count, p2Count, p3Count, erpCount,
    coverageScore,
    justifications,
  }
}

function describeRule(rule: QuantityRule, counts: CountsFromPlan, index?: number): string {
  const at = index !== undefined ? ` (#${index + 1})` : ''
  switch (rule.kind) {
    case 'per-decision-node':       return `1 par nœud de décision · ${counts.decisionNodes} nœuds${at}`
    case 'per-entrance':            return `1 par entrée · ${counts.entrances} entrées${at}`
    case 'per-exit':                return `1 par sortie · ${counts.exits} sorties${at}`
    case 'per-local':               return `1 par local · ${counts.locals} locaux${at}`
    case 'per-elevator':            return `1 par ascenseur${at}`
    case 'per-escalator':           return `1 par escalator${at}`
    case 'per-stair':               return `1 par escalier${at}`
    case 'per-wc-block':            return `1 par bloc sanitaires${at}`
    case 'per-meters-path':         return `1 tous les ${rule.everyM} m · ${counts.evacuationPathLengthM.toFixed(0)} m cumulés${at}`
    case 'per-area-sqm':            return `1 tous les ${rule.everySqm} m²${at}`
    case 'per-parking-entrance':    return `1 par accès parking${at}`
    case 'per-extinguisher':        return `1 par extincteur (≈ 1/200 m²)${at}`
    case 'per-floor-zone':          return `1 par zone de ${rule.zoneSqm} m²${at}`
    case 'per-vehicle-access':      return `1 par accès véhicule${at}`
    case 'fixed':                   return `quantité fixe : ${rule.count}${at}`
    case 'per-secondary-corridor':  return `1 par couloir > ${rule.minLengthM} m${at}`
    case 'per-promenade-meter':     return `métrage promenade principale${at}`
    case 'per-carrefour-promenade': return `1 par ${rule.divisor} carrefours${at}`
    case 'custom-event':            return `événementiel — variable${at}`
  }
}
