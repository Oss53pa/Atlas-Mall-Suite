// ═══ VOL.2 SECURITY CONFIG TEMPLATES — Par verticale ═══
// Templates initiaux : l'utilisateur édite ensuite via CRUD.

import type { VerticalId } from '../../../../verticals/types'
import type {
  AccessEquipment, AccessRight, FireEquipment, FireScenario, FireExercise,
  ErpCheck,
  OrgNode, OrgConnection, PerimeterEquipment, Procedure, SecurityAgent,
  VmsConfig, IncidentTemplate,
} from './securityConfigStore'

type Tpl<T> = Omit<T, 'id'>[]

// ─── Templates communs de base (ERP M / mall par défaut) ──

const BASE_ACCESS_EQUIPMENTS: Tpl<AccessEquipment> = [
  { name: 'Portiques compteurs de flux',                     description: 'Entrées principales — comptage bidirectionnel temps réel',    status: 'Opérationnel' },
  { name: 'Badges RFID personnel + biométrie zones sensibles', description: 'Accès différencié par zone et niveau d\'habilitation',        status: 'Opérationnel' },
  { name: 'SAS livraisons avec vérification identité',       description: 'Zone de livraison sécurisée — contrôle identité + badge temp.', status: 'En cours' },
  { name: 'Interphones vidéo sur accès techniques',          description: 'Accès locaux techniques, TGBT, local SSI — vérification visuelle', status: 'Opérationnel' },
  { name: 'Registre numérique visiteurs',                     description: 'Tablette accueil — enregistrement visiteurs avec photo + badge', status: 'Planifié' },
]

const BASE_ACCESS_RIGHTS: Tpl<AccessRight> = [
  { zone: 'Espaces publics',      niveau: 'RDC / R+1',     typeAcces: 'Public',       badge: false, biometrie: false, sas: false, reference: 'ACC-001' },
  { zone: 'Parking sous-sol',     niveau: 'B1',            typeAcces: 'Semi-public',  badge: false, biometrie: false, sas: false, reference: 'ACC-002' },
  { zone: 'Locaux techniques',    niveau: 'B1 / R+1',      typeAcces: 'Restreint',    badge: true,  biometrie: false, sas: false, reference: 'ACC-003' },
  { zone: 'PC Sécurité',          niveau: 'RDC',           typeAcces: 'Restreint',    badge: true,  biometrie: true,  sas: false, reference: 'ACC-004' },
  { zone: 'Local TGBT',           niveau: 'B1',            typeAcces: 'Restreint',    badge: true,  biometrie: true,  sas: false, reference: 'ACC-005' },
  { zone: 'Zone livraisons',      niveau: 'B1',            typeAcces: 'Contrôlé',     badge: true,  biometrie: false, sas: true,  reference: 'ACC-006' },
  { zone: 'Direction',            niveau: 'R+1',           typeAcces: 'Restreint',    badge: true,  biometrie: false, sas: false, reference: 'ACC-007' },
]

const BASE_FIRE_EQUIPMENTS: Tpl<FireEquipment> = [
  { name: 'SSI catégorie A — détection automatique intégrale', description: 'Détecteurs multi-capteurs tous locaux — report centralisé CMSI' },
  { name: 'Désenfumage mécanique',                              description: 'Galerie, parking, food court — ventilateurs extracteurs + amenées' },
  { name: 'Sprinklers zones à risque + RIA tous 30 m',          description: 'Réseau sprinkler sous-sol et food court — RIA DN 25/30 galeries' },
  { name: 'Issues de secours balisées (BAES + blocs autonomes)', description: 'Balisage réglementaire NF C 71-800 — autonomie 1 h minimum' },
  { name: 'Exercices d\'évacuation trimestriels',                description: 'Simulation avec chronométrage — rapport conformité NF S 61-938' },
]

const BASE_ERP_CHECKS: Tpl<ErpCheck> = [
  { item: 'SSI catégorie A installé et opérationnel',       status: 'conforme' },
  { item: 'Désenfumage mécanique conforme IT 246',          status: 'conforme' },
  { item: 'Issues de secours (2 par compartiment minimum)', status: 'conforme' },
  { item: 'BAES conformes NF C 71-800',                     status: 'conforme' },
  { item: 'Sprinklers conformes NF EN 12845',               status: 'conforme' },
  { item: 'Exercice évacuation réalisé (< 6 mois)',         status: 'conforme' },
  { item: 'Plan d\'évacuation affiché chaque niveau',       status: 'a_verifier' },
  { item: 'Formation SSIAP agents de sécurité à jour',      status: 'conforme' },
  { item: 'Commission de sécurité — avis favorable',        status: 'a_verifier' },
  { item: 'Registre de sécurité tenu à jour',               status: 'conforme' },
]

const BASE_FIRE_SCENARIOS: Tpl<FireScenario> = [
  { name: 'Incendie Zone Food Court', description: 'Départ de feu cuisine food court R+2 — évacuation partielle R+2 puis totale' },
  { name: 'Évacuation totale',         description: 'Alarme générale — évacuation simultanée des 3 niveaux' },
  { name: 'Confinement',               description: 'Menace extérieure — confinement zones intérieures, fermeture accès' },
]

const BASE_FIRE_EXERCISES: Tpl<FireExercise> = [
  { date: '15 Jan 2026', type: 'Évacuation totale',                  result: '2 min 45s — conforme', status: 'ok' },
  { date: '12 Avr 2026', type: 'Incendie food court',                 result: 'Planifié',            status: 'partiel' },
  { date: '10 Juil 2026', type: 'Confinement',                        result: 'Planifié',            status: 'partiel' },
  { date: '08 Oct 2026', type: 'Évacuation totale (pré-ouverture)',   result: 'Planifié',            status: 'partiel' },
]

const BASE_ORG_NODES: Tpl<OrgNode> = [
  { name: 'Directeur Sécurité',      role: 'Direction',        level: 1, phone: '—' },
  { name: 'Chef de poste sécurité',  role: 'Encadrement',      level: 2 },
  { name: 'Responsable incendie',    role: 'Encadrement',      level: 2 },
  { name: 'Agent sécurité jour',     role: 'Opérationnel',     level: 3 },
  { name: 'Agent sécurité nuit',     role: 'Opérationnel',     level: 3 },
  { name: 'Opérateur PC sécurité',   role: 'Opérationnel',     level: 3 },
]

const BASE_ORG_CONNECTIONS: OrgConnection[] = [
  // Remplis dynamiquement par la section via les ids des noeuds créés
]

const BASE_PERIMETER_EQUIPMENTS: Tpl<PerimeterEquipment> = [
  { name: 'Caméras PTZ haute définition sur mâts',         description: 'Surveillance parking et voies d\'accès — rotation 360° et zoom ×30',  status: 'Opérationnel' },
  { name: 'Détection périmétrique par analyse vidéo',       description: 'Détection intrusion automatique sur clôtures et limites de propriété', status: 'En cours' },
  { name: 'Éclairage dissuasif automatique',                description: 'Activation sur détection de mouvement — zones sombres du périmètre',   status: 'Opérationnel' },
  { name: 'Barrières levantes contrôlées',                  description: 'Entrées véhicules avec lecture de badge ou ticket',                    status: 'Opérationnel' },
  { name: 'Rondes véhiculées — circuit GPS tracé',          description: 'Circuit de ronde nocturne géolocalisé — rapport automatique',           status: 'Planifié' },
]

const BASE_PROCEDURES: Tpl<Procedure> = [
  { title: "Plan d'Opération Interne (POI) validé préfecture", content: "Le POI définit l'organisation des secours en cas de sinistre majeur. Il précise les rôles, les moyens d'alerte, les zones de regroupement et les interlocuteurs. Validé par autorité compétente — dernière mise à jour à configurer." },
  { title: "Procédure : alerte intrusion",                       content: "1. Détection par analyse vidéo ou agent\n2. Confirmation visuelle PC sécurité\n3. Alerte chef de poste + envoi équipe mobile\n4. Sécurisation périmètre + confinement si nécessaire\n5. Appel forces de l'ordre si confirmé\n6. Rapport d'incident dans les 2 h" },
  { title: "Procédure : colis suspect",                          content: "1. Détection par agent ou analyse vidéo\n2. Périmètre de sécurité 50 m minimum\n3. Alerte PC sécurité → chef de poste\n4. Évacuation partielle zone concernée\n5. Appel équipe de déminage / police\n6. Interdiction de toucher ou déplacer l'objet\n7. Rapport d'incident" },
  { title: "Procédure : évacuation",                             content: "1. Déclenchement alarme générale (CMSI)\n2. Arrêt escalators, rappel ascenseurs au RDC\n3. Guides-files dirigent vers issues de secours\n4. Comptage aux points de rassemblement\n5. Vérification zones par serre-files\n6. Liaison pompiers (SDIS)\n7. Rapport de fin d'évacuation" },
  { title: "Procédure : inondation",                             content: "1. Détection par capteurs de niveau sous-sol\n2. Coupure électrique zones impactées (TGBT)\n3. Activation pompes de relevage\n4. Évacuation parking si niveau critique\n5. Protection équipements sensibles\n6. Appel prestataire assèchement\n7. Rapport et constat assurance" },
]

const BASE_SECURITY_AGENTS: Tpl<SecurityAgent> = [
  { nom: 'Chef de poste jour',  poste: 'Chef de poste jour',  ssiap: 'SSIAP 3', dateCertif: '2024-03-15', renouvellement: '2027-03-15', status: 'valide' },
  { nom: 'Chef de poste nuit',  poste: 'Chef de poste nuit',  ssiap: 'SSIAP 3', dateCertif: '2024-06-20', renouvellement: '2027-06-20', status: 'valide' },
  { nom: 'Agent sécurité #1',   poste: 'Agent sécurité',      ssiap: 'SSIAP 1', dateCertif: '2023-11-10', renouvellement: '2026-11-10', status: 'valide' },
  { nom: 'Agent sécurité #2',   poste: 'Agent sécurité',      ssiap: 'SSIAP 1', dateCertif: '2024-01-22', renouvellement: '2027-01-22', status: 'valide' },
  { nom: 'Agent sécurité #3',   poste: 'Agent sécurité',      ssiap: 'SSIAP 1', dateCertif: '2023-05-18', renouvellement: '2026-05-18', status: 'a_renouveler' },
  { nom: 'Agent sécurité #4',   poste: 'Agent sécurité',      ssiap: 'SSIAP 2', dateCertif: '2024-04-12', renouvellement: '2027-04-12', status: 'valide' },
  { nom: 'Opérateur PC',        poste: 'Opérateur PC',        ssiap: 'SSIAP 1', dateCertif: '2023-02-28', renouvellement: '2026-02-28', status: 'expire' },
]

const BASE_VMS_PROVIDERS: Tpl<VmsConfig> = [
  { provider: 'milestone',      name: 'Milestone XProtect',    status: 'disconnected', cameraCount: 0 },
  { provider: 'genetec',        name: 'Genetec Security Center', status: 'disconnected', cameraCount: 0 },
  { provider: 'dahua_dss',      name: 'Dahua DSS Pro',         status: 'disconnected', cameraCount: 0 },
  { provider: 'hikvision_ivms', name: 'Hikvision iVMS',        status: 'disconnected', cameraCount: 0 },
]

const BASE_INCIDENTS: Tpl<IncidentTemplate> = [
  { title: 'Vol à l\'étalage',           category: 'Sûreté',  severity: 'medium',   state: 'detecte', defaultResponse: 'Intervention agents + identification caméras + signalement police si > seuil.' },
  { title: 'Incident médical',           category: 'Santé',   severity: 'high',     state: 'detecte', defaultResponse: 'Premier secours SST + appel SAMU + sécurisation zone.' },
  { title: 'Incendie détecté',           category: 'Incendie', severity: 'critical', state: 'detecte', defaultResponse: 'Vérif levée de doute 30s → évacuation + pompiers + coupure sectorielle.' },
  { title: 'Agression / violence',       category: 'Sûreté',  severity: 'high',     state: 'detecte', defaultResponse: 'Intervention agents + mise à l\'abri victime + police.' },
  { title: 'Tentative intrusion',        category: 'Sûreté',  severity: 'high',     state: 'detecte', defaultResponse: 'Alarme périmétrique + intervention + vérification caméras.' },
]

// ─── Variantes par verticale ─────────────────────────────

// Hotel : rôles spécifiques + procédures VIP + incidents clients
const HOTEL_ACCESS_RIGHTS: Tpl<AccessRight> = [
  { role: 'Direction',            zones: ['toutes'], hours: '24/7' },
  { role: 'Front office',         zones: ['réception', 'chambres étage'], hours: '24/7' },
  { role: 'Housekeeping',         zones: ['chambres', 'lingerie'], hours: '7h-19h' },
  { role: 'F&B',                  zones: ['cuisines', 'restaurants'], hours: '6h-minuit' },
  { role: 'Sécurité',             zones: ['toutes'], hours: '24/7' },
  { role: 'Clients',              zones: ['chambre assignée', 'espaces publics'], hours: '24/7 selon clé' },
]

const HOTEL_PROCEDURES: Tpl<Procedure> = [
  { title: 'SOP check-in VIP',            content: 'Accueil et protocole spécifique : voiturier, welcome pack, coordinateur dédié, surclassement selon dispo.' },
  { title: 'SOP incident chambre',        content: 'Signalement duty manager → intervention discrète housekeeping + maintenance + éventuellement sécurité.' },
  { title: 'SOP évacuation hôtel',        content: '1. Alarme générale\n2. Personnel aide clients PMR/enfants\n3. Point rassemblement extérieur\n4. Comptage par étage sur base PMS\n5. Coordination pompiers' },
  { title: 'SOP client violent',          content: 'Intervention sécurité 2 agents min → isolement + signalement police selon gravité → rapport circonstancié.' },
]

// Hospital : ERP U, zones stériles, confidentialité patient
const HOSPITAL_ACCESS_RIGHTS: Tpl<AccessRight> = [
  { role: 'Médecins',           zones: ['blocs', 'services', 'urgences'], hours: '24/7' },
  { role: 'IDE / Soignants',    zones: ['services', 'urgences', 'pharmacie'], hours: '24/7' },
  { role: 'Admin',              zones: ['bureaux', 'admissions'], hours: '8h-18h' },
  { role: 'Logistique',         zones: ['circulation technique', 'stock'], hours: '5h-23h' },
  { role: 'Familles',           zones: ['chambre patient', 'cafétéria'], hours: 'horaires visite' },
  { role: 'Patients externes',  zones: ['consultations', 'urgences'], hours: 'horaires consultation' },
]

const HOSPITAL_FIRE_EQUIPMENTS: Tpl<FireEquipment> = [
  ...BASE_FIRE_EQUIPMENTS,
  { name: 'Unités de transfert patients (brancards évac)', description: 'Services hospitalisation — procédure horizontale puis verticale' },
  { name: 'Dispositifs anti-panique blocs opératoires',    description: 'Blocs — conduite en cas d\'urgence pendant intervention' },
]

const HOSPITAL_INCIDENTS: Tpl<IncidentTemplate> = [
  { title: 'Code rouge — patient violent',   category: 'Sûreté',   severity: 'high',     state: 'detecte', defaultResponse: 'Équipe intervention + sédation médicale + sécurisation.' },
  { title: 'Fuite gaz médical',              category: 'Technique', severity: 'critical', state: 'detecte', defaultResponse: 'Coupure secteur + évacuation zone + services techniques.' },
  { title: 'Fugue patient (psy, gériatrie)', category: 'Recherche',  severity: 'high',    state: 'detecte', defaultResponse: 'Alerte générale + recherche interne + police selon protocole.' },
  { title: 'Perte médicaments à tracer',     category: 'Pharmacie',  severity: 'high',    state: 'detecte', defaultResponse: 'Audit immédiat pharmacie + signalement ARS + police stups si stupéfiants.' },
  { title: 'Panne critique bloc',             category: 'Technique',  severity: 'critical', state: 'detecte', defaultResponse: 'Transfert patient bloc voisin + astreinte biomédicale.' },
]

// Office : télétravail / visiteurs / accès badge
const OFFICE_ACCESS_RIGHTS: Tpl<AccessRight> = [
  { role: 'Employés',      zones: ['plateau leur étage'], hours: '7h-20h (flex)' },
  { role: 'Direction',     zones: ['tous étages'], hours: '24/7' },
  { role: 'IT',            zones: ['salle serveurs', 'bureaux'], hours: '24/7' },
  { role: 'Ménage',        zones: ['tous'], hours: '18h-22h + 5h-8h' },
  { role: 'Visiteurs',     zones: ['accueil', 'salle réunion désignée'], hours: '8h-18h accompagnés' },
  { role: 'Prestataires',  zones: ['espaces techniques'], hours: 'sur rendez-vous' },
]

// Campus : étudiants, enseignants, CROUS
const CAMPUS_ACCESS_RIGHTS: Tpl<AccessRight> = [
  { role: 'Étudiants',          zones: ['bâtiments pédagogiques', 'bibliothèque', 'resto U'], hours: '7h-22h' },
  { role: 'Enseignants',        zones: ['salles', 'amphis', 'bureaux'], hours: '6h-23h' },
  { role: 'Administration',     zones: ['admin', 'scolarité'], hours: '8h-19h' },
  { role: 'Personnel technique', zones: ['techniques', 'logistiques'], hours: '24/7' },
  { role: 'Visiteurs externes', zones: ['accueil', 'conférences'], hours: 'événements' },
]

// ─── API publique ────────────────────────────────────────

export function getAccessEquipmentTemplates(_v: VerticalId): Tpl<AccessEquipment> {
  return BASE_ACCESS_EQUIPMENTS
}
export function getAccessRightTemplates(v: VerticalId): Tpl<AccessRight> {
  switch (v) {
    case 'hotel':    return HOTEL_ACCESS_RIGHTS
    case 'hospital': return HOSPITAL_ACCESS_RIGHTS
    case 'office':   return OFFICE_ACCESS_RIGHTS
    case 'campus':   return CAMPUS_ACCESS_RIGHTS
    default:         return BASE_ACCESS_RIGHTS
  }
}
export function getFireEquipmentTemplates(v: VerticalId): Tpl<FireEquipment> {
  return v === 'hospital' ? HOSPITAL_FIRE_EQUIPMENTS : BASE_FIRE_EQUIPMENTS
}
export function getErpCheckTemplates(_v: VerticalId): Tpl<ErpCheck> {
  return BASE_ERP_CHECKS
}
export function getFireScenarioTemplates(_v: VerticalId): Tpl<FireScenario> {
  return BASE_FIRE_SCENARIOS
}
export function getFireExerciseTemplates(_v: VerticalId): Tpl<FireExercise> {
  return BASE_FIRE_EXERCISES
}
export function getOrgNodeTemplates(_v: VerticalId): Tpl<OrgNode> {
  return BASE_ORG_NODES
}
export function getOrgConnectionTemplates(_v: VerticalId): OrgConnection[] {
  return BASE_ORG_CONNECTIONS
}
export function getPerimeterEquipmentTemplates(_v: VerticalId): Tpl<PerimeterEquipment> {
  return BASE_PERIMETER_EQUIPMENTS
}
export function getProcedureTemplates(v: VerticalId): Tpl<Procedure> {
  return v === 'hotel' ? HOTEL_PROCEDURES : BASE_PROCEDURES
}
export function getSecurityAgentTemplates(_v: VerticalId): Tpl<SecurityAgent> {
  return BASE_SECURITY_AGENTS
}
export function getVmsProviderTemplates(_v: VerticalId): Tpl<VmsConfig> {
  return BASE_VMS_PROVIDERS
}
export function getIncidentTemplates(v: VerticalId): Tpl<IncidentTemplate> {
  return v === 'hospital' ? HOSPITAL_INCIDENTS : BASE_INCIDENTS
}
