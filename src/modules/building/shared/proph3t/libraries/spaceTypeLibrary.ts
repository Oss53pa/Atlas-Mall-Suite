// ═══ SPACE TYPE LIBRARY ═══
//
// ~100 types sémantiques organisés en 8 catégories métier :
//
//   acces-circulation   — portes, entrées, circulations intérieures
//   commerces-services  — boutiques, restauration, kiosques, terrasses marchandes
//   bureaux-admin       — bureaux, salles de réunion, locaux personnel
//   equipements         — sanitaires, ascenseurs, guichets, bornes
//   locaux-techniques   — TGBT, chaufferie, sprinkler, télécom, déchets
//   parking-voirie      — places, voies, rampes, transport extérieur
//   paysage-exterieur   — parvis, espaces verts, paysage, terrasses non marchandes
//   autre               — à définir, à exclure, fallback

// ─── Catégories ──────────────────────────────────────

export type SpaceTypeCategory =
  | 'acces-circulation'
  | 'commerces-services'
  | 'bureaux-admin'
  | 'equipements'
  | 'locaux-techniques'
  | 'parking-voirie'
  | 'paysage-exterieur'
  | 'autre'

// ─── Keys ────────────────────────────────────────────

export type SpaceTypeKey =
  // ── Accès site piéton
  | 'acces_site_pieton_principal' | 'acces_site_pieton_secondaire'
  // ── Accès site véhicule
  | 'acces_site_vehicule_entree' | 'acces_site_vehicule_sortie'
  | 'acces_site_vehicule_mixte'  | 'acces_site_vehicule_service'
  // ── Compat (anciens noms génériques)
  | 'acces_site_principal' | 'acces_site_secondaire' | 'acces_site_service'
  // ── Entrées bâtiment
  | 'entree_principale' | 'entree_secondaire'
  | 'entree_parking_vehicule_entree' | 'entree_parking_vehicule_sortie'
  | 'entree_parking' | 'entree_service' | 'sortie_secours'
  // ── Portes & ouvertures
  | 'porte_entree' | 'porte_interieure' | 'porte_secours' | 'porte_service'
  | 'porte_double' | 'porte_tambour' | 'porte_automatique'
  // ── Contrôle & sécurité accès
  | 'controle_acces' | 'sas_securite' | 'portique_securite'
  // ── Circulation intérieure (publique)
  | 'mail_central' | 'atrium' | 'promenade' | 'couloir_secondaire'
  | 'hall_distribution' | 'passage_pieton_couvert'
  // ── Circulation back-of-house
  | 'couloir_service' | 'cour_service'
  // ── Commerces & services — types généraux
  | 'local_commerce' | 'restauration' | 'food_court' | 'loisirs' | 'services'
  | 'grande_surface' | 'kiosque'
  // ── Commerces — segments précis
  | 'commerce_supermarche' | 'commerce_restaurant'
  | 'commerce_mode' | 'commerce_accessoires'
  | 'commerce_banque_assurance' | 'commerce_services'
  | 'commerce_beaute_sante' | 'commerce_cadeaux_alimentaire'
  | 'commerce_multimedia'
  // ── Bâtiments hors galerie & grands équipements d'ancrage
  | 'big_box' | 'market'
  | 'hotel' | 'hotel_residence'
  | 'cinema_multiplex' | 'salle_spectacle'
  | 'bureau_immeuble'
  | 'zone_exposition' | 'showroom' | 'galerie_art'
  // ── Spécialistes & niches commerciales
  | 'tabac_presse' | 'auto_lavage' | 'location_vehicule'
  // ── Terrasses commerciales & restauration
  | 'terrasse_restaurant' | 'terrasse_commerciale'
  // ── Bureaux & administration
  | 'bureau_direction' | 'bureau_open_space' | 'salle_reunion' | 'salle_conference'
  | 'accueil_administratif' | 'archives'
  | 'local_informatique' | 'local_securite_ssiap'
  | 'vestiaires_personnel' | 'refectoire_personnel'
  // ── Équipements visiteurs
  | 'sanitaires' | 'escalator' | 'ascenseur' | 'rampe_pmr'
  | 'escalier_fixe' | 'point_information' | 'borne_wayfinder'
  | 'guichet_service' | 'guichet_caisse' | 'atm' | 'cabine_photomaton'
  | 'espace_bebe' | 'poste_premiers_secours' | 'salle_priere'
  | 'consigne_bagages' | 'espace_fumeur'
  // ── Locaux techniques
  | 'local_electrique_tgbt' | 'local_chaufferie_cvc' | 'local_sprinkler'
  | 'local_groupe_electrogene' | 'local_telecom'
  | 'local_menage' | 'local_stockage'
  | 'zone_technique' | 'zone_livraison' | 'local_poubelles'
  // ── Parking & voirie
  | 'parking_vehicule' | 'parking_moto' | 'parking_velo'
  | 'parking_place_standard' | 'parking_place_pmr' | 'parking_place_ve'
  | 'parking_place_moto' | 'parking_place_livraison' | 'parking_place_famille'
  | 'parking_voie_circulation' | 'parking_fleche_sens'
  | 'voie_principale' | 'voie_secondaire' | 'voie_pompier' | 'voie_livraison'
  | 'rond_point' | 'carrefour' | 'passage_pieton'
  // ── Routes publiques hors-site (environnement urbain)
  | 'route_autoroute' | 'route_boulevard' | 'route_avenue'
  | 'route_rue_principale' | 'route_rue_secondaire' | 'route_impasse'
  | 'route_rond_point_public' | 'route_carrefour_public'
  | 'route_pont' | 'route_tunnel'
  | 'route_trottoir_public'
  | 'arret_taxi' | 'arret_bus_tram' | 'station_velo_libre_service'
  // ── Paysage & extérieur
  | 'exterieur_parvis' | 'exterieur_voie_pieton' | 'exterieur_voie_vehicule'
  | 'exterieur_place_forum' | 'exterieur_giratoire' | 'exterieur_arret_transport'
  | 'exterieur_zone_detente' | 'exterieur_aire_jeux' | 'exterieur_fontaine'
  | 'exterieur_voirie'
  | 'terre_plein' | 'massif_vegetal' | 'jardin' | 'pelouse'
  | 'arbre_isole' | 'alignement_arbres' | 'haie'
  | 'terrasse_toit' | 'terrasse_agrement'
  // ── Utilitaires
  | 'a_definir' | 'autre' | 'a_exclure'

// ─── Niveau d'étage ──────────────────────────────────

export type FloorLevelKey = 'exterieur' | 'sous_sol' | 'rdc' | 'r_plus_1' | 'r_plus_2' | 'r_plus_3' | 'autre'

export const FLOOR_LEVEL_META: Record<FloorLevelKey, { label: string; order: number }> = {
  exterieur: { label: 'Extérieur',   order: -10 },
  sous_sol:  { label: 'Sous-sol',    order: -1  },
  rdc:       { label: 'RDC',         order: 0   },
  r_plus_1:  { label: 'R+1',         order: 1   },
  r_plus_2:  { label: 'R+2',         order: 2   },
  r_plus_3:  { label: 'R+3',         order: 3   },
  autre:     { label: 'Autre',       order: 99  },
}

// ─── Metadata par type ───────────────────────────────

export interface SpaceTypeMeta {
  label: string
  category: SpaceTypeCategory
  icon: string
  color: string
  expectedSqm?: { min: number; max: number }
  erpRequired?: boolean
  description: string
}

export const SPACE_TYPE_META: Record<SpaceTypeKey, SpaceTypeMeta> = {

  // ════════════════════════════════════════════
  //  ACCÈS & CIRCULATION
  // ════════════════════════════════════════════

  // ── Accès site piéton ──
  acces_site_pieton_principal: {
    label: 'Accès site piéton principal',
    category: 'acces-circulation', icon: '🚶', color: '#059669',
    expectedSqm: { min: 5, max: 300 },
    description: 'Entrée piétonne principale depuis la voie publique — portillon, passage piéton balisé.',
  },
  acces_site_pieton_secondaire: {
    label: 'Accès site piéton secondaire',
    category: 'acces-circulation', icon: '🚶', color: '#10b981',
    expectedSqm: { min: 5, max: 150 },
    description: 'Accès piéton secondaire (latéral, arrière, livraisons vélo).',
  },

  // ── Accès site véhicule ──
  acces_site_vehicule_entree: {
    label: 'Entrée véhicule (sens entrée)',
    category: 'acces-circulation', icon: '↘🚗', color: '#2563eb',
    expectedSqm: { min: 20, max: 400 },
    description: 'Accès véhicules ENTRÉE uniquement — sens unique vers parking/site.',
  },
  acces_site_vehicule_sortie: {
    label: 'Sortie véhicule (sens sortie)',
    category: 'acces-circulation', icon: '↗🚗', color: '#ea580c',
    expectedSqm: { min: 20, max: 400 },
    description: 'Accès véhicules SORTIE uniquement — sens unique vers la rue.',
  },
  acces_site_vehicule_mixte: {
    label: 'Accès véhicule (double sens)',
    category: 'acces-circulation', icon: '↔🚗', color: '#0ea5e9',
    expectedSqm: { min: 30, max: 500 },
    description: 'Accès véhicules à double sens (entrée + sortie).',
  },
  acces_site_vehicule_service: {
    label: 'Accès véhicule service',
    category: 'acces-circulation', icon: '🚛', color: '#0d9488',
    expectedSqm: { min: 20, max: 400 },
    description: 'Accès réservé livraisons PL, personnel, déchets.',
  },

  // ── Compat ──
  acces_site_principal:  { label: 'Accès site (générique)', category: 'acces-circulation', icon: '🛣', color: '#059669', expectedSqm: { min: 30, max: 800 }, description: 'DÉPRÉCIÉ — utiliser acces_site_pieton_* ou acces_site_vehicule_*.' },
  acces_site_secondaire: { label: 'Accès site secondaire',  category: 'acces-circulation', icon: '🚏', color: '#10b981', expectedSqm: { min: 20, max: 500 }, description: 'Accès secondaire à la parcelle.' },
  acces_site_service:    { label: 'Accès site service',     category: 'acces-circulation', icon: '🚛', color: '#0d9488', expectedSqm: { min: 20, max: 400 }, description: 'Entrée réservée logistique.' },

  // ── Entrées bâtiment ──
  entree_principale: {
    label: 'Entrée bâtiment principale',
    category: 'acces-circulation', icon: '🏛', color: '#16a34a',
    expectedSqm: { min: 20, max: 500 }, erpRequired: true,
    description: 'Entrée principale DANS le centre commercial — flux clients majeur (> 1 000 pers/h).',
  },
  entree_secondaire: {
    label: 'Entrée secondaire',
    category: 'acces-circulation', icon: '🚪', color: '#34d399',
    expectedSqm: { min: 10, max: 200 }, erpRequired: true,
    description: 'Entrée clients flux mineur, accès latéral.',
  },
  entree_parking_vehicule_entree: {
    label: 'Rampe parking (sens entrée)',
    category: 'acces-circulation', icon: '↘🅿', color: '#2563eb',
    expectedSqm: { min: 20, max: 400 },
    description: 'Rampe / accès véhicules entrant dans le parking.',
  },
  entree_parking_vehicule_sortie: {
    label: 'Rampe parking (sens sortie)',
    category: 'acces-circulation', icon: '↗🅿', color: '#ea580c',
    expectedSqm: { min: 20, max: 400 },
    description: 'Rampe / accès véhicules sortant du parking.',
  },
  entree_parking: {
    label: 'Entrée parking (piéton)',
    category: 'acces-circulation', icon: '🅿', color: '#3b82f6',
    expectedSqm: { min: 15, max: 300 },
    description: 'Accès piéton depuis parking vers le mall (porte, escalier, ascenseur).',
  },
  entree_service: {
    label: 'Entrée service',
    category: 'acces-circulation', icon: '🚚', color: '#475569',
    expectedSqm: { min: 10, max: 100 },
    description: 'Accès livraisons et personnel, réservé.',
  },
  sortie_secours: {
    label: 'Sortie de secours',
    category: 'acces-circulation', icon: '🏃', color: '#dc2626',
    expectedSqm: { min: 2, max: 50 }, erpRequired: true,
    description: 'Issue de secours ERP — BAES obligatoire (ISO 7010 E001).',
  },

  // ── Portes & ouvertures ──
  porte_entree:      { label: 'Porte d\'entrée',         category: 'acces-circulation', icon: '🚪', color: '#10b981', expectedSqm: { min: 1, max: 8  }, erpRequired: true, description: 'Porte d\'entrée simple battant — largeur min 90 cm (PMR).' },
  porte_interieure:  { label: 'Porte intérieure',        category: 'acces-circulation', icon: '🚪', color: '#64748b', expectedSqm: { min: 1, max: 5  }, description: 'Porte intérieure entre locaux, couloirs, bureaux.' },
  porte_secours:     { label: 'Porte de secours',        category: 'acces-circulation', icon: '🚨', color: '#ef4444', expectedSqm: { min: 1, max: 8  }, erpRequired: true, description: 'Barre anti-panique EN 1125 obligatoire.' },
  porte_service:     { label: 'Porte de service',        category: 'acces-circulation', icon: '🚪', color: '#0d9488', expectedSqm: { min: 1, max: 5  }, description: 'Porte service personnel / livraison (badge).' },
  porte_double:      { label: 'Porte double battant',    category: 'acces-circulation', icon: '🚪', color: '#059669', expectedSqm: { min: 2, max: 12 }, erpRequired: true, description: 'Double battant ≥ 1.60 m — entrées principales ERP.' },
  porte_tambour:     { label: 'Porte tambour',           category: 'acces-circulation', icon: '🔄', color: '#16a34a', expectedSqm: { min: 4, max: 20 }, description: 'Porte rotative — isolation thermique, flux contrôlé.' },
  porte_automatique: { label: 'Porte automatique',       category: 'acces-circulation', icon: '⬌', color: '#14b8a6', expectedSqm: { min: 2, max: 15 }, erpRequired: true, description: 'Coulissante automatique (détecteur IR) — flux ERP.' },

  // ── Contrôle & sécurité ──
  controle_acces:    { label: 'Contrôle d\'accès',  category: 'acces-circulation', icon: '🔐', color: '#7e5e3c', expectedSqm: { min: 1, max: 20 }, description: 'Borne/lecteur badge, tourniquet, portillon.' },
  sas_securite:      { label: 'SAS de sécurité',    category: 'acces-circulation', icon: '🛡', color: '#9333ea', expectedSqm: { min: 3, max: 30 }, erpRequired: true, description: 'Sas double porte (thermique, anti-effraction).' },
  portique_securite: { label: 'Portique détection', category: 'acces-circulation', icon: '⚠', color: '#b38a5a', expectedSqm: { min: 1, max: 6  }, description: 'Portique détection métaux / antivol.' },

  // ── Circulation intérieure ──
  mail_central:          { label: 'Mail central (galerie)',    category: 'acces-circulation', icon: '▬', color: '#7e5e3c', expectedSqm: { min: 150, max: 8000 }, erpRequired: true, description: 'Allée marchande principale couverte — flux piéton maximal.' },
  atrium:                { label: 'Atrium',                    category: 'acces-circulation', icon: '◈', color: '#9333ea', expectedSqm: { min: 50,  max: 2000 }, erpRequired: true, description: 'Puits de lumière multi-niveaux — point de repère majeur.' },
  promenade:             { label: 'Promenade principale',      category: 'acces-circulation', icon: '↔', color: '#a77d4c', expectedSqm: { min: 100, max: 5000 }, description: 'Axe de circulation principal (mall walk).' },
  couloir_secondaire:    { label: 'Couloir secondaire',        category: 'acces-circulation', icon: '→', color: '#a78bfa', expectedSqm: { min: 20,  max: 500  }, description: 'Axe de circulation secondaire vers zones de service.' },
  hall_distribution:     { label: 'Hall de distribution',     category: 'acces-circulation', icon: '⌂', color: '#c084fc', expectedSqm: { min: 30,  max: 800  }, description: 'Espace de distribution entre niveaux (rotonde).' },
  passage_pieton_couvert:{ label: 'Passage piéton couvert',   category: 'acces-circulation', icon: '⇌', color: '#a78bfa', expectedSqm: { min: 20,  max: 500  }, description: 'Galerie piétonne couverte (tunnel, passerelle).' },

  // ── Circulation back-of-house (réservée personnel & livraisons) ──
  couloir_service: {
    label: 'Couloir de service (back-of-house)',
    category: 'acces-circulation', icon: '↹', color: '#475569',
    expectedSqm: { min: 5, max: 2000 },
    description: 'Couloir réservé au personnel et aux livraisons — derrière ou entre les locaux commerciaux (galerie de service, back corridor).',
  },
  cour_service: {
    label: 'Cour de service',
    category: 'acces-circulation', icon: '🚛', color: '#334155',
    expectedSqm: { min: 50, max: 5000 },
    description: 'Cour ou zone ouverte de service — accès PL, déchargement, dépôt, réservé au personnel.',
  },

  // ════════════════════════════════════════════
  //  COMMERCES & SERVICES
  // ════════════════════════════════════════════

  // ── Segments métier précis ──
  commerce_supermarche:       { label: 'Supermarché',            category: 'commerces-services', icon: '🛒', color: '#059669', expectedSqm: { min: 400, max: 5000  }, description: 'Supermarché alimentaire (fruits, légumes, épicerie, frais, surgelés).' },
  commerce_restaurant:        { label: 'Restaurant',             category: 'commerces-services', icon: '🍽', color: '#f59e0b', expectedSqm: { min: 40,  max: 500   }, description: 'Restaurant service à table, café, brasserie. Cuisine + salle + (terrasse).' },
  commerce_mode:              { label: 'Mode',                   category: 'commerces-services', icon: '👗', color: '#ec4899', expectedSqm: { min: 30,  max: 2000  }, description: 'Habillement homme/femme/enfant, chaussures, sport, lingerie.' },
  commerce_accessoires:       { label: 'Accessoires',            category: 'commerces-services', icon: '👜', color: '#d946ef', expectedSqm: { min: 20,  max: 300   }, description: 'Maroquinerie, bijouterie, horlogerie, lunetterie.' },
  commerce_banque_assurance:  { label: 'Banque & assurances',    category: 'commerces-services', icon: '🏦', color: '#2563eb', expectedSqm: { min: 30,  max: 300   }, description: 'Agence bancaire, mutuelle, assurance, bureau de change.' },
  commerce_services:          { label: 'Services',               category: 'commerces-services', icon: '🛠', color: '#06b6d4', expectedSqm: { min: 15,  max: 200   }, description: 'Pressing, photocopie, agence de voyage, cordonnerie, clé minute.' },
  commerce_beaute_sante:      { label: 'Beauté & santé',         category: 'commerces-services', icon: '💄', color: '#f472b6', expectedSqm: { min: 20,  max: 400   }, description: 'Parfumerie, pharmacie, opticien, coiffeur, spa, esthétique.' },
  commerce_cadeaux_alimentaire:{ label: 'Cadeaux & alimentaire', category: 'commerces-services', icon: '🎁', color: '#c026d3', expectedSqm: { min: 15,  max: 250   }, description: 'Librairie, papeterie, cadeaux, fleuriste, cave, épicerie fine.' },
  commerce_multimedia:        { label: 'Multimédia',             category: 'commerces-services', icon: '📱', color: '#7e5e3c', expectedSqm: { min: 30,  max: 800   }, description: 'Électronique, téléphonie, informatique, gaming, son/image.' },
  // ── Bâtiments hors galerie ──
  big_box: { label: 'Big Box',      category: 'commerces-services', icon: '🏭', color: '#64748b', expectedSqm: { min: 1000, max: 20000 }, description: 'Magasin entrepôt (meubles, bricolage, sport) — accès direct parking.' },
  market:  { label: 'Marché',       category: 'commerces-services', icon: '🏘', color: '#b45309', expectedSqm: { min: 300,  max: 5000  }, description: 'Marché couvert — multiples stands/étals alimentaires ou artisanat.' },
  // ── Grands équipements d'ancrage non-commerciaux ──
  hotel: {
    label: 'Hôtel',
    category: 'commerces-services', icon: '🏨', color: '#0ea5e9',
    expectedSqm: { min: 500, max: 50000 }, erpRequired: true,
    description: 'Établissement hôtelier intégré ou accolé au centre — chambres, lobby, restaurant, services. Peut occuper plusieurs niveaux (utiliser unitId pour lier les niveaux).',
  },
  hotel_residence: {
    label: 'Résidence hôtelière / Appart\'hôtel',
    category: 'commerces-services', icon: '🏩', color: '#38bdf8',
    expectedSqm: { min: 300, max: 30000 }, erpRequired: true,
    description: 'Aparthotel ou résidence de tourisme — studios équipés, longue durée possible.',
  },
  cinema_multiplex: {
    label: 'Cinéma multiplex',
    category: 'commerces-services', icon: '🎬', color: '#b38a5a',
    expectedSqm: { min: 1000, max: 20000 }, erpRequired: true,
    description: 'Multiplexe cinéma — plusieurs salles, foyer, billetterie, restauration rapide. Anchor majeur de flux soirée/week-end.',
  },
  salle_spectacle: {
    label: 'Salle de spectacle / Événementielle',
    category: 'commerces-services', icon: '🎭', color: '#c026d3',
    expectedSqm: { min: 300, max: 15000 }, erpRequired: true,
    description: 'Salle polyvalente événementielle, théâtre, concert, congrès.',
  },
  bureau_immeuble: {
    label: 'Immeuble de bureaux',
    category: 'commerces-services', icon: '🏢', color: '#b38a5a',
    expectedSqm: { min: 500, max: 50000 },
    description: 'Tour ou bloc de bureaux intégré dans un ensemble mixte (mall + bureaux + hôtel). Plusieurs niveaux — utiliser unitId.',
  },
  zone_exposition: {
    label: 'Zone d\'exposition',
    category: 'commerces-services', icon: '🖼', color: '#f59e0b',
    expectedSqm: { min: 100, max: 30000 }, erpRequired: true,
    description: 'Hall ou espace d\'exposition temporaire ou permanente — salons, foires, expos thématiques, showroom collectif. Accueil grand public, flux dense lors des événements.',
  },
  showroom: {
    label: 'Showroom',
    category: 'commerces-services', icon: '✨', color: '#fbbf24',
    expectedSqm: { min: 50, max: 5000 },
    description: 'Showroom mono-marque ou multi-marques — exposition de produits (auto, immobilier, ameublement, luxe) sans vente directe sur place.',
  },
  galerie_art: {
    label: 'Galerie d\'art',
    category: 'commerces-services', icon: '🎨', color: '#e879f9',
    expectedSqm: { min: 20, max: 2000 },
    description: 'Galerie d\'art, espace culturel, musée intégré — exposition d\'œuvres, animations culturelles.',
  },
  // ── Types généraux (fallback) ──
  local_commerce: { label: 'Local commercial',   category: 'commerces-services', icon: '🛍', color: '#ec4899', expectedSqm: { min: 15,  max: 500  }, description: 'Local commercial standard (mode, accessoires, services).' },
  restauration:   { label: 'Restauration',        category: 'commerces-services', icon: '🍽', color: '#f59e0b', expectedSqm: { min: 20,  max: 1000 }, description: 'Restaurant, café, snacking — local individuel.' },
  food_court:     { label: 'Food court',          category: 'commerces-services', icon: '🍴', color: '#fb923c', expectedSqm: { min: 150, max: 3000 }, erpRequired: true, description: 'Zone restauration collective avec kiosques et espace commun.' },
  loisirs:        { label: 'Loisirs',             category: 'commerces-services', icon: '🎬', color: '#b38a5a', expectedSqm: { min: 100, max: 3000 }, description: 'Cinéma, bowling, salle de jeux, escape game.' },
  services:       { label: 'Services',            category: 'commerces-services', icon: '🏦', color: '#06b6d4', expectedSqm: { min: 10,  max: 300  }, description: 'Banque, poste, pressing, coiffeur, pharmacie.' },
  grande_surface: { label: 'Grande surface',      category: 'commerces-services', icon: '🛒', color: '#14b8a6', expectedSqm: { min: 500, max: 10000}, description: 'Anchor store, hypermarché (> 500 m²).' },
  kiosque:        { label: 'Kiosque',             category: 'commerces-services', icon: '🛖', color: '#f43f5e', expectedSqm: { min: 2,   max: 30   }, description: 'Stand éphémère ou permanent en promenade.' },
  // ── Spécialistes & niches ──
  tabac_presse: {
    label: 'Tabac / Presse / Librairie',
    category: 'commerces-services', icon: '📰', color: '#0891b2',
    expectedSqm: { min: 10, max: 120 },
    description: 'Bureau de tabac, kiosque presse, librairie de gare — journaux, tabac, loto.',
  },
  auto_lavage: {
    label: 'Station lavage auto',
    category: 'commerces-services', icon: '🚗', color: '#0ea5e9',
    expectedSqm: { min: 30, max: 500 },
    description: 'Station de lavage voiture — automatique ou haute pression, en parking.',
  },
  location_vehicule: {
    label: 'Location de véhicule',
    category: 'commerces-services', icon: '🔑', color: '#0369a1',
    expectedSqm: { min: 10, max: 200 },
    description: 'Agence de location voiture/moto/scooter (Europcar, Hertz, Avis…) — bureau + aire de remise.',
  },
  // ── Terrasses commerciales ──
  terrasse_restaurant:  {
    label: 'Terrasse restaurant',
    category: 'commerces-services', icon: '🍽', color: '#f97316',
    expectedSqm: { min: 5, max: 400 },
    description: 'Terrasse de restauration en plein air ou sous auvent — tables + chaises, barrières.',
  },
  terrasse_commerciale: {
    label: 'Terrasse commerciale',
    category: 'commerces-services', icon: '☂', color: '#fb923c',
    expectedSqm: { min: 5, max: 500 },
    description: 'Terrasse boutique, déballage marchand, présentoir plein air.',
  },

  // ════════════════════════════════════════════
  //  BUREAUX & ADMINISTRATION
  // ════════════════════════════════════════════

  bureau_direction: {
    label: 'Bureau direction',
    category: 'bureaux-admin', icon: '💼', color: '#b38a5a',
    expectedSqm: { min: 12, max: 80 },
    description: 'Bureau fermé de direction / DG / responsable — espace individuel ou petite équipe.',
  },
  bureau_open_space: {
    label: 'Open space / plateau',
    category: 'bureaux-admin', icon: '🖥', color: '#c9a068',
    expectedSqm: { min: 30, max: 2000 },
    description: 'Plateau bureau en open space — postes de travail mutualisés ou dédiés.',
  },
  salle_reunion: {
    label: 'Salle de réunion',
    category: 'bureaux-admin', icon: '👥', color: '#a78bfa',
    expectedSqm: { min: 10, max: 100 },
    description: 'Salle de réunion fermée (4 à 20 personnes) — table, projecteur, visio.',
  },
  salle_conference: {
    label: 'Salle de conférence / amphithéâtre',
    category: 'bureaux-admin', icon: '🎙', color: '#7e5e3c',
    expectedSqm: { min: 50, max: 1000 },
    description: 'Grande salle événementielle — conférences, AG, formations (> 20 personnes).',
  },
  accueil_administratif: {
    label: 'Accueil administratif',
    category: 'bureaux-admin', icon: '🗂', color: '#e2ccaa',
    expectedSqm: { min: 5, max: 60 },
    description: 'Réception administrative du personnel ou des prestataires (distinct accueil visiteurs).',
  },
  archives: {
    label: 'Archives / stockage documents',
    category: 'bureaux-admin', icon: '📁', color: '#a1a1aa',
    expectedSqm: { min: 5, max: 300 },
    description: 'Local archives papier ou numériques — rayonnages, armoires ignifugées.',
  },
  local_informatique: {
    label: 'Salle serveurs / IT',
    category: 'bureaux-admin', icon: '🖧', color: '#06b6d4',
    expectedSqm: { min: 5, max: 200 },
    description: 'Salle serveurs, baie réseau, onduleurs, climatisation dédié IT.',
  },
  local_securite_ssiap: {
    label: 'Poste de sécurité / SSIAP',
    category: 'bureaux-admin', icon: '🔒', color: '#ef4444',
    expectedSqm: { min: 5, max: 80 },
    erpRequired: true,
    description: 'Poste central de sécurité incendie et secours (SSIAP) — PC sécurité, accès caméras, alarme.',
  },
  vestiaires_personnel: {
    label: 'Vestiaires personnel',
    category: 'bureaux-admin', icon: '👔', color: '#94a3b8',
    expectedSqm: { min: 8, max: 200 },
    description: 'Vestiaires avec casiers et douches pour le personnel et agents de sécurité.',
  },
  refectoire_personnel: {
    label: 'Réfectoire / salle de pause',
    category: 'bureaux-admin', icon: '☕', color: '#d97706',
    expectedSqm: { min: 10, max: 300 },
    description: 'Salle de pause et de repas du personnel — kitchenette, micro-ondes, tables.',
  },

  // ════════════════════════════════════════════
  //  ÉQUIPEMENTS VISITEURS
  // ════════════════════════════════════════════

  sanitaires: {
    label: 'Sanitaires',
    category: 'equipements', icon: '🚻', color: '#0ea5e9',
    expectedSqm: { min: 10, max: 150 }, erpRequired: true,
    description: 'WC hommes/femmes/PMR — ratio ERP obligatoire.',
  },
  escalator: {
    label: 'Escalator',
    category: 'equipements', icon: '⬈', color: '#fb923c',
    expectedSqm: { min: 15, max: 60 }, erpRequired: true,
    description: 'Escalator montant ou descendant. ~45 s/étage.',
  },
  ascenseur: {
    label: 'Ascenseur',
    category: 'equipements', icon: '⬆', color: '#2563eb',
    expectedSqm: { min: 3, max: 15 }, erpRequired: true,
    description: 'Ascenseur obligatoire PMR (EN 81-70).',
  },
  rampe_pmr: {
    label: 'Rampe PMR',
    category: 'equipements', icon: '♿', color: '#3b82f6',
    expectedSqm: { min: 5, max: 80 }, erpRequired: true,
    description: 'Rampe d\'accès PMR conforme (pente ≤ 5 %).',
  },
  escalier_fixe: {
    label: 'Escalier fixe',
    category: 'equipements', icon: '◇', color: '#64748b',
    expectedSqm: { min: 5, max: 60 }, erpRequired: true,
    description: 'Escalier de service ou public (issue de secours).',
  },
  point_information: {
    label: 'Point information',
    category: 'equipements', icon: 'ⓘ', color: '#10b981',
    expectedSqm: { min: 3, max: 30 },
    description: 'Accueil central, borne d\'information, conciergerie.',
  },
  borne_wayfinder: {
    label: 'Borne wayfinder',
    category: 'equipements', icon: '◉', color: '#b38a5a',
    expectedSqm: { min: 1, max: 5 },
    description: 'Borne interactive tactile de navigation (Vol.4 Wayfinder).',
  },
  guichet_service: {
    label: 'Guichet service',
    category: 'equipements', icon: '🪟', color: '#0ea5e9',
    expectedSqm: { min: 2, max: 25 },
    description: 'Comptoir accueil, consigne, objets trouvés, conciergerie.',
  },
  guichet_caisse: {
    label: 'Guichet caisse',
    category: 'equipements', icon: '💰', color: '#f59e0b',
    expectedSqm: { min: 2, max: 15 },
    description: 'Caisse centrale, bureau de perception (parking, événements).',
  },
  atm: {
    label: 'Distributeur ATM',
    category: 'equipements', icon: '🏧', color: '#2563eb',
    expectedSqm: { min: 1, max: 5 },
    description: 'Distributeur automatique de billets (DAB). Proximité entrées.',
  },
  cabine_photomaton: {
    label: 'Cabine photomaton',
    category: 'equipements', icon: '📷', color: '#a77d4c',
    expectedSqm: { min: 1, max: 4 },
    description: 'Cabine photo identité, passeport, permis.',
  },
  espace_bebe: {
    label: 'Espace bébé / nursery',
    category: 'equipements', icon: '🍼', color: '#f9a8d4',
    expectedSqm: { min: 4, max: 40 },
    description: 'Espace change, allaitement, préparation biberons — accessibilité PMR obligatoire.',
  },
  poste_premiers_secours: {
    label: 'Poste de premiers secours',
    category: 'equipements', icon: '🏥', color: '#ef4444',
    expectedSqm: { min: 5, max: 50 }, erpRequired: true,
    description: 'Infirmerie, poste secouriste — brancard, DEA, trousse de secours. Obligatoire ERP > 1 500 m².',
  },
  salle_priere: {
    label: 'Salle de prière',
    category: 'equipements', icon: '🕌', color: '#a78bfa',
    expectedSqm: { min: 10, max: 200 },
    description: 'Espace de recueillement inter-confessionnel (salle de prière, espace de méditation).',
  },
  consigne_bagages: {
    label: 'Consigne / bagagerie',
    category: 'equipements', icon: '🧳', color: '#fb923c',
    expectedSqm: { min: 2, max: 50 },
    description: 'Casiers à code ou service consigne pour les achats et bagages des visiteurs.',
  },
  espace_fumeur: {
    label: 'Espace fumeur',
    category: 'equipements', icon: '🚬', color: '#6b7280',
    expectedSqm: { min: 3, max: 60 },
    description: 'Zone fumeur désignée — extérieure ou sous abri ventilé, balisée réglementairement.',
  },

  // ════════════════════════════════════════════
  //  LOCAUX TECHNIQUES
  // ════════════════════════════════════════════

  local_electrique_tgbt: {
    label: 'Local électrique / TGBT',
    category: 'locaux-techniques', icon: '⚡', color: '#fbbf24',
    expectedSqm: { min: 4, max: 100 },
    description: 'Tableau général basse tension (TGBT), armoires électriques, coffrets divisionnaires.',
  },
  local_chaufferie_cvc: {
    label: 'Chaufferie / local CVC',
    category: 'locaux-techniques', icon: '🌡', color: '#f97316',
    expectedSqm: { min: 10, max: 300 },
    description: 'Chaufferie, climatisation, ventilation, PAC, traitement d\'air.',
  },
  local_sprinkler: {
    label: 'Local sprinkler / réserve incendie',
    category: 'locaux-techniques', icon: '💧', color: '#38bdf8',
    expectedSqm: { min: 5, max: 150 }, erpRequired: true,
    description: 'Nourrice sprinkler, réserve incendie, pompes anti-incendie (ERP obligatoire).',
  },
  local_groupe_electrogene: {
    label: 'Groupe électrogène / onduleur',
    category: 'locaux-techniques', icon: '🔋', color: '#a3e635',
    expectedSqm: { min: 5, max: 100 },
    description: 'Groupe électrogène de secours, onduleur (UPS), alimentation sans coupure.',
  },
  local_telecom: {
    label: 'Local télécom / baie réseau',
    category: 'locaux-techniques', icon: '📡', color: '#22d3ee',
    expectedSqm: { min: 2, max: 50 },
    description: 'Répartiteur téléphonique, baie réseau, nœud fibre optique, WiFi backbone.',
  },
  local_menage: {
    label: 'Local ménage / entretien',
    category: 'locaux-techniques', icon: '🧹', color: '#94a3b8',
    expectedSqm: { min: 2, max: 30 },
    description: 'Local produits d\'entretien, matériel de nettoyage, balai-brosse.',
  },
  local_stockage: {
    label: 'Local stockage général',
    category: 'locaux-techniques', icon: '📦', color: '#78716c',
    expectedSqm: { min: 5, max: 500 },
    description: 'Réserve, stockage matériel, débarras, entrepôt interne.',
  },
  zone_technique: {
    label: 'Zone technique',
    category: 'locaux-techniques', icon: '⚙', color: '#475569',
    expectedSqm: { min: 5, max: 500 },
    description: 'Zone technique générique (fallback) — préférer les types précis ci-dessus.',
  },
  zone_livraison: {
    label: 'Zone livraison / quai',
    category: 'locaux-techniques', icon: '🚚', color: '#0f766e',
    expectedSqm: { min: 30, max: 1000 },
    description: 'Quai de déchargement, zone logistique PL, dock nivelleur.',
  },
  local_poubelles: {
    label: 'Local déchets / poubelles',
    category: 'locaux-techniques', icon: '🗑', color: '#6b7280',
    expectedSqm: { min: 5, max: 80 },
    description: 'Local déchets avec tri sélectif, bacs à ordures, compacteur.',
  },

  // ════════════════════════════════════════════
  //  PARKING & VOIRIE
  // ════════════════════════════════════════════

  // ── Zones macro ──
  parking_vehicule: { label: 'Parking véhicule',     category: 'parking-voirie', icon: '🅿', color: '#60a5fa', expectedSqm: { min: 500, max: 50000 }, description: 'Zone de stationnement voiture (place 2.5 × 5 m).' },
  parking_moto:     { label: 'Parking moto',         category: 'parking-voirie', icon: '🏍', color: '#7dd3fc', expectedSqm: { min: 20,  max: 1000  }, description: 'Zone stationnement motos et scooters.' },
  parking_velo:     { label: 'Parking vélo',         category: 'parking-voirie', icon: '🚲', color: '#67e8f9', expectedSqm: { min: 5,   max: 500   }, description: 'Arceaux vélos, consigne mobilité douce.' },
  // ── Places unitaires ──
  parking_place_standard:  { label: 'Place standard',          category: 'parking-voirie', icon: '▫', color: '#60a5fa', expectedSqm: { min: 10, max: 16 }, description: 'Place standard 2.5 × 5 m (= 12.5 m²). Norme FR min 2.3 × 5 m.' },
  parking_place_pmr:       { label: 'Place PMR (handicap)',    category: 'parking-voirie', icon: '♿', color: '#3b82f6', expectedSqm: { min: 14, max: 20 }, description: 'Place PMR 3.3 × 5 m — obligatoire ≥ 2 % du total.' },
  parking_place_ve:        { label: 'Place borne VE',          category: 'parking-voirie', icon: '🔌', color: '#22c55e', expectedSqm: { min: 10, max: 16 }, description: 'Place avec borne recharge VE (AC 7-22 kW ou DC fast).' },
  parking_place_moto:      { label: 'Place moto',              category: 'parking-voirie', icon: '🏍', color: '#7dd3fc', expectedSqm: { min: 1.5, max: 4 }, description: 'Place moto/scooter individuelle (1 × 2 m).' },
  parking_place_livraison: { label: 'Place livraison',         category: 'parking-voirie', icon: '📦', color: '#f59e0b', expectedSqm: { min: 20, max: 60 }, description: 'Place livraison véhicule utilitaire — souvent jaune.' },
  parking_place_famille:   { label: 'Place famille / enceinte',category: 'parking-voirie', icon: '👨‍👩‍👧', color: '#f472b6', expectedSqm: { min: 12, max: 18 }, description: 'Place élargie familles/femmes enceintes, proche entrée.' },
  // ── Voirie parking ──
  parking_voie_circulation: { label: 'Voie circulation parking', category: 'parking-voirie', icon: '═', color: '#94a3b8', expectedSqm: { min: 15, max: 2000 }, description: 'Allée de roulage interne parking — largeur réglementaire 5-6 m.' },
  voie_principale:          { label: 'Voie principale',            category: 'parking-voirie', icon: '🛣️', color: '#4b5563', expectedSqm: { min: 80, max: 30000 }, description: 'Axe routier principal desservant le bâtiment — accès véhicules majeur.' },
  voie_secondaire:          { label: 'Voie secondaire',            category: 'parking-voirie', icon: '═', color: '#64748b', expectedSqm: { min: 30, max: 10000 }, description: 'Voie de desserte secondaire, contre-allée, accès service.' },
  voie_pompier:             { label: 'Voie pompiers',              category: 'parking-voirie', icon: '🚒', color: '#ef4444', expectedSqm: { min: 50, max: 8000 }, description: 'Voie d\'intervention pompiers — largeur min 4 m + dégagement 7 m.' },
  voie_livraison:           { label: 'Voie livraison',              category: 'parking-voirie', icon: '🚚', color: '#f59e0b', expectedSqm: { min: 40, max: 5000 }, description: 'Voie dédiée aux livraisons / camions — quais de déchargement.' },
  rond_point:               { label: 'Rond-point / Giratoire',     category: 'parking-voirie', icon: '🔄', color: '#6b7280', expectedSqm: { min: 80, max: 2500 }, description: 'Rond-point d\'accès ou giratoire de retournement.' },
  carrefour:                { label: 'Carrefour',                  category: 'parking-voirie', icon: '✚',  color: '#6b7280', expectedSqm: { min: 40, max: 1500 }, description: 'Intersection de voies.' },
  passage_pieton:           { label: 'Passage piéton',             category: 'parking-voirie', icon: '🚸', color: '#fbbf24', expectedSqm: { min: 4,  max: 200 }, description: 'Traversée piétonne sécurisée, zébras.' },

  // ── Routes publiques (hors site — environnement urbain autour du bâtiment) ──
  route_autoroute:          { label: 'Autoroute',                   category: 'paysage-exterieur', icon: '🛣️', color: '#334155', expectedSqm: { min: 500, max: 500000 }, description: 'Autoroute publique — circulation rapide, multiples voies.' },
  route_boulevard:          { label: 'Boulevard',                   category: 'paysage-exterieur', icon: '🛣️', color: '#475569', expectedSqm: { min: 200, max: 50000 }, description: 'Boulevard public — voie principale urbaine à grande circulation.' },
  route_avenue:             { label: 'Avenue',                      category: 'paysage-exterieur', icon: '🛣️', color: '#4b5563', expectedSqm: { min: 150, max: 30000 }, description: 'Avenue publique — voie urbaine structurante.' },
  route_rue_principale:     { label: 'Rue principale',              category: 'paysage-exterieur', icon: '═',  color: '#57606a', expectedSqm: { min: 80,  max: 20000 }, description: 'Rue publique principale bordant ou traversant le site.' },
  route_rue_secondaire:     { label: 'Rue secondaire',              category: 'paysage-exterieur', icon: '═',  color: '#64748b', expectedSqm: { min: 40,  max: 10000 }, description: 'Rue publique secondaire, desserte de quartier.' },
  route_impasse:            { label: 'Impasse / Voie sans issue',   category: 'paysage-exterieur', icon: '⊣',  color: '#64748b', expectedSqm: { min: 20,  max: 3000 }, description: 'Impasse publique ou voie en cul-de-sac.' },
  route_rond_point_public:  { label: 'Rond-point public',           category: 'paysage-exterieur', icon: '🔄', color: '#475569', expectedSqm: { min: 100, max: 5000 }, description: 'Rond-point public hors-site.' },
  route_carrefour_public:   { label: 'Carrefour public',            category: 'paysage-exterieur', icon: '✚',  color: '#475569', expectedSqm: { min: 50,  max: 2500 }, description: 'Intersection publique (feux / stop).' },
  route_pont:               { label: 'Pont',                        category: 'paysage-exterieur', icon: '🌉', color: '#6b7280', expectedSqm: { min: 50,  max: 10000 }, description: 'Pont routier public.' },
  route_tunnel:             { label: 'Tunnel',                      category: 'paysage-exterieur', icon: '⬛', color: '#374151', expectedSqm: { min: 50,  max: 10000 }, description: 'Tunnel routier public.' },
  route_trottoir_public:    { label: 'Trottoir public',             category: 'paysage-exterieur', icon: '🚶', color: '#a3a3a3', expectedSqm: { min: 10,  max: 5000 }, description: 'Trottoir public bordant les routes — hors du site.' },
  parking_fleche_sens:      { label: 'Flèche sens parking',      category: 'parking-voirie', icon: '↗', color: '#f59e0b', expectedSqm: { min: 0.5, max: 5 }, description: 'Marquage sol flèche directionnelle (sens circulation parking).' },
  // ── Transport extérieur ──
  arret_taxi: {
    label: 'Arrêt taxi / VTC',
    category: 'parking-voirie', icon: '🚕', color: '#facc15',
    expectedSqm: { min: 10, max: 200 },
    description: 'Zone dépose/prise taxi, VTC (quai avec marquage au sol).',
  },
  arret_bus_tram: {
    label: 'Arrêt bus / tram',
    category: 'parking-voirie', icon: '🚌', color: '#0ea5e9',
    expectedSqm: { min: 15, max: 150 },
    description: 'Arrêt transport collectif urbain — abribus, quai, borne info.',
  },
  station_velo_libre_service: {
    label: 'Station vélo libre-service',
    category: 'parking-voirie', icon: '🚲', color: '#22c55e',
    expectedSqm: { min: 10, max: 80 },
    description: 'Station vélo en libre-service (Vélib\', Mobike…).',
  },

  // ════════════════════════════════════════════
  //  PAYSAGE & EXTÉRIEUR
  // ════════════════════════════════════════════

  // ── Espaces extérieurs bâtis ──
  exterieur_parvis:         { label: 'Parvis d\'entrée',          category: 'paysage-exterieur', icon: '⬜', color: '#9ca3af', expectedSqm: { min: 100, max: 10000 }, description: 'Parvis accolé à l\'entrée — dépose-minute, accès piéton.' },
  exterieur_voie_pieton:    { label: 'Voie piétonne ext.',        category: 'paysage-exterieur', icon: '🚶', color: '#86efac', expectedSqm: { min: 30,  max: 5000  }, description: 'Trottoir, allée piétonne, mall extérieur.' },
  exterieur_voie_vehicule:  { label: 'Voie véhicule ext.',        category: 'paysage-exterieur', icon: '🚗', color: '#64748b', expectedSqm: { min: 50,  max: 10000 }, description: 'Chaussée, contre-allée, voie d\'accès.' },
  exterieur_place_forum:    { label: 'Place / esplanade',         category: 'paysage-exterieur', icon: '◯', color: '#fcd34d', expectedSqm: { min: 200, max: 15000 }, description: 'Place publique, esplanade événementielle, forum.' },
  exterieur_giratoire:      { label: 'Giratoire / rond-point',    category: 'paysage-exterieur', icon: '⊚', color: '#6b7280', expectedSqm: { min: 50,  max: 3000  }, description: 'Rond-point — point de décision circulation.' },
  exterieur_arret_transport:{ label: 'Arrêt transport ext.',      category: 'paysage-exterieur', icon: '🚌', color: '#0ea5e9', expectedSqm: { min: 10,  max: 200   }, description: 'Arrêt bus/tram, dépose-taxi, quai ext.' },
  exterieur_zone_detente:   { label: 'Zone détente / repos',      category: 'paysage-exterieur', icon: '🪑', color: '#84cc16', expectedSqm: { min: 20,  max: 1000  }, description: 'Zone mobilier (bancs, tables), espace de repos.' },
  exterieur_aire_jeux:      { label: 'Aire de jeux',              category: 'paysage-exterieur', icon: '🛝', color: '#fb7185', expectedSqm: { min: 50,  max: 2000  }, description: 'Playground, aire ludique enfants (NF EN 1176).' },
  exterieur_fontaine:       { label: 'Fontaine / bassin',         category: 'paysage-exterieur', icon: '⛲', color: '#38bdf8', expectedSqm: { min: 5,   max: 500   }, description: 'Fontaine décorative, bassin, élément d\'eau paysager.' },
  exterieur_voirie:         { label: 'Voirie générale',           category: 'paysage-exterieur', icon: '═', color: '#4b5563', expectedSqm: { min: 100, max: 20000 }, description: 'Voirie générique — préférer voie piétonne / véhicule.' },
  // ── Végétation & paysage ──
  terre_plein: {
    label: 'Terre-plein / îlot',
    category: 'paysage-exterieur', icon: '🟫', color: '#92400e',
    expectedSqm: { min: 1, max: 500 },
    description: 'Îlot de séparation surélevé en parking ou voirie — souvent planté ou bétonné.',
  },
  massif_vegetal: {
    label: 'Massif végétal / jardinière',
    category: 'paysage-exterieur', icon: '🌿', color: '#16a34a',
    expectedSqm: { min: 1, max: 200 },
    description: 'Massif de plantes, jardinière, bac planté — intérieur ou extérieur.',
  },
  jardin: {
    label: 'Jardin / espace vert',
    category: 'paysage-exterieur', icon: '🌳', color: '#15803d',
    expectedSqm: { min: 20, max: 5000 },
    description: 'Espace vert aménagé : jardin, parc, noue paysagère, bande verte.',
  },
  pelouse: {
    label: 'Pelouse / gazon',
    category: 'paysage-exterieur', icon: '🟩', color: '#4ade80',
    expectedSqm: { min: 5, max: 10000 },
    description: 'Surface gazonnée naturelle ou synthétique.',
  },
  arbre_isole: {
    label: 'Arbre isolé',
    category: 'paysage-exterieur', icon: '🌲', color: '#166534',
    expectedSqm: { min: 1, max: 25 },
    description: 'Arbre planté seul (projection de couronne ou fosse de plantation).',
  },
  alignement_arbres: {
    label: 'Alignement d\'arbres',
    category: 'paysage-exterieur', icon: '🌲', color: '#14532d',
    expectedSqm: { min: 5, max: 1000 },
    description: 'Rangée d\'arbres en bordure de voirie, allée arborée, mail planté.',
  },
  haie: {
    label: 'Haie / clôture végétale',
    category: 'paysage-exterieur', icon: '🌿', color: '#22c55e',
    expectedSqm: { min: 2, max: 500 },
    description: 'Haie taillée, brise-vue végétal, clôture d\'arbustes.',
  },
  // ── Terrasses non marchandes ──
  terrasse_toit: {
    label: 'Terrasse de toit',
    category: 'paysage-exterieur', icon: '🏙', color: '#7e5e3c',
    expectedSqm: { min: 20, max: 5000 },
    description: 'Terrasse accessible en toiture (rooftop) — jardin, bar, zone de détente en hauteur.',
  },
  terrasse_agrement: {
    label: 'Terrasse d\'agrément',
    category: 'paysage-exterieur', icon: '🪴', color: '#a3e635',
    expectedSqm: { min: 10, max: 2000 },
    description: 'Terrasse publique de repos — dalles, mobilier, végétalisation.',
  },

  // ════════════════════════════════════════════
  //  UTILITAIRES
  // ════════════════════════════════════════════

  a_definir: {
    label: 'À définir',
    category: 'autre', icon: '?', color: '#a1a1aa',
    description: 'Espace non encore identifié — à valider.',
  },
  autre: {
    label: 'Autre',
    category: 'autre', icon: '·', color: '#94a3b8',
    description: 'Autre type non catégorisable dans la bibliothèque.',
  },
  a_exclure: {
    label: 'À exclure',
    category: 'autre', icon: '⊘', color: '#ef4444',
    description: 'Espace à exclure de l\'analyse (bruit DXF, faux espace).',
  },
}

// ─── Groupage pour l'UI ─────────────────────────────

export const SPACE_TYPES_BY_CATEGORY: Record<SpaceTypeCategory, SpaceTypeKey[]> = {
  'acces-circulation': [
    // Accès site piéton
    'acces_site_pieton_principal', 'acces_site_pieton_secondaire',
    // Accès site véhicule
    'acces_site_vehicule_entree', 'acces_site_vehicule_sortie',
    'acces_site_vehicule_mixte', 'acces_site_vehicule_service',
    // Compat
    'acces_site_principal', 'acces_site_secondaire', 'acces_site_service',
    // Entrées bâtiment
    'entree_principale', 'entree_secondaire',
    'entree_parking_vehicule_entree', 'entree_parking_vehicule_sortie',
    'entree_parking', 'entree_service', 'sortie_secours',
    // Portes & ouvertures
    'porte_entree', 'porte_double', 'porte_automatique', 'porte_tambour',
    'porte_interieure', 'porte_service', 'porte_secours',
    // Contrôle & sécurité
    'controle_acces', 'sas_securite', 'portique_securite',
    // Circulation intérieure (publique)
    'mail_central', 'atrium', 'promenade', 'couloir_secondaire',
    'hall_distribution', 'passage_pieton_couvert',
    // Circulation back-of-house
    'couloir_service', 'cour_service',
  ],
  'commerces-services': [
    // Segments précis
    'commerce_supermarche', 'commerce_restaurant',
    'commerce_mode', 'commerce_accessoires',
    'commerce_banque_assurance', 'commerce_services',
    'commerce_beaute_sante', 'commerce_cadeaux_alimentaire', 'commerce_multimedia',
    // Bâtiments hors galerie
    'big_box', 'market',
    // Grands équipements d'ancrage non-commerciaux
    'hotel', 'hotel_residence',
    'cinema_multiplex', 'salle_spectacle',
    'bureau_immeuble',
    'zone_exposition', 'showroom', 'galerie_art',
    // Spécialistes & niches
    'tabac_presse', 'auto_lavage', 'location_vehicule',
    // Terrasses marchandes
    'terrasse_restaurant', 'terrasse_commerciale',
    // Généraux
    'local_commerce', 'restauration', 'food_court', 'loisirs',
    'services', 'grande_surface', 'kiosque',
  ],
  'bureaux-admin': [
    'bureau_direction', 'bureau_open_space',
    'salle_reunion', 'salle_conference',
    'accueil_administratif', 'archives',
    'local_informatique', 'local_securite_ssiap',
    'vestiaires_personnel', 'refectoire_personnel',
  ],
  'equipements': [
    // Verticalité & accessibilité
    'escalator', 'ascenseur', 'rampe_pmr', 'escalier_fixe',
    // Sanitaires & confort
    'sanitaires', 'espace_bebe',
    // Sécurité & santé
    'poste_premiers_secours',
    // Services visiteurs
    'point_information', 'borne_wayfinder',
    'guichet_service', 'guichet_caisse', 'atm', 'cabine_photomaton',
    'consigne_bagages',
    // Espaces sociaux
    'salle_priere', 'espace_fumeur',
  ],
  'locaux-techniques': [
    'local_electrique_tgbt', 'local_chaufferie_cvc',
    'local_sprinkler', 'local_groupe_electrogene', 'local_telecom',
    'local_menage', 'local_stockage',
    'zone_technique', 'zone_livraison', 'local_poubelles',
  ],
  'parking-voirie': [
    // Zones macro
    'parking_vehicule', 'parking_moto', 'parking_velo',
    // Places unitaires
    'parking_place_standard', 'parking_place_pmr', 'parking_place_ve',
    'parking_place_moto', 'parking_place_livraison', 'parking_place_famille',
    // Voirie
    'parking_voie_circulation', 'parking_fleche_sens',
    'voie_principale', 'voie_secondaire', 'voie_pompier', 'voie_livraison',
    'rond_point', 'carrefour', 'passage_pieton',
    // Transport
    'arret_taxi', 'arret_bus_tram', 'station_velo_libre_service',
  ],
  'paysage-exterieur': [
    // Routes publiques (hors-site)
    'route_autoroute', 'route_boulevard', 'route_avenue',
    'route_rue_principale', 'route_rue_secondaire', 'route_impasse',
    'route_rond_point_public', 'route_carrefour_public',
    'route_pont', 'route_tunnel', 'route_trottoir_public',
    // Espaces bâtis extérieurs
    'exterieur_parvis', 'exterieur_voie_pieton', 'exterieur_voie_vehicule',
    'exterieur_place_forum', 'exterieur_giratoire', 'exterieur_arret_transport',
    'exterieur_zone_detente', 'exterieur_aire_jeux', 'exterieur_fontaine',
    'exterieur_voirie',
    // Végétation & paysage
    'terre_plein', 'massif_vegetal', 'jardin', 'pelouse',
    'arbre_isole', 'alignement_arbres', 'haie',
    // Terrasses
    'terrasse_toit', 'terrasse_agrement',
  ],
  'autre': ['a_definir', 'autre', 'a_exclure'],
}

export const SPACE_CATEGORY_META: Record<SpaceTypeCategory, { label: string; color: string; icon: string }> = {
  'acces-circulation':  { label: 'Accès & Circulation',    color: '#a77d4c', icon: '🚪' },
  'commerces-services': { label: 'Commerces & Services',   color: '#ec4899', icon: '🛍' },
  'bureaux-admin':      { label: 'Bureaux & Administration',color: '#b38a5a', icon: '💼' },
  'equipements':        { label: 'Équipements',            color: '#f59e0b', icon: '⚡' },
  'locaux-techniques':  { label: 'Locaux Techniques',      color: '#475569', icon: '⚙' },
  'parking-voirie':     { label: 'Parking & Voirie',       color: '#3b82f6', icon: '🅿' },
  'paysage-exterieur':  { label: 'Paysage & Extérieur',    color: '#22c55e', icon: '🌿' },
  'autre':              { label: 'Autre',                  color: '#94a3b8', icon: '?' },
}

// ─── Auto-classification depuis un label DXF ─────────

const TYPE_PATTERNS: Array<{ key: SpaceTypeKey; pattern: RegExp }> = [
  { key: 'sortie_secours',    pattern: /(?:sortie|issue)[_\s]?secours|emergency[_\s]?exit/i },
  // Portes — matcher AVANT les entrées bâtiment
  { key: 'porte_tambour',     pattern: /porte[_\s]?tambour|revolving[_\s]?door/i },
  { key: 'porte_automatique', pattern: /porte[_\s]?auto|automatic[_\s]?door|coulissante[_\s]?auto/i },
  { key: 'porte_double',      pattern: /porte[_\s]?(?:double|2[_\s]?battant)|double[_\s]?door/i },
  { key: 'porte_secours',     pattern: /porte[_\s]?secours|emergency[_\s]?door|anti[_\s]?panique/i },
  { key: 'porte_service',     pattern: /porte[_\s]?service|service[_\s]?door|porte[_\s]?personnel/i },
  { key: 'porte_interieure',  pattern: /porte[_\s]?(?:int|interieure|locale)/i },
  { key: 'porte_entree',      pattern: /porte[_\s]?(?:entree|ext|principale)|main[_\s]?door|entrance[_\s]?door/i },
  // Contrôle accès
  { key: 'sas_securite',      pattern: /\bsas\b|airlock|security[_\s]?vestibule/i },
  { key: 'portique_securite', pattern: /portique|metal[_\s]?detector|antivol/i },
  { key: 'controle_acces',    pattern: /controle[_\s]?acces|access[_\s]?control|tourniquet|portillon|turnstile|badge(?:eur|_reader)/i },
  // Guichets & services
  { key: 'atm',               pattern: /\batm\b|distributeur[_\s]?(?:billet|automatique)|dab\b|cash[_\s]?machine/i },
  { key: 'guichet_caisse',    pattern: /guichet[_\s]?caisse|caisse[_\s]?centrale|perception/i },
  { key: 'guichet_service',   pattern: /guichet|counter|comptoir[_\s]?service|consigne|objets?[_\s]?trouves?|conciergerie/i },
  { key: 'cabine_photomaton', pattern: /photomaton|photo[_\s]?identite|photo[_\s]?booth/i },
  // Transport
  { key: 'arret_taxi',        pattern: /(?:arret|station)[_\s]?taxi|taxi[_\s]?rank|vtc|uber|yango|bolt[_\s]?stop/i },
  { key: 'arret_bus_tram',    pattern: /(?:arret|station)[_\s]?(?:bus|tram)|bus[_\s]?stop|tram[_\s]?stop/i },
  { key: 'station_velo_libre_service', pattern: /velib|velov|station[_\s]?velo|bike[_\s]?share|bike[_\s]?station/i },
  // Accès site véhicule
  { key: 'acces_site_vehicule_entree', pattern: /(?:acces|entree|rampe)[_\s]?(?:site[_\s]?|parcelle[_\s]?)?(?:vehicule|auto|voit)[_\s]?(?:in|entree|entrant)|veh[_\s]?in/i },
  { key: 'acces_site_vehicule_sortie', pattern: /(?:acces|sortie|rampe)[_\s]?(?:site[_\s]?|parcelle[_\s]?)?(?:vehicule|auto|voit)[_\s]?(?:out|sortie|sortant)|veh[_\s]?out/i },
  { key: 'acces_site_vehicule_mixte',  pattern: /(?:acces|entree)[_\s]?(?:site[_\s]?)?vehicule[_\s]?(?:mixte|2sens|doublesens)/i },
  { key: 'acces_site_vehicule_service',pattern: /acces[_\s]?(?:site[_\s]?)?(?:service|livraison|logistique|PL)(?:[_\s]?ext)?/i },
  // Accès site piéton
  { key: 'acces_site_pieton_secondaire', pattern: /(?:acces|entree)[_\s]?(?:site[_\s]?)?pieton[_\s]?(?:sec|2|latera)/i },
  { key: 'acces_site_pieton_principal',  pattern: /(?:acces|entree)[_\s]?(?:site[_\s]?)?pieton|portillon|pedestrian[_\s]?gate/i },
  // Compat
  { key: 'acces_site_secondaire', pattern: /acces[_\s]?site[_\s]?(?:sec|latera)|portail[_\s]?sec/i },
  { key: 'acces_site_principal',  pattern: /acces[_\s]?(?:site|parcelle|domaine)|portail[_\s]?principal|site[_\s]?entry/i },
  // Entrées bâtiment
  { key: 'entree_parking_vehicule_entree', pattern: /(?:entree|rampe)[_\s]?parking[_\s]?(?:in|entree|entrant)/i },
  { key: 'entree_parking_vehicule_sortie', pattern: /(?:sortie|rampe)[_\s]?parking[_\s]?(?:out|sortie|sortant)/i },
  { key: 'entree_principale', pattern: /entr[eé]e[_\s]?(?:batiment|principale|mall|centre)|main[_\s]?entrance|bldg[_\s]?entry/i },
  { key: 'entree_secondaire', pattern: /entr[eé]e[_\s]?(?:sec|laterale|est|ouest|nord|sud)/i },
  { key: 'entree_parking',    pattern: /entr[eé]e[_\s]?parking|parking[_\s]?access/i },
  { key: 'entree_service',    pattern: /entr[eé]e[_\s]?(?:service|livraison|pers)/i },
  // Équipements verticaux
  { key: 'escalator',     pattern: /escalat/i },
  { key: 'ascenseur',     pattern: /\basc(?:enseur)?\b|lift|elevator/i },
  { key: 'rampe_pmr',     pattern: /ramp[_\s]?pmr|rampe/i },
  { key: 'escalier_fixe', pattern: /escal(?:ier)?|stair/i },
  // Circulation intérieure
  { key: 'atrium',               pattern: /atrium|rotonde(?![\w-]?info)/i },
  { key: 'mail_central',         pattern: /\bmail\b|galerie[_\s]?marchande|galleria|mall[_\s]?central/i },
  { key: 'passage_pieton_couvert',pattern: /passage[_\s]?couvert|passerelle|tunnel[_\s]?pieton/i },
  { key: 'promenade',            pattern: /promenade|concourse/i },
  { key: 'couloir_service',      pattern: /couloir[_\s]?(?:service|bo|back|personnel|livraison)|back[_\s]?(?:corridor|of[_\s]?house|galerie)|galerie[_\s]?service/i },
  { key: 'cour_service',         pattern: /cour[_\s]?(?:service|livraison|decharge)|service[_\s]?yard|back[_\s]?yard/i },
  { key: 'couloir_secondaire',   pattern: /couloir|corridor|passage[_\s]?secondaire/i },
  { key: 'hall_distribution',    pattern: /\bhall\b|lobby/i },
  { key: 'sanitaires',           pattern: /\bwc\b|sanitaire|toilet|lav/i },
  { key: 'food_court',           pattern: /food[_\s]?court|court[_\s]?restauration|espace[_\s]?restauration/i },
  // Bureaux & administration
  { key: 'local_securite_ssiap', pattern: /ssiap|poste[_\s]?(?:securite|gardien)|pc[_\s]?securite|security[_\s]?office/i },
  { key: 'local_informatique',   pattern: /\bsalle[_\s]?(?:serveur|informatique|it)\b|data[_\s]?center|baie[_\s]?reseau|server[_\s]?room/i },
  { key: 'salle_conference',     pattern: /conference|amphitheatre|auditorium|salle[_\s]?ev[eé]nement/i },
  { key: 'salle_reunion',        pattern: /(?:salle)[_\s]?(?:reunion|meeting|brief)|meeting[_\s]?room/i },
  { key: 'vestiaires_personnel', pattern: /vestiaire|locker|changing[_\s]?room/i },
  { key: 'refectoire_personnel', pattern: /refectoire|salle[_\s]?(?:pause|repos[_\s]?pers|manger)|canteen|break[_\s]?room/i },
  { key: 'bureau_open_space',    pattern: /open[_\s]?space|plateau[_\s]?(?:bureau|admin)|coworking/i },
  { key: 'bureau_direction',     pattern: /bureau[_\s]?(?:dir|dg|manager|chef|responsable|direction)|office[_\s]?(?:dir|manager)/i },
  { key: 'accueil_administratif',pattern: /accueil[_\s]?admin|reception[_\s]?(?:admin|rh|pers)/i },
  { key: 'archives',             pattern: /archives|stockage[_\s]?doc|record[_\s]?room/i },
  // Locaux techniques
  { key: 'local_sprinkler',          pattern: /sprinkler|reserv[_\s]?incendie|pompe[_\s]?(?:incendie|anti)/i },
  { key: 'local_groupe_electrogene', pattern: /groupe[_\s]?electro|generatrice|onduleur|ups\b/i },
  { key: 'local_electrique_tgbt',    pattern: /\btgbt\b|local[_\s]?elec|armoire[_\s]?elec|tableau[_\s]?general/i },
  { key: 'local_chaufferie_cvc',     pattern: /chaufferie|cvc\b|ventilation|climatisation|pac\b|traitement[_\s]?air|hvac/i },
  { key: 'local_telecom',            pattern: /telecom|r[eé]partiteur|baie[_\s]?(?:reseau|fibre)|telecom[_\s]?room/i },
  { key: 'local_menage',             pattern: /m[eé]nage|entretien[_\s]?(?:local|mat)|cleaning|janitor/i },
  { key: 'local_stockage',           pattern: /stockage|reserve\b|debarras|entrepot[_\s]?int|storage[_\s]?room/i },
  { key: 'zone_livraison',           pattern: /livraison|quai[_\s]?decharg|logistique|loading|dock/i },
  { key: 'zone_technique',           pattern: /technique|\blocal\b|electr|chauff|vmc|cvc|tgbt/i },
  { key: 'local_poubelles',          pattern: /poubelle|dechet|trash|compost|ordures/i },
  // Segments commerciaux précis
  { key: 'commerce_supermarche',      pattern: /super[_\s]?march|supermarket|grocery|auchan|carrefour|marjane|prosuma|hyper(?!march)/i },
  { key: 'commerce_restaurant',       pattern: /\brestau|restauran|bistro|brasserie|cafe|bar\b|snack|pizzeria|kfc|mcdo|burger/i },
  { key: 'commerce_mode',             pattern: /\bmode\b|habillement|vetement|pret[_\s]?a[_\s]?porter|chaussure|lingerie|sport[_\s]?wear|zara|h&m|mango|celio/i },
  { key: 'commerce_accessoires',      pattern: /accessoir|maroquinerie|bijouterie|horloger|lunetterie|opticien[_\s]?mode|sac\b/i },
  { key: 'commerce_banque_assurance', pattern: /banque|bank|assurance|insurance|mutuelle|bureau[_\s]?change|western[_\s]?union/i },
  { key: 'commerce_beaute_sante',     pattern: /parfum|pharmacie|opticien|coiffeur|institut[_\s]?beaute|ongles?|spa|esthetique|beauty/i },
  { key: 'commerce_cadeaux_alimentaire', pattern: /librair|papeter|cadeau|fleuriste|cave[_\s]?vin|epicerie[_\s]?fine|chocolat|confiserie|deco/i },
  { key: 'commerce_multimedia',       pattern: /electroniq|telephoni|orange|mtn|moov|apple|samsung|informatiq|gaming|photo[_\s]?shop/i },
  { key: 'commerce_services',         pattern: /pressing|photocop|imprim|voyage|cordonner|cle[_\s]?minute|retouch/i },
  // Bâtiments hors galerie
  { key: 'big_box', pattern: /big[_\s]?box|ikea|decathlon|leroy[_\s]?merlin|castorama|conforama|but\b|boulanger|fnac\b|darty/i },
  { key: 'market',  pattern: /\bmarket\b|marche[_\s]?couvert|halles|souk|bazar/i },
  { key: 'hotel',           pattern: /\bh[oô]tel\b(?![_\s]?de[_\s]?ville)|inn\b|lodg|hospita(?!l)|resort(?![_\s]?spa)/i },
  { key: 'hotel_residence', pattern: /appart[_\s]?h[oô]tel|r[eé]sidence[_\s]?(?:h[oô]tel|touristique|serv)|extended[_\s]?stay/i },
  { key: 'cinema_multiplex',pattern: /cin[eé](?:ma|plex|maplexe)|multiplex|ugc|movic|pathé|imax|salle[_\s]?cinema/i },
  { key: 'salle_spectacle', pattern: /salle[_\s]?(?:spectacle|event|f[eê]te|congress|reunion[_\s]?event|polyvalente)|th[eé][aâ]tre|concert[_\s]?hall|auditorium(?![_\s]?conf)/i },
  { key: 'bureau_immeuble', pattern: /immeuble[_\s]?(?:bureau|office|travail)|tour[_\s]?(?:bureau|office)|office[_\s]?(?:tower|building|block)/i },
  { key: 'zone_exposition', pattern: /exposition|hall[_\s]?(?:expo|foire|salon)|salon[_\s]?(?:expo|commercial|professionnel)|foire|exhibit(?:ion)?[_\s]?(?:hall|center|space)/i },
  { key: 'showroom',        pattern: /showroom|show[_\s]?room|salle[_\s]?(?:montre|demostra)|d[eé]monstration(?![_\s]?culin)/i },
  { key: 'galerie_art',     pattern: /galerie[_\s]?(?:art|artiste|expo)|mus[eé]e|art[_\s]?gallery|espace[_\s]?(?:culturel|art|creat)/i },
  // Généraux commerce (fallback)
  { key: 'restauration',   pattern: /restaur|food|cafe|bar|snack|cuisine|pizza/i },
  { key: 'loisirs',        pattern: /cinema|bowling|gym|sport|arcade|loisir/i },
  { key: 'grande_surface', pattern: /hyper|supermarche|carrefour|shoprite|marina|anchor/i },
  { key: 'kiosque',        pattern: /kiosque|stand|pop[_\s]?up/i },
  { key: 'services',       pattern: /banque|poste|atm|pressing|coiffeur|pharmacie|service/i },
  { key: 'local_commerce', pattern: /boutique|shop|magasin|store|\blot\b|tenant/i },
  // Places parking (ordre : spécifique avant générique)
  { key: 'parking_place_pmr',       pattern: /place[_\s]?pmr|pmr[_\s]?parking|handicap[_\s]?spot/i },
  { key: 'parking_place_ve',        pattern: /place[_\s]?(?:ve|borne|recharge|ev)|ev[_\s]?charger/i },
  { key: 'parking_place_moto',      pattern: /place[_\s]?moto|moto[_\s]?spot/i },
  { key: 'parking_place_livraison', pattern: /place[_\s]?(?:livraison|jaune)/i },
  { key: 'parking_place_famille',   pattern: /place[_\s]?(?:famille|enceinte|family|mother)/i },
  { key: 'parking_place_standard',  pattern: /place[_\s]?(?:parking|voit|auto|stationnement|stand)|parking[_\s]?stall/i },
  { key: 'parking_voie_circulation',pattern: /voie[_\s]?(?:parking|circul|parc)|allee[_\s]?parking/i },
  { key: 'voie_principale',         pattern: /voie[_\s]?principale|axe[_\s]?principal|grand[_\s]?axe|main[_\s]?road/i },
  { key: 'voie_secondaire',         pattern: /voie[_\s]?secondaire|contre[_\s]?allee|desserte[_\s]?secondaire/i },
  { key: 'voie_pompier',            pattern: /voie[_\s]?pompier|fire[_\s]?lane|intervention[_\s]?pompier/i },
  { key: 'voie_livraison',          pattern: /voie[_\s]?livraison|voie[_\s]?logistique|delivery[_\s]?lane/i },
  { key: 'rond_point',              pattern: /rond[_\s-]?point|giratoire|roundabout/i },
  { key: 'carrefour',               pattern: /carrefour|intersection|crossroad/i },
  { key: 'passage_pieton',          pattern: /passage[_\s]?pieton|crosswalk|zebra/i },
  // Routes publiques
  { key: 'route_autoroute',         pattern: /autoroute|highway|motorway|^A\d+\b/i },
  { key: 'route_boulevard',         pattern: /boulevard|\bbd\b|\bblvd\b/i },
  { key: 'route_avenue',            pattern: /avenue|\bav\b|\bave\b/i },
  { key: 'route_rue_principale',    pattern: /rue[_\s]?principale|main[_\s]?street|grande[_\s]?rue/i },
  { key: 'route_rue_secondaire',    pattern: /^rue\b|\bstreet\b|ruelle/i },
  { key: 'route_impasse',           pattern: /impasse|cul[_\s-]?de[_\s-]?sac|dead[_\s]?end/i },
  { key: 'route_rond_point_public', pattern: /rond[_\s-]?point[_\s]?public|giratoire[_\s]?public/i },
  { key: 'route_carrefour_public',  pattern: /carrefour[_\s]?public/i },
  { key: 'route_pont',              pattern: /\bpont\b|bridge/i },
  { key: 'route_tunnel',            pattern: /tunnel/i },
  { key: 'route_trottoir_public',   pattern: /trottoir[_\s]?public|sidewalk/i },
  { key: 'parking_fleche_sens',     pattern: /fleche[_\s]?(?:parking|sens)|arrow[_\s]?park/i },
  { key: 'parking_velo',            pattern: /parking[_\s]?v[eé]lo|velo[_\s]?park|arceau/i },
  { key: 'parking_moto',            pattern: /parking[_\s]?(?:moto|2[_\s]?roues|scoot)/i },
  { key: 'parking_vehicule',        pattern: /parking|stationnement/i },
  // Extérieur (spécifique → générique)
  { key: 'exterieur_parvis',          pattern: /parvis|depose[_\s]?minute/i },
  { key: 'exterieur_fontaine',        pattern: /fontaine|bassin[_\s]?deco|water[_\s]?feature/i },
  { key: 'exterieur_aire_jeux',       pattern: /aire[_\s]?(?:de[_\s]?)?jeu|playground|piste[_\s]?enfant/i },
  { key: 'exterieur_arret_transport', pattern: /arret[_\s]?bus|bus[_\s]?stop|taxi|vtc|tram/i },
  { key: 'exterieur_giratoire',       pattern: /giratoire|rond[_\s]?point|roundabout/i },
  { key: 'exterieur_place_forum',     pattern: /\bplace\b|forum|esplanade|plaza[_\s]?ext/i },
  { key: 'exterieur_zone_detente',    pattern: /detente|repos|banc[_\s]?ext|square/i },
  { key: 'exterieur_voie_pieton',     pattern: /voie[_\s]?pieton|allee[_\s]?pieton|trottoir|pedestrian/i },
  { key: 'exterieur_voie_vehicule',   pattern: /voie[_\s]?vehicule|chauss[eé]e|road|carrefour|contre[_\s]?all/i },
  { key: 'exterieur_voirie',          pattern: /voirie|voie(?![_\s]?(pieton|vehic))/i },
  // Paysage & végétation
  { key: 'terre_plein',       pattern: /terre[_\s]?plein|ilot[_\s]?(?:separ|planté|central|parking|betonné)|median[_\s]?strip/i },
  { key: 'alignement_arbres', pattern: /alignement[_\s]?arbres|range[eé]e[_\s]?arbres|allee[_\s]?arbor[eé]e|tree[_\s]?(?:row|line)/i },
  { key: 'arbre_isole',       pattern: /\barbre\b|tree(?![_\s]?(row|line))|platane|chene|palmier|\bpin\b/i },
  { key: 'haie',              pattern: /haie|clot(?:ure)?[_\s]?vegetal|arbuste|brise[_\s]?vue|hedge/i },
  { key: 'pelouse',           pattern: /pelouse|gazon|lawn|grass|herbe|turf/i },
  { key: 'jardin',            pattern: /jardin|parc[_\s]?(?!parking)|espace[_\s]?vert|garden|noue[_\s]?paysag|bande[_\s]?verte/i },
  { key: 'massif_vegetal',    pattern: /massif|vegetal|jardiniere|plante[_\s]?bac|fleur|parterre|planting[_\s]?bed/i },
  // Terrasses
  { key: 'terrasse_restaurant',  pattern: /terrasse[_\s]?(?:restaurant|resto|bar|café|food)|outdoor[_\s]?(?:dining|seating|resto)/i },
  { key: 'terrasse_toit',        pattern: /terrasse[_\s]?toit|rooftop|toiture[_\s]?terrasse/i },
  { key: 'terrasse_commerciale', pattern: /terrasse[_\s]?(?:commerciale|boutique|shop|magasin)|deballage/i },
  { key: 'terrasse_agrement',    pattern: /terrasse[_\s]?(?:agrement|deco|repos|publique)|outdoor[_\s]?lounge/i },
  // Navigation
  { key: 'point_information', pattern: /info|accueil|concierg/i },
  { key: 'borne_wayfinder',   pattern: /wayfinder|borne/i },
  // Équipements sociaux & confort
  { key: 'espace_bebe',            pattern: /\bbb\b|bebe|baby|nursery|allaitement|change[_\s]?bebe|espace[_\s]?enfant/i },
  { key: 'poste_premiers_secours', pattern: /premiers?[_\s]?secours|infirmerie|secouriste|\bdea\b|first[_\s]?aid|medical[_\s]?room/i },
  { key: 'salle_priere',           pattern: /salle[_\s]?(?:priere|pri[eè]re)|espace[_\s]?(?:recueillement|spiritu|meditation)|prayer[_\s]?room|musalla/i },
  { key: 'consigne_bagages',       pattern: /consigne|bagagerie|casier|locker[_\s]?(?!room)|left[_\s]?luggage/i },
  { key: 'espace_fumeur',          pattern: /fumeur|smoking[_\s]?area|espace[_\s]?tabac|zone[_\s]?fum/i },
  // Commerces niches
  { key: 'tabac_presse',      pattern: /\btabac\b|presse\b|bureau[_\s]?tabac|newsagent|journal|loto[_\s]?tabac/i },
  { key: 'auto_lavage',       pattern: /lavage[_\s]?auto|car[_\s]?wash|station[_\s]?lavage/i },
  { key: 'location_vehicule', pattern: /location[_\s]?(?:voiture|vehicule|auto|moto|velo)|car[_\s]?rental|rent[_\s]?a[_\s]?car|hertz|europcar|avis\b/i },
]

/** Auto-détecte le SpaceTypeKey le plus probable à partir d'un label DXF. */
export function autoDetectSpaceType(label: string, type?: string): SpaceTypeKey {
  const hay = `${label ?? ''} ${type ?? ''}`
  for (const { key, pattern } of TYPE_PATTERNS) {
    if (pattern.test(hay)) return key
  }
  return 'a_definir'
}

// ─── Mapping vers les catégories simplifiées (compat) ──

/** Convertit un SpaceTypeKey vers la catégorie simplifiée legacy (10 valeurs). */
export function spaceTypeToCategory(type: SpaceTypeKey): string {
  switch (type) {
    // Commerce
    case 'local_commerce': case 'grande_surface': case 'kiosque':
    case 'commerce_mode': case 'commerce_accessoires':
    case 'commerce_cadeaux_alimentaire': case 'big_box': case 'market':
      return 'mode'
    case 'commerce_supermarche':
      return 'alimentaire'
    case 'restauration': case 'food_court': case 'commerce_restaurant':
    case 'terrasse_restaurant':
      return 'restauration'
    case 'services': case 'point_information': case 'borne_wayfinder':
    case 'commerce_banque_assurance': case 'commerce_services':
    case 'commerce_beaute_sante': case 'terrasse_commerciale':
      return 'services'
    case 'commerce_multimedia':
      return 'mode'
    case 'loisirs': case 'terrasse_toit': case 'terrasse_agrement':
    case 'cinema_multiplex': case 'salle_spectacle':
      return 'loisirs'
    case 'hotel': case 'hotel_residence':
      return 'services'
    case 'bureau_immeuble':
      return 'services'
    case 'zone_exposition': case 'showroom': case 'galerie_art':
      return 'loisirs'
    // Bureaux
    case 'bureau_direction': case 'bureau_open_space': case 'salle_reunion':
    case 'salle_conference': case 'accueil_administratif': case 'archives':
    case 'vestiaires_personnel': case 'refectoire_personnel':
      return 'services'
    // Équipements
    case 'sanitaires': case 'espace_bebe': case 'poste_premiers_secours':
      return 'service-tech'
    case 'salle_priere': case 'espace_fumeur': case 'consigne_bagages':
    case 'escalator': case 'ascenseur': case 'rampe_pmr': case 'escalier_fixe':
    case 'guichet_service': case 'guichet_caisse': case 'atm': case 'cabine_photomaton':
      return 'services'
    case 'tabac_presse': case 'auto_lavage': case 'location_vehicule':
      return 'services'
    // Circulation
    case 'mail_central': case 'atrium': case 'promenade': case 'couloir_secondaire':
    case 'hall_distribution': case 'passage_pieton_couvert':
    case 'couloir_service': case 'cour_service':
    case 'acces_site_principal': case 'acces_site_secondaire': case 'acces_site_service':
    case 'acces_site_pieton_principal': case 'acces_site_pieton_secondaire':
    case 'acces_site_vehicule_entree': case 'acces_site_vehicule_sortie':
    case 'acces_site_vehicule_mixte': case 'acces_site_vehicule_service':
    case 'entree_principale': case 'entree_secondaire': case 'entree_parking':
    case 'entree_parking_vehicule_entree': case 'entree_parking_vehicule_sortie':
    case 'entree_service': case 'sortie_secours':
    case 'porte_entree': case 'porte_interieure': case 'porte_secours':
    case 'porte_service': case 'porte_double': case 'porte_tambour': case 'porte_automatique':
    case 'controle_acces': case 'sas_securite': case 'portique_securite':
      return 'circulation'
    // Locaux techniques
    case 'local_electrique_tgbt': case 'local_chaufferie_cvc': case 'local_sprinkler':
    case 'local_groupe_electrogene': case 'local_telecom':
    case 'local_menage': case 'local_stockage': case 'local_informatique':
    case 'local_securite_ssiap':
    case 'zone_technique': case 'local_poubelles': case 'zone_livraison':
      return 'service-tech'
    // Parking
    case 'parking_vehicule': case 'parking_moto': case 'parking_velo':
    case 'parking_place_standard': case 'parking_place_pmr': case 'parking_place_ve':
    case 'parking_place_moto': case 'parking_place_livraison': case 'parking_place_famille':
    case 'parking_voie_circulation': case 'parking_fleche_sens':
    case 'arret_taxi': case 'arret_bus_tram': case 'station_velo_libre_service':
    case 'exterieur_parvis': case 'exterieur_voirie':
    case 'exterieur_voie_pieton': case 'exterieur_voie_vehicule':
    case 'exterieur_giratoire': case 'exterieur_arret_transport':
      return 'circulation'
    // Paysage
    case 'terre_plein': case 'massif_vegetal': case 'jardin': case 'pelouse':
    case 'arbre_isole': case 'alignement_arbres': case 'haie':
      return 'circulation'
    // Extérieur loisirs
    case 'exterieur_place_forum': case 'exterieur_zone_detente':
    case 'exterieur_aire_jeux': case 'exterieur_fontaine':
      return 'loisirs'
    case 'a_exclure': return 'service-tech'
    default:           return 'other'
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
