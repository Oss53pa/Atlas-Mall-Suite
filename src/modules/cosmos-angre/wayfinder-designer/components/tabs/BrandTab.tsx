// ═══ Onglet 2 — Charte ═══
// Palette primaire/secondaire/urgence, typo, mode sombre/clair (CDC §03)
// + audit WCAG AA + simulation daltonisme (CDC §05)

import React, { useMemo } from 'react'
import { Palette, Type, Sun, Eye, AlertTriangle, CheckCircle, RotateCw, Download, Upload } from 'lucide-react'
import { useDesignerStore } from '../../store/designerStore'
import {
  auditPalette, generatePaletteFromPrimary, evaluateContrast, simulateBrandForColorBlindness,
  exportBrandJson, importBrandJson, adjustForContrast,
  type ColorBlindness,
} from '../../engines/brandEngine'
import type { BrandPalette, FontDef } from '../../types'

const COLOR_KEYS: Array<{ key: keyof BrandPalette; label: string }> = [
  { key: 'primary',         label: 'Primaire' },
  { key: 'secondary',       label: 'Secondaire' },
  { key: 'accent',          label: 'Accent' },
  { key: 'emergency',       label: 'Urgence' },
  { key: 'neutral',         label: 'Neutre' },
  { key: 'background',      label: 'Fond clair' },
  { key: 'backgroundDark',  label: 'Fond sombre' },
  { key: 'foreground',      label: 'Texte clair' },
  { key: 'foregroundDark',  label: 'Texte sombre' },
]

const COMMON_GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Lato', 'Montserrat', 'Open Sans', 'Poppins',
  'Source Sans Pro', 'Nunito', 'Raleway', 'Merriweather', 'Playfair Display',
]

export function BrandTab() {
  const { config, patchBrand } = useDesignerStore()
  const { brand } = config

  const audit = useMemo(() => auditPalette(brand.palette, brand.wcagLevel), [brand])
  const cbSim = useMemo(() =>
    config.colorBlindnessSim && config.colorBlindnessSim !== 'none'
      ? simulateBrandForColorBlindness(brand, config.colorBlindnessSim as ColorBlindness)
      : null,
    [brand, config.colorBlindnessSim],
  )

  const handleColorChange = (key: keyof BrandPalette, value: string) => {
    patchBrand({ palette: { ...brand.palette, [key]: value } })
  }

  const handleAutoFix = () => {
    const fixed: BrandPalette = { ...brand.palette }
    fixed.foreground = adjustForContrast(fixed.foreground, fixed.background, 4.5)
    fixed.foregroundDark = adjustForContrast(fixed.foregroundDark, fixed.backgroundDark, 4.5)
    fixed.primary = adjustForContrast(fixed.primary, fixed.background, 4.5)
    fixed.emergency = adjustForContrast(fixed.emergency, fixed.background, 4.5)
    patchBrand({ palette: fixed })
  }

  const handleRegenerateFromPrimary = () => {
    const generated = generatePaletteFromPrimary(brand.palette.primary)
    patchBrand({ palette: {
      primary: generated.primary,
      secondary: generated.secondary,
      accent: generated.accent,
      emergency: generated.emergency,
      neutral: generated.neutral,
      background: generated.background,
      backgroundDark: generated.backgroundDark,
      foreground: generated.foreground,
      foregroundDark: generated.foregroundDark,
    }})
  }

  const handleExportBrand = () => {
    const json = exportBrandJson(brand)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'wayfinder-brand.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportBrand = async (file: File) => {
    const text = await file.text()
    const r = importBrandJson(text)
    if (r.success && r.brand) {
      patchBrand(r.brand)
    } else {
       
      alert(`Import échoué : ${r.error}`)
    }
  }

  return (
    <div className="overflow-y-auto p-6 max-w-4xl mx-auto space-y-5">

      {/* Audit WCAG global */}
      <div className={`rounded-lg p-4 border ${audit.overallPass
        ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-amber-950/30 border-amber-900/50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {audit.overallPass
              ? <CheckCircle className="text-emerald-400" size={16} />
              : <AlertTriangle className="text-amber-400" size={16} />}
            <span className="text-sm font-semibold">
              Conformité WCAG {brand.wcagLevel} :{' '}
              <span className={audit.overallPass ? 'text-emerald-400' : 'text-amber-400'}>
                {audit.overallPass ? '✓ Conforme' : `✗ ${audit.checks.filter(c => !c.passes).length} check(s) non conforme(s)`}
              </span>
            </span>
          </div>
          {!audit.overallPass && (
            <button
              onClick={handleAutoFix}
              className="text-[11px] px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-500 flex items-center gap-1"
            >
              <RotateCw size={11} /> Auto-corriger
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
          {audit.checks.map(c => (
            <div key={c.pair} className={`flex items-center gap-2 px-2 py-1 rounded ${c.passes ? 'text-emerald-300' : 'text-amber-300'}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.passes ? '#10b981' : '#f59e0b' }} />
              <span className="flex-1 truncate">{c.pair}</span>
              <code className="text-[9px] text-slate-500">{c.ratio.toFixed(2)}:1</code>
            </div>
          ))}
        </div>
      </div>

      {/* Palette */}
      <Section title="Palette" icon={Palette}>
        <div className="grid grid-cols-3 gap-3">
          {COLOR_KEYS.map(({ key, label }) => (
            <ColorPicker
              key={key}
              label={label}
              value={brand.palette[key]}
              onChange={(v) => handleColorChange(key, v)}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleRegenerateFromPrimary}
            className="text-[11px] px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
          >
            <RotateCw size={11} /> Régénérer dark/light depuis primaire
          </button>
        </div>
      </Section>

      {/* Typographie */}
      <Section title="Typographie" icon={Type}>
        <FontPicker
          label="Titre"
          font={brand.fonts.heading}
          onChange={(f) => patchBrand({ fonts: { ...brand.fonts, heading: f } })}
        />
        <FontPicker
          label="Corps"
          font={brand.fonts.body}
          onChange={(f) => patchBrand({ fonts: { ...brand.fonts, body: f } })}
        />
      </Section>

      {/* Apparence générale */}
      <Section title="Apparence" icon={Sun}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Border radius">
            <select
              value={brand.borderRadius}
              onChange={e => patchBrand({ borderRadius: e.target.value as any })}
              className="input"
            >
              {(['none', 'sm', 'md', 'lg', 'full'] as const).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Style icônes">
            <select
              value={brand.iconStyle}
              onChange={e => patchBrand({ iconStyle: e.target.value as any })}
              className="input"
            >
              <option value="outline">Outline (contour)</option>
              <option value="filled">Filled (plein)</option>
              <option value="duotone">Duotone</option>
            </select>
          </Field>
          <Field label="Style plan">
            <select
              value={brand.mapStyle}
              onChange={e => patchBrand({ mapStyle: e.target.value as any })}
              className="input"
            >
              <option value="default">Défaut (couleurs métier)</option>
              <option value="minimal">Minimal (monochrome)</option>
              <option value="satellite">Satellite-like</option>
              <option value="blueprint">Blueprint (bleu technique)</option>
            </select>
          </Field>
          <Field label="Niveau WCAG">
            <select
              value={brand.wcagLevel}
              onChange={e => patchBrand({ wcagLevel: e.target.value as any })}
              className="input"
            >
              <option value="AA">AA (4.5:1) — recommandé</option>
              <option value="AAA">AAA (7:1) — strict</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Preview accessibilité */}
      <Section title="Simulation accessibilité" icon={Eye}>
        <div className="flex gap-2 mb-3">
          {(['none', 'protanopia', 'deuteranopia', 'tritanopia'] as const).map(t => {
            const isActive = (config.colorBlindnessSim ?? 'none') === t
            return (
              <button
                key={t}
                onClick={() => useDesignerStore.getState().patchConfig({ colorBlindnessSim: t })}
                className={`px-2.5 py-1 rounded text-[10px] ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                {t === 'none' ? 'Aucune' : t}
              </button>
            )
          })}
        </div>
        {cbSim && (
          <div className="grid grid-cols-9 gap-1">
            {COLOR_KEYS.map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center gap-1">
                <div className="w-full h-12 rounded" style={{ background: cbSim.palette[key] }} />
                <span className="text-[8px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Import / export charte */}
      <Section title="Import / export charte" icon={Download}>
        <div className="flex gap-2">
          <button
            onClick={handleExportBrand}
            className="text-[11px] px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1.5"
          >
            <Download size={11} /> Exporter charte JSON
          </button>
          <label className="text-[11px] px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1.5 cursor-pointer">
            <Upload size={11} /> Importer
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportBrand(e.target.files[0])}
            />
          </label>
        </div>
      </Section>
    </div>
  )
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ratio = evaluateContrast(value, '#ffffff')
  return (
    <div className="rounded bg-slate-900 border border-white/5 p-2">
      <div className="text-[10px] uppercase text-slate-500 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
        />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-2 py-1 rounded bg-slate-950 border border-white/10 text-[11px] font-mono text-white outline-none"
        />
      </div>
      <div className="text-[9px] text-slate-500 mt-1">
        sur blanc : <span className={ratio.passesAA ? 'text-emerald-400' : 'text-amber-400'}>
          {ratio.ratio.toFixed(2)}:1 {ratio.passesAA ? '✓' : '✗'}
        </span>
      </div>
    </div>
  )
}

function FontPicker({ label, font, onChange }: { label: string; font: FontDef; onChange: (f: FontDef) => void }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</label>
      <select
        value={font.family}
        onChange={e => {
          const family = e.target.value
          onChange({
            family, source: 'google',
            weights: [400, 500, 600, 700],
            url: `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`,
            fallback: font.fallback || 'system-ui, sans-serif',
          })
        }}
        className="input"
      >
        {COMMON_GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <p className="text-[10px] text-slate-600 mt-0.5">
        {font.source === 'google' ? 'Chargée depuis Google Fonts' : font.source === 'local-woff2' ? 'WOFF2 local' : 'Système'}
        {' · fallback : '}<code>{font.fallback}</code>
      </p>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<any>; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-slate-900/40 border border-white/5">
      <header className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-slate-900/50">
        <Icon size={14} className="text-indigo-400" />
        <h3 className="text-[12px] font-semibold text-white">{title}</h3>
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
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
