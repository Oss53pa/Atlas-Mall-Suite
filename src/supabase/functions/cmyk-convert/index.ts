// ═══ Edge Function : cmyk-convert ═══
//
// Conversion sRGB → CMJN d'un PDF généré par jsPDF (sortie sRGB native).
// Référence CDC §07 + remarque limites Wayfinder Designer.
//
// Stratégie : Deno n'a pas Ghostscript natif. On délègue au choix :
//
//   1. **Ghostscript Cloud Run** (préféré, contrôle total)
//      Variable env : GHOSTSCRIPT_SERVICE_URL = https://gs.atlas-mall.ci/convert
//      Le service est un container Docker `ghostscript:latest` exposant
//      POST /convert (multipart PDF) → PDF/X-1a CMJN
//
//   2. **CloudConvert API** (fallback SaaS)
//      Variable env : CLOUDCONVERT_API_KEY = sk_xxx
//      → engine `pdfjet` ou `qpdf` avec preset CMYK
//
//   3. **ConvertAPI** (autre fallback SaaS)
//      Variable env : CONVERTAPI_SECRET = xxx
//      → /convert/pdf/to/pdf?ColorSpace=cmyk
//
// Si aucune n'est configurée → renvoie 501 + instructions à l'utilisateur.

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173,http://localhost:3000').split(',')

function getCors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-key, content-type',
    'Vary': 'Origin',
  }
}

interface ConvertRequest {
  pdfBase64: string         // PDF source en base64
  preset?: 'PDFX-1a' | 'PDFX-3' | 'CMYK-coated' | 'CMYK-uncoated'
  /** Détecte automatiquement le profil ICC à appliquer. */
  iccProfile?: 'ISOcoated_v2_300' | 'ISOuncoated' | 'JapanColor2001'
  fileName?: string
}

interface ConvertResponse {
  success: boolean
  pdfBase64?: string
  mimeType?: 'application/pdf'
  bytes?: number
  engine?: string
  durationMs?: number
  warnings?: string[]
  error?: string
  /** Instructions pour activer le service. */
  setupHelp?: string
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = getCors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return json({ success: false, error: 'POST only' }, 405, cors)
  }

  let body: ConvertRequest
  try {
    body = await req.json()
  } catch {
    return json({ success: false, error: 'JSON invalide' }, 400, cors)
  }

  if (!body.pdfBase64 || typeof body.pdfBase64 !== 'string') {
    return json({ success: false, error: 'pdfBase64 manquant' }, 400, cors)
  }

  const pdfBytes = base64ToBytes(body.pdfBase64.replace(/^data:application\/pdf;base64,/, ''))
  if (pdfBytes.length > 50 * 1024 * 1024) {
    return json({ success: false, error: 'PDF trop volumineux (max 50 Mo)' }, 413, cors)
  }

  const t0 = Date.now()
  const preset = body.preset ?? 'PDFX-1a'
  const profile = body.iccProfile ?? 'ISOcoated_v2_300'

  // ─── Tentative 1 : Cloud Run Ghostscript ───
  const gsUrl = Deno.env.get('GHOSTSCRIPT_SERVICE_URL')
  if (gsUrl) {
    try {
      const result = await convertViaGhostscript(gsUrl, pdfBytes, preset, profile)
      return json({
        success: true,
        pdfBase64: bytesToBase64(result),
        mimeType: 'application/pdf',
        bytes: result.length,
        engine: 'ghostscript-cloud-run',
        durationMs: Date.now() - t0,
      }, 200, cors)
    } catch (err) {
      console.warn('Ghostscript service échec :', err)
      // continue avec fallback
    }
  }

  // ─── Tentative 2 : CloudConvert ───
  const ccKey = Deno.env.get('CLOUDCONVERT_API_KEY')
  if (ccKey) {
    try {
      const result = await convertViaCloudConvert(ccKey, pdfBytes, body.fileName ?? 'doc.pdf')
      return json({
        success: true,
        pdfBase64: bytesToBase64(result),
        mimeType: 'application/pdf',
        bytes: result.length,
        engine: 'cloudconvert',
        durationMs: Date.now() - t0,
        warnings: ['Conversion via CloudConvert (service externe payant) — vérifier le quota.'],
      }, 200, cors)
    } catch (err) {
      console.warn('CloudConvert échec :', err)
    }
  }

  // ─── Tentative 3 : ConvertAPI ───
  const caSecret = Deno.env.get('CONVERTAPI_SECRET')
  if (caSecret) {
    try {
      const result = await convertViaConvertAPI(caSecret, pdfBytes)
      return json({
        success: true,
        pdfBase64: bytesToBase64(result),
        mimeType: 'application/pdf',
        bytes: result.length,
        engine: 'convertapi',
        durationMs: Date.now() - t0,
      }, 200, cors)
    } catch (err) {
      console.warn('ConvertAPI échec :', err)
    }
  }

  // ─── Aucun backend configuré ───
  return json({
    success: false,
    error: 'Aucun backend CMJN configuré sur cette instance Supabase.',
    setupHelp: [
      'Pour activer la conversion sRGB → CMJN, configurer une de ces variables d\'environnement :',
      '  • GHOSTSCRIPT_SERVICE_URL — préféré, contrôle total (déployer un container ghostscript:latest)',
      '  • CLOUDCONVERT_API_KEY — fallback SaaS (https://cloudconvert.com)',
      '  • CONVERTAPI_SECRET — fallback SaaS (https://www.convertapi.com)',
      '',
      'Setup Cloud Run minimal :',
      '  Dockerfile :',
      '    FROM debian:bookworm-slim',
      '    RUN apt-get update && apt-get install -y ghostscript',
      '    COPY server.sh /server.sh',
      '    EXPOSE 8080',
      '    CMD ["/server.sh"]',
      '',
      'En attendant, le PDF reste en sRGB (compatible impression standard, pas pré-presse).',
    ].join('\n'),
  }, 501, cors)
})

// ─── Backends ─────────────────────────────────

async function convertViaGhostscript(
  serviceUrl: string,
  pdfBytes: Uint8Array,
  preset: string,
  iccProfile: string,
): Promise<Uint8Array> {
  const form = new FormData()
  form.append('preset', preset)
  form.append('icc_profile', iccProfile)
  form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'input.pdf')

  const res = await fetch(`${serviceUrl}/convert`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`Ghostscript HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

async function convertViaCloudConvert(
  apiKey: string,
  pdfBytes: Uint8Array,
  fileName: string,
): Promise<Uint8Array> {
  // 1. Créer le job
  const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tasks: {
        'import-pdf': { operation: 'import/upload' },
        'convert-cmyk': {
          operation: 'convert',
          input: 'import-pdf',
          input_format: 'pdf',
          output_format: 'pdf',
          options: { color_space: 'cmyk', preset: 'pdfx1a' },
        },
        'export-pdf': { operation: 'export/url', input: 'convert-cmyk' },
      },
    }),
  })
  if (!jobRes.ok) throw new Error(`CloudConvert job HTTP ${jobRes.status}`)
  const job = await jobRes.json()

  // 2. Upload le fichier
  const uploadTask = job.data.tasks.find((t: { name: string }) => t.name === 'import-pdf')
  const uploadForm = new FormData()
  for (const [key, value] of Object.entries(uploadTask.result.form.parameters)) {
    uploadForm.append(key, value as string)
  }
  uploadForm.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), fileName)
  await fetch(uploadTask.result.form.url, { method: 'POST', body: uploadForm })

  // 3. Polling job complétion (timeout 90s)
  const jobId = job.data.id
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const statusData = await statusRes.json()
    if (statusData.data.status === 'finished') {
      const exportTask = statusData.data.tasks.find((t: { name: string }) => t.name === 'export-pdf')
      const fileUrl = exportTask.result.files[0].url
      const finalRes = await fetch(fileUrl)
      return new Uint8Array(await finalRes.arrayBuffer())
    }
    if (statusData.data.status === 'error') {
      throw new Error('CloudConvert job échec')
    }
  }
  throw new Error('CloudConvert timeout')
}

async function convertViaConvertAPI(secret: string, pdfBytes: Uint8Array): Promise<Uint8Array> {
  const form = new FormData()
  form.append('File', new Blob([pdfBytes], { type: 'application/pdf' }), 'input.pdf')
  form.append('ColorSpace', 'CMYK')
  const res = await fetch(`https://v2.convertapi.com/convert/pdf/to/pdf?Secret=${secret}`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) throw new Error(`ConvertAPI HTTP ${res.status}`)
  const data = await res.json()
  const fileUrl = data.Files[0].Url
  const finalRes = await fetch(fileUrl)
  return new Uint8Array(await finalRes.arrayBuffer())
}

// ─── Helpers ──────────────────────────────────

function json<T>(body: T, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}
