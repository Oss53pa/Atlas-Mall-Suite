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
  // Accès SITE piéton (depuis la rue)
  | 'acces_site_pieton_principal' | 'acces_site_pieton_secondaire'
  // Accès SITE véhicule (avec sens)
  | 'acces_site_vehicule_entree' | 'acces_site_vehicule_sortie'
  | 'acces_site_vehicule_mixte' | 'acces_site_vehicule_service'
  // Compat — ancien nom (accès site générique)
  | 'acces_site_principal' | 'acces_site_secondaire' | 'acces_site_service'
  // Entrées BÂTIMENT (parvis → mall)
  | 'entree_principale' | 'entree_secondaire'
  | 'entree_parking_vehicule_entree' | 'entree_parking_vehicule_sortie'
  | 'entree_parking' | 'entree_service'
  | 'sortie_secours'
  // Circulation intérieure
  | 'mail_central' | 'atrium' | 'promenade' | 'couloir_secondaire' | 'hall_distribution'
  | 'passage_pieton_couvert'
  // Commerces & services — types généraux
  | 'local_commerce' | 'restauration' | 'food_court' | 'loisirs' | 'services'
  | 'grande_surface' | 'kiosque'
  // Commerces — segments métier précis
  | 'commerce_supermarche' | 'commerce_restaurant'
  | 'commerce_mode' | 'commerce_accessoires'
  | 'commerce_banque_assurance' | 'commerce_services'
  | 'commerce_beaute_sante' | 'commerce_cadeaux_alimentaire'
  | 'commerce_multimedia'
  // Bâtiments hors galerie commerciale
  | 'big_box' | 'market'
  // Équipements
  | 'sanitaires' | 'escalator' | 'ascenseur' | 'rampe_pmr'
  | 'escalier_fixe' | 'point_information' | 'borne_wayfinder'
  // Parking — macro zone + éléments détaillés
  | 'parking_vehicule' | 'parking_moto' | 'parking_velo'
  | 'parking_place_standard' | 'parking_place_pmr' | 'parking_place_ve'
  | 'parking_place_moto' | 'parking_place_livraison' | 'parking_place_famille'
  | 'parking_voie_circulation' | 'parking_fleche_sens'
  // Autres infrastructure
  | 'zone_livraison' | 'zone_technique' | 'local_poubelles'
  | 'exterieur_parvis' | 'exterieur_voie_pieton' | 'exterieur_voie_vehicule'
  | 'exterieur_place_forum' | 'exterieur_giratoire' | 'exterieur_arret_transport'
  | 'exterieur_zone_detente' | 'exterieur_aire_jeux' | 'exterieur_fontaine'
  | 'exterieur_voirie'
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
  // ─── Accès SITE PIÉTON (depuis la rue) ───
  acces_site_pieton_principal: {
    label: 'Accès site piéton principal',
    category: 'acces-circulation',
    icon: '🚶', color: '#059669',
    expectedSqm: { min: 5, max: 300 },
    description: 'Entrée PIÉTONNE principale depuis la route publique — portillon, barrière, passage piéton.',
  },
  acces_site_pieton_secondaire: {
    label: 'Accès site piéton secondaire',
    category: 'acces-circulation',
    icon: '🚶', color: '#10b981',
    expectedSqm: { min: 5, max: 150 },
    description: 'Accès piéton secondaire (latéral, arrière).',
  },

  // ─── Accès SITE VÉHICULE (avec sens de circulation) ───
  acces_site_vehicule_entree: {
    label: 'Entrée véhicule (sens entrée)',
    category: 'acces-circulation',
    icon: '↘🚗', color: '#2563eb',
    expectedSqm: { min: 20, max: 400 },
    description: 'Accès véhicules ENTRÉE uniquement (sens unique vers parking/site).',
  },
  acces_site_vehicule_sortie: {
    label: 'Sortie véhicule (sens sortie)',
    category: 'acces-circulation',
    icon: '↗🚗', color: '#ea580c',
    expectedSqm: { min: 20, max: 400 },
    description: 'Accès véhicules SORTIE uniquement (sens unique vers la rue).',
  },
  acces_site_vehicule_mixte: {
    label: 'Accès véhicule (double sens)',
    category: 'acces-circulation',
    icon: '↔🚗', color: '#0ea5e9',
    expectedSqm: { min: 30, max: 500 },
    description: 'Accès véhicules à double sens (entrée + sortie).',
  },
  acces_site_vehicule_service: {
    label: 'Accès véhicule service',
    category: 'acces-circulation',
    icon: '🚛', color: '#0d9488',
    expectedSqm: { min: 20, max: 400 },
    description: 'Accès réservé livraisons PL, personnel, déchets.',
  },

  // ─── Compat — ancien type générique (déprécié au profit des types précis) ───
  acces_site_principal: {
    label: 'Accès site (générique)',
    category: 'acces-circulation',
    icon: '🛣', color: '#059669',
    expectedSqm: { min: 30, max: 800 },
    description: 'DÉPRÉCIÉ — préférer acces_site_pieton_* ou acces_site_vehicule_* pour être précis sur le type de flux.',
  },
  acces_site_secondaire: {
    label: 'Accès site secondaire',
    category: 'acces-circulation',
    icon: '🚏', color: '#10b981',
    expectedSqm: { min: 20, max: 500 },
    description: 'Accès secondaire à la parcelle (sortie, accès délesté, contre-allée).',
  },
  acces_site_service: {
    label: 'Accès site service',
    category: 'acces-circulation',
    icon: '🚛', color: '#0d9488',
    expectedSqm: { min: 20, max: 400 },
    description: 'Entrée de la parcelle réservée logistique : livraisons PL, ramassage déchets, personnel.',
  },

  // ─── Entrées BÂTIMENT (depuis parvis/parcelle vers le mall) ───
  entree_principale: {
    label: 'Entrée bâtiment principale',
    category: 'acces-circulation',
    icon: '🏛', color: '#16a34a',
    expectedSqm: { min: 20, max: 500 },
    erpRequired: true,
    description: 'Entrée principale DANS le centre commercial (après le parvis). Flux clients majeur (> 1000 pers/h).',
  },
  entree_secondaire: {
    label: 'Entrée secondaire',
    category: 'acces-circulation',
    icon: '🚪', color: '#34d399',
    expectedSqm: { min: 10, max: 200 },
    erpRequired: true,
    description: 'Entrée clients flux mineur, accès latéral.',
  },
  entree_parking_vehicule_entree: {
    label: 'Rampe parking (sens entrée)',
    category: 'acces-circulation',
    icon: '↘🅿', color: '#2563eb',
    expectedSqm: { min: 20, max: 400 },
    description: 'Rampe/accès véhicules ENTRANT dans le parking (sens unique).',
  },
  entree_parking_vehicule_sortie: {
    label: 'Rampe parking (sens sortie)',
    category: 'acces-circulation',
    icon: '↗🅿', color: '#ea580c',
    expectedSqm: { min: 20, max: 400 },
    description: 'Rampe/accès véhicules SORTANT du parking (sens unique).',
  },
  entree_parking: {
    label: 'Entrée parking (piéton)',
    category: 'acces-circulation',
    icon: '🅿', color: '#3b82f6',
    expectedSqm: { min: 15, max: 300 },
    description: 'Accès PIÉTON depuis parking vers le mall (porte, escalier, ascenseur depuis parking).',
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
  mail_central: {
    label: 'Mail central (galerie)',
    category: 'acces-circulation',
    icon: '▬', color: '#7c3aed',
    expectedSqm: { min: 150, max: 8000 },
    erpRequired: true,
    description: 'Allée marchande principale couverte — cœur commerçant du centre. Flux piéton maximal, enseignes de part et d\'autre.',
  },
  atrium: {
    label: 'Atrium',
    category: 'acces-circulation',
    icon: '◈', color: '#9333ea',
    expectedSqm: { min: 50, max: 2000 },
    erpRequired: true,
    description: 'Puits de lumière multi-niveaux au centre du mall. Point de repère visuel majeur.',
  },
  promenade: {
    label: 'Promenade principale',
    category: 'acces-circulation',
    icon: '↔', color: '#8b5cf6',
    expectedSqm: { min: 100, max: 5000 },
    description: 'Axe de circulation principal (mall walk). Nœuds de décision nombreux.',
  },
  passage_pieton_couvert: {
    label: 'Passage piéton couvert',
    category: 'acces-circulation',
    icon: '⇌', color: '#a78bfa',
    expectedSqm: { min: 20, max: 500 },
    description: 'Passage ou galerie piétonne couverte (tunnel, passerelle).',
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
    label: 'Restauration individuelle',
    category: 'commerces-services',
    icon: '🍽', color: '#f59e0b',
    expectedSqm: { min: 20, max: 1000 },
    description: 'Restaurant, café, snacking — local individuel.',
  },
  food_court: {
    label: 'Food court',
    category: 'commerces-services',
    icon: '🍴', color: '#fb923c',
    expectedSqm: { min: 150, max: 3000 },
    erpRequired: true,
    description: 'Zone de restauration collective avec plusieurs kiosques/enseignes et espace commun de consommation.',
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

  // ─── Commerces — segments métier précis ───
  commerce_supermarche: {
    label: 'Supermarché',
    category: 'commerces-services',
    icon: '🛒', color: '#059669',
    expectedSqm: { min: 400, max: 5000 },
    description: 'Supermarché alimentaire (fruits, légumes, épicerie, frais, surgelés). En galerie ou standalone.',
  },
  commerce_restaurant: {
    label: 'Restaurant',
    category: 'commerces-services',
    icon: '🍽', color: '#f59e0b',
    expectedSqm: { min: 40, max: 500 },
    description: 'Restaurant service à table, café, brasserie. Cuisine + salle + (terrasse optionnelle).',
  },
  commerce_mode: {
    label: 'Mode',
    category: 'commerces-services',
    icon: '👗', color: '#ec4899',
    expectedSqm: { min: 30, max: 2000 },
    description: 'Habillement homme/femme/enfant, chaussures, sport, lingerie.',
  },
  commerce_accessoires: {
    label: 'Accessoires',
    category: 'commerces-services',
    icon: '👜', color: '#d946ef',
    expectedSqm: { min: 20, max: 300 },
    description: 'Maroquinerie, bijouterie, horlogerie, lunetterie, petite maroquinerie.',
  },
  commerce_banque_assurance: {
    label: 'Banque & assurances',
    category: 'commerces-services',
    icon: '🏦', color: '#2563eb',
    expectedSqm: { min: 30, max: 300 },
    description: 'Agence bancaire, mutuelle, assurance, bureau de change, Western Union.',
  },
  commerce_services: {
    label: 'Services',
    category: 'commerces-services',
    icon: '🛠', color: '#06b6d4',
    expectedSqm: { min: 15, max: 200 },
    description: 'Pressing, photocopie/impression, agence de voyage, cordonnerie, clé minute, retouche.',
  },
  commerce_beaute_sante: {
    label: 'Beauté & santé',
    category: 'commerces-services',
    icon: '💄', color: '#f472b6',
    expectedSqm: { min: 20, max: 400 },
    description: 'Parfumerie, pharmacie, opticien, coiffeur, institut de beauté, ongles, spa, centre esthétique.',
  },
  commerce_cadeaux_alimentaire: {
    label: 'Cadeaux & alimentaire fin',
    category: 'commerces-services',
    icon: '🎁', color: '#c026d3',
    expectedSqm: { min: 15, max: 250 },
    description: 'Librairie, papeterie, cadeaux, fleuriste, cave à vin, épicerie fine, chocolaterie, confiserie, décoration.',
  },
  commerce_multimedia: {
    label: 'Multimédia',
    category: 'commerces-services',
    icon: '📱', color: '#7c3aed',
    expectedSqm: { min: 30, max: 800 },
    description: 'Électronique, téléphonie/opérateur mobile, informatique, gaming, son/image, photo.',
  },

  // ─── Bâtiments HORS galerie commerciale ───
  big_box: {
    label: 'Big Box',
    category: 'commerces-services',
    icon: '🏭', color: '#64748b',
    expectedSqm: { min: 1000, max: 20000 },
    description: 'Magasin entrepôt indépendant à grande surface spécialisée (meubles, bricolage, sport, jardinage). Accès direct depuis parking externe, pas de galerie commerciale intégrée.',
  },
  market: {
    label: 'Market (marché)',
    category: 'commerces-services',
    icon: '🏘', color: '#b45309',
    expectedSqm: { min: 300, max: 5000 },
    description: 'Marché couvert ou semi-ouvert avec multiples stands/étals traditionnels (alimentaire, artisanat, produits locaux). Agencement en allées avec échoppes modulaires.',
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
    label: 'Parking moto',
    category: 'infrastructure',
    icon: '🏍', color: '#7dd3fc',
    expectedSqm: { min: 20, max: 1000 },
    description: 'Zone stationnement motos et scooters.',
  },
  parking_velo: {
    label: 'Parking vélo',
    category: 'infrastructure',
    icon: '🚲', color: '#67e8f9',
    expectedSqm: { min: 5, max: 500 },
    description: 'Arceaux vélos, consigne mobilité douce.',
  },

  // ─── Éléments unitaires de parking (places individuelles) ───
  parking_place_standard: {
    label: 'Place parking standard',
    category: 'infrastructure',
    icon: '▫', color: '#60a5fa',
    expectedSqm: { min: 10, max: 16 },
    description: 'Place de stationnement standard (2.5 × 5 m = 12.5 m²). Norme FR : 2.3 × 5 m minimum.',
  },
  parking_place_pmr: {
    label: 'Place PMR (handicap)',
    category: 'infrastructure',
    icon: '♿', color: '#3b82f6',
    expectedSqm: { min: 14, max: 20 },
    description: 'Place PMR (3.3 × 5 m). Obligatoire : ≥ 2% du total, proche entrée bâtiment, cheminement accessible.',
  },
  parking_place_ve: {
    label: 'Place borne VE',
    category: 'infrastructure',
    icon: '🔌', color: '#22c55e',
    expectedSqm: { min: 10, max: 16 },
    description: 'Place équipée borne de recharge véhicule électrique (AC 7-22 kW ou DC fast).',
  },
  parking_place_moto: {
    label: 'Place moto',
    category: 'infrastructure',
    icon: '🏍', color: '#7dd3fc',
    expectedSqm: { min: 1.5, max: 4 },
    description: 'Place moto/scooter individuelle (1 × 2 m environ).',
  },
  parking_place_livraison: {
    label: 'Place livraison',
    category: 'infrastructure',
    icon: '📦', color: '#f59e0b',
    expectedSqm: { min: 20, max: 60 },
    description: 'Place livraison (véhicule utilitaire) — souvent signalée en jaune.',
  },
  parking_place_famille: {
    label: 'Place famille / femme enceinte',
    category: 'infrastructure',
    icon: '👨‍👩‍👧', color: '#f472b6',
    expectedSqm: { min: 12, max: 18 },
    description: 'Place élargie pour poussettes/familles/femmes enceintes, proche entrée.',
  },
  parking_voie_circulation: {
    label: 'Voie circulation parking',
    category: 'infrastructure',
    icon: '═', color: '#94a3b8',
    expectedSqm: { min: 15, max: 2000 },
    description: 'Voie de roulage interne parking (allée entre rangées). Largeur réglementaire 5-6 m (double sens).',
  },
  parking_fleche_sens: {
    label: 'Flèche sens parking',
    category: 'infrastructure',
    icon: '↗', color: '#f59e0b',
    expectedSqm: { min: 0.5, max: 5 },
    description: 'Marquage au sol flèche directionnelle (sens de circulation parking).',
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
    label: 'Parvis d\'entrée',
    category: 'infrastructure',
    icon: '⬜', color: '#9ca3af',
    expectedSqm: { min: 100, max: 10000 },
    description: 'Parvis extérieur accolé à l\'entrée — accès piéton, dépose-minute.',
  },
  exterieur_voie_pieton: {
    label: 'Voie piétonne extérieure',
    category: 'infrastructure',
    icon: '🚶', color: '#86efac',
    expectedSqm: { min: 30, max: 5000 },
    description: 'Trottoir, allée piétonne, mall extérieur — strict usage piéton, pas de véhicules.',
  },
  exterieur_voie_vehicule: {
    label: 'Voie véhicule extérieure',
    category: 'infrastructure',
    icon: '🚗', color: '#64748b',
    expectedSqm: { min: 50, max: 10000 },
    description: 'Chaussée, contre-allée, voie d\'accès — circulation voitures / bus / livraisons.',
  },
  exterieur_place_forum: {
    label: 'Place / forum / esplanade',
    category: 'infrastructure',
    icon: '◯', color: '#fcd34d',
    expectedSqm: { min: 200, max: 15000 },
    description: 'Place publique, esplanade événementielle, forum central extérieur.',
  },
  exterieur_giratoire: {
    label: 'Giratoire / rond-point',
    category: 'infrastructure',
    icon: '⊚', color: '#6b7280',
    expectedSqm: { min: 50, max: 3000 },
    description: 'Rond-point de distribution véhicules — point de décision circulation.',
  },
  exterieur_arret_transport: {
    label: 'Arrêt transport',
    category: 'infrastructure',
    icon: '🚌', color: '#0ea5e9',
    expectedSqm: { min: 10, max: 200 },
    description: 'Arrêt bus/tram, quai dépose-taxis, VTC.',
  },
  exterieur_zone_detente: {
    label: 'Zone détente / repos',
    category: 'infrastructure',
    icon: '🪑', color: '#84cc16',
    expectedSqm: { min: 20, max: 1000 },
    description: 'Zone aménagée avec mobilier (bancs, tables), espace vert attenant.',
  },
  exterieur_aire_jeux: {
    label: 'Aire de jeux enfants',
    category: 'infrastructure',
    icon: '🛝', color: '#fb7185',
    expectedSqm: { min: 50, max: 2000 },
    description: 'Playground, aire ludique enfants — sol souple, jeux normés (NF EN 1176).',
  },
  exterieur_fontaine: {
    label: 'Fontaine / bassin',
    category: 'infrastructure',
    icon: '⛲', color: '#38bdf8',
    expectedSqm: { min: 5, max: 500 },
    description: 'Fontaine décorative, bassin, élément d\'eau paysager.',
  },
  exterieur_voirie: {
    label: 'Voirie générale',
    category: 'infrastructure',
    icon: '═', color: '#4b5563',
    expectedSqm: { min: 100, max: 20000 },
    description: 'Voirie générique (fallback) — préférez les types voie piétonne / véhicule si possible.',
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
    // Accès site piéton
    'acces_site_pieton_principal', 'acces_site_pieton_secondaire',
    // Accès site véhicule (avec sens)
    'acces_site_vehicule_entree', 'acces_site_vehicule_sortie',
    'acces_site_vehicule_mixte', 'acces_site_vehicule_service',
    // Compat
    'acces_site_principal', 'acces_site_secondaire', 'acces_site_service',
    // Entrées bâtiment
    'entree_principale', 'entree_secondaire',
    'entree_parking_vehicule_entree', 'entree_parking_vehicule_sortie',
    'entree_parking', 'entree_service',
    'sortie_secours',
    // Circulation intérieure
    'mail_central', 'atrium', 'promenade', 'couloir_secondaire', 'hall_distribution',
    'passage_pieton_couvert',
  ],
  'commerces-services': [
    // Segments métier précis (préférer ceux-ci)
    'commerce_supermarche', 'commerce_restaurant',
    'commerce_mode', 'commerce_accessoires',
    'commerce_banque_assurance', 'commerce_services',
    'commerce_beaute_sante', 'commerce_cadeaux_alimentaire',
    'commerce_multimedia',
    // Bâtiments hors galerie
    'big_box', 'market',
    // Types génériques (fallback)
    'local_commerce', 'restauration', 'food_court', 'loisirs', 'services',
    'grande_surface', 'kiosque',
  ],
  'equipements': [
    'sanitaires', 'escalator', 'ascenseur', 'rampe_pmr', 'escalier_fixe',
    'point_information', 'borne_wayfinder',
  ],
  'infrastructure': [
    // Parking macro + éléments unitaires
    'parking_vehicule', 'parking_moto', 'parking_velo',
    'parking_place_standard', 'parking_place_pmr', 'parking_place_ve',
    'parking_place_moto', 'parking_place_livraison', 'parking_place_famille',
    'parking_voie_circulation', 'parking_fleche_sens',
    'zone_livraison', 'zone_technique', 'local_poubelles',
    'exterieur_parvis', 'exterieur_voie_pieton', 'exterieur_voie_vehicule',
    'exterieur_place_forum', 'exterieur_giratoire', 'exterieur_arret_transport',
    'exterieur_zone_detente', 'exterieur_aire_jeux', 'exterieur_fontaine',
    'exterieur_voirie',
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
  // ─── Accès SITE (matcher AVANT entrées bâtiment) ───
  // Véhicule (avec sens)
  { key: 'acces_site_vehicule_entree', pattern: /(?:acces|entree|rampe)[_\s]?(?:site[_\s]?|parcelle[_\s]?)?(?:vehicule|auto|voit)[_\s]?(?:in|entree|entrant)|veh[_\s]?in/i },
  { key: 'acces_site_vehicule_sortie', pattern: /(?:acces|sortie|rampe)[_\s]?(?:site[_\s]?|parcelle[_\s]?)?(?:vehicule|auto|voit)[_\s]?(?:out|sortie|sortant)|veh[_\s]?out/i },
  { key: 'acces_site_vehicule_mixte', pattern: /(?:acces|entree)[_\s]?(?:site[_\s]?)?vehicule[_\s]?(?:mixte|2sens|doublesens)/i },
  { key: 'acces_site_vehicule_service', pattern: /acces[_\s]?(?:site[_\s]?)?(?:service|livraison|logistique|PL)(?:[_\s]?ext)?/i },
  // Piéton
  { key: 'acces_site_pieton_secondaire', pattern: /(?:acces|entree)[_\s]?(?:site[_\s]?)?pieton[_\s]?(?:sec|2|latera)/i },
  { key: 'acces_site_pieton_principal', pattern: /(?:acces|entree)[_\s]?(?:site[_\s]?)?pieton|portillon|pedestrian[_\s]?gate/i },
  // Compat : accès site générique (préserver anciens fichiers)
  { key: 'acces_site_secondaire', pattern: /acces[_\s]?site[_\s]?(?:sec|latera)|portail[_\s]?sec/i },
  { key: 'acces_site_principal', pattern: /acces[_\s]?(?:site|parcelle|domaine)|portail[_\s]?principal|site[_\s]?entry/i },
  // ─── Entrées bâtiment (parvis → mall) ───
  { key: 'entree_parking_vehicule_entree', pattern: /(?:entree|rampe)[_\s]?parking[_\s]?(?:in|entree|entrant)/i },
  { key: 'entree_parking_vehicule_sortie', pattern: /(?:sortie|rampe)[_\s]?parking[_\s]?(?:out|sortie|sortant)/i },
  { key: 'entree_principale', pattern: /entr[eé]e[_\s]?(?:batiment|principale|mall|centre)|main[_\s]?entrance|bldg[_\s]?entry/i },
  { key: 'entree_secondaire', pattern: /entr[eé]e[_\s]?(?:sec|laterale|est|ouest|nord|sud)/i },
  { key: 'entree_parking',    pattern: /entr[eé]e[_\s]?parking|parking[_\s]?access/i },
  { key: 'entree_service',    pattern: /entr[eé]e[_\s]?(?:service|livraison|pers)/i },
  { key: 'escalator',         pattern: /escalat/i },
  { key: 'ascenseur',         pattern: /\basc(?:enseur)?\b|lift|elevator/i },
  { key: 'rampe_pmr',         pattern: /ramp[_\s]?pmr|rampe/i },
  { key: 'escalier_fixe',     pattern: /escal(?:ier)?|stair/i },
  // Circulation intérieure (ordre important : mail > promenade > couloir)
  { key: 'atrium',            pattern: /atrium|rotonde(?![\w-]?info)/i },
  { key: 'mail_central',      pattern: /\bmail\b|galerie[_\s]?marchande|galleria|mall[_\s]?central/i },
  { key: 'passage_pieton_couvert', pattern: /passage[_\s]?couvert|passerelle|tunnel[_\s]?pieton/i },
  { key: 'promenade',         pattern: /promenade|concourse/i },
  { key: 'couloir_secondaire',pattern: /couloir|corridor|passage[_\s]?secondaire/i },
  { key: 'hall_distribution', pattern: /\bhall\b|lobby/i },
  { key: 'sanitaires',        pattern: /\bwc\b|sanitaire|toilet|lav/i },
  { key: 'food_court',        pattern: /food[_\s]?court|court[_\s]?restauration|espace[_\s]?restauration/i },
  // ─── Segments commerciaux précis (à matcher AVANT les types génériques) ───
  { key: 'commerce_supermarche', pattern: /super[_\s]?march|supermarket|grocery|auchan|carrefour|marjane|prosuma|hyper(?!march)/i },
  { key: 'commerce_restaurant',  pattern: /\brestau|restauran|bistro|brasserie|cafe|bar\b|snack|pizzeria|kfc|mcdo|burger/i },
  { key: 'commerce_mode',        pattern: /\bmode\b|habillement|vetement|pret[_\s]?a[_\s]?porter|chaussure|lingerie|sport[_\s]?wear|zara|h&m|mango|celio/i },
  { key: 'commerce_accessoires', pattern: /accessoir|maroquinerie|bijouterie|horloger|lunetterie|opticien[_\s]?mode|sac\b/i },
  { key: 'commerce_banque_assurance', pattern: /banque|bank|assurance|insurance|mutuelle|bureau[_\s]?change|western[_\s]?union|money[_\s]?gram/i },
  { key: 'commerce_beaute_sante', pattern: /parfum|pharmacie|opticien|coiffeur|institut[_\s]?beaute|ongles?|spa|esthetique|beauty/i },
  { key: 'commerce_cadeaux_alimentaire', pattern: /librair|papeter|cadeau|fleuriste|cave[_\s]?vin|epicerie[_\s]?fine|chocolat|confiserie|deco/i },
  { key: 'commerce_multimedia',  pattern: /electroniq|telephoni|orange|mtn|moov|apple|samsung|informatiq|gaming|photo[_\s]?shop|son[_\s]?image/i },
  { key: 'commerce_services',    pattern: /pressing|photocop|imprim|voyage|cordonner|cle[_\s]?minute|retouch/i },
  // ─── Bâtiments hors galerie ───
  { key: 'big_box',              pattern: /big[_\s]?box|ikea|decathlon|leroy[_\s]?merlin|castorama|conforama|but\b|boulanger|fnac\b|darty|intermarche|lidl|aldi/i },
  { key: 'market',               pattern: /\bmarket\b|marche[_\s]?couvert|halles|souk|bazar/i },
  // Types génériques (fallback si aucun segment précis)
  { key: 'restauration',      pattern: /restaur|food|cafe|bar|snack|cuisine|pizza/i },
  { key: 'loisirs',           pattern: /cinema|bowling|gym|sport|arcade|loisir/i },
  { key: 'grande_surface',    pattern: /hyper|supermarche|carrefour|shoprite|marina|anchor/i },
  { key: 'kiosque',           pattern: /kiosque|stand|pop[_\s]?up/i },
  { key: 'services',          pattern: /banque|poste|atm|pressing|coiffeur|pharmacie|service/i },
  { key: 'local_commerce',    pattern: /boutique|shop|magasin|store|\blot\b|tenant/i },
  // Éléments unitaires parking (matcher AVANT parking macro)
  { key: 'parking_place_pmr', pattern: /place[_\s]?pmr|pmr[_\s]?parking|handicap[_\s]?spot/i },
  { key: 'parking_place_ve',  pattern: /place[_\s]?(?:ve|borne|recharge|ev)|ev[_\s]?charger/i },
  { key: 'parking_place_moto', pattern: /place[_\s]?moto|moto[_\s]?spot/i },
  { key: 'parking_place_livraison', pattern: /place[_\s]?(?:livraison|jaune)/i },
  { key: 'parking_place_famille', pattern: /place[_\s]?(?:famille|enceinte|family|mother)/i },
  { key: 'parking_place_standard', pattern: /place[_\s]?(?:parking|voit|auto|stationnement|stand)|parking[_\s]?stall/i },
  { key: 'parking_voie_circulation', pattern: /voie[_\s]?(?:parking|circul|parc)|allee[_\s]?parking/i },
  { key: 'parking_fleche_sens', pattern: /fleche[_\s]?(?:parking|sens)|arrow[_\s]?park/i },
  { key: 'parking_velo',      pattern: /parking[_\s]?v[eé]lo|velo[_\s]?park|arceau/i },
  { key: 'parking_moto',      pattern: /parking[_\s]?(?:moto|2[_\s]?roues|scoot)/i },
  { key: 'parking_vehicule',  pattern: /parking|stationnement/i },
  { key: 'zone_livraison',    pattern: /livraison|quai[_\s]?decharg|logistique|loading/i },
  { key: 'zone_technique',    pattern: /technique|\blocal\b|electr|chauff|vmc|tgbt|cvc/i },
  { key: 'local_poubelles',   pattern: /poubelle|dechet|trash|compost/i },
  // Extérieur (ordre important : spécifique avant voirie générique)
  { key: 'exterieur_parvis',  pattern: /parvis|depose[_\s]?minute/i },
  { key: 'exterieur_fontaine', pattern: /fontaine|bassin[_\s]?deco|water[_\s]?feature/i },
  { key: 'exterieur_aire_jeux', pattern: /aire[_\s]?(?:de[_\s]?)?jeu|playground|piste[_\s]?enfant/i },
  { key: 'exterieur_arret_transport', pattern: /arret[_\s]?bus|bus[_\s]?stop|taxi|vtc|tram/i },
  { key: 'exterieur_giratoire', pattern: /giratoire|rond[_\s]?point|roundabout/i },
  { key: 'exterieur_place_forum', pattern: /\bplace\b|forum|esplanade|plaza[_\s]?ext/i },
  { key: 'exterieur_zone_detente', pattern: /detente|repos|banc[_\s]?ext|square/i },
  { key: 'exterieur_voie_pieton', pattern: /voie[_\s]?pieton|allee[_\s]?pieton|trottoir|pedestrian/i },
  { key: 'exterieur_voie_vehicule', pattern: /voie[_\s]?vehicule|chauss[eé]e|road|carrefour|contre[_\s]?all/i },
  { key: 'exterieur_voirie',  pattern: /voirie|voie(?![_\s]?(pieton|vehic))/i },
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
    case 'local_commerce': case 'grande_surface': case 'kiosque':
    case 'commerce_mode': case 'commerce_accessoires':
    case 'commerce_cadeaux_alimentaire': case 'big_box': case 'market':
      return 'mode'
    case 'commerce_supermarche':
      return 'alimentaire' as string
    case 'restauration': case 'food_court':
    case 'commerce_restaurant':
      return 'restauration'
    case 'services': case 'point_information': case 'borne_wayfinder':
    case 'commerce_banque_assurance': case 'commerce_services':
      return 'services'
    case 'commerce_beaute_sante':
      return 'services'
    case 'commerce_multimedia':
      return 'mode'
    case 'loisirs': return 'loisirs'
    case 'sanitaires': return 'service-tech'
    case 'escalator': case 'ascenseur': case 'rampe_pmr': case 'escalier_fixe':
    case 'mail_central': case 'atrium': case 'promenade': case 'couloir_secondaire':
    case 'hall_distribution': case 'passage_pieton_couvert':
    case 'acces_site_principal': case 'acces_site_secondaire': case 'acces_site_service':
    case 'acces_site_pieton_principal': case 'acces_site_pieton_secondaire':
    case 'acces_site_vehicule_entree': case 'acces_site_vehicule_sortie':
    case 'acces_site_vehicule_mixte': case 'acces_site_vehicule_service':
    case 'entree_principale': case 'entree_secondaire': case 'entree_parking':
    case 'entree_parking_vehicule_entree': case 'entree_parking_vehicule_sortie':
    case 'entree_service': case 'sortie_secours':
      return 'circulation'
    case 'zone_technique': case 'local_poubelles': case 'zone_livraison':
      return 'service-tech'
    case 'parking_vehicule': case 'parking_moto': case 'parking_velo':
    case 'parking_place_standard': case 'parking_place_pmr': case 'parking_place_ve':
    case 'parking_place_moto': case 'parking_place_livraison': case 'parking_place_famille':
    case 'parking_voie_circulation': case 'parking_fleche_sens':
    case 'exterieur_parvis': case 'exterieur_voirie':
    case 'exterieur_voie_pieton': case 'exterieur_voie_vehicule':
    case 'exterieur_giratoire': case 'exterieur_arret_transport':
      return 'circulation'
    case 'exterieur_place_forum': case 'exterieur_zone_detente':
    case 'exterieur_aire_jeux': case 'exterieur_fontaine':
      return 'loisirs'
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
