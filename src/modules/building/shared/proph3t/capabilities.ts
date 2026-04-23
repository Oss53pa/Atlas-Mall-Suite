// ═══ PROPH3T CAPABILITIES — Matrice exhaustive des compétences par volume ═══
//
// Documente formellement ce que Proph3t sait faire pour chaque volume,
// découpé selon les 4 axes de l'intelligence artificielle appliquée :
//
//   • LEARN    — apprend des données du projet + feedback utilisateur
//   • PREDICT  — produit des prédictions chiffrées (KPIs, délais, CA)
//   • SUGGEST  — propose des alternatives / ce qu'il ferait à la place
//   • RECOMMEND— actions chiffrées (coût, délai, impact) priorisées
//
// Chaque capability pointe vers :
//   - le skill qui l'implémente (analyzeSecurity, analyzeCommercialMix, …)
//   - le moteur algorithmique sous-jacent
//   - le niveau de maturité (production / beta / experimental)

export type VolumeId = 'vol1' | 'vol2' | 'vol3' | 'vol4' | 'transverse'
export type CapabilityAxis = 'learn' | 'predict' | 'suggest' | 'recommend'
export type MaturityLevel = 'production' | 'beta' | 'experimental'

export interface Proph3tCapability {
  id: string
  volume: VolumeId
  axis: CapabilityAxis
  title: string
  description: string
  /** Nom du skill qui expose cette capability. */
  skill: string
  /** Moteur algorithmique sous-jacent. */
  engine: string
  /** Sources normes/benchmarks. */
  normReference?: string
  maturity: MaturityLevel
  /** Exemple concret d'usage. */
  example: string
}

// ─── MATRICE COMPLÈTE ─────────────────────────────────────

export const PROPH3T_CAPABILITIES: Proph3tCapability[] = [
  // ═══════════════ VOL.1 · COMMERCIAL ═══════════════
  {
    id: 'vol1.learn.tenant-performance',
    volume: 'vol1', axis: 'learn',
    title: 'Apprentissage performance enseignes',
    description: 'Apprend le CA/m² de chaque enseigne à partir des données historiques et benchmarks sectoriels. Affine le modèle à chaque nouveau mois de ventes.',
    skill: 'analyzeCommercialMix',
    engine: 'tenantPerformanceModel',
    normReference: 'Benchmark ICSC + Cushman',
    maturity: 'production',
    example: 'Après 6 mois de données, Proph3t sait que "MAROQUINERIE LUXE" performe 1.3× la moyenne benchmark.',
  },
  {
    id: 'vol1.predict.revenue',
    volume: 'vol1', axis: 'predict',
    title: 'Prédiction de CA par local',
    description: 'Mini-GBDT (gradient-boosted trees) calibré sur benchmarks de 50+ malls africains. Prédit le CA prévisionnel d\'un local selon sa surface, catégorie, position, environnement.',
    skill: 'analyzeCommercialMix',
    engine: 'revenueForestEngine',
    normReference: 'Gradient-boosted decision trees (Chen & Guestrin 2016)',
    maturity: 'production',
    example: '"Ce local de 120m² en galerie sud devrait générer 18.5 M FCFA/mois (IC 95% : 14.2-23.8M)."',
  },
  {
    id: 'vol1.suggest.mix-alternatives',
    volume: 'vol1', axis: 'suggest',
    title: 'Suggestions de mix alternatives',
    description: 'Algorithme génétique (100 générations) qui propose 3 alternatives de mix enseigne optimisées pour le CA/m² global.',
    skill: 'analyzeCommercialMix',
    engine: 'commercialEngine (genetic)',
    normReference: 'Genetic algorithm + CA/m² fitness',
    maturity: 'production',
    example: '"Swap Zara ↔ H&M : +2.3% CA total, mais -5% affluence zone nord."',
  },
  {
    id: 'vol1.recommend.lease-actions',
    volume: 'vol1', axis: 'recommend',
    title: 'Actions leasing priorisées',
    description: 'Recommandations chiffrées sur le renouvellement des baux, ajustement des loyers, relocalisation d\'enseignes sous-performantes.',
    skill: 'analyzeCommercialMix',
    engine: 'commercialEngine',
    normReference: 'SYSCOHADA + pratiques leasing mall',
    maturity: 'production',
    example: '"Renouveler ZARA à +8% de loyer (économie vs prospection nouveau preneur : 45 MFCFA)."',
  },

  // ═══════════════ VOL.2 · SÉCURITÉ ═══════════════
  {
    id: 'vol2.learn.risk-patterns',
    volume: 'vol2', axis: 'learn',
    title: 'Apprentissage patterns de risque',
    description: 'Risk Bayésien qui met à jour les probabilités d\'incident par zone à chaque nouveau rapport d\'incident enregistré.',
    skill: 'auditSecurity',
    engine: 'bayesianRisk',
    normReference: 'Bayes + APSAD R82',
    maturity: 'production',
    example: 'Après 3 incidents en B1 parking, la priorité de couverture de cette zone passe de 3/5 à 5/5.',
  },
  {
    id: 'vol2.predict.coverage',
    volume: 'vol2', axis: 'predict',
    title: 'Prédiction couverture caméras',
    description: 'Calcul géométrique exact de la couverture (cônes de vision × obstacles) + simulation Monte-Carlo intervention.',
    skill: 'auditSecurity',
    engine: 'cameraCoverageEngine + monteCarloInterventionEngine',
    normReference: 'EN 62676-4 + APSAD R82',
    maturity: 'production',
    example: '"Avec les 37 caméras actuelles, couverture = 82% des zones critiques. +4 caméras → 95%."',
  },
  {
    id: 'vol2.suggest.camera-placement',
    volume: 'vol2', axis: 'suggest',
    title: 'Suggestion placements caméras',
    description: 'Optimizer glouton qui identifie les zones non couvertes et suggère les placements avec le meilleur ratio couverture/coût.',
    skill: 'auditSecurity',
    engine: 'coverageOptimizer',
    normReference: 'Greedy set-cover + heuristique géométrique',
    maturity: 'production',
    example: '"Ajouter caméra dôme à (45, 120) + (78, 34) couvre 4 zones aveugles restantes."',
  },
  {
    id: 'vol2.recommend.compliance-actions',
    volume: 'vol2', axis: 'recommend',
    title: 'Actions conformité ERP',
    description: 'Audit ERP complet (M, N, L…) + Dijkstra multi-source pour les distances d\'évacuation. Produit des actions chiffrées budgetées.',
    skill: 'auditSecurity',
    engine: 'complianceEngine + dijkstraMultiSource',
    normReference: 'ERP CO + APSAD R82 + NF S 61-938 + EN 1125',
    maturity: 'production',
    example: '"Ajouter 2 issues de secours sud → conformité ERP : 68% → 98%. Capex estimé 2.4 MFCFA."',
  },

  // ═══════════════ VOL.3 · PARCOURS CLIENT ═══════════════
  {
    id: 'vol3.learn.flow-patterns',
    volume: 'vol3', axis: 'learn',
    title: 'Apprentissage patterns de flux',
    description: 'Agent-Based Modeling (Helbing Social Force Model) qui apprend les patterns de déplacement observés et recalibre les vitesses/préférences par persona.',
    skill: 'analyzeParcours',
    engine: 'abmSocialForceEngine + parcoursAgentEngine',
    normReference: 'Helbing & Molnár 1995',
    maturity: 'production',
    example: 'Après observation terrain, vitesse moyenne observée = 1.15 m/s (vs 1.3 théorique) → Proph3t ajuste.',
  },
  {
    id: 'vol3.predict.dwell-time',
    volume: 'vol3', axis: 'predict',
    title: 'Prédiction dwell time & flux',
    description: 'Calcule le temps passé par zone et le flux de passage avec Monte-Carlo ABM. Identifie les bottlenecks avant ouverture du mall.',
    skill: 'analyzeParcours',
    engine: 'dwellTimeOptimizer + abmSocialForceEngine',
    normReference: 'Benchmark ICSC dwell-time',
    maturity: 'production',
    example: '"Zone food-court : dwell moyen 28 min · mais 14h-15h = 42 min (bottleneck prévu)."',
  },
  {
    id: 'vol3.suggest.signage-placement',
    volume: 'vol3', axis: 'suggest',
    title: 'Suggestion placements signalétique',
    description: 'Flow path engine qui calcule le chemin optimal entrée→sortie et suggère la signalétique directionnelle aux nœuds de décision avec le plus de flux.',
    skill: 'analyzeParcours',
    engine: 'flowPathEngine + signaleticsEngine',
    normReference: 'ISO 7010 + NF X 08-003',
    maturity: 'production',
    example: '"Panneau directionnel suspendu à l\'intersection (45, 80) : 340 personnes/h y passent."',
  },
  {
    id: 'vol3.recommend.god-mode-signage',
    volume: 'vol3', axis: 'recommend',
    title: 'GOD MODE signalétique (institutionnel + pub)',
    description: 'Orchestre le mobilier d\'affichage complet : institutionnel (plans, flèches, sorties) vs publicitaire (campagnes, promotions). Règles de cohabitation strictes.',
    skill: 'analyzeParcours',
    engine: 'godModeSignageEngine',
    normReference: 'ISO 7010 + charte graphique mall',
    maturity: 'production',
    example: '"32 panneaux recommandés : 18 institutionnels (totem/suspendu/mural) + 14 publicitaires (LED/rétroéclairé). 0 conflit détecté."',
  },

  // ═══════════════ VOL.4 · WAYFINDER ═══════════════
  {
    id: 'vol4.learn.usage-patterns',
    volume: 'vol4', axis: 'learn',
    title: 'Apprentissage patterns d\'usage Wayfinder',
    description: 'Analyse les itinéraires réels demandés par les visiteurs, détecte les paires A→B les plus fréquentes, identifie les zones jamais cherchées. Recalibre les poids du graphe chaque semaine.',
    skill: 'analyzeWayfinder',
    engine: 'proph3tWayfinder.buildUsageReport',
    normReference: 'Empirique — agrégation logs wayfinder_usage_logs',
    maturity: 'production',
    example: '"Top paires A→B : Entrée Nord → Carrefour (412 requêtes/jour), Sanitaires RDC (289)…"',
  },
  {
    id: 'vol4.predict.recalc-rate',
    volume: 'vol4', axis: 'predict',
    title: 'Prédiction taux de recalcul (confusion)',
    description: 'Prédit le taux de déviation utilisateur par rapport au trajet optimal — indicateur direct de la qualité de la signalétique physique.',
    skill: 'analyzeWayfinder',
    engine: 'astarEngine.checkDeviation + CUSUM',
    normReference: 'Heuristique empirique (< 15 % = bon, > 20 % = problème)',
    maturity: 'production',
    example: '"Recalc rate prévu : 14% — signalétique physique cohérente avec le graphe."',
  },
  {
    id: 'vol4.suggest.beacon-plan',
    volume: 'vol4', axis: 'suggest',
    title: 'Plan de déploiement beacons BLE',
    description: 'Calcule les positions optimales pour les beacons BLE en fonction du graphe : nœuds de décision, transits verticaux, entrées. Précision cible ±1.5m.',
    skill: 'analyzeWayfinder',
    engine: 'positioningEngine.planBeaconDeployment',
    normReference: 'BLE Trilateration + WiFi KNN fusion (EKF 2D)',
    maturity: 'production',
    example: '"42 beacons recommandés · précision prévue ±1.3m sur 95% des couloirs."',
  },
  {
    id: 'vol4.recommend.signage-corrections',
    volume: 'vol4', axis: 'recommend',
    title: 'Corrections signalétique ciblées',
    description: 'Croise les données d\'usage (recalc rate) avec le graphe pour identifier précisément où la signalétique physique est insuffisante. Recommandations chiffrées budgetées.',
    skill: 'analyzeWayfinder',
    engine: 'proph3tWayfinder.buildUsageReport + analyzeGraphQuality',
    normReference: 'Croise usage réel × topologie graphe',
    maturity: 'production',
    example: '"52% des trajets vers Carrefour Market recalculent à l\'intersection B — ajouter panneau directionnel (180k FCFA)."',
  },

  // ═══════════════ TRANSVERSE ═══════════════
  {
    id: 'transverse.learn.memory',
    volume: 'transverse', axis: 'learn',
    title: 'Mémoire projet longue',
    description: 'Proph3t se souvient de toutes les décisions, modifications et validations depuis le premier import. Accessible via chat conversationnel.',
    skill: 'memoryEngine',
    engine: 'memoryEngine + proph3t_memory table',
    normReference: 'LangChain-inspired agentic memory',
    maturity: 'production',
    example: '"Souviens-toi, le DG a refusé le placement de caméra B1 en mars, préférant renforcer l\'éclairage."',
  },
  {
    id: 'transverse.predict.monthly-report',
    volume: 'transverse', axis: 'predict',
    title: 'Rapports mensuels auto',
    description: 'Génération automatique d\'un rapport mensuel cross-volumes avec exécutive summary, KPIs, alertes et projections trimestre suivant.',
    skill: 'monthlyReportEngine',
    engine: 'monthlyReportEngine + narrativeEnricher',
    normReference: 'Standards rapport directeur mall',
    maturity: 'production',
    example: '"Mars 2026 : occupation 92% (-1pt), incidents 3 (stable), recalc rate 11% (▼ 2pts). Projection Q2 : CA +4%."',
  },
  {
    id: 'transverse.suggest.cascade',
    volume: 'transverse', axis: 'suggest',
    title: 'Cascade multi-volumes',
    description: 'Quand une action est prise dans un volume, Proph3t suggère les impacts cascadés sur les autres (ex: ajouter une sortie secours → impact flux Vol.3 → impact wayfinding Vol.4).',
    skill: 'cascadeEngine',
    engine: 'cascadeEngine + orchestrator',
    normReference: 'Inter-volume dependency graph',
    maturity: 'production',
    example: '"Tu ajoutes une sortie secours parking B1. Impact Vol.3 : recalcul des flux évac (2s). Impact Vol.4 : update graphe navigation (1s)."',
  },
  // ═══════════════ NOUVELLES COMPÉTENCES — ANOMALIES / MAINTENANCE / SCORING / CROWDING / SENTIMENT ═══════════════

  // L-01 Anomalies
  {
    id: 'transverse.learn.anomaly-baseline',
    volume: 'transverse', axis: 'learn',
    title: 'Apprentissage baseline pour détection d\'anomalies',
    description: 'CUSUM + σ-threshold + EWMA drift apprennent la baseline normale de chaque série (CA, incidents, télémetrie caméras, flux, paiements, sentiment) et signalent les dérives significatives.',
    skill: 'analyzeAnomalies',
    engine: 'anomalyDetectionEngine',
    normReference: 'Page 1954 (CUSUM) + Shewhart σ-limits',
    maturity: 'production',
    example: '"Flux couloir nord : baseline 280 pax/h σ=35. Alerte CUSUM↓ ce matin : -3.2σ pendant 2h."',
  },
  {
    id: 'transverse.predict.offline-equipment',
    volume: 'transverse', axis: 'predict',
    title: 'Watchdog équipements offline',
    description: 'Détecte les équipements silencieux au-delà du seuil heartbeat (caméras, bornes, portes). Production d\'alertes temps réel.',
    skill: 'analyzeAnomalies',
    engine: 'anomalyDetectionEngine.detectOfflineEquipments',
    normReference: 'Watchdog timer heartbeat',
    maturity: 'production',
    example: '"Caméra C-B1-04 silencieuse depuis 18 min (seuil 10 min) — à vérifier."',
  },

  // L-02 Maintenance prédictive
  {
    id: 'transverse.predict.equipment-failure',
    volume: 'transverse', axis: 'predict',
    title: 'Prédiction de panne équipement (Weibull)',
    description: 'Probabilités de panne à 30/90/180j pour chaque équipement selon distribution Weibull calibrée par type + usage + historique.',
    skill: 'analyzeMaintenance',
    engine: 'predictiveMaintenanceEngine',
    normReference: 'Weibull 1951 + MTBF industrie',
    maturity: 'production',
    example: '"Escalator E-02 : P(panne 90j) = 31 % — planifier intervention sous 30j (économie 2.7 MFCFA)."',
  },
  {
    id: 'transverse.recommend.maintenance-schedule',
    volume: 'transverse', axis: 'recommend',
    title: 'Plan maintenance préventive chiffré',
    description: 'Priorise les interventions préventives avec budget, délai, économies attendues (panne imprévue coûte 2-3× plus).',
    skill: 'analyzeMaintenance',
    engine: 'predictiveMaintenanceEngine.forecastMaintenanceBatch',
    normReference: 'RCM (Reliability-Centered Maintenance) + Weibull',
    maturity: 'production',
    example: '"12 interventions priorisées · budget 18.4 MFCFA · économies attendues 47.2 MFCFA."',
  },

  // L-03 Tenant scoring
  {
    id: 'vol1.predict.tenant-default',
    volume: 'vol1', axis: 'predict',
    title: 'Prédiction de défaut preneur (12 mois)',
    description: 'Régression logistique calibrée sur 50+ malls qui prédit la probabilité qu\'un preneur candidat soit en défaut de paiement à 12 mois.',
    skill: 'analyzeTenantScore',
    engine: 'tenantScoringEngine',
    normReference: 'Logistic regression + benchmark retail',
    maturity: 'production',
    example: '"Preneur X : score 72/100 · P(défaut) 8.4 % · recommandation : négocier garanties."',
  },
  {
    id: 'vol1.recommend.zone-matching',
    volume: 'vol1', axis: 'recommend',
    title: 'Matching preneur × zone optimale',
    description: 'Pour un preneur candidat, calcule le top 3 zones avec fit catégoriel (synergies + cannibalisation) et CA attendu.',
    skill: 'analyzeTenantScore',
    engine: 'tenantScoringEngine.scoreTenantApplicant',
    normReference: 'Category fit + synergies + cannibalization',
    maturity: 'production',
    example: '"Pour bijouterie Y : zone A1 (fit 89, synergie mode-haut-gamme) → CA attendu 14.2 MFCFA/an."',
  },

  // L-04 Crowding
  {
    id: 'vol3.predict.overcrowding',
    volume: 'vol3', axis: 'predict',
    title: 'Prédiction surpopulation (6h horizon)',
    description: 'Lissage saisonnier (Holt-Winters simplifié) + seuils densité ISO pour prédire les risques de surpopulation / piétinement.',
    skill: 'analyzeCrowding',
    engine: 'crowdingPredictor.forecastCrowdingBatch',
    normReference: 'ISO 20382 densités sécurité',
    maturity: 'production',
    example: '"Zone food-court : pic prévu 18h30 — 3.2 pax/m² (surpeuplé). Déployer 3 agents."',
  },
  {
    id: 'vol3.recommend.crowd-mitigation',
    volume: 'vol3', axis: 'recommend',
    title: 'Actions mitigation foule',
    description: 'Recommandations graduées : surveillance, déploiement agents, fermeture partielle, évacuation selon niveau de risque.',
    skill: 'analyzeCrowding',
    engine: 'crowdingPredictor',
    normReference: 'Retour d\'expérience 20 malls ouest-africains',
    maturity: 'beta',
    example: '"Critique zone entrée Sud : fermer accès 20 min + rediriger via Nord (densité projetée 4.1 pax/m²)."',
  },

  // L-05 Sentiment
  {
    id: 'transverse.learn.sentiment',
    volume: 'transverse', axis: 'learn',
    title: 'Analyse sentiment feedback clients',
    description: 'Classifie reviews/NPS/tickets en polarité (pos/neu/neg) + topics (propreté, sécurité, accueil…) + urgence.',
    skill: 'analyzeSentiment',
    engine: 'sentimentEngine',
    normReference: 'Lexique FR/EN + NRC Emotion Lexicon adapté',
    maturity: 'beta',
    example: '"28 feedbacks négatifs sur "propreté toilettes" ce mois-ci — sévérité 14.2 (top issue)."',
  },
  {
    id: 'transverse.recommend.feedback-triage',
    volume: 'transverse', axis: 'recommend',
    title: 'Triage automatique feedback urgents',
    description: 'Détecte les feedbacks critiques (sécurité, agression, discrimination) et les escalade automatiquement à la direction.',
    skill: 'analyzeSentiment',
    engine: 'sentimentEngine.analyzeSentiment',
    normReference: 'Keywords urgence + polarité',
    maturity: 'beta',
    example: '"3 feedbacks urgents escaladés (vol signalé parking) + 12 à investiguer + 47 à accuser réception."',
  },

  {
    id: 'transverse.recommend.action-plan',
    volume: 'transverse', axis: 'recommend',
    title: 'Plan d\'action consolidé',
    description: 'Consolide toutes les actions recommandées par les 4 volumes en un plan d\'action priorisé avec budget global, délai, ROI estimé.',
    skill: 'recommendationEngine',
    engine: 'recommendationEngine + consolidatedReportEngine',
    normReference: 'Priorisation ICE (Impact × Confidence × Effort)',
    maturity: 'production',
    example: '"13 actions priorisées · budget total 87 MFCFA · ROI estimé 4.2× sur 24 mois."',
  },
]

// ─── Helpers ──────────────────────────────────────────────

export function capabilitiesByVolume(volumeId: VolumeId): Proph3tCapability[] {
  return PROPH3T_CAPABILITIES.filter(c => c.volume === volumeId)
}

export function capabilitiesByAxis(axis: CapabilityAxis): Proph3tCapability[] {
  return PROPH3T_CAPABILITIES.filter(c => c.axis === axis)
}

export interface VolumeCapabilitiesSummary {
  volume: VolumeId
  axes: Record<CapabilityAxis, number>
  total: number
  maturitiesCount: Record<MaturityLevel, number>
}

export function summarizeVolumeCapabilities(volumeId: VolumeId): VolumeCapabilitiesSummary {
  const caps = capabilitiesByVolume(volumeId)
  const axes: Record<CapabilityAxis, number> = { learn: 0, predict: 0, suggest: 0, recommend: 0 }
  const maturitiesCount: Record<MaturityLevel, number> = {
    production: 0, beta: 0, experimental: 0,
  }
  for (const c of caps) {
    axes[c.axis]++
    maturitiesCount[c.maturity]++
  }
  return { volume: volumeId, axes, total: caps.length, maturitiesCount }
}

/** Couverture globale : pourcentage d'axes couverts par volume. */
export function coverageGlobalPct(): number {
  const volumes: VolumeId[] = ['vol1', 'vol2', 'vol3', 'vol4']
  const axes: CapabilityAxis[] = ['learn', 'predict', 'suggest', 'recommend']
  const expected = volumes.length * axes.length // 16 capacités minimum
  const actual = volumes.reduce((sum, v) => {
    const caps = capabilitiesByVolume(v)
    const covered = new Set(caps.map(c => c.axis))
    return sum + covered.size
  }, 0)
  return (actual / expected) * 100
}
