// ═══ EXPERIENCE TEMPLATES — Personas / Touchpoints / KPIs / Actions par verticale ═══
//
// Contenu initial par type de bâtiment. Utilisé par `experienceStore.ensureInitialized`
// pour seed un projet. Ensuite l'utilisateur modifie librement via CRUD.

import type { VerticalId } from '../../../../verticals/types'
import type {
  Persona, Touchpoint, Kpi, ActionItem,
} from './experienceStore'

// Les templates sont écrits sans id/createdAt (ajoutés par le store)
type PersonaTpl    = Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>
type TouchpointTpl = Omit<Touchpoint, 'id' | 'createdAt'>
type KpiTpl        = Omit<Kpi, 'id' | 'createdAt'>
type ActionTpl     = Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt' | 'origin' | 'proph3tSkill'>

// ─── MALL ─────────────────────────────────────────────────

const MALL_PERSONAS: PersonaTpl[] = [
  {
    name: 'Aminata', role: 'Jeune active urbaine', age: '28 ans', avatar: '👩🏾',
    description: 'Cadre dans une multinationale, shopping rapide le samedi après-midi, très connectée.',
    contexte: 'Travaille en semaine, utilise le mall principalement le week-end pour shopping + food court.',
    frustrations: ['Files d\'attente aux caisses', 'Signalétique confuse', 'WiFi instable'],
    besoins: ['Paiement mobile rapide', 'Pressing/retouche express', 'Points de recharge téléphone'],
    canauxPreferes: ['App mobile', 'Instagram', 'WhatsApp'],
    parcoursType: 'Entrée Nord → galerie mode → pause food court → caisse express → sortie',
  },
  {
    name: 'Famille Koné', role: 'Famille 2 enfants', age: '35-40 ans', avatar: '👨‍👩‍👧‍👦',
    description: 'Parents avec 2 enfants (6 et 10 ans). Shopping combiné loisirs enfants + courses.',
    frustrations: ['Manque de sièges', 'Sanitaires familiaux éloignés', 'Surveillance enfants'],
    besoins: ['Aire de jeux sécurisée', 'Toilettes famille', 'Parking proche entrée'],
    canauxPreferes: ['Bouche-à-oreille', 'Facebook', 'Radio locale'],
    parcoursType: 'Parking → aire de jeux → courses hyper → snack → cinéma',
  },
  {
    name: 'Pierre', role: 'Cadre international', age: '45 ans', avatar: '👨🏻',
    description: 'Expatrié, recherche marques internationales et service premium.',
    frustrations: ['Manque d\'enseignes haut de gamme', 'Service client peu anglophone'],
    besoins: ['Boutiques premium', 'Conciergerie', 'Accueil bilingue'],
    canauxPreferes: ['Email', 'LinkedIn', 'Google Maps'],
    parcoursType: 'Entrée VIP → boutiques mode/tech ciblées → restaurant terrasse',
  },
  {
    name: 'Yao', role: 'Étudiant', age: '22 ans', avatar: '👨🏿',
    description: 'Étudiant en université voisine. Vient pour loisirs (cinéma, fast-food, WiFi gratuit).',
    frustrations: ['Prix élevés', 'Pas assez d\'espaces gratuits'],
    besoins: ['WiFi', 'Espaces de co-working', 'Fast-food abordable'],
    canauxPreferes: ['TikTok', 'Instagram', 'WhatsApp'],
    parcoursType: 'Food court → cinéma → coin WiFi → sortie',
  },
]

const MALL_TOUCHPOINTS: TouchpointTpl[] = [
  { name: 'Signalétique directionnelle extérieure',       phase: 'Approche',     type: 'physique', responsable: 'Exploitation + Collectivité', description: 'Panneaux routiers aux grands axes, éclairage nocturne.', priorite: 'critique' },
  { name: 'Fiche Google Maps / Waze',                     phase: 'Approche',     type: 'digital',  responsable: 'Marketing digital',           description: 'Fiche vérifiée, photos HD, horaires, FAQ.',              priorite: 'critique' },
  { name: 'Guidage parking avec capteurs',                phase: 'Parking',      type: 'physique', responsable: 'Exploitation',                description: 'Capteurs IoT + LED disponibilité, ANPR.',                priorite: 'critique' },
  { name: 'Accueil bilingue + desk info',                 phase: 'Entrée',       type: 'humain',   responsable: 'RH',                           description: '2 hôtesses, protocole accueil, welcome pack.',           priorite: 'critique' },
  { name: 'Bornes wayfinding tactiles',                   phase: 'Entrée',       type: 'digital',  responsable: 'IT',                           description: '4+ bornes plan interactif, recherche boutique.',         priorite: 'important' },
  { name: 'WiFi haute densité gratuit',                   phase: 'Hall central', type: 'digital',  responsable: 'IT',                           description: 'Portail captif, inscription programme fidélité.',        priorite: 'critique' },
  { name: 'Points de repos design',                       phase: 'Shopping',     type: 'physique', responsable: 'Exploitation',                description: 'Bancs, plantes, prises USB, éclairage doux.',            priorite: 'important' },
  { name: 'Food court multi-enseignes',                   phase: 'Restauration', type: 'physique', responsable: 'F&B Manager',                  description: 'Stations variées, terrasse, design unifié.',             priorite: 'critique' },
  { name: 'QR commande + paiement mobile',                phase: 'Restauration', type: 'digital',  responsable: 'IT + F&B',                     description: 'QR table, paiement mobile, file virtuelle.',             priorite: 'important' },
  { name: 'Programme de fidélité (app + carte)',          phase: 'Fidélisation', type: 'digital',  responsable: 'CRM',                          description: 'Points, niveaux, offres personnalisées.',                priorite: 'critique' },
]

const MALL_KPIS: KpiTpl[] = [
  { groupTitle: 'Trafic & Fréquentation', groupColor: '#34d399', label: 'Visiteurs mensuels',        cible: 'à définir (projet)',          frequence: 'Mensuel',      source: 'Compteurs entrées + WiFi',          status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Trafic & Fréquentation', groupColor: '#34d399', label: 'Taux de re-visite M+1',     cible: '> 40 %',                       frequence: 'Mensuel',      source: 'WiFi analytics',                    status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Trafic & Fréquentation', groupColor: '#34d399', label: 'Dwell time moyen',          cible: '> 52 min (benchmark ICSC)',    frequence: 'Hebdo',        source: 'WiFi sessions + ABM Vol.3',         status: 'en_cours', computedBy: 'journey-store' },
  { groupTitle: 'Satisfaction',           groupColor: '#38bdf8', label: 'NPS global',                cible: '> 40',                         frequence: 'Trimestriel', source: 'Enquête NPS',                       status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Satisfaction',           groupColor: '#38bdf8', label: 'Avis Google Maps',          cible: '> 4,3 ★',                      frequence: 'Continu',     source: 'Google Business',                   status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Commercial',             groupColor: '#f59e0b', label: 'CA / m² GLA / an',          cible: '> 15 MFCFA (benchmark UEMOA)', frequence: 'Mensuel',      source: 'Lots Vol.1 + remontées tenants',    status: 'en_cours', computedBy: 'lots-store' },
  { groupTitle: 'Commercial',             groupColor: '#f59e0b', label: 'Taux d\'occupation',        cible: '> 92 %',                       frequence: 'Mensuel',      source: 'Vol.1 lots',                        status: 'en_cours', computedBy: 'lots-store' },
  { groupTitle: 'Opérations',             groupColor: '#a855f7', label: 'Espaces modélisés & validés', cible: '100 % surface GLA',          frequence: 'Continu',     source: 'Atlas Studio éditeur',              status: 'en_cours', computedBy: 'plan-engine' },
]

const MALL_ACTIONS: ActionTpl[] = [
  { title: 'Installer signalétique directionnelle extérieure', category: 'Signalétique', responsable: 'Exploitation', impact: 'Accessibilité clients × 1,3', priority: 'p0', status: 'a_faire' },
  { title: 'Déployer programme fidélité mobile',               category: 'Digital',      responsable: 'CRM',           impact: 'Rétention +12 %',             priority: 'p0', status: 'a_faire' },
  { title: 'Formation hôtesses accueil bilingue',              category: 'RH',           responsable: 'RH',            impact: 'NPS +8 pts',                   priority: 'p1', status: 'a_faire' },
]

// ─── HOTEL ────────────────────────────────────────────────

const HOTEL_PERSONAS: PersonaTpl[] = [
  { name: 'Business traveler', role: 'Cadre en déplacement',    age: '35-50 ans', avatar: '💼', description: 'Séjours courts 1-2 nuits, attend check-in rapide + WiFi business + petit-déjeuner tôt.', frustrations: ['Check-in lent', 'WiFi faible', 'Petit-déj en retard'], besoins: ['Check-in mobile', 'Espace travail en chambre', 'Navette aéroport'], canauxPreferes: ['Email', 'App hôtel', 'LinkedIn'], parcoursType: 'Arrivée tardive → check-in → chambre → breakfast 7h → check-out → Uber' },
  { name: 'Couple week-end',   role: 'Loisirs / escapade',      age: '30-45 ans', avatar: '💑', description: 'Séjour loisir 2-3 nuits, recherche spa, restaurant gastronomique, piscine.', frustrations: ['Manque ambiance romantique', 'Spa complet'], besoins: ['Upgrade vue', 'Dîner romantique', 'Late check-out'], canauxPreferes: ['Instagram', 'Booking reviews', 'Blog voyage'], parcoursType: 'Check-in → spa → dîner gastro → piscine → late check-out' },
  { name: 'Famille vacances',  role: 'Vacanciers 2 enfants',    age: '35-45 ans', avatar: '👨‍👩‍👧', description: 'Séjour long 5-7 nuits, kids club, piscine, demi-pension.', frustrations: ['Kids club complet', 'Bruit nocturne'], besoins: ['Chambre communicante', 'Menus enfants', 'Activités encadrées'], canauxPreferes: ['Tripadvisor', 'App hôtel', 'Facebook'], parcoursType: 'Check-in → kids club → piscine → dîner demi-pension → extras' },
  { name: 'Groupe MICE',       role: 'Séminaire entreprise',    age: 'mixte',     avatar: '👥', description: 'Groupe 15-80 personnes, salles de réunion, restauration de groupe.', frustrations: ['Salles sous-équipées', 'AV défaillant'], besoins: ['AV haut niveau', 'Coffee breaks', 'Team building'], canauxPreferes: ['RFP agences', 'Email', 'LinkedIn'], parcoursType: 'Arrivée groupe → salles → pauses café → dîner banquet → espaces détente' },
]

const HOTEL_TOUCHPOINTS: TouchpointTpl[] = [
  { name: 'Pré-check-in mobile',         phase: 'Arrivée',       type: 'digital',  responsable: 'IT + Front Office', description: 'App hôtel + QR code : pré-enregistrement, upgrade, early check-in.', priorite: 'critique' },
  { name: 'Réception bilingue 24/7',     phase: 'Arrivée',       type: 'humain',   responsable: 'Front Office',       description: 'Hôtes FR/EN, protocole welcome + conciergerie.',                   priorite: 'critique' },
  { name: 'Clé numérique (NFC)',         phase: 'Arrivée',       type: 'digital',  responsable: 'IT',                  description: 'Ouverture chambre via smartphone ou carte NFC.',                   priorite: 'important' },
  { name: 'Housekeeping notification',   phase: 'Séjour',        type: 'digital',  responsable: 'Housekeeping',        description: 'App client : demande ménage, serviettes, signalement.',            priorite: 'important' },
  { name: 'Restaurant réservation in-app', phase: 'F&B',         type: 'digital',  responsable: 'F&B',                 description: 'Réservation table, menu, allergies.',                             priorite: 'important' },
  { name: 'Spa & wellness booking',      phase: 'Séjour',        type: 'digital',  responsable: 'Spa Manager',          description: 'Réservation soin via app, facturation chambre.',                  priorite: 'important' },
  { name: 'Express check-out mobile',    phase: 'Départ',        type: 'digital',  responsable: 'Front Office',        description: 'Facture PDF dématérialisée, règlement automatique CB enregistrée.', priorite: 'critique' },
  { name: 'Enquête satisfaction post-séjour', phase: 'Fidélisation', type: 'digital', responsable: 'CRM',              description: 'Email J+1 avec NPS, relance programme fidélité.',                priorite: 'critique' },
]

const HOTEL_KPIS: KpiTpl[] = [
  { groupTitle: 'Performance', groupColor: '#ec4899', label: 'RevPAR',                       cible: '> 52 000 FCFA (benchmark STR)', frequence: 'Quotidien',   source: 'Opera PMS',           status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Performance', groupColor: '#ec4899', label: 'ADR',                          cible: '> 78 000 FCFA',                 frequence: 'Quotidien',   source: 'Opera PMS',           status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Performance', groupColor: '#ec4899', label: 'Taux d\'occupation',           cible: '> 68 %',                        frequence: 'Quotidien',   source: 'Opera PMS',           status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Performance', groupColor: '#ec4899', label: 'ALOS (séjour moyen)',          cible: '> 2,4 nuits',                   frequence: 'Mensuel',     source: 'Opera PMS',           status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Satisfaction', groupColor: '#38bdf8', label: 'NPS clients',                 cible: '> 60',                          frequence: 'Trimestriel', source: 'Enquête post-séjour', status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'F&B',         groupColor: '#f59e0b', label: 'Revenu F&B/chambre/jour',      cible: '> 18 500 FCFA',                 frequence: 'Hebdo',       source: 'POS restaurants',     status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Opérations',  groupColor: '#a855f7', label: 'Temps moyen de check-in',     cible: '< 5 min',                       frequence: 'Quotidien',   source: 'PMS timer',           status: 'en_cours', computedBy: 'manual' },
]

const HOTEL_ACTIONS: ActionTpl[] = [
  { title: 'Pré-check-in mobile + clé NFC',   category: 'Digital', responsable: 'IT',           impact: '−50 % temps check-in',       priority: 'p0', status: 'a_faire' },
  { title: 'Upselling suite en app',          category: 'CRM',     responsable: 'Revenue Mgmt', impact: '+8 % RevPAR',                priority: 'p0', status: 'a_faire' },
  { title: 'Housekeeping rationnel par étage', category: 'RH',     responsable: 'Housekeeping', impact: '+22 % productivité',        priority: 'p1', status: 'a_faire' },
]

// ─── OFFICE ───────────────────────────────────────────────

const OFFICE_PERSONAS: PersonaTpl[] = [
  { name: 'Cadre hybride',       role: 'Flex worker',          age: '30-45 ans', avatar: '💻', description: 'Présent 2-3 jours/semaine, réserve son bureau via app.',            frustrations: ['Desk pris', 'Salles réservées vides', 'QAI dégradée'], besoins: ['Desk booking fluide', 'Qualité air', 'Silence'],          canauxPreferes: ['Teams', 'Outlook', 'Slack'],       parcoursType: 'Arrivée 9h → desk réservé → salles pivotantes → déjeuner → réunions → départ 17h' },
  { name: 'Dirigeant / C-level', role: 'Executive',            age: '45-60 ans', avatar: '👔', description: 'Présent 5j/7, bureau dédié, reçoit des visiteurs externes.',       frustrations: ['Salon VIP absent', 'Parking visiteurs'],              besoins: ['Bureau fermé', 'Conciergerie', 'Protocole visiteurs'],    canauxPreferes: ['Email', 'Assistante', 'Téléphone'], parcoursType: 'Parking dédié → bureau → salles privées → déjeuner restaurant' },
  { name: 'Équipe tech',         role: 'Développeurs / IT',    age: '25-35 ans', avatar: '💼', description: 'Travail d\'équipe, stand-ups, besoin de salles informelles.',     frustrations: ['Bruit open-space', 'Pas de salles dédiées équipe'],   besoins: ['Phone booths', 'Whiteboards', 'Multi-écrans'],            canauxPreferes: ['Slack', 'Teams', 'WhatsApp'],       parcoursType: 'Stand-up 9h30 → focus work → pair programming → lunch → review demo' },
  { name: 'Visiteur externe',    role: 'Client / fournisseur', age: 'variable',  avatar: '🤝', description: 'Visite ponctuelle pour réunion, intervention, livraison.',         frustrations: ['Accueil confus', 'Badge compliqué', 'WiFi guest absent'], besoins: ['Accueil dédié', 'Badge rapide', 'WiFi visiteur'],         canauxPreferes: ['Email', 'Téléphone'],               parcoursType: 'Accueil → badge → ascenseur → salle → sortie' },
]

const OFFICE_TOUCHPOINTS: TouchpointTpl[] = [
  { name: 'Badge / contrôle accès',       phase: 'Entrée',      type: 'digital',  responsable: 'Sécurité + IT',       description: 'Badges nominatifs, lecteurs NFC portiques + ascenseurs.',    priorite: 'critique' },
  { name: 'Accueil + réception visiteurs', phase: 'Entrée',     type: 'humain',   responsable: 'Facility Management', description: 'Hôtes, enregistrement, badges visiteurs, salon d\'attente.', priorite: 'critique' },
  { name: 'Desk booking app',             phase: 'Installation', type: 'digital', responsable: 'IT',                   description: 'Réservation desks flex + salles réunion en temps réel.',     priorite: 'critique' },
  { name: 'Capteurs QAI (CO₂, COV)',      phase: 'Travail',     type: 'digital',  responsable: 'Facility',             description: 'Capteurs par plateau, alertes au-delà de 800 ppm CO₂.',     priorite: 'important' },
  { name: 'Cafétéria / restaurant',       phase: 'Pause',       type: 'physique', responsable: 'F&B',                  description: 'Restauration sur place ou kiosque, commande mobile possible.', priorite: 'important' },
  { name: 'Phone booths acoustiques',     phase: 'Travail',     type: 'physique', responsable: 'Facility',             description: 'Cabines 1-2 personnes insonorisées pour visios.',            priorite: 'important' },
  { name: 'Auto-release salles no-show',  phase: 'Travail',     type: 'digital',  responsable: 'IT',                   description: 'Capteur présence libère la salle après 10 min no-show.',     priorite: 'important' },
  { name: 'App mobile services',          phase: 'Travail',     type: 'digital',  responsable: 'Facility + IT',        description: 'Réservations, tickets maintenance, parking, catering.',       priorite: 'important' },
]

const OFFICE_KPIS: KpiTpl[] = [
  { groupTitle: 'Occupation',   groupColor: '#6366f1', label: 'Taux d\'occupation',         cible: '> 90 %',                  frequence: 'Mensuel',   source: 'Badges + capteurs',     status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Occupation',   groupColor: '#6366f1', label: 'Présence quotidienne',       cible: '> 58 %',                  frequence: 'Quotidien', source: 'Badges',                status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Occupation',   groupColor: '#6366f1', label: 'Ratio bureaux/employé',      cible: '≤ 0,7',                   frequence: 'Trimestriel', source: 'RH + Facility',        status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Salles',       groupColor: '#8b5cf6', label: 'Taux réservation salles',    cible: '> 62 %',                  frequence: 'Hebdo',     source: 'Outlook/Teams',          status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Salles',       groupColor: '#8b5cf6', label: 'Ghost bookings',             cible: '< 15 %',                  frequence: 'Hebdo',     source: 'Capteurs + reservas',    status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'QAI / Confort', groupColor: '#10b981', label: 'CO₂ moyen plateau',        cible: '< 800 ppm',                frequence: 'Continu',   source: 'Capteurs IoT',           status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Financier',    groupColor: '#f59e0b', label: 'Loyer effectif/m²',          cible: 'à définir',               frequence: 'Mensuel',   source: 'Vol.1 Lots',             status: 'en_cours', computedBy: 'lots-store' },
  { groupTitle: 'Opérations',   groupColor: '#a855f7', label: 'Espaces modélisés & validés', cible: '100 %',                  frequence: 'Continu',   source: 'Atlas Studio',           status: 'en_cours', computedBy: 'plan-engine' },
]

const OFFICE_ACTIONS: ActionTpl[] = [
  { title: 'Desk booking app déploiement',    category: 'Digital',      responsable: 'IT',           impact: '+22 pts util. plateaux', priority: 'p0', status: 'a_faire' },
  { title: 'Capteurs CO₂ par plateau',        category: 'QAI',          responsable: 'Facility',     impact: '+15 % productivité',     priority: 'p0', status: 'a_faire' },
  { title: 'Auto-release salles no-show',     category: 'Digital',      responsable: 'IT',           impact: '+30 pts dispo salles',   priority: 'p1', status: 'a_faire' },
]

// ─── HOSPITAL ─────────────────────────────────────────────

const HOSPITAL_PERSONAS: PersonaTpl[] = [
  { name: 'Patient ambulatoire',     role: 'Consultation sans hospitalisation', age: 'variable',  avatar: '🚶', description: 'Vient pour consultation, imagerie, bilan — repart le même jour.',         frustrations: ['Attente', 'Signalétique', 'Paiement'],                      besoins: ['Parcours clair', 'Pré-enregistrement', 'Paiement mobile'],              canauxPreferes: ['SMS', 'App hôpital', 'Téléphone'],   parcoursType: 'Accueil → admissions → salle d\'attente → consultation → pharmacie → sortie' },
  { name: 'Patient hospitalisé',     role: 'Séjour prolongé',                  age: 'variable',  avatar: '🛏️', description: 'Hospitalisation 3-10 jours, chambre individuelle ou double.',             frustrations: ['Bruit', 'Qualité repas', 'Visites limitées'],               besoins: ['Confort chambre', 'WiFi', 'Contact famille'],                            canauxPreferes: ['Téléphone', 'App télémédecine'],     parcoursType: 'Admission → chambre → bloc (optionnel) → recovery → sortie' },
  { name: 'Famille accompagnant',    role: 'Proche de patient',                age: 'variable',  avatar: '👨‍👩', description: 'Accompagne le patient, attend en zones dédiées, fréquente cafétéria.',   frustrations: ['Pas d\'info', 'Manque de sièges', 'Zones inconfortables'],  besoins: ['Zones attente confortables', 'Info en temps réel', 'Restauration'],      canauxPreferes: ['SMS', 'WhatsApp'],                   parcoursType: 'Accueil → zone attente → cafétéria → chambre (visite) → sortie' },
  { name: 'Personnel soignant',      role: 'Médecins + IDE',                   age: 'variable',  avatar: '👩‍⚕️', description: 'Circule entre services, blocs, urgences, zones logistiques.',            frustrations: ['Flux logistique vs patients confondus', 'Ascenseurs saturés'], besoins: ['Accès rapide', 'Vestiaires proches', 'Repas équipe'],                    canauxPreferes: ['Bipper', 'DPI', 'Messagerie interne'], parcoursType: 'Vestiaire → service → blocs → pause → retour service' },
]

const HOSPITAL_TOUCHPOINTS: TouchpointTpl[] = [
  { name: 'Accueil + pré-admission',         phase: 'Arrivée',        type: 'humain',   responsable: 'Admissions',       description: 'Enregistrement patient, carte vitale/assurance, bracelet.',       priorite: 'critique' },
  { name: 'Pré-enregistrement mobile',       phase: 'Arrivée',        type: 'digital',  responsable: 'IT + DPI',          description: 'App hôpital : consentements, documents, questionnaire médical.',  priorite: 'critique' },
  { name: 'Triage urgences (5 niveaux)',     phase: 'Urgences',       type: 'humain',   responsable: 'IDE / IPA',         description: 'Grille CTAS, étiquetage rouge/orange/jaune/vert/bleu.',           priorite: 'critique' },
  { name: 'Wayfinding patient + famille',    phase: 'Parcours',       type: 'digital',  responsable: 'IT + Facility',     description: 'App mobile + bornes tactiles : itinéraire vers service/chambre.', priorite: 'critique' },
  { name: 'Signalétique ISO/PMR',            phase: 'Parcours',       type: 'physique', responsable: 'Facility',          description: 'Pictogrammes conformes, braille, contraste, hauteur PMR.',         priorite: 'critique' },
  { name: 'Chambre : domotique / WiFi',      phase: 'Hospitalisation', type: 'digital', responsable: 'IT',                description: 'Commande lumière, TV, appel soignant, WiFi patient.',             priorite: 'important' },
  { name: 'Communication famille',           phase: 'Hospitalisation', type: 'digital', responsable: 'CRM hôpital',        description: 'SMS / app : info séjour, visites, sortie.',                        priorite: 'important' },
  { name: 'Cafétéria + restauration visiteurs', phase: 'Accompagnement', type: 'physique', responsable: 'F&B',            description: 'Espace restauration 24/7 pour familles et personnel.',             priorite: 'important' },
  { name: 'Pharmacie + ordonnance digitalisée', phase: 'Sortie',      type: 'digital',  responsable: 'Pharmacie + DPI',   description: 'Ordonnance transmise à la pharmacie hospitalière + externe.',     priorite: 'important' },
]

const HOSPITAL_KPIS: KpiTpl[] = [
  { groupTitle: 'Qualité de soin',  groupColor: '#ef4444', label: 'Taux d\'infections nosocomiales', cible: '< 3 ‰ (HAS)',          frequence: 'Mensuel',     source: 'CME + labo',            status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Qualité de soin',  groupColor: '#ef4444', label: 'Taux de ré-admission 30j',         cible: '< 8 %',                 frequence: 'Mensuel',     source: 'DPI',                   status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Urgences',         groupColor: '#f59e0b', label: 'Attente urgences P90',             cible: '< 30 min (HAS)',        frequence: 'Continu',    source: 'DPI urgences',          status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Bloc opératoire',  groupColor: '#a855f7', label: 'Utilisation bloc',                 cible: '> 68 %',                frequence: 'Hebdo',      source: 'Planning bloc',         status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Lits',             groupColor: '#10b981', label: 'Taux occupation lits',             cible: '> 85 %',                frequence: 'Quotidien',  source: 'DPI',                   status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Lits',             groupColor: '#10b981', label: 'DMS (durée moyenne séjour)',       cible: '< 4,8 j',               frequence: 'Mensuel',    source: 'DPI',                   status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Satisfaction',     groupColor: '#38bdf8', label: 'Satisfaction patient',             cible: '> 80 %',                frequence: 'Trimestriel', source: 'Enquête Saphora',       status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Opérations',       groupColor: '#6366f1', label: 'Espaces modélisés & validés',      cible: '100 %',                 frequence: 'Continu',    source: 'Atlas Studio',          status: 'en_cours', computedBy: 'plan-engine' },
]

const HOSPITAL_ACTIONS: ActionTpl[] = [
  { title: 'Reconfigurer triage urgences (5 niveaux)', category: 'Organisation', responsable: 'Direction médicale', impact: '−55 % attente',     priority: 'p0', status: 'a_faire' },
  { title: 'Rénovation ventilation blocs (NF S 90-351)', category: 'Travaux',   responsable: 'Facility + Biomed',  impact: 'Conformité HAS',    priority: 'p0', status: 'a_faire' },
  { title: 'Wayfinder patient (app + bornes)',         category: 'Digital',      responsable: 'IT + Facility',     impact: '−38 % perdus',      priority: 'p1', status: 'a_faire' },
]

// ─── CAMPUS ───────────────────────────────────────────────

const CAMPUS_PERSONAS: PersonaTpl[] = [
  { name: 'Étudiant L1',          role: 'Première année',   age: '18-20 ans', avatar: '🎓', description: 'Nouveau campus, découvre les bâtiments, utilise beaucoup la bibliothèque et le restaurant U.', frustrations: ['Se perd', 'WiFi faible', 'Prises rares'],                besoins: ['App campus', 'WiFi haute densité', 'Plans simples'],              canauxPreferes: ['Instagram', 'Discord', 'App campus'],  parcoursType: 'Amphi → bibliothèque → resto U → TD → bibliothèque → sortie' },
  { name: 'Étudiant M1/M2',       role: 'Master',           age: '21-24 ans', avatar: '📚', description: 'Connaît le campus, recherche espaces calmes pour mémoire, coworking.', frustrations: ['Salles réservées mais vides', 'Bruit bibliothèque'],    besoins: ['Réservation salles étude', 'Espaces cowork silencieux', 'Imprimantes'], canauxPreferes: ['ENT', 'Email', 'Slack équipe'],           parcoursType: 'Bibliothèque → salle étude → resto → cours → labo recherche' },
  { name: 'Enseignant chercheur', role: 'Professeur / MCF',  age: '35-60 ans', avatar: '👨‍🏫', description: 'Cours + recherche, bureau partagé, utilise amphis + labos.',                             frustrations: ['Équipement AV défaillant', 'Pas de bureau silencieux'],  besoins: ['Amphis équipés', 'Labo recherche', 'Bureau fermé'],                  canauxPreferes: ['Email', 'ENT'],                             parcoursType: 'Bureau → amphi → labo → bureau → cours' },
  { name: 'Personnel administratif', role: 'Scolarité / admin', age: '30-55 ans', avatar: '🧑‍💼', description: 'Inscriptions, gestion dossiers, accueil étudiants.',                                   frustrations: ['Files d\'attente scolarité', 'Docs papier'],              besoins: ['Dématérialisation', 'Accueil moderne', 'Systèmes performants'],       canauxPreferes: ['Email', 'Téléphone'],                       parcoursType: 'Bureau → accueil étudiants → archives → retour bureau' },
]

const CAMPUS_TOUCHPOINTS: TouchpointTpl[] = [
  { name: 'Carte étudiante multi-services', phase: 'Inscription', type: 'digital',  responsable: 'Scolarité + IT',   description: 'Accès bibli, resto U, impression, badge labo.',                   priorite: 'critique' },
  { name: 'ENT / plateforme pédagogique',   phase: 'Apprentissage', type: 'digital', responsable: 'IT',                description: 'Cours, notes, emploi du temps, messagerie.',                      priorite: 'critique' },
  { name: 'Wayfinding app campus',          phase: 'Navigation',  type: 'digital',  responsable: 'IT',               description: 'Plans, itinéraires, salle du jour, événements.',                    priorite: 'critique' },
  { name: 'Bibliothèque — réservation',     phase: 'Étude',       type: 'digital',  responsable: 'Bibliothécaire',   description: 'Réservation salles d\'étude, prêt livres, PEB.',                    priorite: 'important' },
  { name: 'Resto U + paiement mobile',      phase: 'Repas',       type: 'digital',  responsable: 'CROUS',            description: 'Commande + paiement via app, files virtuelles.',                   priorite: 'important' },
  { name: 'WiFi haute densité amphis',      phase: 'Apprentissage', type: 'digital', responsable: 'IT',               description: 'Couverture 100 % cours + bibliothèque + resto.',                    priorite: 'critique' },
  { name: 'Événementiel campus',            phase: 'Vie étudiante', type: 'physique', responsable: 'BDE + Direction',  description: 'Amphis, salles, rooftop pour conférences, soirées.',             priorite: 'important' },
]

const CAMPUS_KPIS: KpiTpl[] = [
  { groupTitle: 'Occupation',    groupColor: '#a855f7', label: 'Taux occupation salles',   cible: '> 70 %',                    frequence: 'Hebdo',     source: 'ADE Campus',         status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Pédagogie',     groupColor: '#6366f1', label: 'Ratio étudiants/enseignant', cible: '< 22',                      frequence: 'Annuel',    source: 'Scolarité',          status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Bibliothèque',  groupColor: '#10b981', label: 'Taux d\'usage bibli',      cible: '> 45 %',                    frequence: 'Mensuel',   source: 'Badges + réserv.',   status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Bibliothèque',  groupColor: '#10b981', label: 'Satisfaction WiFi',        cible: '> 80 %',                    frequence: 'Trimestriel', source: 'Enquête',            status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Événementiel',  groupColor: '#f59e0b', label: 'Événements/semaine',       cible: '> 28',                      frequence: 'Hebdo',     source: 'Agenda campus',      status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Accessibilité', groupColor: '#38bdf8', label: 'Conformité PMR',           cible: '100 %',                     frequence: 'Annuel',    source: 'Audit',              status: 'en_cours', computedBy: 'manual' },
  { groupTitle: 'Opérations',    groupColor: '#ec4899', label: 'Espaces modélisés & validés', cible: '100 %',                 frequence: 'Continu',   source: 'Atlas Studio',        status: 'en_cours', computedBy: 'plan-engine' },
]

const CAMPUS_ACTIONS: ActionTpl[] = [
  { title: 'Lissage charge horaire (12h-14h, 18h-20h, ven.)', category: 'Organisation', responsable: 'Scolarité',        impact: '+3 400 étudiants/an capacité', priority: 'p0', status: 'a_faire' },
  { title: 'Modernisation bibliothèque (WiFi + prises)',      category: 'Travaux',      responsable: 'Facility + IT',    impact: '+13 pts usage',                 priority: 'p0', status: 'a_faire' },
  { title: 'Mise aux normes PMR 4 bâtiments',                 category: 'Conformité',   responsable: 'Facility',          impact: 'Accréditation CAMES',           priority: 'p0', status: 'a_faire' },
]

// ─── Fallbacks pour les autres verticales (réutilisent mall par défaut) ──

const FALLBACK_PERSONAS    = MALL_PERSONAS
const FALLBACK_TOUCHPOINTS = MALL_TOUCHPOINTS
const FALLBACK_KPIS        = MALL_KPIS
const FALLBACK_ACTIONS     = MALL_ACTIONS

// ─── Public API ───────────────────────────────────────────

export function getPersonaTemplates(v: VerticalId): PersonaTpl[] {
  switch (v) {
    case 'mall':     return MALL_PERSONAS
    case 'hotel':    return HOTEL_PERSONAS
    case 'office':   return OFFICE_PERSONAS
    case 'hospital': return HOSPITAL_PERSONAS
    case 'campus':   return CAMPUS_PERSONAS
    default:         return FALLBACK_PERSONAS
  }
}

export function getTouchpointTemplates(v: VerticalId): TouchpointTpl[] {
  switch (v) {
    case 'mall':     return MALL_TOUCHPOINTS
    case 'hotel':    return HOTEL_TOUCHPOINTS
    case 'office':   return OFFICE_TOUCHPOINTS
    case 'hospital': return HOSPITAL_TOUCHPOINTS
    case 'campus':   return CAMPUS_TOUCHPOINTS
    default:         return FALLBACK_TOUCHPOINTS
  }
}

export function getKpiTemplates(v: VerticalId): KpiTpl[] {
  switch (v) {
    case 'mall':     return MALL_KPIS
    case 'hotel':    return HOTEL_KPIS
    case 'office':   return OFFICE_KPIS
    case 'hospital': return HOSPITAL_KPIS
    case 'campus':   return CAMPUS_KPIS
    default:         return FALLBACK_KPIS
  }
}

export function getActionPlanTemplates(v: VerticalId): ActionTpl[] {
  switch (v) {
    case 'mall':     return MALL_ACTIONS
    case 'hotel':    return HOTEL_ACTIONS
    case 'office':   return OFFICE_ACTIONS
    case 'hospital': return HOSPITAL_ACTIONS
    case 'campus':   return CAMPUS_ACTIONS
    default:         return FALLBACK_ACTIONS
  }
}
