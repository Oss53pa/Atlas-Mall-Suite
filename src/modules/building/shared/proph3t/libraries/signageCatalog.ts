// ═══ SIGNAGE CATALOG — Bibliothèque complète signalétique centre commercial ═══
//
// 6 catégories, ~30 sous-types, chacun avec :
//   - code unique (ex: DIR-S, SEC-IS)
//   - icône (pictogramme ISO ou emoji)
//   - modèle (statique / électronique / lumineux)
//   - hauteur de pose (cm depuis sol)
//   - quantité calculée par règle métier
//   - norme applicable
//   - priorité de pose (P1 avant ouverture, P2 semaine 1, P3 mois 1)
//   - matériau + spec technique + fournisseurs CI + prix indicatif FCFA

// ─── Types ────────────────────────────────────────────

export type SignageCategoryKey =
  | 'orientation-direction'
  | 'identification-locaux'
  | 'securite-erp'
  | 'information-services'
  | 'communication-promotion'
  | 'wayfinding-numerique'

export type SignageModel = 'statique' | 'electronique' | 'lumineux' | 'statique+photoluminescent'

export type SignagePriority = 'P1' | 'P2' | 'P3'

export const PRIORITY_META: Record<SignagePriority, { label: string; poseDelay: string; color: string }> = {
  P1: { label: 'Obligatoire ERP', poseDelay: 'Avant ouverture',  color: '#dc2626' },
  P2: { label: 'Fonctionnel',     poseDelay: 'Semaine 1',         color: '#f59e0b' },
  P3: { label: 'Confort',         poseDelay: 'Mois 1',            color: '#3b82f6' },
}

// ─── Règles de calcul de quantité ─────────────────────

export type QuantityRule =
  | { kind: 'per-decision-node' }                             // 1 par nœud de décision
  | { kind: 'per-entrance' }                                  // 1 par entrée principale
  | { kind: 'per-exit' }                                      // 1 par sortie de secours
  | { kind: 'per-local' }                                     // 1 par local commercial
  | { kind: 'per-elevator' }                                  // 1 par ascenseur
  | { kind: 'per-escalator' }                                 // 1 par escalator
  | { kind: 'per-stair' }                                     // 1 par escalier
  | { kind: 'per-wc-block' }                                  // 1 par bloc sanitaires
  | { kind: 'per-meters-path'; everyM: number }               // 1 tous les N mètres sur chemins
  | { kind: 'per-area-sqm'; everySqm: number }                // 1 par N m² de surface totale
  | { kind: 'per-parking-entrance' }
  | { kind: 'per-extinguisher'; defaultCount: number }        // basé sur défaut ERP (tous les 200m²)
  | { kind: 'per-floor-zone'; zoneSqm: number }               // 1 par zone de N m² par niveau
  | { kind: 'per-vehicle-access' }                            // 1 par accès véhicule
  | { kind: 'fixed'; count: number }                          // quantité fixe
  | { kind: 'per-secondary-corridor'; minLengthM: number }    // 1 par couloir > N m
  | { kind: 'per-promenade-meter' }                           // 1 par mètre linéaire de promenade principale
  | { kind: 'per-carrefour-promenade'; divisor: number }      // 1 par N carrefours
  | { kind: 'custom-event' }                                  // événementiel (variable)

// ─── Catégorie metadata ───────────────────────────────

export const SIGNAGE_CATEGORY_META: Record<SignageCategoryKey, {
  label: string
  icon: string
  color: string
  order: number
}> = {
  'orientation-direction':   { label: 'Orientation & direction',    icon: '↗', color: '#f59e0b', order: 1 },
  'identification-locaux':   { label: 'Identification locaux',       icon: '🏷', color: '#3b82f6', order: 2 },
  'securite-erp':            { label: 'Sécurité & ERP',              icon: '🚨', color: '#dc2626', order: 3 },
  'information-services':    { label: 'Information & services',      icon: 'ⓘ', color: '#10b981', order: 4 },
  'communication-promotion': { label: 'Communication & promotion',   icon: '📣', color: '#b38a5a', order: 5 },
  'wayfinding-numerique':    { label: 'Wayfinding numérique',        icon: '◉', color: '#b38a5a', order: 6 },
}

// ─── Sous-type de signalétique ─────────────────────────

export interface SignageTypeMeta {
  code: string                      // code unique ex: DIR-S
  label: string                     // nom humain
  category: SignageCategoryKey
  icon: string                      // pictogramme pour légendes
  color: string
  /** Modèles disponibles pour ce type. */
  availableModels: SignageModel[]
  /** Modèle par défaut. */
  defaultModel: SignageModel
  /** Hauteur de pose en cm depuis le sol. */
  heightCm: { min: number; max: number; default: number }
  /** Dimensions standard (cm). */
  dimensions: { widthCm: number; heightCm: number; depthCm?: number }
  /** Matériau recommandé. */
  material: string
  /** Règle de calcul de quantité. */
  quantityRule: QuantityRule
  /** Normes applicables. */
  standards: string[]
  /** Priorité de pose. */
  priority: SignagePriority
  /** Fournisseurs CI recommandés (3 max). */
  suppliersCI: string[]
  /** Prix indicatif unitaire (FCFA). */
  priceFcfa: number
  /** Description. */
  description: string
  /** Indique si obligation ERP. */
  erpRequired: boolean
}

// ─── Bibliothèque complète (30 types) ──────────────────

export const SIGNAGE_CATALOG: Record<string, SignageTypeMeta> = {

  // ═══ 1. ORIENTATION & DIRECTION ═══════════════════

  'DIR-S': {
    code: 'DIR-S',
    label: 'Directionnel suspendu',
    category: 'orientation-direction',
    icon: '↗', color: '#f59e0b',
    availableModels: ['statique', 'lumineux'],
    defaultModel: 'lumineux',
    heightCm: { min: 300, max: 450, default: 350 },
    dimensions: { widthCm: 120, heightCm: 40, depthCm: 10 },
    material: 'Caisson aluminium rétroéclairé LED, double face',
    quantityRule: { kind: 'per-decision-node' },
    standards: ['ISO 7001'],
    priority: 'P2',
    suppliersCI: ['Signalétique CI', 'ASG Industries', 'LM Signa'],
    priceFcfa: 320_000,
    description: 'Panneau directionnel suspendu aux nœuds de promenade, carrefours, têtes d\'escalators.',
    erpRequired: false,
  },

  'DIR-M': {
    code: 'DIR-M',
    label: 'Directionnel mural',
    category: 'orientation-direction',
    icon: '→', color: '#fbbf24',
    availableModels: ['statique', 'lumineux'],
    defaultModel: 'statique',
    heightCm: { min: 180, max: 250, default: 210 },
    dimensions: { widthCm: 80, heightCm: 30, depthCm: 5 },
    material: 'Applique murale aluminium, vinyl imprimé UV',
    quantityRule: { kind: 'per-secondary-corridor', minLengthM: 15 },
    standards: ['ISO 7001'],
    priority: 'P2',
    suppliersCI: ['Signalétique CI', 'LM Signa'],
    priceFcfa: 95_000,
    description: 'Applique directionnelle pour couloirs secondaires et zones de service.',
    erpRequired: false,
  },

  'DIR-SOL': {
    code: 'DIR-SOL',
    label: 'Signalétique au sol',
    category: 'orientation-direction',
    icon: '◼', color: '#d97706',
    availableModels: ['statique', 'lumineux'],
    defaultModel: 'statique',
    heightCm: { min: 0, max: 0, default: 0 },
    dimensions: { widthCm: 50, heightCm: 50 },
    material: 'Vinyl antidérapant classe R10 ou époxy peint',
    quantityRule: { kind: 'per-promenade-meter' },
    standards: ['ISO 7001', 'EN 13501 classement glissance'],
    priority: 'P3',
    suppliersCI: ['LM Signa', 'Pôle Graphique'],
    priceFcfa: 25_000,
    description: 'Marquage au sol pour guidage promenade, PMR et zones tactiles.',
    erpRequired: false,
  },

  'TOT-EXT': {
    code: 'TOT-EXT',
    label: 'Totem extérieur',
    category: 'orientation-direction',
    icon: '▲', color: '#b45309',
    availableModels: ['statique', 'lumineux'],
    defaultModel: 'lumineux',
    heightCm: { min: 300, max: 600, default: 450 },
    dimensions: { widthCm: 100, heightCm: 450, depthCm: 30 },
    material: 'Mât aluminium + caisson lumineux LED IP65, fondation béton',
    quantityRule: { kind: 'per-vehicle-access' },
    standards: ['NF P 98-520 mobilier urbain'],
    priority: 'P1',
    suppliersCI: ['Signalétique CI', 'ASG Industries'],
    priceFcfa: 1_800_000,
    description: 'Totem extérieur pour identification du centre et accès véhicule (visibilité 50m+).',
    erpRequired: false,
  },

  'PLAN-M': {
    code: 'PLAN-M',
    label: 'Plan "Vous êtes ici"',
    category: 'orientation-direction',
    icon: '⊕', color: '#059669',
    availableModels: ['statique', 'electronique'],
    defaultModel: 'statique',
    heightCm: { min: 120, max: 160, default: 140 },
    dimensions: { widthCm: 100, heightCm: 80, depthCm: 3 },
    material: 'Panneau aluminium + vinyl laminé ou écran tactile 43"',
    quantityRule: { kind: 'per-area-sqm', everySqm: 2000 },
    standards: ['ISO 23601 plan évacuation'],
    priority: 'P2',
    suppliersCI: ['Pôle Graphique', 'Signalétique CI'],
    priceFcfa: 250_000,
    description: 'Plan de masse interactif ou imprimé aux entrées principales et carrefours.',
    erpRequired: false,
  },

  // ═══ 2. IDENTIFICATION LOCAUX ═════════════════════

  'LOT-N': {
    code: 'LOT-N',
    label: 'Numéro de lot',
    category: 'identification-locaux',
    icon: '#', color: '#3b82f6',
    availableModels: ['statique'],
    defaultModel: 'statique',
    heightCm: { min: 220, max: 280, default: 250 },
    dimensions: { widthCm: 20, heightCm: 15, depthCm: 1 },
    material: 'Plaque inox gravée ou lettres relief 3D aluminium',
    quantityRule: { kind: 'per-local' },
    standards: ['Charte graphique mall'],
    priority: 'P2',
    suppliersCI: ['LM Signa', 'Pôle Graphique'],
    priceFcfa: 35_000,
    description: 'Numéro format lettre+numéro (ex: A01, B12) en façade de chaque local.',
    erpRequired: false,
  },

  'ENS': {
    code: 'ENS',
    label: 'Enseigne commerciale',
    category: 'identification-locaux',
    icon: '🏷', color: '#2563eb',
    availableModels: ['statique', 'lumineux'],
    defaultModel: 'lumineux',
    heightCm: { min: 250, max: 400, default: 320 },
    dimensions: { widthCm: 300, heightCm: 60, depthCm: 15 },
    material: 'Lettres découpées rétroéclairées LED ou caisson lumineux',
    quantityRule: { kind: 'per-local' },
    standards: ['Charte graphique The Mall'],
    priority: 'P2',
    suppliersCI: ['Signalétique CI', 'ASG Industries'],
    priceFcfa: 850_000,
    description: 'Enseigne commerciale au-dessus de chaque local (selon charte mall).',
    erpRequired: false,
  },

  'REP': {
    code: 'REP',
    label: 'Répertoire enseignes',
    category: 'identification-locaux',
    icon: '📋', color: '#1e40af',
    availableModels: ['statique', 'electronique'],
    defaultModel: 'electronique',
    heightCm: { min: 120, max: 180, default: 150 },
    dimensions: { widthCm: 90, heightCm: 140, depthCm: 10 },
    material: 'Aluminium + vinyl imprimé ou borne tactile 43"',
    quantityRule: { kind: 'per-entrance' },
    standards: [],
    priority: 'P2',
    suppliersCI: ['Pôle Graphique', 'Signalétique CI'],
    priceFcfa: 750_000,
    description: 'Annuaire complet des enseignes aux entrées principales (sync Vol.1).',
    erpRequired: false,
  },

  // ═══ 3. SÉCURITÉ & ERP ═══════════════════════════════

  'SEC-IS': {
    code: 'SEC-IS',
    label: 'Bloc BAES sortie de secours',
    category: 'securite-erp',
    icon: '🏃', color: '#dc2626',
    availableModels: ['lumineux'],
    defaultModel: 'lumineux',
    heightCm: { min: 200, max: 220, default: 210 },
    dimensions: { widthCm: 30, heightCm: 10, depthCm: 5 },
    material: 'Bloc BAES autonome 45 lm, 1h autonomie, pictogramme ISO 7010-E001',
    quantityRule: { kind: 'per-meters-path', everyM: 30 },
    standards: ['ISO 7010-E001', 'NF C71-800', 'EN 60598-2-22'],
    priority: 'P1',
    suppliersCI: ['Hager CI', 'Legrand CI', 'Schneider CI'],
    priceFcfa: 135_000,
    description: 'Bloc autonome d\'éclairage de sécurité — fond vert picto blanc, obligatoire /30m.',
    erpRequired: true,
  },

  'SEC-EXT': {
    code: 'SEC-EXT',
    label: 'Signalétique extincteur',
    category: 'securite-erp',
    icon: '🔴', color: '#b91c1c',
    availableModels: ['statique+photoluminescent'],
    defaultModel: 'statique+photoluminescent',
    heightCm: { min: 180, max: 220, default: 200 },
    dimensions: { widthCm: 20, heightCm: 20, depthCm: 1 },
    material: 'Panneau rigide photoluminescent ISO 7010-F001 rouge',
    quantityRule: { kind: 'per-extinguisher', defaultCount: 1 },
    standards: ['ISO 7010-F001', 'Arrêté 25 juin 1980 MS39'],
    priority: 'P1',
    suppliersCI: ['Protec Industrie CI', 'Signalétique CI'],
    priceFcfa: 18_000,
    description: 'Flèche de localisation au-dessus de chaque extincteur (1 tous les 200 m²).',
    erpRequired: true,
  },

  'SEC-RIA': {
    code: 'SEC-RIA',
    label: 'Signalétique RIA',
    category: 'securite-erp',
    icon: '⭘', color: '#dc2626',
    availableModels: ['statique+photoluminescent'],
    defaultModel: 'statique+photoluminescent',
    heightCm: { min: 150, max: 200, default: 180 },
    dimensions: { widthCm: 25, heightCm: 25, depthCm: 1 },
    material: 'Panneau rigide photoluminescent ISO 7010-F002',
    quantityRule: { kind: 'per-floor-zone', zoneSqm: 500 },
    standards: ['ISO 7010-F002', 'NF S 62-201'],
    priority: 'P1',
    suppliersCI: ['Protec Industrie CI', 'Signalétique CI'],
    priceFcfa: 22_000,
    description: 'Panneau de localisation du Robinet d\'Incendie Armé (1 par RIA).',
    erpRequired: true,
  },

  'SEC-EVA': {
    code: 'SEC-EVA',
    label: 'Plan d\'évacuation',
    category: 'securite-erp',
    icon: '🗺', color: '#dc2626',
    availableModels: ['statique+photoluminescent'],
    defaultModel: 'statique+photoluminescent',
    heightCm: { min: 140, max: 170, default: 150 },
    dimensions: { widthCm: 60, heightCm: 45, depthCm: 1 },
    material: 'Plaque aluminium + impression photoluminescente + cadre',
    quantityRule: { kind: 'per-floor-zone', zoneSqm: 1000 },
    standards: ['Arrêté ERP 25 juin 1980 MS41', 'ISO 23601'],
    priority: 'P1',
    suppliersCI: ['Pôle Graphique', 'Signalétique CI'],
    priceFcfa: 180_000,
    description: 'Plan d\'évacuation obligatoire 1 par niveau par zone de 1000 m².',
    erpRequired: true,
  },

  'SEC-BAES': {
    code: 'SEC-BAES',
    label: 'BAES balisage',
    category: 'securite-erp',
    icon: '💡', color: '#ea580c',
    availableModels: ['lumineux'],
    defaultModel: 'lumineux',
    heightCm: { min: 220, max: 280, default: 250 },
    dimensions: { widthCm: 30, heightCm: 15, depthCm: 5 },
    material: 'BAES autonome 45 lm, autonomie 1h, LED',
    quantityRule: { kind: 'per-meters-path', everyM: 15 },
    standards: ['NF C71-800', 'EN 60598-2-22', 'Arrêté 14 décembre 2011'],
    priority: 'P1',
    suppliersCI: ['Hager CI', 'Legrand CI', 'Schneider CI'],
    priceFcfa: 95_000,
    description: 'Balisage lumineux de sécurité — 1 tous les 15m dans les cheminements d\'évacuation.',
    erpRequired: true,
  },

  'SEC-INT': {
    code: 'SEC-INT',
    label: 'Interdictions & obligations',
    category: 'securite-erp',
    icon: '⊘', color: '#991b1b',
    availableModels: ['statique'],
    defaultModel: 'statique',
    heightCm: { min: 150, max: 220, default: 180 },
    dimensions: { widthCm: 25, heightCm: 25, depthCm: 1 },
    material: 'Panneau aluminium ou vinyl adhésif ISO 7010',
    quantityRule: { kind: 'per-floor-zone', zoneSqm: 2000 },
    standards: ['ISO 7010 série P et M'],
    priority: 'P2',
    suppliersCI: ['Signalétique CI', 'LM Signa'],
    priceFcfa: 15_000,
    description: 'Pictogrammes interdits/obligatoires (fumer, hauteur max parking, sens interdit…).',
    erpRequired: true,
  },

  // ═══ 4. INFORMATION & SERVICES ════════════════════

  'SRV-WC': {
    code: 'SRV-WC',
    label: 'Signalétique sanitaires',
    category: 'information-services',
    icon: '🚻', color: '#0ea5e9',
    availableModels: ['statique', 'lumineux'],
    defaultModel: 'statique',
    heightCm: { min: 200, max: 250, default: 220 },
    dimensions: { widthCm: 40, heightCm: 40, depthCm: 3 },
    material: 'Pictogramme aluminium double face suspendu ou mural',
    quantityRule: { kind: 'per-wc-block' },
    standards: ['ISO 7001', 'EN 17210 PMR'],
    priority: 'P2',
    suppliersCI: ['Signalétique CI', 'LM Signa'],
    priceFcfa: 65_000,
    description: 'Bloc signalétique H/F/PMR aux sanitaires + rappel directionnel /20m.',
    erpRequired: false,
  },

  'SRV-ASC': {
    code: 'SRV-ASC',
    label: 'Signalétique ascenseur',
    category: 'information-services',
    icon: '⬆', color: '#0284c7',
    availableModels: ['statique'],
    defaultModel: 'statique',
    heightCm: { min: 200, max: 300, default: 240 },
    dimensions: { widthCm: 30, heightCm: 60, depthCm: 2 },
    material: 'Panneau aluminium avec relief Braille + numérotation niveaux',
    quantityRule: { kind: 'per-elevator' },
    standards: ['EN 81-70 PMR', 'Loi 2005-102'],
    priority: 'P1',
    suppliersCI: ['Signalétique CI', 'LM Signa'],
    priceFcfa: 85_000,
    description: 'Identification ascenseur + niveaux desservis + signalétique PMR.',
    erpRequired: true,
  },

  'SRV-PKG': {
    code: 'SRV-PKG',
    label: 'Signalétique parking',
    category: 'information-services',
    icon: '🅿', color: '#0369a1',
    availableModels: ['statique', 'electronique'],
    defaultModel: 'statique',
    heightCm: { min: 0, max: 400, default: 250 },
    dimensions: { widthCm: 60, heightCm: 40 },
    material: 'Panneau galvanisé sur mât + marquage sol époxy RAL 1021',
    quantityRule: { kind: 'per-parking-entrance' },
    standards: ['NF EN 12464-2 éclairage parkings'],
    priority: 'P2',
    suppliersCI: ['ASG Industries', 'LM Signa'],
    priceFcfa: 180_000,
    description: 'Fléchage parking : marquage sol + panneaux mât + compteur places (option LED).',
    erpRequired: false,
  },

  'SRV-HOR': {
    code: 'SRV-HOR',
    label: 'Horaires d\'ouverture',
    category: 'information-services',
    icon: '🕐', color: '#065f46',
    availableModels: ['statique', 'electronique'],
    defaultModel: 'statique',
    heightCm: { min: 120, max: 180, default: 150 },
    dimensions: { widthCm: 40, heightCm: 60, depthCm: 2 },
    material: 'Plaque aluminium imprimée ou écran LCD 27"',
    quantityRule: { kind: 'per-entrance' },
    standards: ['Code de la consommation'],
    priority: 'P2',
    suppliersCI: ['Pôle Graphique', 'Signalétique CI'],
    priceFcfa: 75_000,
    description: 'Horaires du mall affichés à chaque entrée (+ 1 par local selon charte).',
    erpRequired: false,
  },

  'SRV-ACC': {
    code: 'SRV-ACC',
    label: 'Borne d\'accueil',
    category: 'information-services',
    icon: 'ⓘ', color: '#10b981',
    availableModels: ['statique', 'electronique'],
    defaultModel: 'electronique',
    heightCm: { min: 100, max: 150, default: 110 },
    dimensions: { widthCm: 80, heightCm: 110, depthCm: 50 },
    material: 'Comptoir bois/mélaminé + borne tactile + habillage enseigne',
    quantityRule: { kind: 'fixed', count: 1 },
    standards: ['EN 17210'],
    priority: 'P1',
    suppliersCI: ['Pôle Graphique', 'Cosmos Fit-out'],
    priceFcfa: 2_500_000,
    description: 'Point accueil central : 1 à l\'entrée principale pour mall classique.',
    erpRequired: false,
  },

  'PMR': {
    code: 'PMR',
    label: 'Signalétique PMR',
    category: 'information-services',
    icon: '♿', color: '#1d4ed8',
    availableModels: ['statique+photoluminescent'],
    defaultModel: 'statique+photoluminescent',
    heightCm: { min: 100, max: 150, default: 130 },
    dimensions: { widthCm: 30, heightCm: 30, depthCm: 2 },
    material: 'Pictogramme ISO 7001 bleu + bandes podotactiles + Braille complémentaire',
    quantityRule: { kind: 'per-meters-path', everyM: 25 },
    standards: ['Loi 2005-102', 'Arrêté 8 déc. 2014', 'EN 17210'],
    priority: 'P1',
    suppliersCI: ['Signalétique CI', 'LM Signa'],
    priceFcfa: 55_000,
    description: 'Continuité de signalétique PMR sur tout le parcours accessible.',
    erpRequired: true,
  },

  // ═══ 5. COMMUNICATION & PROMOTION ═══════════════════

  'COM-ECR': {
    code: 'COM-ECR',
    label: 'Écran dynamique',
    category: 'communication-promotion',
    icon: '📺', color: '#b38a5a',
    availableModels: ['electronique', 'lumineux'],
    defaultModel: 'lumineux',
    heightCm: { min: 150, max: 400, default: 250 },
    dimensions: { widthCm: 120, heightCm: 68, depthCm: 15 },
    material: 'LED indoor P2.5 ou LCD 55" / 75", lecteur réseau 4K',
    quantityRule: { kind: 'per-area-sqm', everySqm: 3000 },
    standards: ['NF EN 60529 IP30'],
    priority: 'P3',
    suppliersCI: ['Samsung CI', 'LG CI', 'Distribution CI'],
    priceFcfa: 3_200_000,
    description: 'Écrans dynamiques publicitaires + information + mode urgence.',
    erpRequired: false,
  },

  'COM-KAK': {
    code: 'COM-KAK',
    label: 'Kakémono / Oriflamme',
    category: 'communication-promotion',
    icon: '🎌', color: '#9333ea',
    availableModels: ['statique'],
    defaultModel: 'statique',
    heightCm: { min: 150, max: 300, default: 200 },
    dimensions: { widthCm: 80, heightCm: 200, depthCm: 3 },
    material: 'Tissu imprimé sublimation + structure alu démontable',
    quantityRule: { kind: 'custom-event' },
    standards: [],
    priority: 'P3',
    suppliersCI: ['Pôle Graphique', 'LM Signa'],
    priceFcfa: 65_000,
    description: 'Support événementiel temporaire (animations, promotions).',
    erpRequired: false,
  },

  'COM-VIT': {
    code: 'COM-VIT',
    label: 'Vitrophanie',
    category: 'communication-promotion',
    icon: '▥', color: '#7e22ce',
    availableModels: ['statique'],
    defaultModel: 'statique',
    heightCm: { min: 0, max: 0, default: 0 },
    dimensions: { widthCm: 100, heightCm: 200 },
    material: 'Film adhésif monomère ou polymère, impression UV',
    quantityRule: { kind: 'per-local' },
    standards: ['Charte graphique mall (max 40% vitrine)'],
    priority: 'P3',
    suppliersCI: ['Pôle Graphique', 'LM Signa'],
    priceFcfa: 45_000,
    description: 'Film adhésif sur vitrine — décor ou communication produit.',
    erpRequired: false,
  },

  'COM-LED': {
    code: 'COM-LED',
    label: 'Habillage LED façade',
    category: 'communication-promotion',
    icon: '✨', color: '#6b21a8',
    availableModels: ['electronique', 'lumineux'],
    defaultModel: 'lumineux',
    heightCm: { min: 500, max: 2000, default: 800 },
    dimensions: { widthCm: 1500, heightCm: 800, depthCm: 20 },
    material: 'Modules LED P6/P8 extérieur IP65, structure alu',
    quantityRule: { kind: 'fixed', count: 1 },
    standards: ['IP65', 'NF EN 60598-1'],
    priority: 'P3',
    suppliersCI: ['Samsung CI', 'LG CI'],
    priceFcfa: 25_000_000,
    description: 'Média de façade extérieure programmable (publicité + animations).',
    erpRequired: false,
  },

  // ═══ 6. WAYFINDING NUMÉRIQUE ═══════════════════════

  'WAY-BOR': {
    code: 'WAY-BOR',
    label: 'Borne Wayfinder',
    category: 'wayfinding-numerique',
    icon: '◉', color: '#b38a5a',
    availableModels: ['electronique'],
    defaultModel: 'electronique',
    heightCm: { min: 120, max: 140, default: 125 },
    dimensions: { widthCm: 70, heightCm: 180, depthCm: 30 },
    material: 'Borne tactile 43" PCAP + PC embarqué + habillage acier',
    quantityRule: { kind: 'per-entrance' },
    standards: ['EN 301 549 accessibilité', 'EN 17210 PMR'],
    priority: 'P2',
    suppliersCI: ['Samsung CI', 'Cosmos Tech'],
    priceFcfa: 4_500_000,
    description: 'Borne interactive de wayfinding (1 par entrée + 1 par 2 carrefours).',
    erpRequired: false,
  },

  'WAY-QR': {
    code: 'WAY-QR',
    label: 'QR code localisation',
    category: 'wayfinding-numerique',
    icon: '⊞', color: '#4f46e5',
    availableModels: ['statique'],
    defaultModel: 'statique',
    heightCm: { min: 120, max: 180, default: 150 },
    dimensions: { widthCm: 10, heightCm: 10, depthCm: 1 },
    material: 'Vinyl laminé antirayure ou plaque alu gravée',
    quantityRule: { kind: 'per-decision-node' },
    standards: ['ISO/IEC 18004 QR'],
    priority: 'P3',
    suppliersCI: ['LM Signa', 'Pôle Graphique'],
    priceFcfa: 5_000,
    description: 'QR code à chaque nœud de décision — ouvre le wayfinder mobile.',
    erpRequired: false,
  },

  'WAY-BLE': {
    code: 'WAY-BLE',
    label: 'Beacon BLE',
    category: 'wayfinding-numerique',
    icon: '📡', color: '#3730a3',
    availableModels: ['electronique'],
    defaultModel: 'electronique',
    heightCm: { min: 250, max: 400, default: 300 },
    dimensions: { widthCm: 8, heightCm: 8, depthCm: 3 },
    material: 'Balise Bluetooth 5.0 iBeacon, pile 3 ans, fixation plafond',
    quantityRule: { kind: 'per-meters-path', everyM: 10 },
    standards: ['Bluetooth 5.0', 'iBeacon Apple'],
    priority: 'P3',
    suppliersCI: ['Cosmos Tech', 'Samsung CI'],
    priceFcfa: 65_000,
    description: 'Balises Bluetooth pour géolocalisation indoor (nav mobile Vol.4).',
    erpRequired: false,
  },
}

// ─── Groupage ─────────────────────────────────────────

export const SIGNAGE_CODES_BY_CATEGORY: Record<SignageCategoryKey, string[]> = {
  'orientation-direction':   ['DIR-S', 'DIR-M', 'DIR-SOL', 'TOT-EXT', 'PLAN-M'],
  'identification-locaux':   ['LOT-N', 'ENS', 'REP'],
  'securite-erp':            ['SEC-IS', 'SEC-EXT', 'SEC-RIA', 'SEC-EVA', 'SEC-BAES', 'SEC-INT'],
  'information-services':    ['SRV-WC', 'SRV-ASC', 'SRV-PKG', 'SRV-HOR', 'SRV-ACC', 'PMR'],
  'communication-promotion': ['COM-ECR', 'COM-KAK', 'COM-VIT', 'COM-LED'],
  'wayfinding-numerique':    ['WAY-BOR', 'WAY-QR', 'WAY-BLE'],
}

// ─── Helpers ──────────────────────────────────────────

export function getCatalogItem(code: string): SignageTypeMeta | null {
  return SIGNAGE_CATALOG[code] ?? null
}

/** Total FCFA pour une liste de panneaux (type → quantité). */
export function estimateTotalFcfa(quantitiesByCode: Record<string, number>): number {
  let total = 0
  for (const [code, qty] of Object.entries(quantitiesByCode)) {
    const meta = SIGNAGE_CATALOG[code]
    if (meta) total += meta.priceFcfa * qty
  }
  return total
}

// ─── Migration legacy SignKind → catalog code ────────────
//
// Compatibilité : avant le catalogue complet, le store ne connaissait que
// 3 types ('direction' | 'you-are-here' | 'zone-entrance'). Cette table
// permet de migrer transparemment les PlacedSign existants en localStorage.
const LEGACY_KIND_MAP: Record<string, string> = {
  'direction':     'DIR-S',
  'you-are-here':  'PLAN-M',
  'zone-entrance': 'ENS',
}

/** Résout un kind (nouveau code catalogue OU legacy 3-types) vers une SignageTypeMeta. */
export function resolveSignageKind(kind: string): SignageTypeMeta {
  if (SIGNAGE_CATALOG[kind]) return SIGNAGE_CATALOG[kind]
  const mapped = LEGACY_KIND_MAP[kind]
  if (mapped && SIGNAGE_CATALOG[mapped]) return SIGNAGE_CATALOG[mapped]
  // Fallback : DIR-S (directionnel suspendu)
  return SIGNAGE_CATALOG['DIR-S']
}

/** Liste tous les codes du catalogue (pour pickers). */
export function listAllSignageCodes(): string[] {
  return Object.keys(SIGNAGE_CATALOG)
}
