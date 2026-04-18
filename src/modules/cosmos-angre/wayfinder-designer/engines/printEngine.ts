// ═══ printEngine — PDF/SVG/PNG grand format ═══
//
// Référence CDC §07 :
//   - PDF grand format : page size personnalisée (A0/A1/A2 + custom),
//     150 DPI minimum, sRGB (CMJN via post-processing optionnel),
//     bleed 3mm configurable, traits de coupe optionnels.
//   - SVG vectoriel : pur SVG, polices embarquées, plan vectoriel Vol.3,
//     compatible Illustrator/Inkscape.
//   - PNG ultra-HD : 300 DPI pour impression directe.
//
// Pas de Puppeteer côté client (alourdirait le bundle). On utilise jsPDF
// avec injection SVG directe + rastérisation contrôlée pour PNG.

import jsPDF from 'jspdf'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type {
  DesignerConfig, ExportOptions, ExportResult,
  InjectedPlanData, Template,
} from '../types'
import { mmToPx } from '../templates/shared/printDimensions'

export interface PrintExportInput {
  template: Template
  planData: InjectedPlanData
}

// ═══════════════════════════════════════════════════
// 1. Export PDF grand format
// ═══════════════════════════════════════════════════

export async function exportPdf(
  config: DesignerConfig,
  input: PrintExportInput,
  opts: ExportOptions,
): Promise<ExportResult> {
  const t0 = performance.now()
  const warnings: string[] = []
  const m = input.template.metadata

  if (m.dimensions.unit !== 'mm') {
    warnings.push(`Template ${m.id} non destiné à l'impression (dimensions en ${m.dimensions.unit}).`)
  }

  const wMm = m.dimensions.unit === 'mm' ? m.dimensions.width : 210
  const hMm = m.dimensions.unit === 'mm' ? m.dimensions.height : 297
  const dpi = opts.dpi ?? 150
  const bleedMm = opts.bleedMm ?? 0

  const totalWMm = wMm + 2 * bleedMm
  const totalHMm = hMm + 2 * bleedMm

  const orientation: 'p' | 'l' = totalWMm > totalHMm ? 'l' : 'p'
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [totalWMm, totalHMm],
    compress: true,
  })

  // Métadonnées
  if (opts.metadata) {
    doc.setProperties({
      title: opts.metadata.title ?? config.project.siteName,
      author: opts.metadata.author ?? 'Atlas Mall Suite',
      keywords: (opts.metadata.keywords ?? []).join(','),
      subject: 'Wayfinder',
      creator: 'PROPH3T Wayfinder Designer',
    })
  }

  // ─── Rendu SVG du template via React headless ───
  const svgMarkup = renderToStaticMarkup(
    React.createElement(input.template.render as any, {
      config,
      metadata: m,
      planData: input.planData,
      renderMode: 'export',
    }),
  )

  // jsPDF accepte les SVG via la méthode addSvgAsImage si dispo, sinon on
  // convertit le SVG en PNG via canvas puis on l'insère.
  // Solution stable : rastérisation à dpi.
  const widthPx = mmToPx(wMm, dpi)
  const heightPx = mmToPx(hMm, dpi)
  const png = await rasterizeSvg(svgMarkup, widthPx, heightPx)
  const dataUrl = await blobToDataUrl(png)

  doc.addImage(
    dataUrl, 'PNG',
    bleedMm, bleedMm,
    wMm, hMm,
    undefined,
    'FAST',
  )

  // Traits de coupe
  if (opts.cropMarks && bleedMm > 0) {
    drawCropMarks(doc, totalWMm, totalHMm, bleedMm)
  }

  // QR code en pied (toujours en plus du QR du template — pour traçabilité)
  if (opts.qrUrl) {
    const qrSvg = renderToStaticMarkup(
      React.createElement(QRCodeSVG as any, {
        value: opts.qrUrl, size: 200, level: 'M', includeMargin: false,
      }),
    )
    const qrPng = await rasterizeSvg(qrSvg, mmToPx(20, 300), mmToPx(20, 300))
    const qrUrl = await blobToDataUrl(qrPng)
    doc.addImage(qrUrl, 'PNG', totalWMm - bleedMm - 20, totalHMm - bleedMm - 20, 18, 18)
  }

  // Watermark (version + date)
  if (opts.includeWatermark) {
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(
      `${config.project.siteName} · v${config.project.version} · ${new Date().toLocaleDateString('fr-FR')} · sRGB ${dpi}dpi`,
      bleedMm + 4,
      totalHMm - bleedMm - 2,
    )
  }

  let blob = doc.output('blob')

  // ─── Conversion CMJN via Edge Function cmyk-convert ───
  if (opts.colorSpace === 'CMYK') {
    try {
      const converted = await convertToCmyk(blob, opts.filename ?? 'doc')
      if (converted.success && converted.pdf) {
        blob = converted.pdf
        warnings.push(`PDF converti en CMJN via ${converted.engine}.`)
      } else {
        warnings.push(`Conversion CMJN indisponible : ${converted.error ?? 'service non configuré'}. Sortie sRGB conservée.`)
        if (converted.setupHelp) warnings.push(`Setup : ${converted.setupHelp.split('\n')[0]}`)
      }
    } catch (err) {
      warnings.push(`Conversion CMJN échec : ${err instanceof Error ? err.message : 'unknown'}. Sortie sRGB conservée.`)
    }
  }

  return {
    blob,
    filename: (opts.filename ?? `${m.format}-${config.project.siteName}`) + (opts.colorSpace === 'CMYK' ? '-cmyk.pdf' : '.pdf'),
    mimeType: 'application/pdf',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'pdf',
    warnings,
  }
}

// ─── Helper CMJN ────────────────────────────────

async function convertToCmyk(pdfBlob: Blob, fileName: string): Promise<{
  success: boolean; pdf?: Blob; engine?: string; error?: string; setupHelp?: string
}> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? ''
  const supabaseAnon = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? ''
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    return { success: false, error: 'Supabase non configuré (mode offline)' }
  }
  // Convertir blob → base64
  const buf = await pdfBlob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const b64 = btoa(bin)

  const res = await fetch(`${supabaseUrl}/functions/v1/cmyk-convert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnon}`,
    },
    body: JSON.stringify({
      pdfBase64: b64,
      preset: 'PDFX-1a',
      iccProfile: 'ISOcoated_v2_300',
      fileName: `${fileName}.pdf`,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    return {
      success: false,
      error: data.error,
      setupHelp: data.setupHelp,
    }
  }
  // Reconstruction blob CMJN
  const cmykBin = atob(data.pdfBase64)
  const cmykBytes = new Uint8Array(cmykBin.length)
  for (let i = 0; i < cmykBin.length; i++) cmykBytes[i] = cmykBin.charCodeAt(i)
  return {
    success: true,
    pdf: new Blob([cmykBytes], { type: 'application/pdf' }),
    engine: data.engine,
  }
}

function drawCropMarks(doc: jsPDF, w: number, h: number, bleed: number): void {
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.1)
  const len = 5  // mm
  // 4 coins
  doc.line(0, bleed, len, bleed)              // haut-gauche horizontal
  doc.line(bleed, 0, bleed, len)              // haut-gauche vertical
  doc.line(w - len, bleed, w, bleed)
  doc.line(w - bleed, 0, w - bleed, len)
  doc.line(0, h - bleed, len, h - bleed)
  doc.line(bleed, h - len, bleed, h)
  doc.line(w - len, h - bleed, w, h - bleed)
  doc.line(w - bleed, h - len, w - bleed, h)
}

// ═══════════════════════════════════════════════════
// 2. Export SVG vectoriel pur
// ═══════════════════════════════════════════════════

export async function exportSvg(
  config: DesignerConfig,
  input: PrintExportInput,
  opts: ExportOptions,
): Promise<ExportResult> {
  const t0 = performance.now()
  const svgMarkup = renderToStaticMarkup(
    React.createElement(input.template.render as any, {
      config,
      metadata: input.template.metadata,
      planData: input.planData,
      renderMode: 'export',
    }),
  )

  // Wrap pour standalone
  const standalone = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Atlas Mall Suite Wayfinder Designer · ${config.project.siteName} · v${config.project.version} · ${new Date().toISOString()} -->
${svgMarkup}`

  const blob = new Blob([standalone], { type: 'image/svg+xml;charset=utf-8' })
  return {
    blob,
    filename: (opts.filename ?? `${input.template.metadata.format}-${config.project.siteName}`) + '.svg',
    mimeType: 'image/svg+xml',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'svg',
    warnings: [],
  }
}

// ═══════════════════════════════════════════════════
// 3. Export PNG ultra-HD (300 DPI)
// ═══════════════════════════════════════════════════

export async function exportPngHd(
  config: DesignerConfig,
  input: PrintExportInput,
  opts: ExportOptions,
): Promise<ExportResult> {
  const t0 = performance.now()
  const m = input.template.metadata
  const dpi = opts.dpi ?? 300

  const wPx = m.dimensions.unit === 'mm'
    ? mmToPx(m.dimensions.width, dpi)
    : m.dimensions.width
  const hPx = m.dimensions.unit === 'mm'
    ? mmToPx(m.dimensions.height, dpi)
    : m.dimensions.height

  const svgMarkup = renderToStaticMarkup(
    React.createElement(input.template.render as any, {
      config,
      metadata: m,
      planData: input.planData,
      renderMode: 'export',
    }),
  )
  const blob = await rasterizeSvg(svgMarkup, wPx, hPx)

  return {
    blob,
    filename: (opts.filename ?? `${m.format}-${config.project.siteName}-${dpi}dpi`) + '.png',
    mimeType: 'image/png',
    sizeBytes: blob.size,
    durationMs: Math.round(performance.now() - t0),
    format: 'png-hd',
    warnings: wPx * hPx > 100_000_000
      ? [`Image très grande (${wPx}×${hPx}px = ${(wPx * hPx / 1e6).toFixed(0)} MP). Mémoire navigateur : monitorer.`]
      : [],
  }
}

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════

async function rasterizeSvg(svg: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D non disponible')); return }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('toBlob échoué')),
        'image/png',
        1.0,
      )
    }
    img.onerror = (e) => reject(new Error('SVG non rastérisable : ' + (e instanceof Event ? e.type : e)))
    // Encodage UTF-8 safe
    const utf8 = new TextEncoder().encode(svg)
    let binary = ''
    for (const b of utf8) binary += String.fromCharCode(b)
    img.src = 'data:image/svg+xml;base64,' + btoa(binary)
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsDataURL(blob)
  })
}

// ═══════════════════════════════════════════════════
// Façade unique d'export
// ═══════════════════════════════════════════════════

export async function executeExport(
  config: DesignerConfig,
  input: PrintExportInput,
  opts: ExportOptions,
): Promise<ExportResult> {
  switch (opts.format) {
    case 'pdf':    return exportPdf(config, input, opts)
    case 'svg':    return exportSvg(config, input, opts)
    case 'png-hd': return exportPngHd(config, input, opts)
    default:
      throw new Error(`Format print non géré ici : ${opts.format} (utiliser digitalEngine pour les formats digitaux).`)
  }
}
