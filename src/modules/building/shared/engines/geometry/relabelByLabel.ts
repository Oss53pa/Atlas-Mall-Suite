// ═══ RELABEL BY LABEL — Reclassification heuristique des EditableSpace ═══
//
// Beaucoup d'EditableSpace ont été créés rc.0 avec le type par défaut
// (`commerce`) sans que l'user ait pensé à changer le type quand il
// labellait autre chose. Résultat : un polygone labellé "TERRE PLEIN"
// reste typé `commerce` → extrudé à 4.5m en 3D au lieu d'être plat.
//
// Ce module applique des heuristiques regex sur le label (et le name)
// pour proposer un type sémantique plus juste, SANS modifier les données.
// Le user passe par /admin/geometry → bouton "Re-typer depuis labels".
//
// Aligné avec MigrationHeuristics de la spec spatial-core (mode B).

import type { SpaceTypeKey } from '../../proph3t/libraries/spaceTypeLibrary'

export interface RelabelSuggestion {
  spaceId: string
  currentType: string
  suggestedType: SpaceTypeKey
  confidence: 'high' | 'medium' | 'low'
  matchedRule: string
  matchedText: string
}

/**
 * Normalise un label : minuscules + suppression des accents.
 * Permet de matcher "Terre-plein", "TERRE PLEIN", "terre plein" identiquement.
 */
function normalize(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Liste de règles ordonnées — la première qui matche gagne. */
interface Rule {
  pattern: RegExp
  type: SpaceTypeKey
  confidence: RelabelSuggestion['confidence']
  ruleId: string
}

const RULES: Rule[] = [
  // ─── Marquages sol et paysage (priorité haute — extrusion 3D critique) ─
  { pattern: /\bterre[\s-]?plein|\bilot\s*central|\bsep(arateur|aration)\b/, type: 'terre_plein',         confidence: 'high', ruleId: 'terre_plein' },
  { pattern: /\bjardin\b/,                                                    type: 'jardin',              confidence: 'high', ruleId: 'jardin' },
  { pattern: /\bpelouse|\bgazon\b/,                                           type: 'pelouse',             confidence: 'high', ruleId: 'pelouse' },
  { pattern: /\bespace[\s-]?vert|\bvegetal|\bplantation/,                     type: 'espace_vert',         confidence: 'high', ruleId: 'espace_vert' },
  { pattern: /\bmassif/,                                                      type: 'massif_vegetal',      confidence: 'high', ruleId: 'massif' },
  { pattern: /\bhaie\b/,                                                      type: 'haie',                confidence: 'high', ruleId: 'haie' },
  { pattern: /\balignement\s*d?\s*arbres?/,                                   type: 'alignement_arbres',   confidence: 'high', ruleId: 'alignement_arbres' },
  { pattern: /\barbre\b(?!.*alignement)/,                                     type: 'arbre_isole',         confidence: 'high', ruleId: 'arbre_isole' },
  { pattern: /\bfontaine|\bbassin\b/,                                         type: 'exterieur_fontaine',  confidence: 'high', ruleId: 'fontaine' },
  { pattern: /\baire\s*de\s*jeux|\bjeux\s*enfants?/,                          type: 'exterieur_aire_jeux', confidence: 'high', ruleId: 'aire_jeux' },

  // ─── Voirie / parking ─────────────────────────────────────────────────
  { pattern: /\bvoie\s+pompiers?\b|\bpompier\b/,                              type: 'voie_pompier',        confidence: 'high', ruleId: 'voie_pompier' },
  { pattern: /\bvoie\s+livraison|\blivraison\b/,                              type: 'voie_livraison',      confidence: 'high', ruleId: 'voie_livraison' },
  { pattern: /\bvoie\s+principale|\baxe\s+principal/,                         type: 'voie_principale',     confidence: 'high', ruleId: 'voie_principale' },
  { pattern: /\bvoie\s+secondaire|\bvoie\s+circulation|\bvoirie/,             type: 'voie_secondaire',     confidence: 'high', ruleId: 'voie_secondaire' },
  { pattern: /\brond[\s-]?point|\bgiratoire/,                                 type: 'rond_point',          confidence: 'high', ruleId: 'rond_point' },
  { pattern: /\bcarrefour/,                                                   type: 'carrefour',           confidence: 'high', ruleId: 'carrefour' },
  { pattern: /\bpassage\s+pieton|\bzebra/,                                    type: 'passage_pieton',      confidence: 'high', ruleId: 'passage_pieton' },
  { pattern: /\btrottoir\b/,                                                  type: 'trottoir',            confidence: 'high', ruleId: 'trottoir' },
  { pattern: /\bparvis\b/,                                                    type: 'parvis',              confidence: 'high', ruleId: 'parvis' },
  { pattern: /\bplace\s+pmr|\bhandicape?\b|\bfauteuil/,                       type: 'parking_place_pmr',   confidence: 'high', ruleId: 'parking_pmr' },
  { pattern: /\bborne\s+ve|\brecharge|\belectrique\s+ve/,                     type: 'parking_place_ve',    confidence: 'high', ruleId: 'parking_ve' },
  { pattern: /\bparking\s+moto|\bplace\s+moto|\b2\s*roues?/,                  type: 'parking_place_moto',  confidence: 'high', ruleId: 'parking_moto' },
  { pattern: /\bplace\s+livraison/,                                           type: 'parking_place_livraison', confidence: 'high', ruleId: 'parking_livraison' },
  { pattern: /\bparking\s+velo|\bvelos?\b/,                                   type: 'parking_velo',        confidence: 'high', ruleId: 'parking_velo' },
  { pattern: /\bparking|\bstationnement/,                                     type: 'parking_vehicule',    confidence: 'high', ruleId: 'parking_default' },

  // ─── Routes publiques hors-site ───────────────────────────────────────
  { pattern: /\bautoroute\b/,                                                 type: 'route_autoroute',     confidence: 'high', ruleId: 'route_autoroute' },
  { pattern: /\bboulevard\b/,                                                 type: 'route_boulevard',     confidence: 'high', ruleId: 'route_boulevard' },
  { pattern: /\bavenue\b/,                                                    type: 'route_avenue',        confidence: 'high', ruleId: 'route_avenue' },
  { pattern: /\brue\s+principale/,                                            type: 'route_rue_principale', confidence: 'high', ruleId: 'route_rue_principale' },
  { pattern: /\brue\s+secondaire/,                                            type: 'route_rue_secondaire', confidence: 'high', ruleId: 'route_rue_secondaire' },
  { pattern: /\bimpasse\b/,                                                   type: 'route_impasse',       confidence: 'high', ruleId: 'route_impasse' },
  { pattern: /\bpont\s+routier|\bviaduc/,                                     type: 'route_pont',          confidence: 'high', ruleId: 'route_pont' },
  { pattern: /\btunnel\b/,                                                    type: 'route_tunnel',        confidence: 'high', ruleId: 'route_tunnel' },

  // ─── Accès au site ────────────────────────────────────────────────────
  { pattern: /\bacces\s+pieton\s+principal|\bentree\s+pieton\s+principal/,    type: 'acces_site_pieton_principal',   confidence: 'high', ruleId: 'acces_pieton_principal' },
  { pattern: /\bacces\s+pieton/,                                              type: 'acces_site_pieton_secondaire',  confidence: 'high', ruleId: 'acces_pieton_secondaire' },
  { pattern: /\bacces\s+vehicule\s+entree|\bentree\s+vehicule/,               type: 'acces_site_vehicule_entree',    confidence: 'high', ruleId: 'acces_vehicule_entree' },
  { pattern: /\bacces\s+vehicule\s+sortie|\bsortie\s+vehicule/,               type: 'acces_site_vehicule_sortie',    confidence: 'high', ruleId: 'acces_vehicule_sortie' },
  { pattern: /\bacces\s+service|\bentree\s+service/,                          type: 'acces_site_vehicule_service',   confidence: 'high', ruleId: 'acces_service' },

  // ─── Portes & sorties ─────────────────────────────────────────────────
  { pattern: /\bporte\s+(double|d.entree|principal)/,                         type: 'porte_double',        confidence: 'high', ruleId: 'porte_double' },
  { pattern: /\bporte\s+(automatique|coulissante)/,                           type: 'porte_automatique',   confidence: 'high', ruleId: 'porte_automatique' },
  { pattern: /\bporte\s+(secours|secou)/,                                     type: 'porte_secours',       confidence: 'high', ruleId: 'porte_secours' },
  { pattern: /\bsortie\s+(secours|incendie|de\s+secours)/,                    type: 'sortie_secours',      confidence: 'high', ruleId: 'sortie_secours' },
  { pattern: /\bporte\s+service/,                                             type: 'porte_service',       confidence: 'high', ruleId: 'porte_service' },
  { pattern: /\bporte\s+(int|interieur)/,                                     type: 'porte_interieure',    confidence: 'high', ruleId: 'porte_interieure' },
  { pattern: /\bporte\s+entree|\bporte\s+ent\b/,                              type: 'porte_entree',        confidence: 'high', ruleId: 'porte_entree' },

  // ─── Sanitaires ────────────────────────────────────────────────────────
  { pattern: /\btoilettes?\b|\bsanitaires?\b|\bwc\b|\bw\.?c\.?\s/,             type: 'sanitaires',          confidence: 'high', ruleId: 'sanitaires' },
  { pattern: /\bvestiaires?\b/,                                               type: 'vestiaires_personnel', confidence: 'high', ruleId: 'vestiaires' },

  // ─── Restauration & food court ────────────────────────────────────────
  { pattern: /\bfood\s*court|\baire\s+restauration/,                          type: 'food_court',          confidence: 'high', ruleId: 'food_court' },
  { pattern: /\brestaurant\b/,                                                type: 'commerce_restaurant', confidence: 'high', ruleId: 'restaurant' },
  { pattern: /\bcafe\b|\bbrasserie\b|\bsalon\s+de\s+the/,                     type: 'commerce_restaurant', confidence: 'medium', ruleId: 'cafe' },
  { pattern: /\bbar\b(?!\s*(re|cod))/,                                        type: 'commerce_restaurant', confidence: 'medium', ruleId: 'bar' },
  { pattern: /\bterrasse\s+restaurant/,                                       type: 'terrasse_restaurant', confidence: 'high', ruleId: 'terrasse_restaurant' },
  { pattern: /\bterrasse\b/,                                                  type: 'terrasse_commerciale', confidence: 'medium', ruleId: 'terrasse_default' },

  // ─── Commerces spécialisés ─────────────────────────────────────────────
  { pattern: /\bsupermarche|\bmonoprix|\bcarrefour\s+market|\bizumiya|\bauchan|\bcora/, type: 'commerce_supermarche', confidence: 'high', ruleId: 'supermarche' },
  { pattern: /\b(zara|lacoste|jules|h&m|hm|gap|gemo|kiabi|bershka|pull&bear|mango)\b/, type: 'commerce_mode',         confidence: 'high', ruleId: 'mode_brands' },
  { pattern: /\bmode\b|\bvetement|\bpret\s+a\s+porter/,                       type: 'commerce_mode',       confidence: 'high', ruleId: 'mode' },
  { pattern: /\bsamsung|\baiwatch|\btechno|\biphone|\bapple|\borange\s*ci|\bmtn/, type: 'commerce_multimedia', confidence: 'high', ruleId: 'multimedia' },
  { pattern: /\bbijou|\bjoaillerie|\bhorlogerie/,                             type: 'commerce_accessoires', confidence: 'high', ruleId: 'bijou' },
  { pattern: /\bopticien|\boptic|\bmoderne\s+optique/,                        type: 'commerce_beaute_sante', confidence: 'high', ruleId: 'optique' },
  { pattern: /\bbeaute|\bparfum|\bcosmetique|\bsephora|\byves\s+rocher/,      type: 'commerce_beaute_sante', confidence: 'high', ruleId: 'beaute' },
  { pattern: /\bpharmacie\b|\bsante\b/,                                       type: 'commerce_beaute_sante', confidence: 'high', ruleId: 'sante' },
  { pattern: /\bcoiffeur|\bbarber|\bsalon\s+de\s+coiffure/,                   type: 'commerce_beaute_sante', confidence: 'high', ruleId: 'coiffeur' },
  { pattern: /\bbanque|\bnsia|\bsib|\bsgci|\becobank|\buba|\bbiao|\bba(n)?cage/, type: 'commerce_banque_assurance', confidence: 'high', ruleId: 'banque' },
  { pattern: /\bdab\b|\batm\b|\bdistributeur/,                                type: 'atm',                 confidence: 'high', ruleId: 'atm' },
  { pattern: /\bchange\b|\bbureau\s+de\s+change/,                             type: 'commerce_banque_assurance', confidence: 'high', ruleId: 'change' },

  // ─── Loisirs / culturel ───────────────────────────────────────────────
  { pattern: /\bcinema|\bmajestic|\bpathe|\bgaumont|\bcgr/,                   type: 'cinema_multiplex',    confidence: 'high', ruleId: 'cinema' },
  { pattern: /\bdreamland|\bbowling|\bsalle\s+de\s+jeu/,                      type: 'loisirs',             confidence: 'high', ruleId: 'loisirs_dreamland' },
  { pattern: /\bsport|\bdecathlon|\bfitness|\bgym/,                           type: 'loisirs',             confidence: 'high', ruleId: 'sport' },
  { pattern: /\bcity\s+sport/,                                                type: 'loisirs',             confidence: 'high', ruleId: 'city_sport' },
  { pattern: /\bnature\s+home|\bdeco|\bameublement/,                          type: 'commerce_cadeaux_alimentaire', confidence: 'medium', ruleId: 'deco' },

  // ─── Locaux techniques & service ──────────────────────────────────────
  { pattern: /\bcour\s+de\s+service|\bcour\s+service/,                        type: 'cour_service',        confidence: 'high', ruleId: 'cour_service' },
  { pattern: /\bcouloir\s+service/,                                           type: 'couloir_service',     confidence: 'high', ruleId: 'couloir_service' },
  { pattern: /\bcouloir\s+secondaire/,                                        type: 'couloir_secondaire',  confidence: 'high', ruleId: 'couloir_secondaire' },
  { pattern: /\bcouloir\b/,                                                   type: 'circulation',         confidence: 'medium', ruleId: 'couloir_generic' },
  { pattern: /\btgbt|\belectrique\s+local|\bdisjoncteur/,                     type: 'local_electrique_tgbt', confidence: 'high', ruleId: 'tgbt' },
  { pattern: /\bchaufferie|\bcvc|\bclim/,                                     type: 'local_chaufferie_cvc', confidence: 'high', ruleId: 'chaufferie' },
  { pattern: /\bgroupe\s+electrogene/,                                        type: 'local_groupe_electrogene', confidence: 'high', ruleId: 'gen_electro' },
  { pattern: /\bsprinkler|\bcolonne\s+seche/,                                 type: 'local_sprinkler',     confidence: 'high', ruleId: 'sprinkler' },
  { pattern: /\btelecom|\bbaie\s+brassage|\binformatique\s+local/,            type: 'local_telecom',       confidence: 'high', ruleId: 'telecom' },
  { pattern: /\blocal\s+menage|\bmenage/,                                     type: 'local_menage',        confidence: 'high', ruleId: 'menage' },
  { pattern: /\bpoubelle|\bdechet/,                                           type: 'local_poubelles',     confidence: 'high', ruleId: 'poubelles' },
  { pattern: /\breserve|\bstockage|\bdepot|\barchive/,                        type: 'stockage',            confidence: 'high', ruleId: 'stockage' },
  { pattern: /\blivraison|\bquai/,                                            type: 'zone_livraison',      confidence: 'high', ruleId: 'livraison' },
  { pattern: /\bzone\s+technique|\blocal\s+technique/,                        type: 'zone_technique',      confidence: 'high', ruleId: 'technique' },

  // ─── Mall / circulation ───────────────────────────────────────────────
  { pattern: /\bmail\s+central/,                                              type: 'mail_central',        confidence: 'high', ruleId: 'mail_central' },
  { pattern: /\bmail\s+secondaire/,                                           type: 'mail_secondaire',     confidence: 'high', ruleId: 'mail_secondaire' },
  { pattern: /\bmail\b/,                                                      type: 'mail_central',        confidence: 'medium', ruleId: 'mail_default' },
  { pattern: /\batrium/,                                                      type: 'atrium',              confidence: 'high', ruleId: 'atrium' },
  { pattern: /\bgalerie\b/,                                                   type: 'galerie',             confidence: 'high', ruleId: 'galerie' },
  { pattern: /\bpromenade/,                                                   type: 'promenade',           confidence: 'high', ruleId: 'promenade' },
  { pattern: /\bhall\b/,                                                      type: 'hall_distribution',   confidence: 'medium', ruleId: 'hall' },
  { pattern: /\bescalator|\bescalier\s+mecanique/,                            type: 'escalator',           confidence: 'high', ruleId: 'escalator' },
  { pattern: /\bascenseur|\blift\b/,                                          type: 'ascenseur',           confidence: 'high', ruleId: 'ascenseur' },
  { pattern: /\bescalier(?!\s+mecanique)/,                                    type: 'escalier_fixe',       confidence: 'high', ruleId: 'escalier' },
  { pattern: /\brampe\s+pmr|\brampe(?!\s+access)/,                            type: 'rampe_pmr',           confidence: 'high', ruleId: 'rampe' },

  // ─── Services divers ──────────────────────────────────────────────────
  { pattern: /\binformation|\bpoint\s+info|\baccueil\b/,                      type: 'point_information',   confidence: 'high', ruleId: 'info' },
  { pattern: /\bespace\s+bebe|\bnurserie/,                                    type: 'espace_bebe',         confidence: 'high', ruleId: 'bebe' },
  { pattern: /\bsalle\s+priere/,                                              type: 'salle_priere',        confidence: 'high', ruleId: 'priere' },
  { pattern: /\bconsigne|\bbagage/,                                           type: 'consigne_bagages',    confidence: 'high', ruleId: 'consigne' },
  { pattern: /\bfumeur/,                                                      type: 'espace_fumeur',       confidence: 'high', ruleId: 'fumeur' },
  { pattern: /\bphotomaton/,                                                  type: 'cabine_photomaton',   confidence: 'high', ruleId: 'photomaton' },
  { pattern: /\bborne\s+wayfind|\bwayfinder/,                                 type: 'borne_wayfinder',     confidence: 'high', ruleId: 'wayfinder' },
  { pattern: /\bguichet\s+caisse|\bcaisse\b/,                                 type: 'guichet_caisse',      confidence: 'high', ruleId: 'caisse' },
  { pattern: /\bguichet/,                                                     type: 'guichet_service',     confidence: 'medium', ruleId: 'guichet' },

  // ─── Brand commerce générique fallback ────────────────────────────────
  { pattern: /\bboutique|\bmagasin|\bshop\b|\benseigne/,                      type: 'local_commerce',      confidence: 'medium', ruleId: 'boutique_generic' },
]

/**
 * Analyse un EditableSpace et propose un type plus juste basé sur son label.
 * Retourne null si :
 *  - Le label est vide / aucun matche → on ne touche pas
 *  - Le type actuel correspond DÉJÀ au matche → no-op
 */
export function suggestType(
  spaceId: string,
  currentType: string,
  label: string,
  name: string,
): RelabelSuggestion | null {
  const text = `${label ?? ''} ${name ?? ''}`.trim()
  if (!text) return null
  const norm = normalize(text)

  for (const rule of RULES) {
    if (rule.pattern.test(norm)) {
      // Pas de proposition si le type est déjà le bon
      if (currentType === rule.type) return null
      return {
        spaceId,
        currentType,
        suggestedType: rule.type,
        confidence: rule.confidence,
        matchedRule: rule.ruleId,
        matchedText: text,
      }
    }
  }
  return null
}

/** Applique en lot et retourne les suggestions pour validation user. */
export function batchSuggestRelabels(
  spaces: ReadonlyArray<{ id: string; type: string; label?: string; name?: string }>,
): RelabelSuggestion[] {
  const out: RelabelSuggestion[] = []
  for (const s of spaces) {
    const sug = suggestType(s.id, s.type, s.label ?? '', s.name ?? '')
    if (sug) out.push(sug)
  }
  return out
}
