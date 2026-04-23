// ═══ VOCABULARY — Libellés dynamiques par verticale ═══
//
// Atlas BIM est multi-verticales. Les mots "visiteur" (mall), "client" (hôtel),
// "occupant" (bureaux), "patient" (hôpital), "étudiant" (campus)… sont tous
// valides selon le type de bâtiment. Ce fichier centralise la traduction
// dynamique pour éviter de hardcoder un vocabulaire dans les composants.
//
// Usage :
//   import { t } from '@/i18n/vocabulary'
//   const label = t('user.plural', project.verticalId) // "visiteurs" / "clients" / "occupants" / "patients"

import type { VerticalId } from '../verticals/types'

// ─── Clés de vocabulaire ───────────────────────────────────

export type VocabularyKey =
  | 'user.singular'         // visiteur / client / occupant / patient / étudiant
  | 'user.plural'           // visiteurs / clients / occupants / patients / étudiants
  | 'user.possessive'       // du visiteur / du client / de l'occupant / du patient
  | 'space.singular'        // boutique / chambre / bureau / salle / amphi
  | 'space.plural'          // boutiques / chambres / bureaux / salles / amphis
  | 'space.unit-area'       // m² GLA / m² / m² utiles / m² soignés / m² enseignement
  | 'space.area-total'      // GLA / surface louable / SHOB / SHON / CAPUA
  | 'revenue.main-kpi'      // CA/m² / RevPAR / loyer/m² / actes/jour / taux occupation
  | 'revenue.unit'          // MFCFA/m²/an / FCFA/chambre/nuit / FCFA/m²/mois / actes/j / MFCFA
  | 'operator.title'        // exploitant / opérateur hôtelier / asset manager / directeur d'hôpital / doyen
  | 'occupant.pro'          // enseigne / opérateur F&B / entreprise locataire / service médical / département
  | 'occupant.pro.plural'   // enseignes / opérateurs / entreprises / services / départements
  | 'journey.noun'          // parcours client / expérience client / parcours utilisateur / parcours patient / parcours étudiant
  | 'journey.verb'          // visiter / séjourner / travailler / se faire soigner / étudier
  | 'building.noun'         // centre commercial / hôtel / immeuble / hôpital / campus / entrepôt / ERP / portfolio
  | 'building.noun.plural'  // centres commerciaux / hôtels / immeubles / hôpitaux / campus / entrepôts
  | 'event.noun'            // événement promotionnel / événement / réunion / intervention / cours
  | 'entry.noun'            // entrée / accueil / hall / admissions / entrée campus / quai de chargement
  | 'operator.team'         // équipe exploitation / housekeeping / facility management / équipe soignante / équipe pédagogique
  | 'emergency.service'     // poste sécurité / réception sécurité / gardiennage / urgences / surveillance
  | 'dashboard.title'       // Tableau de bord commerce / Tableau de bord hôtel / Tableau de bord bureaux / Tableau de bord santé / Tableau de bord campus

// ─── Dictionnaire par verticale ───────────────────────────

type VocabularyMap = Partial<Record<VocabularyKey, string>>

const VOCAB: Record<VerticalId, VocabularyMap> = {
  'mall': {
    'user.singular':        'visiteur',
    'user.plural':          'visiteurs',
    'user.possessive':      'du visiteur',
    'space.singular':       'boutique',
    'space.plural':         'boutiques',
    'space.unit-area':      'm² GLA',
    'space.area-total':     'GLA',
    'revenue.main-kpi':     'CA/m²',
    'revenue.unit':         'MFCFA/m²/an',
    'operator.title':       'exploitant mall',
    'occupant.pro':         'enseigne',
    'occupant.pro.plural':  'enseignes',
    'journey.noun':         'parcours client',
    'journey.verb':         'visiter',
    'building.noun':        'centre commercial',
    'building.noun.plural': 'centres commerciaux',
    'event.noun':           'événement promotionnel',
    'entry.noun':           'entrée',
    'operator.team':        'équipe exploitation',
    'emergency.service':    'poste sécurité',
    'dashboard.title':      'Tableau de bord commerce',
  },
  'hotel': {
    'user.singular':        'client',
    'user.plural':          'clients',
    'user.possessive':      'du client',
    'space.singular':       'chambre',
    'space.plural':         'chambres',
    'space.unit-area':      'm²',
    'space.area-total':     'surface totale',
    'revenue.main-kpi':     'RevPAR',
    'revenue.unit':         'FCFA/chambre/nuit',
    'operator.title':       'directeur hôtel',
    'occupant.pro':         'opérateur F&B',
    'occupant.pro.plural':  'points F&B',
    'journey.noun':         'expérience client',
    'journey.verb':         'séjourner',
    'building.noun':        'hôtel',
    'building.noun.plural': 'hôtels',
    'event.noun':           'séminaire',
    'entry.noun':           'réception',
    'operator.team':        'housekeeping & front office',
    'emergency.service':    'sécurité hôtelière',
    'dashboard.title':      'Tableau de bord hôtel',
  },
  'office': {
    'user.singular':        'occupant',
    'user.plural':          'occupants',
    'user.possessive':      'de l\'occupant',
    'space.singular':       'bureau',
    'space.plural':         'bureaux',
    'space.unit-area':      'm² utiles',
    'space.area-total':     'SHOB',
    'revenue.main-kpi':     'loyer/m²',
    'revenue.unit':         'FCFA/m²/mois',
    'operator.title':       'asset manager',
    'occupant.pro':         'entreprise locataire',
    'occupant.pro.plural':  'entreprises locataires',
    'journey.noun':         'parcours occupant',
    'journey.verb':         'travailler',
    'building.noun':        'immeuble de bureaux',
    'building.noun.plural': 'immeubles de bureaux',
    'event.noun':           'réunion / événement corporate',
    'entry.noun':           'hall d\'entrée',
    'operator.team':        'facility management',
    'emergency.service':    'gardiennage',
    'dashboard.title':      'Tableau de bord bureaux',
  },
  'hospital': {
    'user.singular':        'patient',
    'user.plural':          'patients',
    'user.possessive':      'du patient',
    'space.singular':       'salle',
    'space.plural':         'salles',
    'space.unit-area':      'm² soignés',
    'space.area-total':     'CAPUA',
    'revenue.main-kpi':     'actes/jour',
    'revenue.unit':         'actes/jour',
    'operator.title':       'directeur d\'hôpital',
    'occupant.pro':         'service médical',
    'occupant.pro.plural':  'services médicaux',
    'journey.noun':         'parcours patient',
    'journey.verb':         'se faire soigner',
    'building.noun':        'hôpital',
    'building.noun.plural': 'hôpitaux',
    'event.noun':           'intervention',
    'entry.noun':           'admissions',
    'operator.team':        'équipe soignante',
    'emergency.service':    'urgences + sécurité',
    'dashboard.title':      'Tableau de bord santé',
  },
  'campus': {
    'user.singular':        'étudiant',
    'user.plural':          'étudiants',
    'user.possessive':      'de l\'étudiant',
    'space.singular':       'salle de cours',
    'space.plural':         'salles',
    'space.unit-area':      'm² enseignement',
    'space.area-total':     'surface pédagogique',
    'revenue.main-kpi':     'taux occupation salles',
    'revenue.unit':         '%',
    'operator.title':       'doyen / directeur',
    'occupant.pro':         'département pédagogique',
    'occupant.pro.plural':  'départements',
    'journey.noun':         'parcours étudiant',
    'journey.verb':         'étudier',
    'building.noun':        'campus',
    'building.noun.plural': 'campus',
    'event.noun':           'cours / séminaire',
    'entry.noun':           'entrée campus',
    'operator.team':        'équipe pédagogique',
    'emergency.service':    'sécurité campus',
    'dashboard.title':      'Tableau de bord campus',
  },
  'industrial': {
    'user.singular':        'opérateur',
    'user.plural':          'opérateurs',
    'user.possessive':      'de l\'opérateur',
    'space.singular':       'zone logistique',
    'space.plural':         'zones',
    'space.unit-area':      'm²',
    'space.area-total':     'surface opérée',
    'revenue.main-kpi':     'rotation stock',
    'revenue.unit':         'jours',
    'operator.title':       'responsable logistique',
    'occupant.pro':         'équipe',
    'occupant.pro.plural':  'équipes',
    'journey.noun':         'flux logistique',
    'journey.verb':         'opérer',
    'building.noun':        'entrepôt',
    'building.noun.plural': 'entrepôts',
    'event.noun':           'campagne logistique',
    'entry.noun':           'quai de chargement',
    'operator.team':        'équipe de quai',
    'emergency.service':    'HSE / gardiennage',
    'dashboard.title':      'Tableau de bord logistique',
  },
  'erp-public': {
    'user.singular':        'visiteur',
    'user.plural':          'visiteurs',
    'user.possessive':      'du visiteur',
    'space.singular':       'salle',
    'space.plural':         'salles',
    'space.unit-area':      'm²',
    'space.area-total':     'surface publique',
    'revenue.main-kpi':     'visiteurs/jour',
    'revenue.unit':         'pax/j',
    'operator.title':       'directeur d\'établissement',
    'occupant.pro':         'exposant',
    'occupant.pro.plural':  'exposants',
    'journey.noun':         'parcours visiteur',
    'journey.verb':         'visiter',
    'building.noun':        'ERP',
    'building.noun.plural': 'ERP',
    'event.noun':           'événement culturel',
    'entry.noun':           'entrée publique',
    'operator.team':        'équipe accueil',
    'emergency.service':    'sécurité',
    'dashboard.title':      'Tableau de bord établissement',
  },
  'multi-site': {
    'user.singular':        'actif',
    'user.plural':          'actifs',
    'user.possessive':      'de l\'actif',
    'space.singular':       'site',
    'space.plural':         'sites',
    'space.unit-area':      'm² portfolio',
    'space.area-total':     'AUM',
    'revenue.main-kpi':     'rendement brut',
    'revenue.unit':         '%',
    'operator.title':       'asset manager portfolio',
    'occupant.pro':         'actif sous gestion',
    'occupant.pro.plural':  'actifs',
    'journey.noun':         'cycle de gestion',
    'journey.verb':         'gérer',
    'building.noun':        'portfolio',
    'building.noun.plural': 'portfolios',
    'event.noun':           'reporting trimestriel',
    'entry.noun':           'entrée du site',
    'operator.team':        'équipe asset management',
    'emergency.service':    'sécurité mutualisée',
    'dashboard.title':      'Tableau de bord portfolio',
  },
}

// ─── API ──────────────────────────────────────────────────

/** Traduit une clé de vocabulaire selon la verticale du projet.
 *  Fallback sur le vocabulaire "mall" si clé manquante, puis sur la clé brute. */
export function t(key: VocabularyKey, vertical: VerticalId = 'mall'): string {
  return VOCAB[vertical]?.[key] ?? VOCAB['mall']?.[key] ?? key
}

/** Récupère tout le vocabulaire d'une verticale (utile pour i18n batching). */
export function getVocabulary(vertical: VerticalId): VocabularyMap {
  return VOCAB[vertical] ?? VOCAB['mall']
}

/** Capitalise la première lettre (utile après `t()` en début de phrase). */
export function tCap(key: VocabularyKey, vertical: VerticalId = 'mall'): string {
  const s = t(key, vertical)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
