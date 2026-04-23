// ═══ RAG HELPER — Singleton + recherche citations sources réglementaires ═══
// Initialise le RAG une seule fois (seed ERP + benchmarks + réglementations CI)
// puis fournit findRelevantSources() pour récupérer des SourceCitation typées.

import type { SourceCitation } from './orchestrator.types'
import { openRagStore, type RagStore } from '../rag/ragEngine'

let storePromise: Promise<RagStore> | null = null
let seeded = false

async function getStore(): Promise<RagStore> {
  if (storePromise) return storePromise
  storePromise = openRagStore('proph3t-grounding')
  return storePromise
}

/** Idempotent : seed le RAG avec ERP + benchmarks + réglementations locales. */
export async function ensureRagSeeded(): Promise<void> {
  if (seeded) return
  try {
    const store = await getStore()
    const stats = await store.stats()
    if (stats.chunks > 0) { seeded = true; return } // déjà ingéré

    const { seedFromErpRules, seedFromBenchmarks } = await import('../rag/ragEngine')
    await seedFromErpRules(store)
    await seedFromBenchmarks(store)

    // Bonus : ingest réglementations locales CI
    try {
      const { CI_DATA_PROTECTION, CI_TAX_RULES, ABIDJAN_ZONING, SYSCOHADA_CLASSES } =
        await import('../benchmarks/localRegulations')
      const docs = [
        ...CI_DATA_PROTECTION.map(r => ({
          id: `cidp-${r.id}`,
          text: `${r.requirement}. Domaine : ${r.domain}. Référence : ${r.reference}.`,
          metadata: { source: 'CI Loi 2013-450', kind: 'data-protection', ruleId: r.id },
        })),
        ...CI_TAX_RULES.map(r => ({
          id: `citax-${r.id}`,
          text: `Taxe ${r.name} : ${r.rate}% sur ${r.base}, fréquence ${r.frequency}. Référence : ${r.reference}.`,
          metadata: { source: 'CGI Côte d\'Ivoire', kind: 'tax', ruleId: r.id },
        })),
        ...ABIDJAN_ZONING.map(z => ({
          id: `zone-${z.zone}`,
          text: `Zone ${z.zone} (${z.label}) : COS max ${z.maxCosInternal}, hauteur max ${z.maxHeight}m, parking ${z.parkingRatioPerSqm} pl/100m². Usages autorisés : ${z.allowedUses.join(', ')}. Restrictions : ${z.restrictions.join(' ; ')}.`,
          metadata: { source: 'Code urbanisme Abidjan', kind: 'zoning', zone: z.zone },
        })),
        ...SYSCOHADA_CLASSES.map(c => ({
          id: `syscohada-${c.classNum}`,
          text: `SYSCOHADA classe ${c.classNum} (${c.name}) — ${c.applies}. Sous-comptes : ${c.subAccounts.map(s => `${s.num} ${s.label}`).join('; ')}.`,
          metadata: { source: 'SYSCOHADA OHADA', kind: 'accounting', classNum: c.classNum },
        })),
      ]
      await store.ingest(docs)
      console.log(`[RAG] seeded ${docs.length} regulatory chunks (CI + SYSCOHADA + Abidjan zoning)`)
    } catch (err) {
      console.warn('[RAG] local regulations seed failed', err)
    }

    const finalStats = await store.stats()
    console.log(`[RAG] ready : ${finalStats.chunks} chunks · ${finalStats.vocab} tokens vocab`)
    seeded = true
  } catch (err) {
    console.warn('[RAG] seed failed, fallback to algo-only sources', err)
    seeded = true // évite retry infini
  }
}

/** Cherche des sources RAG pertinentes pour une requête textuelle.
 *  Retourne des SourceCitation prêtes à coller dans Proph3tFinding/Action. */
export async function findRelevantSources(
  query: string,
  topK = 3,
): Promise<SourceCitation[]> {
  try {
    await ensureRagSeeded()
    const store = await getStore()
    const hits = await store.search(query, topK)
    return hits.map(hit => {
      const meta = hit.chunk.metadata ?? {}
      const src = String(meta.source ?? 'RAG')
      const ruleId = String(meta.ruleId ?? meta.classNum ?? meta.zone ?? hit.chunk.id)
      return {
        id: hit.chunk.id,
        kind: 'rag' as const,
        label: `${src} · ${ruleId}`,
        reference: hit.chunk.text.slice(0, 140) + (hit.chunk.text.length > 140 ? '…' : ''),
      }
    })
  } catch (err) {
    console.warn('[RAG] search failed', err)
    return []
  }
}

// Cap dur pour éviter freeze main thread sur longs listes
const MAX_ENRICH_ITEMS = 8

/** Helper : enrichit chaque action avec des sources RAG basées sur son label.
 *  Parallèle + timeout 500ms global → non bloquant. Max 8 items pour perf. */
export async function enrichActionsWithRag<T extends { label: string; sources: SourceCitation[] }>(
  actions: T[],
  topKPerAction = 2,
): Promise<T[]> {
  if (actions.length === 0) return actions
  try {
    await Promise.race([
      ensureRagSeeded(),
      new Promise<void>((_, rej) => setTimeout(() => rej(new Error('rag seed timeout')), 2000)),
    ])
  } catch { return actions /* skip enrichment si seed trop lent */ }

  // Limite dure pour éviter freeze
  const toEnrich = actions.slice(0, MAX_ENRICH_ITEMS)
  const rest = actions.slice(MAX_ENRICH_ITEMS)

  // Parallèle avec timeout global 1s
  try {
    const results = await Promise.race([
      Promise.all(toEnrich.map(a => findRelevantSources(a.label, topKPerAction).catch(() => []))),
      new Promise<SourceCitation[][]>((_, rej) => setTimeout(() => rej(new Error('rag search timeout')), 1500)),
    ])
    const enriched = toEnrich.map((a, i) => ({ ...a, sources: [...a.sources, ...(results[i] ?? [])] }))
    return [...enriched, ...rest]
  } catch {
    return actions // timeout → retourne sans enrichissement
  }
}

/** Helper : enrichit chaque finding avec sources RAG. */
export async function enrichFindingsWithRag<T extends { title: string; description: string; sources: SourceCitation[] }>(
  findings: T[],
  topKPerFinding = 2,
): Promise<T[]> {
  if (findings.length === 0) return findings
  try {
    await Promise.race([
      ensureRagSeeded(),
      new Promise<void>((_, rej) => setTimeout(() => rej(new Error('rag seed timeout')), 2000)),
    ])
  } catch { return findings }

  const toEnrich = findings.slice(0, MAX_ENRICH_ITEMS)
  const rest = findings.slice(MAX_ENRICH_ITEMS)
  try {
    const results = await Promise.race([
      Promise.all(toEnrich.map(f => findRelevantSources(`${f.title} ${f.description}`, topKPerFinding).catch(() => []))),
      new Promise<SourceCitation[][]>((_, rej) => setTimeout(() => rej(new Error('rag search timeout')), 1500)),
    ])
    const enriched = toEnrich.map((f, i) => ({ ...f, sources: [...f.sources, ...(results[i] ?? [])] }))
    return [...enriched, ...rest]
  } catch {
    return findings
  }
}
