// ═══ LAYER CLEANING ENGINE ═══
// Classifie les calques d'un plan DXF importé selon leur rôle métier pour
// le parcours client, puis applique un niveau de nettoyage (Minimal / Standard /
// Complet). Le résultat produit une liste explicite de calques à conserver /
// supprimer, avec justification par calque.
//
// Pipeline :
//   1. classifyLayer(name) → ParcoursLayerRole (17 catégories)
//   2. computeCleaningPlan(layers, level) → { keep[], remove[], reasons }
//   3. applyCleaningPlan(plan, cleaningPlan) → ParsedPlan nettoyé
//
// Aucune donnée mockée — tout est déduit du plan réel.

import type { ParsedPlan, PlanLayer, PlanEntity } from '../../planReader/planEngineTypes'

// ─── Rôles métier (plus fin que LayerCategory) ──────────────

export type ParcoursLayerRole =
  | 'structure-murs'      // murs porteurs, facades, beton
  | 'structure-dalles'    // dalles, poutres, planchers
  | 'cloisons'            // cloisons légères, partitions
  | 'ouvertures'          // portes, fenêtres, baies
  | 'circulation'         // mail, hall, couloir, atrium, promenade
  | 'entrees'             // entrées, sorties, issues secours
  | 'escaliers'           // escaliers, escalators, rampes
  | 'ascenseurs'          // ascenseurs, monte-charges
  | 'parking'             // parking, stationnement, voirie
  | 'sanitaires'          // WC, toilettes, sanitaires
  | 'technique-vmc'       // VMC, ventilation, climatisation
  | 'technique-elec'      // électricité, éclairage, courants faibles
  | 'technique-plomb'     // plomberie, eau, gaz
  | 'mobilier'            // mobilier, équipements mobiles
  | 'signaletique'        // panneaux, signalétique
  | 'cotes'               // dimensions, cotes
  | 'texte'               // textes, annotations
  | 'hachures'            // hachures décoratives
  | 'autre'

// ─── Contribution au parcours client ─────────────────────────

interface RoleMeta {
  label: string
  /** true si essentiel pour tracer un parcours (A* + signalétique). */
  essential: boolean
  /** true si utile pour la visualisation mais non indispensable. */
  usefulForVisual: boolean
  /** true si bruit inutile pour le parcours. */
  isNoise: boolean
}

export const ROLE_META: Record<ParcoursLayerRole, RoleMeta> = {
  'structure-murs':   { label: 'Structure — murs',       essential: true,  usefulForVisual: true,  isNoise: false },
  'structure-dalles': { label: 'Structure — dalles',     essential: false, usefulForVisual: true,  isNoise: false },
  'cloisons':         { label: 'Cloisons',               essential: true,  usefulForVisual: true,  isNoise: false },
  'ouvertures':       { label: 'Portes / fenêtres',      essential: true,  usefulForVisual: true,  isNoise: false },
  'circulation':      { label: 'Circulation',            essential: true,  usefulForVisual: true,  isNoise: false },
  'entrees':          { label: 'Entrées / sorties',      essential: true,  usefulForVisual: true,  isNoise: false },
  'escaliers':        { label: 'Escaliers / rampes',     essential: true,  usefulForVisual: true,  isNoise: false },
  'ascenseurs':       { label: 'Ascenseurs',             essential: true,  usefulForVisual: true,  isNoise: false },
  'parking':          { label: 'Parking',                essential: false, usefulForVisual: true,  isNoise: false },
  'sanitaires':       { label: 'Sanitaires',             essential: false, usefulForVisual: true,  isNoise: false },
  'technique-vmc':    { label: 'Technique — VMC',        essential: false, usefulForVisual: false, isNoise: true },
  'technique-elec':   { label: 'Technique — électricité', essential: false, usefulForVisual: false, isNoise: true },
  'technique-plomb':  { label: 'Technique — plomberie',  essential: false, usefulForVisual: false, isNoise: true },
  'mobilier':         { label: 'Mobilier',               essential: false, usefulForVisual: true,  isNoise: true },
  'signaletique':     { label: 'Signalétique existante', essential: false, usefulForVisual: true,  isNoise: false },
  'cotes':            { label: 'Cotes / dimensions',     essential: false, usefulForVisual: false, isNoise: true },
  'texte':            { label: 'Textes / annotations',   essential: false, usefulForVisual: true,  isNoise: false },
  'hachures':         { label: 'Hachures',               essential: false, usefulForVisual: false, isNoise: true },
  'autre':            { label: 'Autre',                  essential: false, usefulForVisual: true,  isNoise: false },
}

// ─── Classification par expressions régulières ──────────────

const ROLE_RULES: Array<{ role: ParcoursLayerRole; pattern: RegExp }> = [
  // Structure lourde
  { role: 'structure-dalles',  pattern: /dalle|plancher|poutre|slab|ceiling|plafond/i },
  { role: 'structure-murs',    pattern: /mur\b|wall\b|facade|fa[cç]ade|maconn|beton|concrete|structure|porteur/i },
  // Cloisons légères
  { role: 'cloisons',          pattern: /clois|partition|sep[aé]ration|sep\b/i },
  // Ouvertures
  { role: 'ouvertures',        pattern: /porte|door|fenetre|window|baie|bay|ouvert|opening/i },
  // Circulations
  { role: 'circulation',       pattern: /\bmail\b|\bhall\b|circul|couloir|passage|atrium|galerie|galleria|promenade|concourse|plaza|forum|lobby|rotonde|parvis/i },
  // Entrées / sorties
  { role: 'entrees',           pattern: /entr[eé]e|entrance|\bsortie\b|\bexit\b|issue[_\s]?secours|emergency|entry/i },
  // Escaliers / rampes
  { role: 'escaliers',         pattern: /escal(?:ier|ator)|\bstair\b|rampe|ramp|\bescal\b/i },
  // Ascenseurs
  { role: 'ascenseurs',        pattern: /asc(?:enseur)?|\blift\b|elevator|monte[_\s-]?charge/i },
  // Parking
  { role: 'parking',           pattern: /parking|parc\b|stationnement|voirie|\bcar\b|place[_\s]?auto/i },
  // Sanitaires
  { role: 'sanitaires',        pattern: /\bwc\b|sanitaire|toilet|lav[abo]|bath/i },
  // Technique VMC
  { role: 'technique-vmc',     pattern: /vmc|ventil|clim|clima|\bcvc\b|hvac|\bcta\b|extracteur|gaine[_\s]?air/i },
  // Technique électricité
  { role: 'technique-elec',    pattern: /\belec\b|electr|eclair|\blum\b|lighting|power|courant[_\s]?faible|cfo\b|cfa\b/i },
  // Technique plomberie
  { role: 'technique-plomb',   pattern: /plomb|sanit[_\s]?r[eé]s|evacu|\begout|\beau\b|gaz\b|assainiss|gout/i },
  // Mobilier
  { role: 'mobilier',          pattern: /mobilier|furniture|furn|table|chaise|chair|banc|bench|amenag|equipement/i },
  // Signalétique existante
  { role: 'signaletique',      pattern: /signal|panneau|sign|wayfind|panel/i },
  // Cotes
  { role: 'cotes',             pattern: /cote|dimension|\bdim\b|mesure|measurement/i },
  // Textes
  { role: 'texte',             pattern: /\btexte?\b|\btext\b|annot|label|notation|\brep\b/i },
  // Hachures
  { role: 'hachures',          pattern: /hatch|hachure|trame/i },
]

export function classifyLayer(layerName: string): ParcoursLayerRole {
  const name = (layerName ?? '').trim()
  if (!name) return 'autre'
  for (const { role, pattern } of ROLE_RULES) {
    if (pattern.test(name)) return role
  }
  return 'autre'
}

// ─── Niveaux de nettoyage ──────────────────────────────────

export type CleaningLevel = 'minimal' | 'standard' | 'complet'

export const CLEANING_LEVEL_META: Record<CleaningLevel, { label: string; description: string }> = {
  minimal: {
    label: 'Minimal',
    description: 'Retire uniquement les calques de bruit (cotes, hachures, textes techniques).',
  },
  standard: {
    label: 'Standard',
    description: 'Retire aussi mobilier, VMC, électricité, plomberie. Garde signalétique et parking.',
  },
  complet: {
    label: 'Complet',
    description: 'Ne garde que structure + circulations + entrées + escaliers + ascenseurs + parking + sanitaires. Plan épuré parcours-ready.',
  },
}

/** Définit quels rôles sont conservés pour chaque niveau de nettoyage. */
const KEEP_BY_LEVEL: Record<CleaningLevel, Set<ParcoursLayerRole>> = {
  minimal: new Set<ParcoursLayerRole>([
    'structure-murs', 'structure-dalles', 'cloisons', 'ouvertures',
    'circulation', 'entrees', 'escaliers', 'ascenseurs',
    'parking', 'sanitaires', 'technique-vmc', 'technique-elec', 'technique-plomb',
    'mobilier', 'signaletique', 'texte', 'autre',
  ]),
  standard: new Set<ParcoursLayerRole>([
    'structure-murs', 'structure-dalles', 'cloisons', 'ouvertures',
    'circulation', 'entrees', 'escaliers', 'ascenseurs',
    'parking', 'sanitaires', 'signaletique', 'texte', 'autre',
  ]),
  complet: new Set<ParcoursLayerRole>([
    'structure-murs', 'cloisons', 'ouvertures',
    'circulation', 'entrees', 'escaliers', 'ascenseurs',
    'parking', 'sanitaires',
  ]),
}

// ─── Plan de nettoyage ─────────────────────────────────────

export interface LayerClassification {
  name: string
  role: ParcoursLayerRole
  entityCount: number
  /** Dans le niveau sélectionné : conservé ou retiré. */
  kept: boolean
  /** Justification humaine. */
  reason: string
}

export interface CleaningPlan {
  level: CleaningLevel
  classifications: LayerClassification[]
  keptLayers: string[]
  removedLayers: string[]
  stats: {
    totalLayers: number
    keptCount: number
    removedCount: number
    removedEntities: number
    keptEntities: number
  }
}

export function computeCleaningPlan(
  plan: ParsedPlan,
  level: CleaningLevel,
  /** Ajustements manuels : layerName → forcer kept true/false. */
  overrides?: Record<string, boolean>,
): CleaningPlan {
  const entitiesByLayer = new Map<string, number>()
  for (const e of plan.entities) {
    entitiesByLayer.set(e.layer, (entitiesByLayer.get(e.layer) ?? 0) + 1)
  }

  const keepSet = KEEP_BY_LEVEL[level]
  const classifications: LayerClassification[] = []

  for (const layer of plan.layers) {
    const role = classifyLayer(layer.name)
    const meta = ROLE_META[role]
    let kept = keepSet.has(role)
    let reason = kept
      ? `Conservé (${meta.label}) — ${meta.essential ? 'essentiel' : 'utile'} pour le parcours`
      : `Retiré (${meta.label}) — ${meta.isNoise ? 'bruit' : 'non requis'} au niveau « ${CLEANING_LEVEL_META[level].label.toLowerCase()} »`

    if (overrides && overrides[layer.name] !== undefined) {
      const forced = overrides[layer.name]
      if (forced !== kept) {
        kept = forced
        reason = kept
          ? `Conservé (override manuel)`
          : `Retiré (override manuel)`
      }
    }

    classifications.push({
      name: layer.name,
      role,
      entityCount: entitiesByLayer.get(layer.name) ?? 0,
      kept,
      reason,
    })
  }

  const keptLayers = classifications.filter(c => c.kept).map(c => c.name)
  const removedLayers = classifications.filter(c => !c.kept).map(c => c.name)
  const keptEntities = classifications.filter(c => c.kept).reduce((s, c) => s + c.entityCount, 0)
  const removedEntities = classifications.filter(c => !c.kept).reduce((s, c) => s + c.entityCount, 0)

  return {
    level,
    classifications,
    keptLayers,
    removedLayers,
    stats: {
      totalLayers: classifications.length,
      keptCount: keptLayers.length,
      removedCount: removedLayers.length,
      removedEntities,
      keptEntities,
    },
  }
}

/** Applique le plan de nettoyage en retournant une copie nettoyée du parsedPlan.
 *  Filtre TOUS les champs dérivés du DXF qui ont un `layer` associé :
 *    - entities, layers (sources)
 *    - wallSegments (→ rendu 3D / murs)
 *    - dimensions (→ cotes affichées)
 *  Les spaces sans calque sont conservés (détection polygonale autonome).
 */
export function applyCleaningPlan(plan: ParsedPlan, cleaning: CleaningPlan): ParsedPlan {
  const keep = new Set(cleaning.keptLayers)
  const entities: PlanEntity[] = plan.entities.filter(e => keep.has(e.layer))
  const layers: PlanLayer[] = plan.layers.filter(l => keep.has(l.name))
  // Nettoyer AUSSI les wallSegments (sinon la vue 3D garde les murs parasites)
  const wallSegments = plan.wallSegments.filter(w => keep.has(w.layer))
  // Nettoyer les dimensions/cotes si leur calque a été retiré
  const dimensions = (plan.dimensions ?? []).filter(d => keep.has(d.layer))

  return {
    ...plan,
    entities,
    layers,
    wallSegments,
    dimensions,
  }
}

// ─── Analyse synthétique (pour affichage UI) ───────────────

export interface CleaningSummary {
  /** % d'entités conservées. */
  keptRatio: number
  /** Liste des 5 plus gros calques retirés (avec entityCount). */
  topRemoved: Array<{ name: string; role: ParcoursLayerRole; entityCount: number }>
  /** Liste des 5 plus gros calques conservés. */
  topKept: Array<{ name: string; role: ParcoursLayerRole; entityCount: number }>
  /** Alertes : rôles essentiels absents. */
  warnings: string[]
}

export function summarizeCleaning(cleaning: CleaningPlan): CleaningSummary {
  const total = cleaning.stats.removedEntities + cleaning.stats.keptEntities
  const keptRatio = total > 0 ? cleaning.stats.keptEntities / total : 0

  const sortByEntities = (a: LayerClassification, b: LayerClassification) => b.entityCount - a.entityCount

  const topRemoved = cleaning.classifications
    .filter(c => !c.kept)
    .sort(sortByEntities)
    .slice(0, 5)
    .map(c => ({ name: c.name, role: c.role, entityCount: c.entityCount }))

  const topKept = cleaning.classifications
    .filter(c => c.kept)
    .sort(sortByEntities)
    .slice(0, 5)
    .map(c => ({ name: c.name, role: c.role, entityCount: c.entityCount }))

  const warnings: string[] = []
  const essentialRoles: ParcoursLayerRole[] = ['circulation', 'entrees', 'escaliers']
  const keptRoles = new Set(cleaning.classifications.filter(c => c.kept).map(c => c.role))
  for (const er of essentialRoles) {
    if (!keptRoles.has(er)) {
      warnings.push(`Aucun calque « ${ROLE_META[er].label} » détecté — vérifier la nomenclature du DXF.`)
    }
  }

  return { keptRatio, topRemoved, topKept, warnings }
}
