// ═══ ERP Global Audit Engine — SEC-02 / SEC-03 / SEC-06 ═══
//
// CDC §3.3 :
//   SEC-02 — Vérifier la conformité ERP Catégorie 1 (issues, distances,
//            dégagements)
//   SEC-03 — Citer la norme applicable pour chaque vérification
//   SEC-06 — Produire un rapport de non-conformités avec niveau de criticité
//
// Référentiel : Arrêté du 25 juin 1980 (France/UEMOA), ISO 7010, NF S 61-938,
// NF C71-800, EN 1125, Décret CI 2009-264, Loi CI 2014-388.
//
// Audit produit : liste de NonConformity avec article cité + criticité + correction.

import type { ParsedPlan } from '../../shared/planReader/planEngineTypes'
import type { FlowAnalysisResult } from '../../shared/engines/plan-analysis/flowPathEngine'

// ─── Types ────────────────────────────────────

export type Criticality = 'critical' | 'major' | 'minor' | 'observation'

export const CRITICALITY_META: Record<Criticality, { label: string; color: string; impact: string }> = {
  critical:    { label: 'Critique',     color: '#dc2626', impact: 'Bloquant ouverture ERP — refus du bureau de contrôle' },
  major:       { label: 'Majeur',       color: '#ea580c', impact: 'Réserve grave — correction sous 30 jours' },
  minor:       { label: 'Mineur',       color: '#f59e0b', impact: 'Réserve à lever — correction sous 90 jours' },
  observation: { label: 'Observation',  color: '#3b82f6', impact: 'Amélioration recommandée — non bloquante' },
}

export type Norm =
  | 'Arrêté 25 juin 1980 — Règlement de sécurité ERP'
  | 'ISO 7010 — Symboles graphiques de sécurité'
  | 'NF C71-800 — BAES blocs autonomes'
  | 'NF S 61-938 — Système de sécurité incendie'
  | 'EN 1125 — Quincaillerie pour issues de secours'
  | 'EN 60598-2-22 — Luminaires de sécurité'
  | 'APSAD R82 — Vidéo-protection ERP'
  | 'Décret CI 2009-264 — Sécurité incendie Côte d\'Ivoire'
  | 'Loi CI 2014-388 — ERP Côte d\'Ivoire'
  | 'Loi 2005-102 — Accessibilité PMR'

export interface NonConformity {
  id: string
  article: string
  norm: Norm
  category: 'issues-secours' | 'eclairage-securite' | 'extincteurs' | 'plan-evacuation'
    | 'signalétique' | 'pmr' | 'vidéo-protection' | 'circulation' | 'distance'
    | 'capacité' | 'autre'
  description: string
  /** Localisation sur le plan (id space ou coordonnées). */
  spaceId?: string
  position?: { x: number; y: number }
  criticality: Criticality
  /** Seuil exigé par la norme. */
  requiredValue?: string
  /** Valeur observée. */
  observedValue?: string
  correction: string
  estimatedCostFcfa?: number
}

export interface ErpAuditResult {
  nonConformities: NonConformity[]
  byCategory: Record<NonConformity['category'], number>
  byCriticality: Record<Criticality, number>
  /** Score conformité 0..100 (100 = parfait). */
  conformityScore: number
  /** Statut global. */
  status: 'compliant' | 'minor-issues' | 'major-issues' | 'blocking'
  /** Référence du dossier. */
  reportRef: string
  generatedAt: string
  totalCorrectionCostFcfa: number
}

// ─── Audit principal ─────────────────────────

export interface ErpAuditInput {
  parsedPlan: ParsedPlan
  flow?: FlowAnalysisResult
  /** Paramètres ERP catégorie. */
  erpCategory: '1' | '2' | '3' | '4' | '5'
  /** Effectif total estimé. */
  effectifTotal: number
  /** Surface totale m². */
  surfaceTotalSqm: number
  /** Nombre de niveaux. */
  numFloors: number
}

export function auditErpCompliance(input: ErpAuditInput): ErpAuditResult {
  const issues: NonConformity[] = []
  const spaces = input.parsedPlan.spaces ?? []

  // ═══ 1. ISSUES DE SECOURS ═══
  // CDC §SEC-02 : Arrêté 25 juin 1980 — Section CO 38 → CO 41
  const exits = spaces.filter((s: { label: string; type?: unknown }) =>
    /sortie|exit|issue/i.test(s.label) || s.type === 'sortie_secours')
  const requiredExits = computeRequiredExits(input.effectifTotal, input.erpCategory)

  if (exits.length < requiredExits.minCount) {
    issues.push({
      id: `nc-exits-count`,
      article: 'CO 38',
      norm: 'Arrêté 25 juin 1980 — Règlement de sécurité ERP',
      category: 'issues-secours',
      description: `Nombre d'issues de secours insuffisant pour l'effectif.`,
      requiredValue: `≥ ${requiredExits.minCount} issues (effectif ${input.effectifTotal})`,
      observedValue: `${exits.length} issues détectées`,
      criticality: 'critical',
      correction: `Ajouter ${requiredExits.minCount - exits.length} issue(s) de secours conformes ` +
        `(largeur ≥ ${requiredExits.minWidthM} m, débouchant sur l'extérieur).`,
      estimatedCostFcfa: (requiredExits.minCount - exits.length) * 850_000,
    })
  }

  // ═══ 2. PLAN D'ÉVACUATION ═══
  // CDC §SEC-02 : Arrêté MS 41
  const surfaceParPlan = 1000  // m² → 1 plan tous les 1000 m²
  const requiredEvacPlans = Math.ceil(input.surfaceTotalSqm / surfaceParPlan) * input.numFloors
  // Détection : on ne peut pas savoir si le plan est physiquement présent, on signale comme à vérifier
  issues.push({
    id: `nc-evac-plan`,
    article: 'MS 41',
    norm: 'Arrêté 25 juin 1980 — Règlement de sécurité ERP',
    category: 'plan-evacuation',
    description: `Plans d'évacuation à afficher.`,
    requiredValue: `${requiredEvacPlans} plans (1 par 1000 m² × ${input.numFloors} niveaux)`,
    observedValue: 'À déployer',
    criticality: 'major',
    correction: `Afficher ${requiredEvacPlans} plans d'évacuation aux endroits stratégiques (entrée, sortie, hall, étage).`,
    estimatedCostFcfa: requiredEvacPlans * 180_000,
  })

  // ═══ 3. CASCADE BAES (signalétique sortie tous les 30 m) ═══
  // CDC §SEC-02 : NF C71-800 / EN 60598-2-22
  if (input.flow) {
    const longPaths = input.flow.paths.filter(p => p.distanceM > 30)
    for (const p of longPaths) {
      const requiredBaes = Math.floor(p.distanceM / 30)
      issues.push({
        id: `nc-baes-${p.id}`,
        article: 'EC 12 + EC 14',
        norm: 'NF C71-800 — BAES blocs autonomes',
        category: 'eclairage-securite',
        description: `Chemin ${p.from.label} → ${p.to.label} (${p.distanceM.toFixed(0)} m) sans cascade BAES.`,
        requiredValue: `1 BAES tous les 30 m`,
        observedValue: `Aucun BAES détecté sur ce trajet`,
        criticality: 'major',
        correction: `Installer ${requiredBaes} blocs BAES SATI 45 lm autonomie 1h le long du chemin.`,
        estimatedCostFcfa: requiredBaes * 95_000,
      })
    }
  }

  // ═══ 4. SIGNALÉTIQUE ISO 7010 ═══
  // CDC §SEC-03 : ISO 7010 E001 (sortie de secours)
  if (input.flow) {
    if (input.flow.entrances.length > 0 && input.flow.exits.length > 0) {
      issues.push({
        id: `nc-iso7010-exit`,
        article: 'E001 / E002',
        norm: 'ISO 7010 — Symboles graphiques de sécurité',
        category: 'signalétique',
        description: `Chaque sortie doit être identifiée par pictogramme normalisé.`,
        requiredValue: `Pictogramme ISO 7010 E001 (sortie de secours, vert + blanc) à chaque sortie`,
        observedValue: `${input.flow.exits.length} sorties détectées — vérification visuelle requise`,
        criticality: input.flow.exits.length > 0 ? 'observation' : 'critical',
        correction: `Poser un pictogramme ISO 7010 E001 ou E002 conforme à chaque issue de secours.`,
        estimatedCostFcfa: input.flow.exits.length * 18_000,
      })
    }
  }

  // ═══ 5. EXTINCTEURS ═══
  // 1 extincteur tous les 200 m²
  const requiredExtinguishers = Math.ceil(input.surfaceTotalSqm / 200)
  issues.push({
    id: `nc-extincteurs`,
    article: 'MS 39',
    norm: 'Arrêté 25 juin 1980 — Règlement de sécurité ERP',
    category: 'extincteurs',
    description: `Extincteurs portatifs obligatoires.`,
    requiredValue: `≥ ${requiredExtinguishers} extincteurs (1/200 m²)`,
    observedValue: 'À déployer',
    criticality: 'major',
    correction: `Installer ${requiredExtinguishers} extincteurs ABC 6 kg (NF EN 3-7) avec signalisation ISO 7010 F001.`,
    estimatedCostFcfa: requiredExtinguishers * 35_000 + requiredExtinguishers * 18_000,
  })

  // ═══ 6. ACCESSIBILITÉ PMR ═══
  // CDC : Loi 2005-102 + Arrêté 8 décembre 2014
  if (input.flow?.pmr) {
    const pmr = input.flow.pmr
    if (!pmr.compliant) {
      issues.push({
        id: `nc-pmr-${pmr.complianceScore}`,
        article: 'Articles 1 à 4',
        norm: 'Loi 2005-102 — Accessibilité PMR',
        category: 'pmr',
        description: `Parcours PMR non conforme.`,
        requiredValue: `Score PMR 100/100 (largeur ≥ 1,40 m, pente ≤ 5 %)`,
        observedValue: `Score PMR ${pmr.complianceScore}/100, ${pmr.stats.nonCompliantEdges} segments non conformes`,
        criticality: pmr.complianceScore < 70 ? 'critical' : 'major',
        correction: `Élargir les passages étroits, installer rampes ou ascenseurs sur les pentes > 5 %.`,
        estimatedCostFcfa: pmr.stats.narrowPassages * 1_200_000 + pmr.stats.steepSlopes * 2_500_000,
      })
    }
  }

  // ═══ 7. DISTANCES MAX SORTIE ═══
  // Tout point doit être à < 30 m d'une issue (CO 49)
  if (input.flow && input.flow.exits.length > 0) {
    let farthest = 0
    for (const s of spaces) {
      let cx = 0, cy = 0
      for (const [x, y] of s.polygon) { cx += x; cy += y }
      cx /= s.polygon.length; cy /= s.polygon.length
      let minDistToExit = Infinity
      for (const ex of input.flow.exits) {
        const d = Math.hypot(cx - ex.x, cy - ex.y)
        if (d < minDistToExit) minDistToExit = d
      }
      if (minDistToExit > farthest) farthest = minDistToExit
    }
    if (farthest > 30) {
      issues.push({
        id: `nc-distance-exit`,
        article: 'CO 49',
        norm: 'Arrêté 25 juin 1980 — Règlement de sécurité ERP',
        category: 'distance',
        description: `Distance d'un point à l'issue la plus proche dépasse 30 m.`,
        requiredValue: `Distance max ≤ 30 m`,
        observedValue: `${farthest.toFixed(1)} m observés`,
        criticality: 'major',
        correction: `Ajouter une issue de secours intermédiaire pour ramener la distance sous 30 m.`,
        estimatedCostFcfa: 850_000,
      })
    }
  }

  // ─── Agrégation ─────────────────────────

  const byCategory: Record<NonConformity['category'], number> = {
    'issues-secours': 0, 'eclairage-securite': 0, 'extincteurs': 0,
    'plan-evacuation': 0, 'signalétique': 0, 'pmr': 0,
    'vidéo-protection': 0, 'circulation': 0, 'distance': 0,
    'capacité': 0, 'autre': 0,
  }
  const byCriticality: Record<Criticality, number> = {
    critical: 0, major: 0, minor: 0, observation: 0,
  }
  let totalCost = 0
  for (const i of issues) {
    byCategory[i.category]++
    byCriticality[i.criticality]++
    totalCost += i.estimatedCostFcfa ?? 0
  }

  const penalty = byCriticality.critical * 25 + byCriticality.major * 8
    + byCriticality.minor * 2 + byCriticality.observation * 0.5
  const score = Math.max(0, Math.min(100, 100 - penalty))

  let status: ErpAuditResult['status'] = 'compliant'
  if (byCriticality.critical > 0) status = 'blocking'
  else if (byCriticality.major > 2) status = 'major-issues'
  else if (byCriticality.major > 0 || byCriticality.minor > 5) status = 'minor-issues'

  return {
    nonConformities: issues,
    byCategory, byCriticality,
    conformityScore: score,
    status,
    reportRef: `ERP-AUDIT-${Date.now().toString(36).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    totalCorrectionCostFcfa: totalCost,
  }
}

// ─── Helpers ─────────────────────────────

function computeRequiredExits(effectif: number, _erpCategory: '1' | '2' | '3' | '4' | '5'): {
  minCount: number
  minWidthM: number
} {
  // CO 38 / CO 39 — la catégorie ERP affine les seuils mais on s'en tient
  // au modèle effectif pour la V1 (l'ajustement par catégorie sera ajouté
  // quand le bureau de contrôle The Mall aura validé la grille exacte).
  if (effectif >= 1500) return { minCount: 4, minWidthM: 2.4 }    // > 4 UP
  if (effectif >= 700)  return { minCount: 3, minWidthM: 1.8 }
  if (effectif >= 200)  return { minCount: 2, minWidthM: 1.4 }
  if (effectif >= 50)   return { minCount: 2, minWidthM: 0.9 }
  return { minCount: 1, minWidthM: 0.9 }
}

// ─── Reporting (SEC-06) ─────────────────

export function summarizeAudit(audit: ErpAuditResult): string[] {
  const lines: string[] = []
  lines.push(`Référence audit : ${audit.reportRef}`)
  lines.push(`Score de conformité : ${audit.conformityScore}/100 — Statut : ${audit.status}`)
  lines.push(`Total non-conformités : ${audit.nonConformities.length}`)
  lines.push(`  · Critiques : ${audit.byCriticality.critical}`)
  lines.push(`  · Majeures : ${audit.byCriticality.major}`)
  lines.push(`  · Mineures : ${audit.byCriticality.minor}`)
  lines.push(`  · Observations : ${audit.byCriticality.observation}`)
  lines.push(`Coût correction estimé : ${audit.totalCorrectionCostFcfa.toLocaleString('fr-FR')} FCFA`)
  return lines
}
