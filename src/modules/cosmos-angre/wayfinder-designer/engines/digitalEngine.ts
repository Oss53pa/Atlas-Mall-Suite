// ═══ digitalEngine — exports HTML autonome / bundle borne / static site ═══
//
// Référence CDC §06.
// 4 sortes d'exports digitaux :
//   - html-single-file : HTML auto-contenu < 5 Mo
//   - bundle-zip : dossier déployable index.html + assets + sw.js (PWA offline)
//   - static-site : Vite SSG prêt Netlify/Vercel/S3
//   - qr-svg / qr-png : QR code (URL configurable + UTM optionnels)
//   - manifest-json : config borne
//
// Pas de Puppeteer côté client — rendu fait via renderToStaticMarkup React.

import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type {
  DesignerConfig, ExportOptions, ExportResult,
  InjectedPlanData, Template,
} from '../types'
import { generateCssVariables } from './brandEngine'

// ─── HTML autonome (single file) ───────────────

export interface HtmlBundleOptions extends ExportOptions {
  template: Template
  planData: InjectedPlanData
  /** Inclure runtime borne JS interactif (search + clavier). Default false. */
  includeKioskRuntime?: boolean
}

export async function exportHtmlSingleFile(
  config: DesignerConfig,
  opts: HtmlBundleOptions,
): Promise<ExportResult> {
  const t0 = performance.now()
  const warnings: string[] = []

  const svgMarkup = renderToStaticMarkup(
    React.createElement(opts.template.render as any, {
      config,
      metadata: opts.template.metadata,
      planData: opts.planData,
      renderMode: 'export',
    }),
  )

  const css = generateCssVariables(config.brand, { themeMode: config.previewMode })
  const fontsLink = collectGoogleFontUrls(config)

  // Injecter le QR si demandé
  let qrSection = ''
  if (opts.qrUrl) {
    const qrSvg = renderToStaticMarkup(
      React.createElement(QRCodeSVG as any, {
        value: buildQrUrl(opts.qrUrl, opts.utm),
        size: 96,
        level: 'M',
      }),
    )
    qrSection = `<div class="wdr-qr">${qrSvg}<small>Continuer sur mobile</small></div>`
  }

  const html = `<!DOCTYPE html>
<html lang="${config.project.activeLocale}" dir="${config.project.dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(opts.metadata?.title ?? config.project.siteName)}</title>
  ${(opts.metadata?.keywords ?? []).length ? `<meta name="keywords" content="${escapeHtml((opts.metadata?.keywords ?? []).join(','))}" />` : ''}
  ${fontsLink}
  <style>
    ${css}
    html, body { margin: 0; padding: 0; background: var(--wdr-bg); color: var(--wdr-fg); font-family: var(--wdr-font-body); }
    .wdr-root { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .wdr-root svg { max-width: 100%; max-height: 100%; }
    .wdr-qr { position: fixed; bottom: 16px; right: 16px; background: rgba(255,255,255,.95); padding: 12px; border-radius: 8px; text-align: center; font-size: 10px; color: #334155; }
    .wdr-qr svg { display: block; margin: 0 auto 4px; }
    @media print {
      .wdr-qr { position: absolute; }
    }
  </style>
</head>
<body>
  <div class="wdr-root">${svgMarkup}</div>
  ${qrSection}
  ${opts.includeKioskRuntime ? '<script>/* TODO: runtime borne externalisé en LOT 5 */</script>' : ''}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  if (blob.size > 5 * 1024 * 1024) {
    warnings.push(`Taille bundle ${(blob.size / 1024 / 1024).toFixed(2)} Mo > 5 Mo cible CDC §06.`)
  }

  return {
    blob,
    filename: (opts.filename ?? `wayfinder-${config.project.siteName}`) + '.html',
    mimeType: 'text/html',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'html-single-file',
    warnings,
  }
}

// ─── Bundle ZIP borne ───────────────────────────

export async function exportBundleZip(
  config: DesignerConfig,
  opts: HtmlBundleOptions,
): Promise<ExportResult> {
  const t0 = performance.now()

  // On utilise JSZip (tree-shaken si non utilisé ailleurs).
  // Charger dynamiquement pour ne pas peser dans le bundle principal.
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  // index.html
  const html = await exportHtmlSingleFile(config, { ...opts, includeKioskRuntime: true })
  const htmlText = await html.blob.text()
  zip.file('index.html', htmlText)

  // manifest.json (PWA)
  const manifest = {
    name: config.project.siteName,
    short_name: config.project.siteName.slice(0, 12),
    lang: config.project.activeLocale,
    dir: config.project.dir,
    display: 'fullscreen',
    background_color: config.brand.palette.background,
    theme_color: config.brand.palette.primary,
    start_url: './index.html',
    icons: config.project.logoUrl ? [{
      src: config.project.logoUrl,
      sizes: '512x512',
      type: 'image/png',
    }] : [],
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  // config.json (configuration borne lue par le runtime)
  const kioskConfig = {
    schemaVersion: '1.0',
    siteName: config.project.siteName,
    locale: config.project.activeLocale,
    dir: config.project.dir,
    palette: config.brand.palette,
    attract: config.attract,
    search: config.search,
    deployedAt: new Date().toISOString(),
    versionCdc: '1.0',
  }
  zip.file('config.json', JSON.stringify(kioskConfig, null, 2))

  // sw.js — Service Worker minimal (cache-first, network fallback)
  zip.file('sw.js', SERVICE_WORKER_SRC)

  // README installation borne
  zip.file('README.md', `# Bundle Wayfinder Borne — ${config.project.siteName}

Déploiement :
1. Décompresser ce ZIP sur la borne (ex: \`/var/www/html\`).
2. Servir avec un serveur HTTP statique (Nginx, Apache, http-server).
3. Ouvrir \`index.html\` en plein écran (mode kiosque navigateur).
4. Les assets sont mis en cache par sw.js — fonctionne sans réseau pendant 72h.

Configuration : éditer \`config.json\` puis recharger.

Généré le ${new Date().toLocaleString('fr-FR')} par Atlas Mall Suite Wayfinder Designer.
`)

  // Logo si présent
  if (config.project.logoUrl?.startsWith('data:')) {
    const [, mime, b64] = /^data:([^;]+);base64,(.+)$/.exec(config.project.logoUrl) ?? []
    if (mime && b64) {
      zip.file('logo.' + mime.split('/')[1], b64, { base64: true })
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })

  return {
    blob,
    filename: (opts.filename ?? `wayfinder-bundle-${config.project.siteName}`) + '.zip',
    mimeType: 'application/zip',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'bundle-zip',
    warnings: [],
  }
}

// ─── Site web statique (export Vite-style) ────

export async function exportStaticSite(
  config: DesignerConfig,
  opts: HtmlBundleOptions,
): Promise<ExportResult> {
  const t0 = performance.now()
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  const html = await exportHtmlSingleFile(config, opts)
  zip.file('index.html', await html.blob.text())

  // robots.txt
  zip.file('robots.txt', `User-agent: *\nAllow: /\nSitemap: ./sitemap.xml\n`)

  // sitemap.xml
  zip.file('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>./index.html</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`)

  // _redirects (Netlify) + vercel.json (Vercel)
  zip.file('_redirects', `/* /index.html 200\n`)
  zip.file('vercel.json', JSON.stringify({ rewrites: [{ source: '/(.*)', destination: '/index.html' }] }, null, 2))

  // README
  zip.file('README.md', `# Site web Wayfinder — ${config.project.siteName}

Déploiement :
- **Netlify** : drag-and-drop ce dossier sur Netlify Drop.
- **Vercel** : \`vercel deploy\` dans le dossier décompressé.
- **AWS S3** : \`aws s3 sync . s3://votre-bucket --acl public-read\`.
- **Serveur Nginx** : copier dans \`/usr/share/nginx/html\`.

Tous les assets sont inline dans \`index.html\` — pas besoin de CDN externe.
`)

  const blob = await zip.generateAsync({ type: 'blob' })
  return {
    blob,
    filename: (opts.filename ?? `wayfinder-site-${config.project.siteName}`) + '.zip',
    mimeType: 'application/zip',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'static-site',
    warnings: [],
  }
}

// ─── QR code ────────────────────────────────────

export async function exportQrSvg(opts: ExportOptions & { url: string }): Promise<ExportResult> {
  const t0 = performance.now()
  const url = buildQrUrl(opts.url, opts.utm)
  const svg = renderToStaticMarkup(
    React.createElement(QRCodeSVG as any, {
      value: url,
      size: 1024,
      level: 'H',
      includeMargin: true,
    }),
  )
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  return {
    blob,
    filename: (opts.filename ?? 'wayfinder-qr') + '.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'qr-svg',
    warnings: [],
  }
}

export async function exportQrPng(opts: ExportOptions & { url: string }): Promise<ExportResult> {
  const t0 = performance.now()
  // SVG → canvas → PNG
  const svgResult = await exportQrSvg(opts)
  const svgText = await svgResult.blob.text()
  const blob = await svgToPng(svgText, 1024, 1024)
  return {
    blob,
    filename: (opts.filename ?? 'wayfinder-qr') + '.png',
    mimeType: 'image/png',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'qr-png',
    warnings: [],
  }
}

// ─── Manifest JSON borne ────────────────────────

export async function exportManifestJson(
  config: DesignerConfig, opts: ExportOptions,
): Promise<ExportResult> {
  const t0 = performance.now()
  const manifest = {
    schemaVersion: '1.0',
    siteName: config.project.siteName,
    locales: config.project.locales,
    defaultLocale: config.project.activeLocale,
    palette: config.brand.palette,
    attract: config.attract,
    search: config.search,
    map: config.map,
    deployedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
  return {
    blob,
    filename: (opts.filename ?? 'wayfinder-manifest') + '.json',
    mimeType: 'application/json',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'manifest-json',
    warnings: [],
  }
}

// ─── Helpers ────────────────────────────────────

function buildQrUrl(base: string, utm?: ExportOptions['utm']): string {
  if (!utm) return base
  const u = new URL(base)
  if (utm.source) u.searchParams.set('utm_source', utm.source)
  if (utm.medium) u.searchParams.set('utm_medium', utm.medium)
  if (utm.campaign) u.searchParams.set('utm_campaign', utm.campaign)
  return u.toString()
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c))
}

function collectGoogleFontUrls(config: DesignerConfig): string {
  const urls = new Set<string>()
  for (const f of [config.brand.fonts.heading, config.brand.fonts.body, config.brand.fonts.mono]) {
    if (f?.source === 'google' && f.url) urls.add(f.url)
  }
  return Array.from(urls).map(u => `<link rel="stylesheet" href="${u}" crossorigin />`).join('\n')
}

async function svgToPng(svg: string, w: number, h: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D non disponible')); return }
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob échoué')), 'image/png')
    }
    img.onerror = () => reject(new Error('Image SVG non chargeable'))
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
  })
}

// ─── Service Worker (cache-first, offline 72h) ──

const SERVICE_WORKER_SRC = `// SW Wayfinder Borne — cache-first, offline 72h
const CACHE = 'wayfinder-v1'
const ASSETS = ['./index.html', './config.json', './manifest.json']
const TTL_MS = 72 * 3600 * 1000
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        const dt = parseInt(cached.headers.get('x-cache-time') || '0', 10)
        if (Date.now() - dt < TTL_MS) return cached
      }
      return fetch(req)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(req, clone))
          return res
        })
        .catch(() => cached || new Response('Offline'))
    })
  )
})
`
