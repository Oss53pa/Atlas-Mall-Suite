// ═══ RAG ENGINE — Client-side retrieval augmented generation (M07) ═══
// Pas de Lancedb/BGE (nécessiterait backend) → implémentation BM25 pure-JS
// en IndexedDB via Dexie. Suffisant pour corpus < 10k chunks.
//
// Usage :
//   const rag = await openRagStore('cosmos-angre-kb')
//   await rag.ingest([{ id:'doc1', text:'...', metadata:{source:'apsad'} }])
//   const hits = await rag.search('couverture vidéo centre commercial', 5)

import Dexie, { type Table } from 'dexie'

export interface RagDocument {
  id: string
  text: string
  metadata?: Record<string, unknown>
}

export interface IndexedChunk {
  id: string
  docId: string
  text: string
  tokens: string[]
  tokenFreq: Record<string, number>
  length: number
  metadata?: Record<string, unknown>
}

export interface VocabEntry {
  token: string
  df: number // document frequency (nb chunks containing this token)
}

export interface RagSearchHit {
  chunk: IndexedChunk
  score: number
}

// ─── Tokenization (FR + EN) ───────────────────────────────

const STOPWORDS = new Set([
  'le','la','les','un','une','des','de','du','et','ou','a','à','au','aux','ce','ces','cette',
  'pour','par','sur','dans','en','avec','sans','est','sont','ete','être','etre','que','qui',
  'dont','ne','pas','plus','moins','tres','très','ses','son','sa','mon','ma','mes','ton','ta',
  'the','a','an','is','are','was','were','of','to','in','on','at','by','for','with','and','or',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // dé-accentue
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && t.length <= 30 && !STOPWORDS.has(t))
}

function chunkText(text: string, maxWords = 120): string[] {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return [text]
  const out: string[] = []
  for (let i = 0; i < words.length; i += maxWords) {
    out.push(words.slice(i, i + maxWords).join(' '))
  }
  return out
}

// ─── Dexie DB ──────────────────────────────────────────────

class RagDb extends Dexie {
  chunks!: Table<IndexedChunk, string>
  vocab!: Table<VocabEntry, string>

  constructor(name: string) {
    super(`cosmos-rag-${name}`)
    this.version(1).stores({
      chunks: 'id, docId',
      vocab: 'token',
    })
  }
}

// ─── Store API ─────────────────────────────────────────────

export interface RagStore {
  ingest(docs: RagDocument[]): Promise<{ chunks: number; tokens: number }>
  search(query: string, topK?: number): Promise<RagSearchHit[]>
  clear(): Promise<void>
  stats(): Promise<{ chunks: number; vocab: number; totalLength: number }>
}

export async function openRagStore(name = 'default'): Promise<RagStore> {
  const db = new RagDb(name)
  await db.open()

  return {
    async ingest(docs) {
      let tokenCount = 0
      const chunks: IndexedChunk[] = []
      for (const doc of docs) {
        const parts = chunkText(doc.text)
        for (let i = 0; i < parts.length; i++) {
          const tokens = tokenize(parts[i])
          const tokenFreq: Record<string, number> = {}
          for (const t of tokens) tokenFreq[t] = (tokenFreq[t] ?? 0) + 1
          tokenCount += tokens.length
          chunks.push({
            id: `${doc.id}#${i}`,
            docId: doc.id,
            text: parts[i],
            tokens,
            tokenFreq,
            length: tokens.length,
            metadata: doc.metadata,
          })
        }
      }
      await db.chunks.bulkPut(chunks)

      // Update vocabulary (document frequency per token)
      const dfDelta = new Map<string, number>()
      for (const c of chunks) {
        for (const t of Object.keys(c.tokenFreq)) {
          dfDelta.set(t, (dfDelta.get(t) ?? 0) + 1)
        }
      }
      const tokens = Array.from(dfDelta.keys())
      const existing = await db.vocab.bulkGet(tokens)
      const updates: VocabEntry[] = tokens.map((token, i) => ({
        token,
        df: (existing[i]?.df ?? 0) + (dfDelta.get(token) ?? 0),
      }))
      await db.vocab.bulkPut(updates)

      return { chunks: chunks.length, tokens: tokenCount }
    },

    async search(query, topK = 5) {
      const qTokens = tokenize(query)
      if (qTokens.length === 0) return []
      const n = await db.chunks.count()
      if (n === 0) return []

      const vocabEntries = await db.vocab.bulkGet(qTokens)
      const idf = new Map<string, number>()
      for (let i = 0; i < qTokens.length; i++) {
        const df = vocabEntries[i]?.df ?? 1
        idf.set(qTokens[i], Math.log(1 + (n - df + 0.5) / (df + 0.5)))
      }

      // Avg doc length for BM25 normalization
      const allChunks = await db.chunks.toArray()
      const avgLen = allChunks.reduce((s, c) => s + c.length, 0) / allChunks.length
      const k1 = 1.5, b = 0.75

      const scored: RagSearchHit[] = []
      for (const c of allChunks) {
        let score = 0
        for (const t of qTokens) {
          const tf = c.tokenFreq[t] ?? 0
          if (tf === 0) continue
          const numerator = tf * (k1 + 1)
          const denominator = tf + k1 * (1 - b + (b * c.length) / avgLen)
          score += (idf.get(t) ?? 0) * (numerator / denominator)
        }
        if (score > 0) scored.push({ chunk: c, score })
      }
      scored.sort((a, b) => b.score - a.score)
      return scored.slice(0, topK)
    },

    async clear() {
      await db.chunks.clear()
      await db.vocab.clear()
    },

    async stats() {
      const chunks = await db.chunks.count()
      const vocab = await db.vocab.count()
      const all = await db.chunks.toArray()
      const totalLength = all.reduce((s, c) => s + c.length, 0)
      return { chunks, vocab, totalLength }
    },
  }
}

// ─── Helper : seed depuis les règles ERP ───────────────────

export async function seedFromErpRules(store: RagStore): Promise<void> {
  const { ERP_RULES } = await import('../benchmarks/erpRegulations')
  const docs: RagDocument[] = ERP_RULES.map(r => ({
    id: `erp-${r.id}`,
    text: `${r.title}. ${r.description}. Référence : ${r.reference}. Gravité : ${r.severity}. Scope : ${r.scope}.`,
    metadata: { source: 'erp-ci-2019', ruleId: r.id, severity: r.severity },
  }))
  await store.ingest(docs)
}

export async function seedFromBenchmarks(store: RagStore): Promise<void> {
  const { WEST_AFRICA_BENCHMARKS } = await import('../benchmarks/africanRetail')
  const docs: RagDocument[] = WEST_AFRICA_BENCHMARKS.map((b, i) => ({
    id: `bench-${i}`,
    text: `Benchmark ${b.metric} en ${b.region} : médiane ${b.median} ${b.unit} (Q25: ${b.q25 ?? '?'}, Q75: ${b.q75 ?? '?'}). ${b.note ?? ''}`,
    metadata: { source: 'west-africa-retail-2024', metric: b.metric, region: b.region },
  }))
  await store.ingest(docs)
}
