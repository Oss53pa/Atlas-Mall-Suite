// ═══ TYPES PARTAGÉS — Atlas Mall Suite ═══

export type FloorLevel = 'B2' | 'B1' | 'RDC' | 'R+1' | 'R+2' | 'R+3' | 'Terrasse'

export type SpaceType =
  | 'parking' | 'commerce' | 'restauration' | 'circulation'
  | 'technique' | 'backoffice' | 'financier' | 'sortie_secours'
  | 'loisirs' | 'services' | 'hotel' | 'bureaux' | 'exterieur'

export type TransitionType =
  | 'escalier_fixe' | 'escalator_montant' | 'escalator_descendant'
  | 'ascenseur' | 'rampe_pmr' | 'escalier_secours' | 'monte_charge'

export interface TransitionNode {
  id: string
  type: TransitionType
  fromFloor: FloorLevel
  toFloor: FloorLevel
  x: number
  y: number
  pmr: boolean
  capacityPerMin: number
  label: string
}

export interface Floor {
  id: string
  projectId?: string
  level: FloorLevel
  order: number
  svgPath?: string
  dwgUrl?: string
  widthM: number
  heightM: number
  zones: Zone[]
  transitions: TransitionNode[]
}

export interface Zone {
  id: string
  floorId: string
  label: string
  type: SpaceType
  x: number
  y: number
  w: number
  h: number
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  description?: string
  surfaceM2?: number
  lux?: number
}

export type CameraModel =
  | 'XNV-8080R' | 'QNV-8080R' | 'PTZ QNP-9300RWB' | 'PNM-9000VQ'
  | 'QNO-8080R' | 'XNF-9300RV' | 'DS-2CD2T47G2' | 'IPC-HDW3849H'
  | 'PTZ-P3'

export interface Camera {
  id: string
  floorId: string
  label: string
  model: CameraModel
  x: number
  y: number
  angle: number
  fov: number
  range: number
  rangeM: number
  color: string
  note?: string
  priority: 'normale' | 'haute' | 'critique'
  wisefmEquipmentId?: string
  capexFcfa: number
  autoPlaced: boolean
  coverageScore?: number
}

export interface Door {
  id: string
  floorId: string
  label: string
  x: number
  y: number
  zoneType: SpaceType
  isExit: boolean
  hasBadge: boolean
  hasBiometric: boolean
  hasSas: boolean
  ref: string
  normRef: string
  note: string
  widthM: number
  wisefmEquipmentId?: string
  capexFcfa: number
}

export interface BlindSpot {
  id: string
  floorId: string
  x: number
  y: number
  w: number
  h: number
  severity: 'critique' | 'elevee' | 'normale'
  surfaceM2: number
  parentZoneId: string
  sessionCount: number
}

export interface SecurityScore {
  total: number
  camScore: number
  zoneScore: number
  doorScore: number
  exitScore: number
  coverage: number
  issues: string[]
  norm: 'APSAD R82'
  generatedAt: string
}

export interface Bottleneck {
  id: string
  floorId: string
  x: number
  y: number
  entityId: string
  entityType: 'door' | 'transition'
  queueLength: number
  waitTimeSec: number
}

export interface EvacuationFrame {
  time: number
  agents: { id: string; floorId: string; x: number; y: number; evacuated: boolean }[]
}

export interface FloorEvacResult {
  floorId: string
  level: FloorLevel
  totalAgents: number
  evacuatedCount: number
  timeSec: number
  bottlenecks: Bottleneck[]
}

export interface EvacuationResult {
  totalTimeSec: number
  conformNFS61938: boolean
  bottlenecks: Bottleneck[]
  frames: EvacuationFrame[]
  recommendations: string[]
  floorResults: FloorEvacResult[]
}

export type SecurityScenario =
  | 'vol_etalage' | 'intrusion_nocturne' | 'incendie'
  | 'mouvement_foule' | 'pickpocket' | 'agression_parking'

export type FluxScenario =
  | 'journee_normale' | 'tabaski' | 'noel'
  | 'rentree_scolaire' | 'evenement'

export interface MonteCarloResult {
  scenario: string
  runs: number
  resilienceScore: number
  avgDetectionTimeSec: number
  failureZones: { zoneId: string; failureRate: number }[]
  heatmapData: number[][]
}

export interface EvacuationScenario {
  name: string
  originFloorId?: string
  originZoneId?: string
  occupancyMultiplier: number
  disabledExits?: string[]
  disabledTransitions?: string[]
}

// ═══ TYPES PARCOURS (VOL. 3) ═══

export type POIType =
  | 'enseigne' | 'sortie' | 'sortie_secours' | 'toilettes' | 'ascenseur'
  | 'escalator' | 'parking' | 'cosmos_club' | 'restauration' | 'totem'
  | 'caisse' | 'service_client' | 'pharmacie' | 'banque' | 'hotel'

export type SignageType =
  | 'totem_3m' | 'totem_5m' | 'panneau_dir_suspendu' | 'panneau_dir_mural'
  | 'banniere_suspend' | 'marquage_sol' | 'borne_interactive'
  | 'enseigne_facade' | 'plaque_porte' | 'numero_cellule'
  | 'pictogramme_pmr' | 'panneau_toilettes' | 'sortie_secours_led'
  | 'bloc_autonome' | 'plan_evacuation' | 'interdiction_fumee'

export interface POI {
  id: string
  floorId: string
  label: string
  type: POIType
  x: number
  y: number
  pmr: boolean
  color: string
  icon: string
  note?: string
  cosmosClubOffre?: string
  qrUrl?: string
  linkedFloorId?: string
}

export interface SignageItem {
  id: string
  floorId: string
  type: SignageType
  x: number
  y: number
  orientationDeg: number
  poseHeightM: number
  textHeightMm: number
  maxReadingDistanceM: number
  visibilityScore: number
  isLuminous: boolean
  requiresBAES: boolean
  content?: string
  ref: string
  capexFcfa: number
  normRef: string
  proph3tNote?: string
  autoPlaced?: boolean
}

export interface MomentCle {
  id: string
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7
  name: string
  floorId: string
  x: number
  y: number
  poiId?: string
  kpi: string
  friction: string
  recommendation: string
  cosmosClubAction?: string
  signageItems: string[]
}

export interface VisitorProfile {
  id: string
  name: string
  speed: number
  pmrRequired: boolean
  attractors: POIType[]
  dwellMultiplier: number
  exposureByEnsigne?: Record<string, number>
}

export interface NavigationNode {
  id: string
  x: number
  y: number
  floorId: string
  poiId?: string
  label?: string
  isTransition: boolean
}

export interface NavigationEdge {
  id: string
  from: string
  to: string
  distanceM: number
  pmr: boolean
  floorId: string
}

export interface InterFloorEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  transitionId: string
  timeSec: number
  pmr: boolean
}

export interface NavigationGraph {
  nodes: NavigationNode[]
  edges: NavigationEdge[]
  floorId: string
  interFloorEdges: InterFloorEdge[]
}

export interface PathResult {
  path: NavigationNode[]
  totalDistanceM: number
  totalTimeSec: number
  floorsTraversed: FloorLevel[]
  pmrCompliant: boolean
  instructions: string[]
}

// ═══ TYPES MÉMOIRE PROPH3T ═══

export interface ProPh3tMemory {
  id: string
  projectId: string
  sessionId: string
  timestamp: string
  eventType: 'placement' | 'modification' | 'deletion' | 'analysis' | 'report' | 'alert_ignored'
  entityType: 'camera' | 'door' | 'poi' | 'signage' | 'zone' | 'transition'
  entityId: string
  description: string
  impactMetric?: string
  floorLevel?: string
  userId?: string
}

export interface ProjectMemorySummary {
  totalSessions: number
  lastActivity: string
  keyDecisions: ProPh3tMemory[]
  unresolvedAlerts: ProPh3tMemory[]
  progressMetrics: {
    coverageEvolution: { date: string; coverage: number }[]
    scoreEvolution: { date: string; score: number }[]
    capexEvolution: { date: string; totalFcfa: number }[]
  }
  proph3tNarrative: string
}

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

// ═══ TYPES CHAT ═══

export interface ChatMessage {
  id: string
  role: 'user' | 'proph3t' | 'claude'
  content: string
  timestamp: string
  references?: string[]
}

export interface ChatAnswer {
  text: string
  type: 'info' | 'alerte' | 'simulation' | 'rapport' | 'aide'
  references?: string[]
  suggestions?: string[]
  affectedEntities?: string[]
}

// ═══ TYPES CASCADE ═══

export type CascadeTrigger =
  | { type: 'camera_moved'; cameraId: string }
  | { type: 'camera_added'; cameraId: string }
  | { type: 'camera_deleted'; cameraId: string }
  | { type: 'door_changed'; doorId: string }
  | { type: 'zone_changed'; zoneId: string }
  | { type: 'transition_changed'; transitionId: string }
  | { type: 'signage_changed'; signageId: string }
  | { type: 'poi_changed'; poiId: string }
  | { type: 'floor_imported'; floorId: string }
  | { type: 'full_recalc' }

export interface CascadeResult {
  score: SecurityScore
  coverage: number
  blindSpots: BlindSpot[]
  doorRecommendations: DoorRecommendation[]
  signageAlerts: string[]
  durationMs: number
  coverageByFloor: Record<string, number>
}

// ═══ TYPES CAPEX ═══

export interface CapexItem {
  id: string
  entityId: string
  entityType: 'camera' | 'door' | 'signage' | 'mobilier'
  designation: string
  reference: string
  unitPriceFcfa: number
  quantity: number
  totalPriceFcfa: number
  budgetLine: string
}

// ═══ TYPES BIBLIOTHÈQUE ═══

export interface LibraryItem {
  id: string
  category: 'camera' | 'door' | 'signage' | 'mobilier_pmr'
  ref: string
  name: string
  brand: string
  svgIcon: string
  priceFcfa: number
  normRef: string
  specs: Record<string, string | number | boolean>
  usageRecommendation: string
}

// ═══ TYPES WISEFM / COCKPIT ═══

export interface WiseFMLink {
  entityId: string
  entityType: string
  wisefmId: string
  status: 'operationnel' | 'maintenance' | 'panne' | 'a_installer'
  lastMaintenance?: string
  nextMaintenance?: string
}

export interface WiseFMEquipment {
  id: string
  wisefmId: string
  name: string
  type: 'camera' | 'door' | 'sensor' | 'alarm'
  location: string
  floorId: string
  status: 'operationnel' | 'maintenance' | 'panne' | 'a_installer'
  firmware?: string
  lastSync?: string
  metadata?: Record<string, string | number | boolean>
}

export interface WiseFMAlert {
  id: string
  equipmentId: string
  severity: 'critique' | 'haute' | 'moyenne' | 'basse'
  message: string
  timestamp: string
  acknowledged: boolean
  resolvedAt?: string
}

export interface CockpitMilestone {
  zoneId: string
  milestoneId: string
  label: string
  dueDate: string
  status: 'a_venir' | 'en_cours' | 'termine' | 'en_retard'
}

export interface CockpitUpdate {
  id: string
  milestoneId: string
  timestamp: string
  author: string
  content: string
  attachments?: string[]
  status: 'a_venir' | 'en_cours' | 'termine' | 'en_retard'
}

// ═══ TYPES BENCHMARK ═══

export interface MallBenchmark {
  name: string
  city: string
  country: string
  surfaceM2: number
  cameraDensityPer100m2: number
  signageDensityPer100m2: number
  evacuationTimeSec: number
  securityScore: number
  parcoursScore: number
  classe: 'A' | 'B' | 'C'
}

// ═══ TYPES RECOMMANDATION PORTE ═══

export interface DoorRecommendation {
  type: SpaceType
  ref: string
  hasBadge: boolean
  hasBiometric: boolean
  hasSas: boolean
  normRef: string
  note: string
  capexFcfa: number
}

// ═══ TYPES CLASSIFICATION DXF ═══

export interface LayerClassification {
  layerName: string
  entityType: 'zone' | 'camera' | 'door' | 'transition' | 'unknown'
  confidence: number
  spaceType?: SpaceType
  reason: string
}

export interface DXFEntity {
  type: string
  layer: string
  vertices?: { x: number; y: number }[]
  position?: { x: number; y: number }
  insertionPoint?: { x: number; y: number }
  name?: string
  width?: number
  height?: number
}

// ═══ TYPES SIMULATION / FLUX ═══

export interface GestureOptions {
  panEnabled: boolean
  zoomEnabled: boolean
  rotateEnabled: boolean
  minZoom: number
  maxZoom: number
}

export interface AgentPosition {
  id: string
  floorId: string
  x: number
  y: number
  speed: number
  direction: number
  profileId: string
  evacuated: boolean
}

export interface FlowRate {
  transitionId: string
  agentsPerMin: number
  capacity: number
  saturation: number
}

export interface ZoneStatus {
  zoneId: string
  occupancy: number
  maxCapacity: number
  density: number
  alertLevel: 'normal' | 'attention' | 'critique'
}

// ═══ TYPES EXPORT RAPPORTS ═══

export interface Vol2ExportData {
  projectName: string
  generatedAt: string
  floors: Floor[]
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  transitions: TransitionNode[]
  blindSpots: BlindSpot[]
  score: SecurityScore
  coverageByFloor: Record<string, number>
  capexTotal: number
}

export interface Vol3ExportData {
  projectName: string
  generatedAt: string
  floors: Floor[]
  zones: Zone[]
  pois: POI[]
  signageItems: SignageItem[]
  parcours: MomentCle[]
  navigationGraph: NavigationGraph
  visitorProfiles: VisitorProfile[]
}

export interface Vol2ReportData {
  title: string
  generatedAt: string
  score: SecurityScore
  blindSpots: BlindSpot[]
  coverageByFloor: Record<string, number>
  doorRecommendations: DoorRecommendation[]
  capexSummary: {
    cameras: number
    doors: number
    total: number
  }
  normReferences: string[]
  recommendations: string[]
}

export interface Vol3ReportData {
  title: string
  generatedAt: string
  parcours: MomentCle[]
  signageSummary: {
    totalItems: number
    byType: Record<string, number>
    capexTotal: number
    visualBreaks: number
  }
  poiSummary: {
    totalPois: number
    byType: Record<string, number>
    pmrCompliant: number
  }
  wayfindingSummary: {
    totalNodes: number
    totalEdges: number
    pmrPaths: number
  }
  normReferences: string[]
  recommendations: string[]
}

// ═══ TYPES CASCADE v3 — INTER-VOLUMES ═══

export interface CrossVolumeInsight {
  sourceVolume: 'vol1' | 'vol2' | 'vol3'
  targetVolume: 'vol1' | 'vol2' | 'vol3'
  sourceEntityId: string
  targetEntityId: string
  insightType: 'conflict' | 'opportunity' | 'risk' | 'optimization'
  severity: 'critique' | 'attention' | 'info'
  title: string
  explanation: string
  recommendedAction: string
}

export interface JourneyImpact {
  affectedMoments: string[]
  zoneHeatValues: Record<string, number>
  axisHeatValues: Record<string, number>
}

export interface CommercialImpact {
  affectedTenants: string[]
  revenueImpactFcfa: number
}

export interface CascadeResultV3 extends CascadeResult {
  capex: number
  complianceCertifiable: boolean
  journeyImpact: JourneyImpact | null
  commercialImpact: CommercialImpact | null
  crossVolumeInsights: CrossVolumeInsight[]
  proactiveInsights: ProactiveInsight[]
}

// ═══ TYPES PHASAGE TEMPOREL ═══

export interface ProjectPhase {
  id: string
  name: string
  targetDate: string
  confirmedTenantIds: string[]
  plannedCameraIds: string[]
  plannedDoorIds: string[]
  targetOccupancyRate: number
  notes?: string
}

export interface PhaseSimulation {
  phase: ProjectPhase
  activeZones: Zone[]
  activeCameras: Camera[]
  activeDoors: Door[]
  securityScore: SecurityScore
  capexPhase: number
  revenueMonthlyFcfa: number
  occupancyRate: number
  isASPADCertifiable: boolean
  blockers: string[]
  warnings: string[]
  proph3tAdvice: string
}

// ═══ TYPES APPRENTISSAGE BAYÉSIEN ═══

export interface RecommendationFeedbackV2 {
  id: string
  projectId: string
  ruleId: string
  ruleCategory: string
  recommendation: string
  userAction: 'accepted' | 'rejected' | 'modified' | 'deferred'
  modifiedValue?: string
  context: Record<string, string>
  timestamp: string
}

export interface RuleWeight {
  ruleId: string
  baseWeight: number
  adjustedWeight: number
  acceptanceRate: number
  totalFeedbacks: number
  trend: 'improving' | 'stable' | 'declining'
  lastUpdated: string
  userPreferences: {
    preferredCameraModel?: string
    preferredDoorBrand?: string
    signageHeightOffset?: number
    capexThreshold?: number
  }
}

// ═══ TYPES INSIGHTS PROACTIFS ═══

export type InsightLevel = 'bloquant' | 'attention' | 'opportunite'

export interface ProactiveInsight {
  id: string
  level: InsightLevel
  sessionCount: number
  title: string
  explanation: string
  impact: string
  action: string
  normReference?: string
  estimatedEffortMin: number
  zoomTarget?: { x: number; y: number; floorId: string }
}

// ═══ TYPES BENCHMARK v2 ═══

export interface MallBenchmarkV2 {
  id: string
  name: string
  city: string
  country: string
  glaM2: number
  classType: 'A' | 'B' | 'C'
  cameraDensity: number
  securityScore: number
  exitCount: number
  occupancyRate: number
  avgRentFcfaM2: number
  avgDwellTimeMin: number
  dailyVisitorBase: number
  signagetDensity: number
  anchorTypes: string[]
  openYear: number
}

export interface BenchmarkReport {
  groupLabel: string
  peerCount: number
  percentiles: Record<string, number>
  stats: Record<string, { min: number; max: number; avg: number; median: number }>
  narrative: string
  topPerformer: MallBenchmarkV2
  recommendations: string[]
}

export interface ProjectMetrics {
  cameraDensity: number
  securityScore: number
  occupancyRate: number
  avgDwellTimeMin: number
  signagetDensity: number
  exitCount: number
}

// ═══ TYPES TENANT (VOL.1 CROSS-REF) ═══

export interface TenantInfo {
  spaceId: string
  name: string
  status: 'active' | 'vacant' | 'confirmed' | 'negotiation'
  sector: string
  rentFcfaM2?: number
}

// ═══ CONTEXTE PROJET COMPLET v3 ═══

export interface FullProjectContextV3 extends FullProjectContext {
  tenants?: TenantInfo[]
  phases?: ProjectPhase[]
  lastApprovedVersion?: { date: string; snapshotId: string } | null
  crossVolumeInsights?: CrossVolumeInsight[]
  moments?: MomentCle[]
  signageGaps?: Array<{
    id: string
    axisId: string
    description: string
    distanceM: number
    recommendedPoseHeight: number
  }>
  userPreferences?: Record<string, unknown>
  projectClass?: 'A' | 'B' | 'C'
}
