// ═══ VOL.4 WAYFINDER — SEARCH ENGINE ═══
//
// Moteur de recherche full-text léger (pas de dépendance externe type Lunr)
// indexant le catalogue complet du mall : enseignes, catégories, lots,
// POI, sanitaires, ascenseurs…
//
// Caractéristiques :
//   • Recherche par préfixe + substring
//   • Tolérance aux fautes : distance de Levenshtein ≤ 2
//   • Filtres : catégorie, étage, ouvert-maintenant, distance max
//   • Tri par pertinence (score TF-idf simplifié) ou par distance réelle A*

// ─── Types ──────────────────────────────────────────────

export interface SearchableItem {
  id: string
  /** Libellé principal (nom enseigne, POI…). */
  label: string
  /** Catégorie (mode, restauration, loisirs, services, sanitaires, parking…). */
  category: string
  /** Tags / synonymes pour enrichir la recherche. */
  tags: string[]
  /** Numéro de lot ou référence. */
  reference?: string
  /** Étage. */
  floorId: string
  floorLabel?: string
  /** Position en mètres. */
  x: number
  y: number
  /** Horaires d'ouverture (ex: "10:00-22:00"). */
  hours?: string
  /** Statut commercial (Vol.1). */
  status?: 'open' | 'closed' | 'vacant' | 'works'
  /** Score intrinsèque (pour tri secondaire). */
  score?: number
  /** Icône ou catégorie visuelle. */
  icon?: string
}

export interface SearchQuery {
  q: string
  /** Catégories autorisées (vide = toutes). */
  categories?: string[]
  floorId?: string
  openNow?: boolean
  /** Filtre de distance réelle A* (nécessite callback). */
  maxDistanceM?: number
  /** Callback de calcul de distance A* depuis la position courante. */
  distanceFn?: (itemId: string) => number | null
  limit?: number
}

export interface SearchResult {
  item: SearchableItem
  score: number
  distanceM: number | null
  highlight: string
}

// ─── Index ──────────────────────────────────────────────

export interface SearchIndex {
  items: SearchableItem[]
  /** Index inversé : token → Set(itemId). */
  tokenIndex: Map<string, Set<string>>
  /** Tailles de documents pour normalisation. */
  docLengths: Map<string, number>
}

/** Tokenize + normalise (minuscules, accents, ponctuation, pluriels simples). */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // suppression diacritiques
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2)
}

export function buildSearchIndex(items: SearchableItem[]): SearchIndex {
  const tokenIndex = new Map<string, Set<string>>()
  const docLengths = new Map<string, number>()

  for (const it of items) {
    const fields = [
      it.label,
      it.category,
      ...it.tags,
      it.reference ?? '',
      it.floorLabel ?? '',
    ].join(' ')
    const tokens = tokenize(fields)
    docLengths.set(it.id, tokens.length)
    for (const t of tokens) {
      // Indexer aussi les préfixes (de 2 à 5 caractères) pour autocompletion
      for (let k = 2; k <= Math.min(5, t.length); k++) {
        const prefix = t.slice(0, k)
        let set = tokenIndex.get(prefix)
        if (!set) { set = new Set(); tokenIndex.set(prefix, set) }
        set.add(it.id)
      }
      // Token complet
      let set = tokenIndex.get(t)
      if (!set) { set = new Set(); tokenIndex.set(t, set) }
      set.add(it.id)
    }
  }

  return { items, tokenIndex, docLengths }
}

// ─── Distance de Levenshtein (tolérance fautes) ──────────

function levenshtein(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const la = a.length, lb = b.length
  if (la === 0) return lb
  if (lb === 0) return la
  const prev = new Array(lb + 1)
  const cur = new Array(lb + 1)
  for (let j = 0; j <= lb; j++) prev[j] = j
  for (let i = 1; i <= la; i++) {
    cur[0] = i
    let rowMin = cur[0]
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin > max) return max + 1
    for (let j = 0; j <= lb; j++) prev[j] = cur[j]
  }
  return prev[lb]
}

// ─── Recherche ──────────────────────────────────────────

export function search(index: SearchIndex, query: SearchQuery): SearchResult[] {
  const q = query.q.trim()
  const limit = query.limit ?? 30
  const tokens = tokenize(q)

  // Si aucun token → retourner filtres seuls (ex: "tout ouvert maintenant")
  const candidateIds = new Set<string>()
  if (tokens.length === 0) {
    for (const it of index.items) candidateIds.add(it.id)
  } else {
    // Union des documents matchant au moins un token
    for (const t of tokens) {
      // Match exact ou préfixe
      const exact = index.tokenIndex.get(t)
      if (exact) for (const id of exact) candidateIds.add(id)

      // Recherche tolérante (Levenshtein ≤ 2) si aucun match exact pour ce token
      if (!exact) {
        for (const [term, ids] of index.tokenIndex) {
          if (levenshtein(t, term, 2) <= 2) {
            for (const id of ids) candidateIds.add(id)
          }
        }
      }
    }
  }

  // Scoring
  const results: SearchResult[] = []
  for (const id of candidateIds) {
    const item = index.items.find(i => i.id === id)
    if (!item) continue

    // Filtres
    if (query.categories && query.categories.length > 0 &&
        !query.categories.includes(item.category)) continue
    if (query.floorId && item.floorId !== query.floorId) continue
    if (query.openNow && item.status && item.status !== 'open') continue

    const distanceM = query.distanceFn ? query.distanceFn(item.id) : null
    if (query.maxDistanceM != null && distanceM != null && distanceM > query.maxDistanceM) continue

    // Score : nombre de tokens matchés × bonus label exact × bonus ouvert × pénalité distance
    let score = 0
    const labelTokens = new Set(tokenize(item.label))
    for (const t of tokens) {
      if (labelTokens.has(t)) score += 3
      else if (item.tags.some(tag => tokenize(tag).includes(t))) score += 2
      else score += 1
    }
    if (item.status === 'open') score += 0.5
    if (item.score) score += item.score * 0.3
    if (distanceM != null) score -= Math.min(1.5, distanceM / 200)

    results.push({
      item, score, distanceM,
      highlight: makeHighlight(item.label, tokens),
    })
  }

  // Tri : par distance si fourni, sinon par score
  if (query.distanceFn) {
    results.sort((a, b) => {
      const da = a.distanceM ?? Infinity
      const db = b.distanceM ?? Infinity
      if (Math.abs(da - db) < 5) return b.score - a.score // égalité → score
      return da - db
    })
  } else {
    results.sort((a, b) => b.score - a.score)
  }

  return results.slice(0, limit)
}

function makeHighlight(label: string, tokens: string[]): string {
  if (tokens.length === 0) return label
  let out = label
  for (const t of tokens) {
    const re = new RegExp(`(${escapeRegex(t)})`, 'gi')
    out = out.replace(re, '〘$1〙')
  }
  return out
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Suggestions contextuelles ──────────────────────────

export interface ContextualSuggestionsInput {
  index: SearchIndex
  currentPosition: { x: number; y: number; floorId: string }
  distanceFn: (itemId: string) => number | null
  categories?: string[]
  maxItemsPerCategory?: number
}

export interface ContextualSuggestionGroup {
  category: string
  label: string
  icon: string
  items: SearchResult[]
}

/** Produit les suggestions "à moins de X minutes de vous". */
export function contextualSuggestions(input: ContextualSuggestionsInput): ContextualSuggestionGroup[] {
  const categories = input.categories ?? [
    'restauration', 'mode', 'loisirs', 'services', 'sanitaires',
  ]
  const maxPer = input.maxItemsPerCategory ?? 5

  const groups: ContextualSuggestionGroup[] = []
  for (const cat of categories) {
    const results = search(input.index, {
      q: '',
      categories: [cat],
      distanceFn: input.distanceFn,
      limit: maxPer,
    })
    if (results.length > 0) {
      groups.push({
        category: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        icon: categoryIcon(cat),
        items: results,
      })
    }
  }
  return groups
}

function categoryIcon(cat: string): string {
  switch (cat.toLowerCase()) {
    case 'restauration': return '🍽️'
    case 'mode': return '👕'
    case 'loisirs': return '🎬'
    case 'services': return '🛎️'
    case 'sanitaires': return '🚻'
    case 'parking': return '🅿️'
    default: return '📍'
  }
}
