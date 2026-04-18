// ═══ SIGNAGE MEMORY SERVICE ═══
//
// Mémoire inter-projets : quand un utilisateur valide une correction
// (labelisation, catégorie, emplacement panneau), on enregistre le pattern.
// Sur un futur projet similaire, PROPH3T peut suggérer automatiquement
// les mêmes corrections si le pattern match.
//
// Ex : un utilisateur renomme "ESCAL_MECA_N" en "Escalator Nord" et corrige
// la catégorie auto en "escaliers". Le pattern est enregistré. Le prochain
// projet avec un calque "ESCAL_MECA_N" verra PROPH3T proposer cette correction
// directement au premier import.

import { supabase, isOfflineMode } from '../../../../lib/supabase'

// ─── Types ─────────────────────────────────────────────

export type PatternType =
  | 'label-correction'
  | 'category-correction'
  | 'panel-placement'
  | 'layer-classification'
  | 'exclusion'

export interface SignagePattern {
  id: string
  pattern_type: PatternType
  trigger_key: string
  trigger_context?: Record<string, unknown> | null
  applied_value: Record<string, unknown>
  projet_id_origine?: string | null
  validated_by?: string | null
  validation_count: number
  rejection_count: number
  confidence_score: number
  applied_on_projects: string[]
  last_used_at?: string | null
  created_at: string
  updated_at: string
}

export interface PatternMatch {
  pattern: SignagePattern
  /** Similarité de match 0..1 (sur trigger_key + context). */
  similarity: number
  /** Suggestion formatée pour l'UI. */
  suggestion: string
}

// ─── Normalisation ─────────────────────────────────────

/**
 * Normalise une clé de trigger : MAJUSCULES, espaces/tirets/slashes unifiés,
 * chiffres conservés mais séparateurs homogénéisés.
 *
 * "ESCAL-MECA N°2" → "ESCAL_MECA_N_2"
 * "boutique_45" → "BOUTIQUE_45"
 */
export function normalizeTriggerKey(raw: string): string {
  return (raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s/\-.,;:]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/** Similarité entre deux clés normalisées : Jaccard sur tokens + prefix bonus. */
export function triggerSimilarity(a: string, b: string): number {
  const na = normalizeTriggerKey(a)
  const nb = normalizeTriggerKey(b)
  if (na === nb) return 1.0
  const tokensA = new Set(na.split('_').filter(Boolean))
  const tokensB = new Set(nb.split('_').filter(Boolean))
  if (tokensA.size === 0 || tokensB.size === 0) return 0
  const intersection = new Set([...tokensA].filter(t => tokensB.has(t)))
  const union = new Set([...tokensA, ...tokensB])
  const jaccard = intersection.size / union.size
  // Bonus si prefix commun
  let prefixLen = 0
  const maxLen = Math.min(na.length, nb.length)
  for (let i = 0; i < maxLen; i++) {
    if (na[i] === nb[i]) prefixLen++
    else break
  }
  const prefixBonus = prefixLen / Math.max(na.length, nb.length) * 0.2
  return Math.min(1, jaccard + prefixBonus)
}

// ─── Enregistrement d'un pattern ──────────────────────

export async function recordPattern(input: {
  pattern_type: PatternType
  trigger_raw: string
  trigger_context?: Record<string, unknown>
  applied_value: Record<string, unknown>
  projet_id_origine?: string
}): Promise<{ success: boolean; patternId?: string; error?: string }> {
  const trigger_key = normalizeTriggerKey(input.trigger_raw)
  if (!trigger_key) return { success: false, error: 'Clé de trigger invalide après normalisation' }

  if (isOfflineMode) {
    const key = 'atlas-signage-patterns-local'
    const existing: SignagePattern[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    // Fusion si pattern identique
    const dup = existing.find(p =>
      p.pattern_type === input.pattern_type &&
      p.trigger_key === trigger_key &&
      JSON.stringify(p.applied_value) === JSON.stringify(input.applied_value)
    )
    if (dup) {
      dup.validation_count++
      dup.confidence_score = Math.min(0.99, dup.confidence_score + 0.05)
      dup.updated_at = new Date().toISOString()
      localStorage.setItem(key, JSON.stringify(existing))
      return { success: true, patternId: dup.id }
    }
    const id = `local-${crypto.randomUUID()}`
    existing.unshift({
      id, pattern_type: input.pattern_type,
      trigger_key,
      trigger_context: input.trigger_context ?? null,
      applied_value: input.applied_value,
      projet_id_origine: input.projet_id_origine ?? null,
      validated_by: null,
      validation_count: 1,
      rejection_count: 0,
      confidence_score: 0.5,
      applied_on_projects: input.projet_id_origine ? [input.projet_id_origine] : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 1000)))
    return { success: true, patternId: id }
  }

  // Upsert : vérifier d'abord si pattern identique existe
  const { data: existing } = await supabase
    .from('signage_patterns')
    .select('id, validation_count, applied_value, applied_on_projects')
    .eq('pattern_type', input.pattern_type)
    .eq('trigger_key', trigger_key)
    .maybeSingle()

  if (existing && JSON.stringify(existing.applied_value) === JSON.stringify(input.applied_value)) {
    const { data: user } = await supabase.auth.getUser()
    const appliedOn = Array.from(new Set([
      ...(existing.applied_on_projects as string[] ?? []),
      ...(input.projet_id_origine ? [input.projet_id_origine] : []),
    ]))
    const { error } = await supabase
      .from('signage_patterns')
      .update({
        validation_count: (existing.validation_count ?? 0) + 1,
        applied_on_projects: appliedOn,
        last_used_at: new Date().toISOString(),
        validated_by: user.user?.id,
      })
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
    return { success: true, patternId: existing.id }
  }

  const { data: user } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('signage_patterns')
    .insert({
      pattern_type: input.pattern_type,
      trigger_key,
      trigger_context: input.trigger_context ?? null,
      applied_value: input.applied_value,
      projet_id_origine: input.projet_id_origine ?? null,
      validated_by: user.user?.id,
      applied_on_projects: input.projet_id_origine ? [input.projet_id_origine] : [],
      last_used_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, patternId: data!.id }
}

// ─── Recherche de patterns applicables ────────────────

export async function findMatchingPatterns(
  triggers: Array<{ type: PatternType; raw: string; context?: Record<string, unknown> }>,
  opts?: {
    minConfidence?: number  // défaut 0.5
    minSimilarity?: number  // défaut 0.65
    excludeProject?: string // ignore patterns déjà appliqués sur ce projet
  },
): Promise<Record<string, PatternMatch[]>> {
  const minConf = opts?.minConfidence ?? 0.5
  const minSim = opts?.minSimilarity ?? 0.65
  const results: Record<string, PatternMatch[]> = {}

  const loadAll = async (): Promise<SignagePattern[]> => {
    if (isOfflineMode) {
      return JSON.parse(localStorage.getItem('atlas-signage-patterns-local') ?? '[]')
    }
    const types = [...new Set(triggers.map(t => t.type))]
    const { data, error } = await supabase
      .from('signage_patterns')
      .select('*')
      .in('pattern_type', types)
      .gte('confidence_score', minConf)
      .order('confidence_score', { ascending: false })
      .limit(2000)
    if (error) {
       
      console.warn('[signageMemoryService] findMatching failed:', error.message)
      return []
    }
    return (data ?? []) as SignagePattern[]
  }

  const allPatterns = await loadAll()

  for (const t of triggers) {
    const key = `${t.type}::${normalizeTriggerKey(t.raw)}`
    const matches: PatternMatch[] = []
    for (const p of allPatterns) {
      if (p.pattern_type !== t.type) continue
      if (opts?.excludeProject && (p.applied_on_projects ?? []).includes(opts.excludeProject)) continue
      const sim = triggerSimilarity(t.raw, p.trigger_key)
      if (sim < minSim) continue
      matches.push({
        pattern: p,
        similarity: sim,
        suggestion: formatSuggestion(p),
      })
    }
    matches.sort((a, b) => {
      // Score combiné : similarité + confiance
      const sa = a.similarity * 0.6 + a.pattern.confidence_score * 0.4
      const sb = b.similarity * 0.6 + b.pattern.confidence_score * 0.4
      return sb - sa
    })
    results[key] = matches.slice(0, 3)
  }

  return results
}

// ─── Feedback application pattern ────────────────────

export async function incrementPatternValidation(patternId: string, accepted: boolean): Promise<void> {
  if (isOfflineMode) {
    const key = 'atlas-signage-patterns-local'
    const all: SignagePattern[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const p = all.find(p => p.id === patternId)
    if (!p) return
    if (accepted) p.validation_count++
    else p.rejection_count++
    const total = p.validation_count + p.rejection_count
    p.confidence_score = Math.max(0.1, Math.min(0.99, p.validation_count / total))
    p.updated_at = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(all))
    return
  }

  const col = accepted ? 'validation_count' : 'rejection_count'
  await supabase.rpc('increment_pattern_counter', {
    pattern_id: patternId,
    column_name: col,
  }).catch(async () => {
    // Fallback : lecture + écriture manuelle si l'RPC n'existe pas
    const { data } = await supabase
      .from('signage_patterns')
      .select('validation_count, rejection_count')
      .eq('id', patternId)
      .single()
    if (!data) return
    const newVal = accepted ? (data.validation_count + 1) : data.validation_count
    const newRej = accepted ? data.rejection_count : (data.rejection_count + 1)
    await supabase
      .from('signage_patterns')
      .update({ validation_count: newVal, rejection_count: newRej })
      .eq('id', patternId)
  })
}

// ─── Formatage des suggestions ──────────────────────

function formatSuggestion(p: SignagePattern): string {
  const v = p.applied_value
  switch (p.pattern_type) {
    case 'label-correction':
      return `Renommer en « ${v.label ?? '(label)'} »`
    case 'category-correction':
      return `Catégorie → ${v.category ?? '(inconnue)'}`
    case 'layer-classification':
      return `Classer calque comme ${v.role ?? '(rôle)'}`
    case 'exclusion':
      return `Exclure du parcours (${v.reason ?? 'raison non précisée'})`
    case 'panel-placement':
      return `Emplacement ${v.kind ?? 'panneau'} validé sur ${p.applied_on_projects.length} projet(s)`
    default:
      return `Pattern ${p.pattern_type}`
  }
}

// ─── Stats ─────────────────────────────────────────

export interface MemoryStats {
  totalPatterns: number
  byType: Record<PatternType, number>
  averageConfidence: number
  mostUsed: SignagePattern[]
}

export async function getMemoryStats(): Promise<MemoryStats> {
  const loadAll = async (): Promise<SignagePattern[]> => {
    if (isOfflineMode) {
      return JSON.parse(localStorage.getItem('atlas-signage-patterns-local') ?? '[]')
    }
    const { data } = await supabase
      .from('signage_patterns')
      .select('*')
      .order('validation_count', { ascending: false })
      .limit(1000)
    return (data ?? []) as SignagePattern[]
  }
  const all = await loadAll()
  const byType: Record<PatternType, number> = {
    'label-correction': 0, 'category-correction': 0,
    'panel-placement': 0, 'layer-classification': 0, 'exclusion': 0,
  }
  let avgC = 0
  for (const p of all) {
    byType[p.pattern_type]++
    avgC += p.confidence_score
  }
  return {
    totalPatterns: all.length,
    byType,
    averageConfidence: all.length ? avgC / all.length : 0,
    mostUsed: all.slice(0, 10),
  }
}
