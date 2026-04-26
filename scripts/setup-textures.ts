// ═══ SETUP TEXTURES — Download Polyhaven + Upload Supabase Storage ═══
//
// Usage :
//   npm run setup:textures
//
// Pre-requis :
//   • Variables d'environnement :
//       VITE_SUPABASE_URL=https://<project>.supabase.co
//       SUPABASE_SERVICE_ROLE_KEY=eyJ...   (ou SUPABASE_ANON_KEY si bucket public)
//   • Le bucket `spatial-textures` doit exister (Supabase Dashboard → Storage)
//   • Node 18+ (fetch natif)
//
// Le script télécharge 8 textures CC0 de Polyhaven (tailles 1K), puis les
// uploade dans le bucket `spatial-textures`. Idempotent : skip si le fichier
// existe déjà.
//
// Les noms d'upload matchent exactement ce qu'attend MaterialRegistry.ts.

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'

// ─── Config ───────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const BUCKET = 'spatial-textures'
const TMP_DIR = './tmp/textures'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // eslint-disable-next-line no-console
  console.error('[setup-textures] ERREUR : VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY) requis.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Catalogue Polyhaven (CC0) ────────────────────────────

interface TextureDef {
  /** Nom de fichier final dans le bucket (matche MaterialRegistry). */
  readonly uploadName: string
  /** URL CC0 Polyhaven. */
  readonly sourceUrl: string
  /** MIME type. */
  readonly contentType: string
}

const TEXTURES: ReadonlyArray<TextureDef> = [
  // ─── Sols / surfaces ────────────────────────────────────
  {
    uploadName: 'asphalt_diffuse_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_02/asphalt_02_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
  {
    uploadName: 'asphalt_marked_diffuse_1k.jpg',
    // Pas de "asphalt marked" exact sur Polyhaven → on prend asphalt cracked
    // (visuel proche pour parking lignes blanches superposées en runtime)
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_03/asphalt_03_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
  {
    uploadName: 'paved_stone_diffuse_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/cobblestone_floor_06/cobblestone_floor_06_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
  {
    uploadName: 'grass_diffuse_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/grass_field_02/grass_field_02_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
  {
    uploadName: 'floor_tile_ceramic_diffuse_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/marble_01/marble_01_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
  {
    uploadName: 'parquet_diffuse_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_floor_deck/wood_floor_deck_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
  // ─── Murs ───────────────────────────────────────────────
  {
    uploadName: 'concrete_wall_diffuse_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/painted_concrete_wall/painted_concrete_wall_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
  {
    uploadName: 'concrete_wall_normal_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/painted_concrete_wall/painted_concrete_wall_nor_gl_1k.jpg',
    contentType: 'image/jpeg',
  },
  {
    uploadName: 'facade_stone_diffuse_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/medieval_blocks_05/medieval_blocks_05_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
  // ─── Bois (portes) ──────────────────────────────────────
  {
    uploadName: 'door_wood_diffuse_1k.jpg',
    sourceUrl: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks_02/wood_planks_02_diff_1k.jpg',
    contentType: 'image/jpeg',
  },
]

// ─── Steps ────────────────────────────────────────────────

async function downloadOne(t: TextureDef): Promise<Buffer> {
  const localPath = `${TMP_DIR}/${t.uploadName}`
  if (existsSync(localPath)) {
    // eslint-disable-next-line no-console
    console.log(`  [cache] ${t.uploadName}`)
    return readFileSync(localPath)
  }
  // eslint-disable-next-line no-console
  console.log(`  [DL]    ${t.uploadName}  ←  ${t.sourceUrl}`)
  const res = await fetch(t.sourceUrl)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} sur ${t.sourceUrl}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  mkdirSync(dirname(localPath), { recursive: true })
  writeFileSync(localPath, buf)
  return buf
}

async function uploadOne(t: TextureDef, buf: Buffer): Promise<void> {
  // Vérifie si déjà présent dans le bucket
  const { data: existing } = await supabase.storage.from(BUCKET).list('', { search: t.uploadName })
  const found = existing?.find(o => o.name === t.uploadName)
  if (found) {
    // eslint-disable-next-line no-console
    console.log(`  [skip]  ${t.uploadName} (déjà dans le bucket)`)
    return
  }
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(t.uploadName, buf, {
      contentType: t.contentType,
      upsert: true,
      cacheControl: '31536000', // 1 an
    })
  if (error) throw new Error(`Upload ${t.uploadName} : ${error.message}`)
  // eslint-disable-next-line no-console
  console.log(`  [UP]    ${t.uploadName}`)
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[setup-textures] Bucket: ${BUCKET} sur ${SUPABASE_URL}`)
  // eslint-disable-next-line no-console
  console.log(`[setup-textures] ${TEXTURES.length} textures à traiter`)

  // 1. Vérifie / crée le bucket
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BUCKET)
  if (!bucketExists) {
    // eslint-disable-next-line no-console
    console.log(`[setup-textures] Création bucket ${BUCKET} (public)...`)
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`[setup-textures] Échec création bucket : ${error.message}`)
      // eslint-disable-next-line no-console
      console.error('Crée-le manuellement dans Supabase Dashboard → Storage → New bucket.')
      process.exit(1)
    }
  }

  // 2. Pour chaque texture : download puis upload
  let okCount = 0, errCount = 0
  for (const t of TEXTURES) {
    try {
      const buf = await downloadOne(t)
      await uploadOne(t, buf)
      okCount++
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`  [ERR]   ${t.uploadName} : ${(err as Error).message}`)
      errCount++
    }
  }

  // eslint-disable-next-line no-console
  console.log(`\n[setup-textures] ✅ ${okCount} succès · ❌ ${errCount} erreurs`)
  // eslint-disable-next-line no-console
  console.log(`[setup-textures] URLs accessibles à : ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/<filename>`)
  process.exit(errCount > 0 ? 1 : 0)
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('[setup-textures] Erreur fatale:', err)
  process.exit(2)
})
