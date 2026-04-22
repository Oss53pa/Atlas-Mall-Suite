// ═══ PROPH3T — Moteur d'Insights Proactifs v2 ═══
// 20 regles — 3 niveaux d'urgence — max 5 affiches simultanement

import type {
  ProactiveInsight,
  InsightLevel,
  FullProjectContextV3,
  FullProjectContext,
  Camera
} from './types'
import { calcArea } from './engine'
import { formatFcfaWithUnit as formatFcfa } from '../utils/formatting'

// ─── Types internes ──────────────────────────────────────────

interface InsightRule {
  id: string
  level: InsightLevel
  category: 'securite' | 'commercial' | 'parcours' | 'budget' | 'coherence' | 'planning'
  check: (ctx: FullProjectContextV3) => boolean
  generate: (ctx: FullProjectContextV3) => Omit<ProactiveInsight, 'id' | 'level' | 'sessionCount'>
}

// ─── Helpers ─────────────────────────────────────────────────

function findNearbyCamera(cam: Camera, cameras: Camera[], maxDist: number): Camera | undefined {
  return cameras.find(c =>
    c.id !== cam.id &&
    c.floorId === cam.floorId &&
    Math.sqrt((c.x - cam.x) ** 2 + (c.y - cam.y) ** 2) < maxDist
  )
}

// ─── 20 regles d'insights ────────────────────────────────────

const INSIGHT_RULES: InsightRule[] = [

  // ═══ BLOQUANTS (4) ═══

  {
    id: 'exit-uncovered',
    level: 'bloquant',
    category: 'securite',
    check: ctx => ctx.doors.filter(d => d.isExit).some(exit =>
      !ctx.cameras.some(c =>
        c.floorId === exit.floorId &&
        Math.sqrt((c.x - exit.x) ** 2 + (c.y - exit.y) ** 2) < 0.08
      )
    ),
    generate: ctx => {
      const uncovered = ctx.doors.filter(d => d.isExit).filter(exit =>
        !ctx.cameras.some(c =>
          c.floorId === exit.floorId &&
          Math.sqrt((c.x - exit.x) ** 2 + (c.y - exit.y) ** 2) < 0.08
        )
      )
      return {
        title: `${uncovered.length} sortie(s) de secours sans couverture camera`,
        explanation: 'APSAD R82 §4.1 exige la couverture visuelle de toutes les sorties. '
          + 'Une sortie non couverte invalide le rapport de conformite.',
        impact: 'Score APSAD : -5 a -8 pts — Rapport non certifiable',
        action: 'Placer une camera dome a moins de 5m de chaque sortie de secours.',
        normReference: 'APSAD R82 §4.1',
        estimatedEffortMin: 10,
        zoomTarget: uncovered[0] ? { x: uncovered[0].x, y: uncovered[0].y, floorId: uncovered[0].floorId } : undefined,
      }
    },
  },

  {
    id: 'exits-count',
    level: 'bloquant',
    category: 'securite',
    check: ctx => ctx.doors.filter(d => d.isExit).length < 3,
    generate: ctx => ({
      title: `${ctx.doors.filter(d => d.isExit).length}/3 sorties de secours minimum`,
      explanation: 'NF S 61-938 requiert minimum 3 sorties pour tout ERP type M. '
        + 'Sans correction, l\'ouverture ne peut pas etre autorisee.',
      impact: 'Ouverture bloquee — Non-conformite reglementaire critique',
      action: 'Ajouter les barres anti-panique ASSA ABLOY PB1000 manquantes.',
      normReference: 'NF S 61-938',
      estimatedEffortMin: 45,
    }),
  },

  {
    id: 'n4-uncovered',
    level: 'bloquant',
    category: 'securite',
    check: ctx => ctx.zones.filter(z => z.niveau >= 4).some(z =>
      !ctx.cameras.some(c =>
        c.floorId === z.floorId &&
        c.x >= z.x - 0.05 && c.x <= z.x + z.w + 0.05 &&
        c.y >= z.y - 0.05 && c.y <= z.y + z.h + 0.05
      )
    ),
    generate: ctx => {
      const uncovered = ctx.zones.filter(z => z.niveau >= 4).filter(z =>
        !ctx.cameras.some(c =>
          c.floorId === z.floorId &&
          c.x >= z.x - 0.05 && c.x <= z.x + z.w + 0.05 &&
          c.y >= z.y - 0.05 && c.y <= z.y + z.h + 0.05
        )
      )
      return {
        title: `${uncovered.length} zone(s) critique(s) N4/N5 sans camera`,
        explanation: `Les zones ${uncovered.map(z => z.label).join(', ')} `
          + 'requierent une couverture camera systematique selon APSAD R82.',
        impact: 'Rapport APSAD invalide — Risque securitaire maximal',
        action: 'Lancer Proph3t auto-placement pour ces zones en priorite P0.',
        normReference: 'APSAD R82',
        estimatedEffortMin: 15,
        zoomTarget: uncovered[0] ? { x: uncovered[0].x, y: uncovered[0].y, floorId: uncovered[0].floorId } : undefined,
      }
    },
  },

  {
    id: 'opening-blockers',
    level: 'bloquant',
    category: 'planning',
    check: ctx => {
      const firstPhase = ctx.phases?.[0]
      if (!firstPhase) return false
      const days = Math.ceil((new Date(firstPhase.targetDate).getTime() - Date.now()) / 86400000)
      return days < 60 && (ctx.score?.total ?? 0) < 70
    },
    generate: ctx => {
      const days = ctx.phases?.[0]?.targetDate
        ? Math.ceil((new Date(ctx.phases[0].targetDate).getTime() - Date.now()) / 86400000)
        : 0
      return {
        title: `Ouverture dans ${days} jours — score insuffisant`,
        explanation: `Le score APSAD actuel (${ctx.score?.total ?? 0}/100) est sous le seuil de 70 `
          + `requis pour certification. Il reste ${days} jours pour corriger.`,
        impact: `Risque blocage ouverture — ${days} jours restants`,
        action: 'Voir les recommandations prioritaires Proph3t pour gain rapide.',
        estimatedEffortMin: 120,
      }
    },
  },

  // ═══ ATTENTION (8) ═══

  {
    id: 'redundant-cams',
    level: 'attention',
    category: 'budget',
    check: ctx => {
      for (const cam of ctx.cameras) {
        if (findNearbyCamera(cam, ctx.cameras, 0.03)) return true
      }
      return false
    },
    generate: ctx => {
      const redundant: Camera[] = []
      const seen = new Set<string>()
      for (const cam of ctx.cameras) {
        if (seen.has(cam.id)) continue
        const nearby = findNearbyCamera(cam, ctx.cameras, 0.03)
        if (nearby && !seen.has(nearby.id)) {
          redundant.push(nearby)
          seen.add(nearby.id)
        }
      }
      const saving = redundant.reduce((s, c) => s + c.capexFcfa, 0)
      return {
        title: `${redundant.length} camera(s) potentiellement redondante(s)`,
        explanation: 'Overlap FOV > 80% detecte. Ces cameras ne couvrent pas de zones supplementaires.',
        impact: `Economie possible : ${formatFcfa(saving)} sans perte de conformite`,
        action: 'Voir la liste et optimiser le placement.',
        estimatedEffortMin: 20,
      }
    },
  },

  {
    id: 'coverage-low',
    level: 'attention',
    category: 'securite',
    check: ctx => (ctx.score?.coverage ?? 100) < 80,
    generate: ctx => {
      const gap = 95 - (ctx.score?.coverage ?? 0)
      const camsNeeded = Math.ceil(gap / 7.5)
      return {
        title: `Couverture ${ctx.score?.coverage ?? 0}% — objectif 95%`,
        explanation: `L'objectif APSAD R82 est 95% de couverture camera. `
          + `${camsNeeded} camera(s) supplementaire(s) estimee(s) pour combler l'ecart.`,
        impact: `Score APSAD : +${Math.round(camsNeeded * 2.5)} pts potentiels`,
        action: 'Lancer Proph3t auto-placement pour optimiser.',
        normReference: 'APSAD R82',
        estimatedEffortMin: 30,
      }
    },
  },

  {
    id: 'pmr-missing',
    level: 'attention',
    category: 'parcours',
    check: ctx => ctx.transitions.filter(t => t.pmr).length === 0 && ctx.floors.length > 1,
    generate: ctx => ({
      title: 'Aucun acces PMR inter-etages',
      explanation: `${ctx.floors.length} niveaux mais aucun ascenseur ni rampe PMR. `
        + 'Decret CI n°2012-1088 : accessibilite obligatoire dans les ERP.',
      impact: 'Non-conformite legale CI — Accessibilite universelle compromise',
      action: 'Ajouter un noeud de transition "ascenseur" ou "rampe_pmr".',
      normReference: 'Decret CI n°2012-1088',
      estimatedEffortMin: 60,
    }),
  },

  {
    id: 'signaletics-empty',
    level: 'attention',
    category: 'parcours',
    check: ctx => ctx.signageItems.length === 0 && ctx.zones.length > 3,
    generate: () => ({
      title: 'Aucune signaletique configuree',
      explanation: 'ISO 7010 et NF X 08-003 encadrent le placement. '
        + 'Un plan sans signaletique est incomplet pour la presentation investisseurs.',
      impact: 'Plan signaletique manquant — DCE impossible a generer',
      action: 'Lancer Proph3t auto-placement signaletique (< 2 min/etage).',
      normReference: 'ISO 7010 + NF X 08-003',
      estimatedEffortMin: 20,
    }),
  },

  {
    id: 'capex-overrun',
    level: 'attention',
    category: 'budget',
    check: ctx => {
      const total = ctx.cameras.reduce((s, c) => s + (c.capexFcfa ?? 0), 0)
      return total > 60_000_000
    },
    generate: ctx => {
      const total = ctx.cameras.reduce((s, c) => s + (c.capexFcfa ?? 0), 0)
      return {
        title: `Budget CAPEX securite : ${formatFcfa(total)}`,
        explanation: 'Le CAPEX depasse 60M FCFA. '
          + 'Moyenne malls CI Classe A : 42M FCFA pour la videoprotection.',
        impact: `${formatFcfa(total - 42_000_000)} au-dessus de la moyenne CI Classe A`,
        action: 'Voir l\'analyse d\'optimisation budgetaire Proph3t.',
        estimatedEffortMin: 20,
      }
    },
  },

  {
    id: 'approval-invalidated',
    level: 'attention',
    category: 'coherence',
    check: ctx => !!(ctx.lastApprovedVersion),
    generate: ctx => ({
      title: 'Plan modifie apres approbation',
      explanation: `Modifications depuis l'approbation du ${ctx.lastApprovedVersion?.date ?? '?'}. `
        + 'Le rapport APSAD approuve n\'est plus valide.',
      impact: 'Validation invalidee — Re-approbation requise',
      action: 'Soumettre le plan mis a jour au circuit de validation.',
      estimatedEffortMin: 30,
    }),
  },

  {
    id: 'score-declining',
    level: 'attention',
    category: 'coherence',
    check: ctx => {
      const evol = ctx.memory?.progressMetrics?.scoreEvolution ?? []
      if (evol.length < 2) return false
      return evol[evol.length - 1].score < evol[evol.length - 2].score
    },
    generate: ctx => {
      const evol = ctx.memory!.progressMetrics.scoreEvolution
      const prev = evol[evol.length - 2].score
      const curr = evol[evol.length - 1].score
      return {
        title: `Score en baisse : ${prev} → ${curr}`,
        explanation: 'Le score APSAD a baisse lors de la derniere session. '
          + 'Une modification recente a probablement cree une non-conformite.',
        impact: `Regression de ${prev - curr} points`,
        action: 'Verifier les modifications recentes et corriger.',
        estimatedEffortMin: 15,
      }
    },
  },

  {
    id: 'blind-spot-persistent',
    level: 'attention',
    category: 'securite',
    check: ctx => ctx.blindSpots.some(b => b.sessionCount > 3),
    generate: ctx => {
      const persistent = ctx.blindSpots.filter(b => b.sessionCount > 3)
      return {
        title: `${persistent.length} angle(s) mort(s) persistant(s) depuis 3+ sessions`,
        explanation: 'Ces zones mortes n\'ont pas ete corrigees malgre plusieurs sessions. '
          + 'Elles representent un risque recurrent.',
        impact: 'Risque securitaire chronique',
        action: 'Traiter ces angles morts en priorite.',
        estimatedEffortMin: 20,
        zoomTarget: persistent[0] ? { x: persistent[0].x, y: persistent[0].y, floorId: persistent[0].floorId } : undefined,
      }
    },
  },

  // ═══ OPPORTUNITÉS (8) ═══

  {
    id: 'vacant-prime',
    level: 'opportunite',
    category: 'commercial',
    check: ctx => !!(ctx.tenants?.some(t => t.status === 'vacant')),
    generate: ctx => {
      const vacant = (ctx.tenants ?? []).filter(t => t.status === 'vacant')
      return {
        title: `${vacant.length} cellule(s) vacante(s)`,
        explanation: 'Cellule(s) sans preneur. '
          + 'Chaque semaine de vacance = manque a gagner sur trafic qualifie.',
        impact: `Potentiel : ${formatFcfa(vacant.length * 45000 * 100)} /mois non encaisses`,
        action: 'Voir recommandation Proph3t : profil preneur optimal par cellule.',
        estimatedEffortMin: 10,
      }
    },
  },

  {
    id: 'benchmark-gap-camera',
    level: 'opportunite',
    category: 'securite',
    check: ctx => {
      const totalArea = ctx.zones.reduce((s, z) => s + calcArea(z), 0)
      if (totalArea === 0) return false
      const density = (ctx.cameras.length / totalArea) * 1000
      return density < 1.0
    },
    generate: ctx => {
      const totalArea = ctx.zones.reduce((s, z) => s + calcArea(z), 0)
      const density = ((ctx.cameras.length / Math.max(1, totalArea)) * 1000).toFixed(1)
      const needed = Math.ceil((1.4 - parseFloat(density)) * totalArea / 1000)
      return {
        title: `Densite camera sous la moyenne CI (${density} vs 1.4 /1000m2)`,
        explanation: 'La moyenne des malls Classe A en CI est 1.4 camera/1000m2.',
        impact: `+${needed} cameras pour atteindre la moyenne`,
        action: 'Voir analyse benchmark complete Proph3t.',
        estimatedEffortMin: 15,
      }
    },
  },

  {
    id: 'cross-volume-opportunity',
    level: 'opportunite',
    category: 'coherence',
    check: ctx => (ctx.crossVolumeInsights ?? []).filter(i => i.insightType === 'opportunity').length > 0,
    generate: ctx => {
      const opps = (ctx.crossVolumeInsights ?? []).filter(i => i.insightType === 'opportunity')
      return {
        title: `${opps.length} opportunite(s) inter-volumes detectee(s)`,
        explanation: opps[0]?.explanation ?? 'Des synergies existent entre les volumes.',
        impact: 'Optimisation possible sans cout supplementaire',
        action: 'Voir les insights croises Proph3t.',
        estimatedEffortMin: 5,
      }
    },
  },

  {
    id: 'dce-ready',
    level: 'opportunite',
    category: 'planning',
    check: ctx => (ctx.score?.total ?? 0) >= 75 && ctx.cameras.length >= 10,
    generate: ctx => ({
      title: 'Plan pret pour generation du DCE',
      explanation: `Score ${ctx.score?.total}/100 et ${ctx.cameras.length} cameras configurees. `
        + 'Plan suffisamment mature pour generer un dossier de consultation.',
      impact: 'DCE securite generable en 1 clic — envoi prestataires possible',
      action: 'Generer le DCE securite dans l\'onglet DCE.',
      estimatedEffortMin: 5,
    }),
  },

  {
    id: 'signaletics-auto-available',
    level: 'opportunite',
    category: 'parcours',
    check: ctx => ctx.zones.length > 3 && ctx.signageItems.filter(s => s.autoPlaced).length === 0,
    generate: () => ({
      title: 'Placement automatique de signaletique disponible',
      explanation: 'Proph3t peut placer automatiquement la signaletique conforme ISO 7010 '
        + 'sur chaque etage en moins de 2 minutes.',
      impact: 'Gain de temps : 30+ min par etage',
      action: 'Lancer le placement automatique depuis le panneau Signaletique.',
      estimatedEffortMin: 2,
    }),
  },

  {
    id: 'quick-win-score',
    level: 'opportunite',
    category: 'securite',
    check: ctx => {
      const score = ctx.score
      if (!score || score.total >= 80) return false
      // Quick win si un seul axe est tres bas
      return score.camScore < 20 || score.doorScore < 10 || score.exitScore < 10
    },
    generate: ctx => {
      const score = ctx.score!
      let quickWin = ''
      let gain = 0
      if (score.exitScore < 10) { quickWin = 'ajouter une sortie de secours conforme'; gain = 8 }
      else if (score.doorScore < 10) { quickWin = 'ajouter des badges sur zones sensibles'; gain = 7 }
      else { quickWin = 'placer 3-4 cameras supplementaires'; gain = 10 }
      return {
        title: `+${gain} pts en 15 min`,
        explanation: `Action rapide : ${quickWin}. Score actuel ${score.total}/100.`,
        impact: `Score projete : ${score.total + gain}/100`,
        action: quickWin.charAt(0).toUpperCase() + quickWin.slice(1) + '.',
        estimatedEffortMin: 15,
      }
    },
  },

  {
    id: 'evacuation-not-simulated',
    level: 'opportunite',
    category: 'securite',
    check: ctx => ctx.doors.filter(d => d.isExit).length >= 2 && ctx.zones.length > 3,
    generate: () => ({
      title: 'Simulation d\'evacuation disponible',
      explanation: 'Le projet a suffisamment de sorties et de zones pour lancer '
        + 'une simulation d\'evacuation NF S 61-938.',
      impact: 'Validation de conformite evacuation',
      action: 'Lancer la simulation Monte Carlo depuis l\'onglet Evacuation.',
      normReference: 'NF S 61-938',
      estimatedEffortMin: 5,
    }),
  },

  {
    id: 'benchmark-top-quartile',
    level: 'opportunite',
    category: 'securite',
    check: ctx => (ctx.score?.total ?? 0) >= 85,
    generate: ctx => ({
      title: `Score top quartile (${ctx.score?.total}/100)`,
      explanation: 'Votre score APSAD est dans le top 25% des malls africains Classe A. '
        + 'C\'est un argument commercial fort pour les investisseurs et preneurs.',
      impact: 'Valeur marketing pour le dossier investisseurs',
      action: 'Generer le rapport de conformite pour communication externe.',
      estimatedEffortMin: 5,
    }),
  },
]

// ─── Evaluation de tous les insights ─────────────────────────

export function evaluateInsights(ctx: FullProjectContext): ProactiveInsight[] {
  const ctxV3 = ctx as FullProjectContextV3

  const triggered = INSIGHT_RULES
    .filter(rule => {
      try { return rule.check(ctxV3) }
      catch { return false }
    })
    .map(rule => {
      const base = rule.generate(ctxV3)
      const sessionCount = ctxV3.memory?.unresolvedAlerts
        ?.filter(a => a.description.includes(rule.id)).length ?? 0
      return {
        id: rule.id,
        level: rule.level,
        sessionCount,
        ...base,
      } as ProactiveInsight
    })

  // Priorite : bloquant > attention > opportunite
  // Secondaire : sessionCount eleve → priorite accrue
  const levelOrder: Record<InsightLevel, number> = {
    bloquant: 0,
    attention: 1,
    opportunite: 2,
  }

  return triggered
    .sort((a, b) => {
      if (levelOrder[a.level] !== levelOrder[b.level]) {
        return levelOrder[a.level] - levelOrder[b.level]
      }
      return b.sessionCount - a.sessionCount
    })
    .slice(0, 5) // max 5 affiches simultanement
}
