// ═══ Onglet 5 — Export ═══
// Sélection format + options avancées + bouton d'export unique (CDC §03 + §06 + §07).

import React, { useMemo, useState } from 'react'
import {
  Download, FileText, Globe, Package, QrCode, Smartphone,
  FileImage, FileType2, Loader2, CheckCircle, AlertTriangle,
} from 'lucide-react'
import { useDesignerStore } from '../../store/designerStore'
import { getTemplate } from '../../templates/registry'
import {
  exportHtmlSingleFile, exportBundleZip, exportStaticSite,
  exportQrSvg, exportQrPng, exportManifestJson,
} from '../../engines/digitalEngine'
import { executeExport as executePrintExport } from '../../engines/printEngine'
import type { ExportFormat, ExportOptions, ExportResult } from '../../types'
import { usePlanEngineStore } from '../../../shared/stores/planEngineStore'
import type { InjectedPlanData } from '../../types'

interface FormatOption {
  format: ExportFormat
  label: string
  description: string
  icon: React.ComponentType<any>
  kind: 'digital' | 'print' | 'extra'
}

const ALL_FORMATS: FormatOption[] = [
  { format: 'html-single-file', label: 'HTML autonome', description: 'Single file < 5 Mo, fonctionne hors ligne', icon: FileText, kind: 'digital' },
  { format: 'bundle-zip',       label: 'Bundle ZIP borne', description: 'index.html + sw.js + manifest + config.json', icon: Package, kind: 'digital' },
  { format: 'static-site',      label: 'Site web statique', description: 'Prêt Netlify/Vercel/S3', icon: Globe, kind: 'digital' },
  { format: 'pdf',              label: 'PDF grand format', description: 'A0/A1/A2, 150 DPI, sRGB (CMJN optionnel)', icon: FileType2, kind: 'print' },
  { format: 'svg',              label: 'SVG vectoriel', description: 'Pur SVG, compatible Illustrator/Inkscape', icon: FileImage, kind: 'print' },
  { format: 'png-hd',           label: 'PNG ultra-HD 300 DPI', description: 'A0@300DPI = 9933×14043 px', icon: FileImage, kind: 'print' },
  { format: 'qr-svg',           label: 'QR code SVG', description: 'Vectoriel 1024px, UTM optionnel', icon: QrCode, kind: 'extra' },
  { format: 'qr-png',           label: 'QR code PNG', description: 'Bitmap 1024×1024 px', icon: QrCode, kind: 'extra' },
  { format: 'manifest-json',    label: 'Manifest borne JSON', description: 'Configuration runtime', icon: Smartphone, kind: 'extra' },
]

export function ExportTab() {
  const { config } = useDesignerStore()
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const [selected, setSelected] = useState<ExportFormat>('html-single-file')
  const [opts, setOpts] = useState<ExportOptions>({
    format: 'html-single-file',
    colorSpace: 'sRGB',
    bleedMm: 3,
    cropMarks: false,
    dpi: 150,
    includeWatermark: true,
    qrUrl: typeof window !== 'undefined' ? window.location.origin + '/wayfinder' : '',
  })
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<ExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const template = getTemplate(config.templateId)
  const planData = useMemo<InjectedPlanData>(() => buildPlanData(parsedPlan, config), [parsedPlan, config])

  const handleExport = async () => {
    if (!template) { setError('Template non sélectionné.'); return }
    setRunning(true)
    setError(null)
    try {
      const fullOpts: ExportOptions = { ...opts, format: selected }
      let result: ExportResult
      switch (selected) {
        case 'html-single-file':
          result = await exportHtmlSingleFile(config, { ...fullOpts, template, planData })
          break
        case 'bundle-zip':
          result = await exportBundleZip(config, { ...fullOpts, template, planData })
          break
        case 'static-site':
          result = await exportStaticSite(config, { ...fullOpts, template, planData })
          break
        case 'qr-svg':
          result = await exportQrSvg({ ...fullOpts, url: fullOpts.qrUrl ?? '' })
          break
        case 'qr-png':
          result = await exportQrPng({ ...fullOpts, url: fullOpts.qrUrl ?? '' })
          break
        case 'manifest-json':
          result = await exportManifestJson(config, fullOpts)
          break
        case 'pdf':
        case 'svg':
        case 'png-hd':
          result = await executePrintExport(config, { template, planData }, fullOpts)
          break
        default:
          throw new Error(`Format non supporté : ${selected}`)
      }
      setLastResult(result)
      // Téléchargement direct
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur export')
    } finally {
      setRunning(false)
    }
  }

  const isPrint = selected === 'pdf' || selected === 'svg' || selected === 'png-hd'

  return (
    <div className="overflow-y-auto p-6 max-w-4xl mx-auto space-y-5">

      {/* Sélection format */}
      <section className="rounded-lg bg-surface-1/40 border border-white/5 p-5">
        <h3 className="text-[12px] font-semibold text-white mb-3">Choisir le format d'export</h3>
        {(['digital', 'print', 'extra'] as const).map(group => (
          <div key={group} className="mb-3">
            <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              {group === 'digital' ? 'Digital interactif' : group === 'print' ? 'Impression grand format' : 'Annexes'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FORMATS.filter(f => f.kind === group).map(f => {
                const Icon = f.icon
                const isSel = selected === f.format
                return (
                  <button
                    key={f.format}
                    onClick={() => { setSelected(f.format); setOpts(o => ({ ...o, format: f.format })) }}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      isSel
                        ? 'border-atlas-500 bg-indigo-950/30'
                        : 'border-white/10 bg-surface-0/40 hover:border-white/30'
                    }`}
                  >
                    <Icon size={16} />
                    <h4 className="text-[11px] font-semibold text-white mt-1.5">{f.label}</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5">{f.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Options avancées contextuelles */}
      <section className="rounded-lg bg-surface-1/40 border border-white/5 p-5">
        <h3 className="text-[12px] font-semibold text-white mb-3">Options avancées</h3>
        <div className="grid grid-cols-2 gap-4">

          <Field label="Nom de fichier (sans extension)">
            <input
              value={opts.filename ?? ''}
              onChange={e => setOpts(o => ({ ...o, filename: e.target.value }))}
              placeholder={`wayfinder-${config.project.siteName}`}
              className="input"
            />
          </Field>

          {(isPrint || true) && (
            <Field label="DPI">
              <select
                value={opts.dpi ?? 150}
                onChange={e => setOpts(o => ({ ...o, dpi: Number(e.target.value) }))}
                className="input"
              >
                <option value={72}>72 (web only)</option>
                <option value={150}>150 (impression standard)</option>
                <option value={300}>300 (haute qualité)</option>
                <option value={600}>600 (impression pro)</option>
              </select>
            </Field>
          )}

          {isPrint && (
            <>
              <Field label="Espace colorimétrique">
                <select
                  value={opts.colorSpace}
                  onChange={e => setOpts(o => ({ ...o, colorSpace: e.target.value as any }))}
                  className="input"
                >
                  <option value="sRGB">sRGB (web + impression standard)</option>
                  <option value="CMYK">CMJN (impression pro — post-process serveur)</option>
                </select>
              </Field>

              <Field label="Bleed (mm)">
                <input
                  type="number"
                  min={0} max={10}
                  value={opts.bleedMm}
                  onChange={e => setOpts(o => ({ ...o, bleedMm: Number(e.target.value) }))}
                  className="input"
                />
              </Field>

              <label className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  checked={opts.cropMarks}
                  onChange={e => setOpts(o => ({ ...o, cropMarks: e.target.checked }))}
                />
                <span className="text-[11px] text-slate-300">Traits de coupe (cropmarks)</span>
              </label>
            </>
          )}

          <Field label="URL pour QR code">
            <input
              value={opts.qrUrl ?? ''}
              onChange={e => setOpts(o => ({ ...o, qrUrl: e.target.value }))}
              placeholder="https://votre-domaine.com/wayfinder"
              className="input font-mono text-[10px]"
            />
          </Field>

          <Field label="UTM source (optionnel)">
            <input
              value={opts.utm?.source ?? ''}
              onChange={e => setOpts(o => ({ ...o, utm: { ...(o.utm ?? {}), source: e.target.value } }))}
              placeholder="poster_a0"
              className="input"
            />
          </Field>

          <label className="flex items-center gap-2 col-span-2">
            <input
              type="checkbox"
              checked={opts.includeWatermark}
              onChange={e => setOpts(o => ({ ...o, includeWatermark: e.target.checked }))}
            />
            <span className="text-[11px] text-slate-300">Inclure version + date en pied (traçabilité)</span>
          </label>
        </div>
      </section>

      {/* Action */}
      <div className="rounded-lg bg-surface-1/40 border border-white/5 p-5">
        <button
          onClick={handleExport}
          disabled={running || !template}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-atlas-500 to-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          {running ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          {running ? 'Génération en cours…' : `Exporter en ${ALL_FORMATS.find(f => f.format === selected)?.label}`}
        </button>

        {error && (
          <div className="mt-3 px-3 py-2 rounded bg-red-950/40 border border-red-900/50 text-[11px] text-red-300 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {lastResult && (
          <div className="mt-3 px-3 py-2 rounded bg-emerald-950/40 border border-emerald-900/50 text-[11px] text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} />
              <strong>Export réussi</strong> · {lastResult.filename}
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-1">
              {(lastResult.sizeBytes / 1024).toFixed(0)} Ko · {lastResult.durationMs} ms
            </div>
            {lastResult.warnings.length > 0 && (
              <ul className="mt-1 text-[10px] text-amber-300 list-disc pl-4">
                {lastResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <style>{`
        .input {
          width: 100%; padding: 8px 12px;
          background: #2a2d33; border: 1px solid rgba(255,255,255,0.1);
          color: #f1f5f9; border-radius: 6px;
          font-size: 12px; outline: none;
        }
        .input:focus { border-color: #b38a5a; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</label>
      {children}
    </div>
  )
}

// dupliqué de CanvasTab (TODO factoriser dans utils/buildPlanData.ts au LOT 6)
function buildPlanData(parsedPlan: any, config: any): InjectedPlanData {
  if (!parsedPlan) {
    return { projectName: config.project.siteName, floors: [], pois: [], entrances: [], exits: [] }
  }
  const floorMap = new Map<string, any>()
  for (const s of (parsedPlan.spaces ?? [])) {
    const fid = s.floorId ?? 'default'
    if (!floorMap.has(fid)) {
      floorMap.set(fid, {
        id: fid, label: fid, order: 0, walls: [], spaces: [],
        bounds: { width: parsedPlan.bounds?.width ?? 200, height: parsedPlan.bounds?.height ?? 140 },
      })
    }
    floorMap.get(fid).spaces.push({
      id: s.id, label: s.label, type: s.type ?? 'autre',
      polygon: s.polygon as [number, number][],
    })
  }
  const walls = (parsedPlan.wallSegments ?? []).map((w: any) =>
    ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }))
  for (const f of floorMap.values()) f.walls = walls
  if (floorMap.size === 0) {
    floorMap.set('default', { id: 'default', label: 'RDC', order: 0, walls,
      spaces: [], bounds: { width: parsedPlan.bounds?.width ?? 200, height: parsedPlan.bounds?.height ?? 140 } })
  }
  return {
    projectName: config.project.siteName,
    floors: Array.from(floorMap.values()),
    pois: (parsedPlan.spaces ?? [])
      .filter((s: any) => ['local_commerce', 'restauration', 'services', 'loisirs', 'sanitaires'].includes(s.type ?? ''))
      .map((s: any) => {
        let cx = 0, cy = 0
        for (const [x, y] of (s.polygon ?? [])) { cx += x; cy += y }
        cx /= Math.max(1, s.polygon?.length ?? 1)
        cy /= Math.max(1, s.polygon?.length ?? 1)
        return { id: s.id, label: s.label, type: s.type ?? 'autre', x: cx, y: cy, floorId: s.floorId }
      }),
    entrances: [], exits: [],
  }
}
