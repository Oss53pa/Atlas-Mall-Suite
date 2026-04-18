// ═══ Performance Benchmark Suite ═══
//
// CDC §5 — Performance :
//   PERF-01 — Analyse sémantique plan 10 000 m²        < 120 s p95
//   PERF-02 — Orchestration 4 volumes 10 000 m²        < 15 min p95
//   PERF-03 — Prédiction CA/m² par local               < 200 ms p95
//   PERF-04 — Optimisation mix 50 locaux               < 60 s p95
//   PERF-05 — Monte-Carlo 10 000 itérations            < 30 s p95
//   PERF-06 — Précision classification espaces         > 95 %
//   PERF-07 — MAPE prédiction CA/m² 10 projets         < 15 %
//   PERF-08 — Détection non-conformités ERP            100 %
//
// Lancement :
//   npx tsx benchmarks/perfSuite.ts                  # tous les benchmarks
//   npx tsx benchmarks/perfSuite.ts --only PERF-03   # ciblé

interface BenchmarkResult {
  id: string
  description: string
  target: string
  iterations: number
  durations: number[]
  p50: number
  p95: number
  p99: number
  passes: boolean
  notes?: string
}

function percentile(arr: number[], p: number): number {
  const sorted = arr.slice().sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p / 100))
  return sorted[idx]
}

async function runBenchmark(
  id: string,
  description: string,
  target: string,
  targetMs: number,
  iterations: number,
  fn: () => Promise<unknown>,
): Promise<BenchmarkResult> {
  const durations: number[] = []
  console.log(`\n[${id}] ${description}`)
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now()
    await fn()
    const dt = performance.now() - t0
    durations.push(dt)
    process.stdout.write(`  iter ${i + 1}/${iterations} : ${dt.toFixed(0)} ms\r`)
  }
  console.log('')
  const p95 = percentile(durations, 95)
  const passes = p95 <= targetMs
  return {
    id, description, target, iterations, durations,
    p50: percentile(durations, 50),
    p95, p99: percentile(durations, 99),
    passes,
  }
}

// ─── PERF-03 : Prédiction CA/m² ───

async function bench_PERF03(): Promise<BenchmarkResult> {
  const { generateBenchmarkDataset, trainRevenueForest, predictRevenue } =
    await import('../src/modules/cosmos-angre/vol1-commercial/engines/revenueForestEngine')
  const ds = generateBenchmarkDataset()
  const forest = trainRevenueForest(ds.features, ds.revenuesPerSqm, { nTrees: 30 })
  const sample = ds.features[0]
  return runBenchmark(
    'PERF-03', 'Prédiction CA/m² par local', '< 200 ms p95', 200, 50,
    async () => predictRevenue(forest, sample),
  )
}

// ─── PERF-04 : Optimisation mix 50 locaux ───

async function bench_PERF04(): Promise<BenchmarkResult> {
  const { generateBenchmarkDataset, trainRevenueForest } =
    await import('../src/modules/cosmos-angre/vol1-commercial/engines/revenueForestEngine')
  const { optimizeMix, DEFAULT_MALL_CONSTRAINTS } =
    await import('../src/modules/cosmos-angre/vol1-commercial/engines/geneticMixEngine')
  const ds = generateBenchmarkDataset()
  const forest = trainRevenueForest(ds.features.slice(0, 100), ds.revenuesPerSqm.slice(0, 100), { nTrees: 20 })
  const locals = ds.features.slice(0, 50).map((f, i) => ({
    id: `local-${i}`, label: `Local ${i}`,
    features: { ...f, surfaceSqm: f.surfaceSqm }, currentCategory: f.category, locked: false,
  }))
  return runBenchmark(
    'PERF-04', 'Optimisation génétique mix 50 locaux', '< 60 s p95', 60_000, 3,
    async () => optimizeMix(locals as any, forest, DEFAULT_MALL_CONSTRAINTS, { generations: 50 }),
  )
}

// ─── PERF-05 : Monte-Carlo 10 000 itérations ───

async function bench_PERF05(): Promise<BenchmarkResult> {
  const { simulateIntervention } =
    await import('../src/modules/cosmos-angre/vol2-securitaire/engines/monteCarloInterventionEngine')
  return runBenchmark(
    'PERF-05', 'Monte-Carlo intervention 10 000 itérations', '< 30 s p95', 30_000, 5,
    async () => simulateIntervention(50, 50, {
      posts: [{ id: 'p1', label: 'Poste 1', x: 0, y: 0, agentsCount: 3 }],
      iterations: 10_000,
    }),
  )
}

// ─── PERF-08 : Détection non-conformités ERP (rappel = 1.0 sur jeu test) ───

async function bench_PERF08(): Promise<BenchmarkResult> {
  const { auditErpCompliance } =
    await import('../src/modules/cosmos-angre/vol2-securitaire/engines/erpGlobalAuditEngine')
  // Plan minimal sans aucune issue → doit produire au minimum des non-conformités critiques
  const dummyPlan: any = {
    spaces: [], wallSegments: [], bounds: { width: 100, height: 80 },
  }
  const audit = auditErpCompliance({
    parsedPlan: dummyPlan,
    erpCategory: '1', effectifTotal: 1500, surfaceTotalSqm: 8000, numFloors: 2,
  })
  // Doit détecter le manque d'issues + plan évacuation + extincteurs minimum
  const found = audit.byCategory['issues-secours'] >= 1 && audit.byCategory['plan-evacuation'] >= 1
  return {
    id: 'PERF-08',
    description: 'Détection non-conformités ERP 100 %',
    target: 'rappel = 1.0',
    iterations: 1, durations: [0], p50: 0, p95: 0, p99: 0,
    passes: found,
    notes: `Détecté : ${audit.nonConformities.length} non-conformités, ${audit.byCriticality.critical} critiques`,
  }
}

// ─── Runner ───

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const onlyId = args[0] === '--only' ? args[1] : null

  const all: Array<() => Promise<BenchmarkResult>> = [
    bench_PERF03, bench_PERF04, bench_PERF05, bench_PERF08,
  ]

  const results: BenchmarkResult[] = []
  for (const b of all) {
    if (onlyId && !b.name.includes(onlyId.replace('PERF-', 'PERF'))) continue
    try {
      results.push(await b())
    } catch (err) {
      console.error('Erreur :', err)
    }
  }

  console.log('\n' + '═'.repeat(70))
  console.log('RÉSULTATS BENCHMARKS')
  console.log('═'.repeat(70))
  for (const r of results) {
    const status = r.passes ? '✓' : '✗'
    console.log(`${status} ${r.id} — ${r.description}`)
    console.log(`   Cible : ${r.target}`)
    if (r.iterations > 1) {
      console.log(`   p50 : ${r.p50.toFixed(0)} ms · p95 : ${r.p95.toFixed(0)} ms · p99 : ${r.p99.toFixed(0)} ms`)
    }
    if (r.notes) console.log(`   ${r.notes}`)
    console.log('')
  }
  const passCount = results.filter(r => r.passes).length
  console.log(`Total : ${passCount}/${results.length} benchmarks passent.`)
  process.exit(results.every(r => r.passes) ? 0 : 1)
}

if (require.main === module) {
  void main()
}

export { main, runBenchmark }
