// ═══ SPACE TYPE LIBRARY — 31 types sémantiques d'un centre commercial ═══
//
// Chaque type d'espace déclaré par l'utilisateur reçoit un SpaceTypeKey précis,
// qui pilote le moteur de signalétique pour calculer le plan optimal.
//
// Catégories :
//   - accès & circulation   (8 types)
//   - commerces & services  (6 types)
//   - équipements           (7 types)
//   - infrastructure        (7 types)
//
// Total : 28 types métier + 3 utilitaires = 31.

// ─── Keys ────────────────────────────────────────────

export type SpaceTypeCategory =
  | 'acces-circulation'
  | 'commerces-services'
  | 'equipements'
  | 'infrastructure'
  | 'autre'

export type SpaceTypeKey =
  // Accès & circulation
  | 'entree_principale' | 'entree_secondaire' | 'entree_parking' | 'entree_service'
  | 'sortie_secours' | 'promenade' | 'couloir_secondaire' | 'hall_distribution'
  // Commerces & services
  | 'local_commerce' | 'restauration' | 'loisirs' | 'services'
  | 'grande_surface' | 'kiosque'
  // Équipements
  | 'sanitaires' | 'escalator' | 'ascenseur' | 'rampe_pmr'
  | 'escalier_fixe' | 'point_information' | 'borne_wayfinder'
  // Infrastructure
  | 'parking_vehicule' | 'parking_moto' | 'zone_livraison' | 'zone_technique'
  | 'local_poubelles' | 'exterieur_parvis' | 'exterieur_voirie'
  // Utilitaires
  | 'a_definir' | 'autre' | 'a_exclure'

// ─── Niveau d'étage ─────────────────────────────────

export type FloorLevelKey = 'exterieur' | 'sous_sol' | 'rdc' | 'r_plus_1' | 'r_plus_2' | 'r_plus_3' | 'autre'

export const FLOOR_LEVEL_META: Record<FloorLevelKey, { label: string; order: number }> = {
  exterieur: { label: 'Extérieur',   order: -10 },
  sous_sol:  { label: 'Sous-sol',    order: -1 },
  rdc:       { label: 'RDC',         order: 0 },
  r_plus_1:  { label: 'R+1',         order: 1 },
  r_plus_2:  { label: 'R+2',         order: 2 },
  r_plus_3:  { label: 'R+3',         order: 3 },
  autre:     { label: 'Autre',       order: 99 },
}

// ─── Metadata par type ───────────────────────────────

export interface SpaceTypeMeta {
  label: string
  category: SpaceTypeCategory
  icon: string      // pictogramme court pour tooltips / légendes
  color: string     // couleur d'affichage dans l'UI
  /** Surface typique min/max en m² (pour détecter les aberrations). */
  expectedSqm?: { min: number; max: number }
  /** Indique si ce type déclenche de la signalétique ERP. */
  erpRequired?: boolean
  /** Description contextuelle pour l'utilisateur. */
  description: string
}

export const SPACE_TYPE_META: Record<SpaceTypeKey, SpaceTypeMeta> = {
  // ─── Accès & circulation ───
  entree_principale: {
    label: 'Entrée principale',
    category: 'acces-circulation',
    icon: '🏛', color: '#10b981',
    expectedSqm: { min: 20, max: 500 },
    erpRequired: true,
    description: 'Entrée clients flux majeur (flux > 1000 pers/h). Étoile dorée dans la hiérarchie.',
  },
  entree_secondaire: {
    label: 'Entrée secondaire',
    category: 'acces-circulation',
    icon: '🚪', color: '#34d399',
    expectedSqm: { min: 10, max: 200 },
    erpRequired: true,
    description: 'Entrée clients flux mineur, accès latéral.',
  },
  entree_parking: {
    label: 'Entrée parking',
    category: 'acces-circulation',
    icon: '🅿', color: '#3b82f6',
    expectedSqm: { min: 15, max: 300 },
    description: 'Accès piéton depuis parking voitures.',
  },
  entree_service: {
    label: 'Entrée service',
    category: 'acces-circulation',
    icon: '🚚', color: '#475569',
    expectedSqm: { min: 10, max: 100 },
    description: 'Accès livraisons et personnel, réservé.',
  },
  sortie_secours: {
    label: 'Sortie de secours',
    category: 'acces-circulation',
    icon: '🏃', color: '#dc2626',
    expectedSqm: { min: 2, max: 50 },
    erpRequired: true,
    description: 'Issue de secours ERP — BAES obligatoire (ISO 7010 E001).',
  },
  promenade: {
    label: 'Promenade principale',
    category: 'acces-circulation',
    icon: '↔', color: '#8b5cf6',
    expectedSqm: { min: 100, max: 5000 },
    description: 'Axe de circulation principal (mall walk). Nœuds de décision nombreux.',
  },
  couloir_secondaire: {
    label: 'Couloir secondaire',
    category: 'acces-circulation',
    icon: '→', color: '#a78bfa',
    expectedSqm: { min: 20, max: 500 },
    description: 'Axe de circulation secondaire vers zones de service.',
  },
  hall_distribution: {
    label: 'Hall de distribution',
    category: 'acces-circulation',
    icon: '⌂', color: '#c084fc',
    expectedSqm: { min: 30, max: 800 },
    description: 'Espace de distribution entre niveaux (atrium, rotonde).',
  },

  // ─── Commerces & services ───
  local_commerce: {
    label: 'Local commercial',
    category: 'commerces-services',
    icon: '🛍', color: '#ec4899',
    expectedSqm: { min: 15, max: 500 },
    description: 'Local commercial standard (mode, accessoires, services).',
  },
  restauration: {
    label: 'Restauration',
    category: 'commerces-services',
    icon: '🍽', color: '#f59e0b',
    expectedSqm: { min: 20, max: 1000 },
    description: 'Restaurant, food court, café, snacking.',
  },
  loisirs: {
    label: 'Loisirs',
    category: 'commerces-services',
    icon: '🎬', color: '#a855f7',
    expectedSqm: { min: 100, max: 3000 },
    description: 'Cinéma, bowling, salle de jeux, escape game.',
  },
  services: {
    label: 'Services',
    category: 'commerces-services',
    icon: '🏦', color: '#06b6d4',
    expectedSqm: { min: 10, max: 300 },
    description: 'Banque, poste, agence de voyage, coiffeur, pressing.',
  },
  grande_surface: {
    label: 'Grande surface',
    category: 'commerces-services',
    icon: '🛒', color: '#14b8a6',
    expectedSqm: { min: 500, max: 10000 },
    description: 'Anchor store, hypermarché, magasin ancre (> 500 m²).',
  },
  kiosque: {
    label: 'Kiosque',
    category: 'commerces-services',
    icon: '🛖', color: '#f43f5e',
    expectedSqm: { min: 2, max: 30 },
    description: 'Stand éphémère ou permanent en promenade.',
  },

  // ─── Équipements ───
  sanitaires: {
    label: 'Sanitaires',
    category: 'equipements',
    icon: '🚻', color: '#0ea5e9',
    expectedSqm: { min: 10, max: 150 },
    erpRequired: true,
    description: 'WC hommes/femmes/PMR (ratio ERP obligatoire).',
  },
  escalator: {
    label: 'Escalator',
    category: 'equipements',
    icon: '⬈', color: '#fb923c',
    expectedSqm: { min: 15, max: 60 },
    erpRequired: true,
    description: 'Escalator montant ou descendant. 45 s/étage en moyenne.',
  },
  ascenseur: {
    label: 'Ascenseur',
    category: 'equipements',
    icon: '⬆', color: '#2563eb',
    expectedSqm: { min: 3, max: 15 },
    erpRequired: true,
    description: 'Ascenseur (obligatoire PMR — norme EN 81-70).',
  },
  rampe_pmr: {
    label: 'Rampe PMR',
    category: 'equipements',
    icon: '♿', color: '#3b82f6',
    expectedSqm: { min: 5, max: 80 },
    erpRequired: true,
    description: 'Rampe d\'accès PMR conforme (pente ≤ 5 %).',
  },
  escalier_fixe: {
    label: 'Escalier fixe',
    category: 'equipements',
    icon: '◇', color: '#64748b',
    expectedSqm: { min: 5, max: 60 },
    erpRequired: true,
    description: 'Escalier de service ou public (issue de secours).',
  },
  point_information: {
    label: 'Point information',
    category: 'equipements',
    icon: 'ⓘ', color: '#10b981',
    expectedSqm: { min: 3, max: 30 },
    description: 'Accueil central, borne d\'information, conciergerie.',
  },
  borne_wayfinder: {
    label: 'Borne wayfinder',
    category: 'equipements',
    icon: '◉', color: '#6366f1',
    expectedSqm: { min: 1, max: 5 },
    description: 'Borne interactive tactile (Vol.4 Wayfinder).',
  },

  // ─── Infrastructure ───
  parking_vehicule: {
    label: 'Parking véhicule',
    category: 'infrastructure',
    icon: '🅿', color: '#60a5fa',
    expectedSqm: { min: 500, max: 50000 },
    description: 'Zone de stationnement voiture (place 2.5 × 5 m).',
  },
  parking_moto: {
    label: 'Parking 2-roues',
    category: 'infrastructure',
    icon: '🏍', color: '#7dd3fc',
    expectedSqm: { min: 20, max: 1000 },
    description: 'Zone moto / vélo.',
  },
  zone_livraison: {
    label: 'Zone livraison',
    category: 'infrastructure',
    icon: '📦', color: '#0f766e',
    expectedSqm: { min: 30, max: 1000 },
    description: 'Quai de déchargement, zone logistique.',
  },
  zone_technique: {
    label: 'Zone technique',
    category: 'infrastructure',
    icon: '⚙', color: '#475569',
    expectedSqm: { min: 5, max: 500 },
    description: 'Local technique, chaufferie, TGBT, CVC.',
  },
  local_poubelles: {
    label: 'Local poubelles',
    category: 'infrastructure',
    icon: '🗑', color: '#6b7280',
    expectedSqm: { min: 5, max: 80 },
    description: 'Local déchets, tri sélectif.',
  },
  exterieur_parvis: {
    label: 'Parvis extérieur',
    category: 'infrastructure',
    icon: '⬜', color: '#9ca3af',
    expectedSqm: { min: 100, max: 10000 },
    description: 'Parvis extérieur, accès piéton, dépose-minute.',
  },
  exterieur_voirie: {
    label: 'Voirie',
    category: 'infrastructure',
    icon: '═', color: '#4b5563',
    expectedSqm: { min: 100, max: 20000 },
    description: 'Voirie, giratoire, accès véhicules.',
  },

  // ─── Utilitaires ───
  a_definir: {
    label: 'À définir',
    category: 'autre',
    icon: '?', color: '#a1a1aa',
    description: 'Espace non encore identifié — à valider par l\'utilisateur.',
  },
  autre: {
    label: 'Autre',
    category: 'autre',
    icon: '·', color: '#94a3b8',
    description: 'Autre type non catégorisable dans la bibliothèque.',
  },
  a_exclure: {
    label: 'À exclure',
    category: 'autre',
    icon: '⊘', color: '#ef4444',
    description: 'Espace à exclure de l\'analyse (bruit détecté, faux commerce).',
  },
}

// ─── Groupage pour l'UI ─────────────────────────────

export const SPACE_TYPES_BY_CATEGORY: Record<SpaceTypeCategory, SpaceTypeKey[]> = {
  'acces-circulation': [
    'entree_principale', 'entree_secondaire', 'entree_parking', 'entree_service',
    'sortie_secours', 'promenade', 'couloir_secondaire', 'hall_distribution',
  ],
  'commerces-services': [
    'local_commerce', 'restauration', 'loisirs', 'services', 'grande_surface', 'kiosque',
  ],
  'equipements': [
    'sanitaires', 'escalator', 'ascenseur', 'rampe_pmr', 'escalier_fixe',
    'point_information', 'borne_wayfinder',
  ],
  'infrastructure': [
    'parking_vehicule', 'parking_moto', 'zone_livraison', 'zone_technique',
    'local_poubelles', 'exterieur_parvis', 'exterieur_voirie',
  ],
  'autre': ['a_definir', 'autre', 'a_exclure'],
}

export const SPACE_CATEGORY_META: Record<SpaceTypeCategory, { label: string; color: string; icon: string }> = {
  'acces-circulation':  { label: 'Accès & circulation',  color: '#8b5cf6', icon: '🚪' },
  'commerces-services': { label: 'Commerces & services', color: '#ec4899', icon: '🛍' },
  'equipements':        { label: 'Équipements',           color: '#f59e0b', icon: '⚡' },
  'infrastructure':     { label: 'Infrastructure',        color: '#64748b', icon: '🏗' },
  'autre':              { label: 'Autre',                 color: '#94a3b8', icon: '?' },
}

// ─── Auto-classification depuis un label DXF ─────────

const TYPE_PATTERNS: Array<{ key: SpaceTypeKey; pattern: RegExp }> = [
  { key: 'sortie_secours',    pattern: /(?:sortie|issue)[_\s]?secours|emergency[_\s]?exit/i },
  { key: 'entree_principale', pattern: /entr[eé]e[_\s]?principale|main[_\s]?entrance/i },
  { key: 'entree_secondaire', pattern: /entr[eé]e[_\s]?(?:sec|laterale|est|ouest|nord|sud)/i },
  { key: 'entree_parking',    pattern: /entr[eé]e[_\s]?parking|parking[_\s]?access/i },
  { key: 'entree_service',    pattern: /entr[eé]e[_\s]?(?:service|livraison|pers)/i },
  { key: 'escalator',         pattern: /escalat/i },
  { key: 'ascenseur',         pattern: /\basc(?:enseur)?\b|lift|elevator/i },
  { key: 'rampe_pmr',         pattern: /ramp[_\s]?pmr|rampe/i },
  { key: 'escalier_fixe',     pattern: /escal(?:ier)?|stair/i },
  { key: 'promenade',         pattern: /promenade|\bmail\b|galleria|concourse/i },
  { key: 'couloir_secondaire',pattern: /couloir|passage|corridor/i },
  { key: 'hall_distribution', pattern: /\bhall\b|atrium|rotonde|lobby/i },
  { key: 'sanitaires',        pattern: /\bwc\b|sanitaire|toilet|lav/i },
  { key: 'restauration',      pattern: /restaur|food|cafe|bar|snack|cuisine|pizza/i },
  { key: 'loisirs',           pattern: /cinema|bowling|gym|sport|arcade|loisir/i },
  { key: 'grande_surface',    pattern: /hyper|supermarche|carrefour|shoprite|marina|anchor/i },
  { key: 'kiosque',           pattern: /kiosque|stand|pop[_\s]?up/i },
  { key: 'services',          pattern: /banque|poste|atm|pressing|coiffeur|pharmacie|service/i },
  { key: 'local_commerce',    pattern: /boutique|shop|magasin|store|\blot\b|tenant/i },
  { key: 'parking_moto',      pattern: /parking[_\s]?(?:moto|velo|2[_\s]?roues)/i },
  { key: 'parking_vehicule',  pattern: /parking|stationnement/i },
  { key: 'zone_livraison',    pattern: /livraison|quai[_\s]?decharg|logistique|loading/i },
  { key: 'zone_technique',    pattern: /technique|\blocal\b|electr|chauff|vmc|tgbt|cvc/i },
  { key: 'local_poubelles',   pattern: /poubelle|dechet|trash|compost/i },
  { key: 'exterieur_parvis',  pattern: /parvis|depose[_\s]?minute/i },
  { key: 'exterieur_voirie',  pattern: /voirie|voie|giratoire|rondpoint/i },
  { key: 'point_information', pattern: /info|accueil|concierg/i },
  { key: 'borne_wayfinder',   pattern: /wayfinder|borne/i },
]

/** Auto-détecte le SpaceTypeKey le plus probable à partir d'un label DXF. */
export function autoDetectSpaceType(label: string, type?: string): SpaceTypeKey {
  const hay = `${label ?? ''} ${type ?? ''}`
  for (const { key, pattern } of TYPE_PATTERNS) {
    if (pattern.test(hay)) return key
  }
  return 'a_definir'
}

// ─── Mapping vers l'ancien système (spaceCorrectionsStore) ────

/** Compatibilité : convertit un SpaceTypeKey vers la catégorie simplifiée. */
export function spaceTypeToCategory(type: SpaceTypeKey): string {
  // Mapping vers les 10 catégories simplifiées existantes
  switch (type) {
    case 'local_commerce': case 'grande_surface': case 'kiosque': return 'mode'
    case 'restauration': return 'restauration'
    case 'services': case 'point_information': case 'borne_wayfinder': return 'services'
    case 'loisirs': return 'loisirs'
    case 'sanitaires': return 'service-tech'
    case 'escalator': case 'ascenseur': case 'rampe_pmr': case 'escalier_fixe':
    case 'promenade': case 'couloir_secondaire': case 'hall_distribution':
    case 'entree_principale': case 'entree_secondaire': case 'entree_parking':
    case 'entree_service': case 'sortie_secours':
      return 'circulation'
    case 'zone_technique': case 'local_poubelles': case 'zone_livraison':
      return 'service-tech'
    case 'parking_vehicule': case 'parking_moto':
    case 'exterieur_parvis': case 'exterieur_voirie':
      return 'circulation'
    case 'a_exclure': return 'service-tech'
    default: return 'other'
  }
}

/** Vérifie si une surface est aberrante pour un type donné. */
export function checkSurfaceAnomaly(type: SpaceTypeKey, areaSqm: number): {
  aberrant: boolean
  reason?: string
} {
  const meta = SPACE_TYPE_META[type]
  if (!meta.expectedSqm) return { aberrant: false }
  if (areaSqm < meta.expectedSqm.min) {
    return { aberrant: true, reason: `Surface ${areaSqm.toFixed(0)} m² trop petite pour ${meta.label} (min ${meta.expectedSqm.min} m²).` }
  }
  if (areaSqm > meta.expectedSqm.max) {
    return { aberrant: true, reason: `Surface ${areaSqm.toFixed(0)} m² trop grande pour ${meta.label} (max ${meta.expectedSqm.max} m²).` }
  }
  return { aberrant: false }
}
