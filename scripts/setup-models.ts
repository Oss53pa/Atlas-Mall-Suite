// ═══ SETUP MODELS GLB — Upload assets photoréalistes vers Supabase ═══
//
// Usage :
//   export VITE_SUPABASE_URL=https://...
//   export SUPABASE_SERVICE_ROLE_KEY=eyJ...
//   npm run setup:models
//
// Le script télécharge des modèles GLB CC0 depuis des URLs configurables et
// les uploade dans le bucket `spatial-models`. Une fois fait, le user
// renseigne les URLs dans MaterialRegistry.modelUrl et les composants R3F
// (CarInstance, PalmInstance, TreeInstance) chargent les GLB via useGLTF.
//
// Sources CC0 recommandées :
//   • Quaternius (https://quaternius.com/) — packs cars, trees, urban
//   • Polyhaven Models (https://polyhaven.com/models) — qualité PBR
//   • Kenney (https://kenney.nl/assets/) — game-ready
//
// IMPORTANT : Polyhaven n'a pas d'URL directe de DL pour les .glb (ils
// servent en HTTP via leur catalogue). Pour ce script à blanc, on attend
// que l'utilisateur fournisse ses propres URLs CC0 dans MODELS_TO_UPLOAD.

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const BUCKET = 'spatial-models'
const TMP_DIR = './tmp/models'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // eslint-disable-next-line no-console
  console.error('[setup-models] VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) requis.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Catalogue à compléter ───────────────────────────────

interface ModelDef {
  /** Nom du fichier dans le bucket (slug). */
  readonly uploadName: string
  /** URL CC0 source (Quaternius, Polyhaven, etc.). */
  readonly sourceUrl: string
}

/**
 * À compléter avec les URLs des modèles CC0.
 * Pour les usages CarInstance/PalmInstance/TreeInstance, les noms attendus
 * matchent les MaterialRegistry.car_paint, .tree_palm, .tree_oak modelUrl.
 *
 * Exemples (à remplir avec de vraies URLs CC0) :
 *
 * { uploadName: 'car-sedan-low.glb',
 *   sourceUrl: 'https://example.com/car-sedan.glb' },
 * { uploadName: 'palm-tree-low.glb',
 *   sourceUrl: 'https://example.com/palm.glb' },
 * { uploadName: 'oak-tree-low.glb',
 *   sourceUrl: 'https://example.com/oak.glb' },
 */
const MODELS_TO_UPLOAD: ReadonlyArray<ModelDef> = [
  // À COMPLÉTER avec des URLs CC0 publiques.
]

// ─── Pipeline ────────────────────────────────────────────

async function downloadOne(m: ModelDef): Promise<Buffer> {
  const localPath = `${TMP_DIR}/${m.uploadName}`
  if (existsSync(localPath)) {
    // eslint-disable-next-line no-console
    console.log(`  [cache] ${m.uploadName}`)
    return readFileSync(localPath)
  }
  // eslint-disable-next-line no-console
  console.log(`  [DL]    ${m.uploadName}  ←  ${m.sourceUrl}`)
  const res = await fetch(m.sourceUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  mkdirSync(dirname(localPath), { recursive: true })
  writeFileSync(localPath, buf)
  return buf
}

async function uploadOne(m: ModelDef, buf: Buffer): Promise<void> {
  const { data: existing } = await supabase.storage.from(BUCKET).list('', { search: m.uploadName })
  if (existing?.some(o => o.name === m.uploadName)) {
    // eslint-disable-next-line no-console
    console.log(`  [skip]  ${m.uploadName} (déjà présent)`)
    return
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(m.uploadName, buf, {
      contentType: 'model/gltf-binary',
      upsert: true,
      cacheControl: '31536000',
    })
  if (error) throw new Error(error.message)
  // eslint-disable-next-line no-console
  console.log(`  [UP]    ${m.uploadName}`)
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[setup-models] Bucket: ${BUCKET}`)

  if (MODELS_TO_UPLOAD.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[setup-models] Aucun modèle configuré. Édite scripts/setup-models.ts ' +
      'pour ajouter des URLs CC0 dans MODELS_TO_UPLOAD.')
    process.exit(0)
  }

  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some(b => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`[setup-models] Échec création bucket : ${error.message}`)
      process.exit(1)
    }
  }

  let okCount = 0, errCount = 0
  for (const m of MODELS_TO_UPLOAD) {
    try {
      const buf = await downloadOne(m)
      await uploadOne(m, buf)
      okCount++
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`  [ERR]  ${m.uploadName} : ${(err as Error).message}`)
      errCount++
    }
  }

  // eslint-disable-next-line no-console
  console.log(`\n[setup-models] ✅ ${okCount} succès · ❌ ${errCount} erreurs`)
  // eslint-disable-next-line no-console
  console.log(`[setup-models] URLs : ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/<filename>`)
  // eslint-disable-next-line no-console
  console.log(`[setup-models] Renseigne ces URLs dans MaterialRegistry.ts comme \`modelUrl\` sur les MaterialDef appropriés.`)
  process.exit(errCount > 0 ? 1 : 0)
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('[setup-models] Erreur fatale:', err)
  process.exit(2)
})
