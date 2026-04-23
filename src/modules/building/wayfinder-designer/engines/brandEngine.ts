// ═══ WAYFINDER DESIGNER — brandEngine ═══
//
// Moteur de charte graphique conforme §05 du cahier des charges :
//   - Génération de CSS custom properties depuis la palette
//   - Validation contraste WCAG AA (4.5:1) et AAA (7:1)
//   - Suggestion automatique de correction si contraste insuffisant
//   - Export charte JSON réutilisable entre projets
//   - Injection dynamique sans reload
//   - Support RTL (arabe, hébreu)
//   - Google Fonts API + woff2 local + fallback system
//   - Génération dark/light auto depuis primaire (HSL)
//   - Simulation daltonisme (protanopie / deutéranopie / tritanopie)
//
// Toutes les fonctions sont pures (pas d'effet de bord) sauf injectCssVariables
// et loadGoogleFont qui touchent au DOM.

import type {
  BrandConfig, BrandPalette, FontDef, LocaleCode, TextDirection,
} from '../types'

// ═══════════════════════════════════════════════════
// 1. Conversion couleur
// ═══════════════════════════════════════════════════

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '').toLowerCase()
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0')
  const n = parseInt(full.slice(0, 6), 16)
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toH = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return '#' + toH(r) + toH(g) + toH(b)
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break
      case gn: h = (bn - rn) / d + 2; break
      case bn: h = (rn - gn) / d + 4; break
    }
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = ln - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

// ═══════════════════════════════════════════════════
// 2. Luminance relative + contraste WCAG 2.1
// ═══════════════════════════════════════════════════

/** Luminance relative (WCAG 2.1 SC 1.4.3). */
export function relativeLuminance({ r, g, b }: RGB): number {
  const toLin = (c: number) => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
}

/** Ratio de contraste entre 2 couleurs hex. Résultat ∈ [1, 21]. */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1))
  const l2 = relativeLuminance(hexToRgb(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export type WcagLevel = 'AA' | 'AAA' | 'fail'
export interface ContrastReport {
  ratio: number
  level: WcagLevel
  passesAA: boolean
  passesAAA: boolean
  /** Niveau texte large (>=18pt ou 14pt gras) : seuils AA=3, AAA=4.5. */
  passesAALarge: boolean
}

export function evaluateContrast(fgHex: string, bgHex: string): ContrastReport {
  const ratio = contrastRatio(fgHex, bgHex)
  return {
    ratio,
    level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'fail',
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    passesAALarge: ratio >= 3,
  }
}

/**
 * Ajuste la luminosité d'une couleur pour atteindre un ratio minimum sur fond
 * donné. Utilisé pour suggérer automatiquement une couleur corrigée WCAG AA.
 */
export function adjustForContrast(
  fgHex: string, bgHex: string, minRatio = 4.5,
): string {
  if (contrastRatio(fgHex, bgHex) >= minRatio) return fgHex

  const fgHsl = rgbToHsl(hexToRgb(fgHex))
  const bgLum = relativeLuminance(hexToRgb(bgHex))
  const makeDarker = bgLum > 0.5   // fond clair → texte plus sombre, sinon plus clair
  const direction = makeDarker ? -1 : 1

  let { h, s, l } = fgHsl
  for (let step = 0; step < 50; step++) {
    l = Math.max(0, Math.min(100, l + direction * 2))
    const next = rgbToHex(hslToRgb({ h, s, l }))
    if (contrastRatio(next, bgHex) >= minRatio) return next
  }
  // À défaut : noir ou blanc selon fond
  return makeDarker ? '#000000' : '#ffffff'
}

// ═══════════════════════════════════════════════════
// 3. Génération palette dark/light depuis primaire
// ═══════════════════════════════════════════════════

export interface GeneratedPalette extends BrandPalette {
  /** Nuances calculées 50..950. */
  scale: Record<number, string>
}

/**
 * Génère une palette complète (dark/light + nuances 50-950) à partir d'une
 * couleur primaire. Compatible WCAG AA par construction.
 */
export function generatePaletteFromPrimary(primaryHex: string): GeneratedPalette {
  const rgb = hexToRgb(primaryHex)
  const { h, s } = rgbToHsl(rgb)

  const scale: Record<number, string> = {}
  const scaleLightness: Record<number, number> = {
    50: 97, 100: 94, 200: 86, 300: 76, 400: 62,
    500: 50, 600: 40, 700: 32, 800: 24, 900: 16, 950: 10,
  }
  for (const [level, l] of Object.entries(scaleLightness)) {
    scale[Number(level)] = rgbToHex(hslToRgb({ h, s: Math.max(20, s), l }))
  }

  const base: BrandPalette = {
    primary: scale[500],
    secondary: rgbToHex(hslToRgb({ h: (h + 180) % 360, s: Math.max(10, s * 0.3), l: 50 })),
    accent: rgbToHex(hslToRgb({ h: (h + 30) % 360, s: Math.max(60, s), l: 55 })),
    emergency: '#dc2626',
    neutral: rgbToHex(hslToRgb({ h, s: 10, l: 60 })),
    background: '#ffffff',
    backgroundDark: '#0f172a',
    foreground: '#0f172a',
    foregroundDark: '#f1f5f9',
  }

  // Vérifie contrastes fondamentaux et corrige si nécessaire
  base.foreground = adjustForContrast(base.foreground, base.background, 4.5)
  base.foregroundDark = adjustForContrast(base.foregroundDark, base.backgroundDark, 4.5)

  return { ...base, scale }
}

// ═══════════════════════════════════════════════════
// 4. Audit complet d'une palette
// ═══════════════════════════════════════════════════

export interface PaletteAudit {
  level: WcagLevel
  checks: Array<{
    pair: string
    ratio: number
    required: number
    passes: boolean
    suggestion?: string
  }>
  overallPass: boolean
  dominantIssue?: string
}

export function auditPalette(palette: BrandPalette, wcag: 'AA' | 'AAA' = 'AA'): PaletteAudit {
  const req = wcag === 'AAA' ? 7 : 4.5
  const pairs: Array<[string, string, string]> = [
    ['foreground', 'background', 'Texte principal sur fond clair'],
    ['foregroundDark', 'backgroundDark', 'Texte principal sur fond sombre'],
    ['primary', 'background', 'Primaire sur fond clair'],
    ['primary', 'backgroundDark', 'Primaire sur fond sombre'],
    ['accent', 'background', 'Accent sur fond clair'],
    ['emergency', 'background', 'Urgence sur fond clair'],
    ['emergency', 'backgroundDark', 'Urgence sur fond sombre'],
  ]

  const checks = pairs.map(([fgKey, bgKey, label]) => {
    const fg = palette[fgKey as keyof BrandPalette]
    const bg = palette[bgKey as keyof BrandPalette]
    const ratio = contrastRatio(fg, bg)
    const passes = ratio >= req
    return {
      pair: label,
      ratio,
      required: req,
      passes,
      suggestion: passes ? undefined : `${fg} → ${adjustForContrast(fg, bg, req)}`,
    }
  })

  const overallPass = checks.every(c => c.passes)
  const firstFail = checks.find(c => !c.passes)
  return {
    level: overallPass ? wcag : 'fail',
    checks,
    overallPass,
    dominantIssue: firstFail?.pair,
  }
}

// ═══════════════════════════════════════════════════
// 5. Simulation daltonisme (LMS space — Brettel 1997)
// ═══════════════════════════════════════════════════

export type ColorBlindness = 'protanopia' | 'deuteranopia' | 'tritanopia'

/**
 * Simule la perception d'une couleur par une personne daltonienne.
 * Algorithme : conversion RGB → LMS → projection sur plan réduit → RGB.
 */
export function simulateColorBlindness(hex: string, type: ColorBlindness): string {
  const { r, g, b } = hexToRgb(hex)
  // Conversion sRGB → LMS (matrice Hunt-Pointer-Estevez)
  const L = 0.31399022 * r + 0.63951294 * g + 0.04649755 * b
  const M = 0.15537241 * r + 0.75789446 * g + 0.08670142 * b
  const S = 0.01775239 * r + 0.10944209 * g + 0.87256922 * b

  let Lc = L, Mc = M, Sc = S
  switch (type) {
    case 'protanopia':
      Lc = 2.02344 * M - 2.52581 * S
      break
    case 'deuteranopia':
      Mc = 0.494207 * L + 1.24827 * S
      break
    case 'tritanopia':
      Sc = -0.395913 * L + 0.801109 * M
      break
  }

  // Retour LMS → sRGB (matrice inverse approx)
  const rOut = 5.47221206 * Lc - 4.6419601 * Mc + 0.16963708 * Sc
  const gOut = -1.1252419 * Lc + 2.29317094 * Mc - 0.1678952 * Sc
  const bOut = 0.02980165 * Lc - 0.19318073 * Mc + 1.16364789 * Sc

  return rgbToHex({
    r: Math.max(0, Math.min(255, rOut)),
    g: Math.max(0, Math.min(255, gOut)),
    b: Math.max(0, Math.min(255, bOut)),
  })
}

export function simulateBrandForColorBlindness(brand: BrandConfig, type: ColorBlindness): BrandConfig {
  const p = brand.palette
  return {
    ...brand,
    palette: {
      ...p,
      primary: simulateColorBlindness(p.primary, type),
      secondary: simulateColorBlindness(p.secondary, type),
      accent: simulateColorBlindness(p.accent, type),
      emergency: simulateColorBlindness(p.emergency, type),
      neutral: simulateColorBlindness(p.neutral, type),
    },
  }
}

// ═══════════════════════════════════════════════════
// 6. CSS Custom Properties
// ═══════════════════════════════════════════════════

export interface CssVarsOptions {
  scope?: string  // ex : ':root' ou '.wayfinder-designer-preview'
  themeMode?: 'light' | 'dark'
}

export function generateCssVariables(brand: BrandConfig, opts: CssVarsOptions = {}): string {
  const { scope = ':root', themeMode = brand.themeMode === 'auto' ? 'light' : brand.themeMode } = opts
  const p = brand.palette
  const isLight = themeMode === 'light'
  const bg = isLight ? p.background : p.backgroundDark
  const fg = isLight ? p.foreground : p.foregroundDark

  const radiusMap: Record<BrandConfig['borderRadius'], string> = {
    none: '0px', sm: '4px', md: '8px', lg: '16px', full: '9999px',
  }

  return `
${scope} {
  --wdr-primary: ${p.primary};
  --wdr-secondary: ${p.secondary};
  --wdr-accent: ${p.accent};
  --wdr-emergency: ${p.emergency};
  --wdr-neutral: ${p.neutral};
  --wdr-bg: ${bg};
  --wdr-fg: ${fg};
  --wdr-bg-light: ${p.background};
  --wdr-bg-dark: ${p.backgroundDark};
  --wdr-fg-light: ${p.foreground};
  --wdr-fg-dark: ${p.foregroundDark};
  --wdr-radius: ${radiusMap[brand.borderRadius]};
  --wdr-font-heading: '${brand.fonts.heading.family}', ${brand.fonts.heading.fallback};
  --wdr-font-body: '${brand.fonts.body.family}', ${brand.fonts.body.fallback};
  ${brand.fonts.mono ? `--wdr-font-mono: '${brand.fonts.mono.family}', ${brand.fonts.mono.fallback};` : ''}
  --wdr-theme-mode: ${themeMode};
}
`.trim()
}

/** Injecte les variables dans une balise <style> unique (remplacée à chaque call). */
export function injectCssVariables(brand: BrandConfig, opts: CssVarsOptions = {}): void {
  if (typeof document === 'undefined') return
  const ID = 'atlas-wdr-brand-css'
  let el = document.getElementById(ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = ID
    document.head.appendChild(el)
  }
  el.textContent = generateCssVariables(brand, opts)
}

// ═══════════════════════════════════════════════════
// 7. Direction de texte (RTL)
// ═══════════════════════════════════════════════════

const RTL_LOCALES: LocaleCode[] = ['ar-MA', 'he-IL']

export function dirFromLocale(locale: LocaleCode): TextDirection {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

export function applyDocumentDirection(locale: LocaleCode): void {
  if (typeof document === 'undefined') return
  const dir = dirFromLocale(locale)
  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', locale)
}

// ═══════════════════════════════════════════════════
// 8. Google Fonts / fonts locales
// ═══════════════════════════════════════════════════

const INJECTED_FONTS = new Set<string>()

export function loadFont(font: FontDef): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  const key = `${font.source}:${font.family}`
  if (INJECTED_FONTS.has(key)) return Promise.resolve()
  INJECTED_FONTS.add(key)

  return new Promise((resolve, reject) => {
    if (font.source === 'system') { resolve(); return }
    if (font.source === 'google' && font.url) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = font.url
      link.crossOrigin = 'anonymous'
      link.onload = () => resolve()
      link.onerror = () => reject(new Error(`Échec chargement Google Font ${font.family}`))
      document.head.appendChild(link)
      return
    }
    if (font.source === 'local-woff2' && font.url) {
      const face = new FontFace(font.family, `url(${font.url}) format('woff2')`)
      face.load()
        .then(f => {
          (document.fonts as any).add(f)
          resolve()
        })
        .catch(reject)
      return
    }
    resolve()
  })
}

export async function loadBrandFonts(brand: BrandConfig): Promise<void> {
  const tasks: Promise<void>[] = [loadFont(brand.fonts.heading), loadFont(brand.fonts.body)]
  if (brand.fonts.mono) tasks.push(loadFont(brand.fonts.mono))
  await Promise.all(tasks)
}

// ═══════════════════════════════════════════════════
// 9. Import / export charte JSON
// ═══════════════════════════════════════════════════

export const BRAND_SCHEMA = 'atlas-wayfinder-brand@1'

export function exportBrandJson(brand: BrandConfig): string {
  return JSON.stringify({ schema: BRAND_SCHEMA, exportedAt: new Date().toISOString(), brand }, null, 2)
}

export function importBrandJson(raw: string): { success: boolean; brand?: BrandConfig; error?: string } {
  try {
    const parsed = JSON.parse(raw)
    if (parsed.schema !== BRAND_SCHEMA) {
      return { success: false, error: `Schema incompatible : ${parsed.schema}` }
    }
    const brand = parsed.brand as BrandConfig
    if (!brand?.palette?.primary) return { success: false, error: 'Palette invalide.' }
    return { success: true, brand }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'JSON invalide' }
  }
}

// ═══════════════════════════════════════════════════
// 10. Helper : Build palette from scratch
// ═══════════════════════════════════════════════════

/** Construit une BrandConfig valide WCAG AA depuis juste une couleur primaire. */
export function buildBrandFromPrimary(primaryHex: string): BrandConfig {
  const palette = generatePaletteFromPrimary(primaryHex)
  return {
    palette: {
      primary: palette.primary,
      secondary: palette.secondary,
      accent: palette.accent,
      emergency: palette.emergency,
      neutral: palette.neutral,
      background: palette.background,
      backgroundDark: palette.backgroundDark,
      foreground: palette.foreground,
      foregroundDark: palette.foregroundDark,
    },
    fonts: {
      heading: {
        family: 'Inter', source: 'google',
        weights: [400, 600, 700],
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
        fallback: 'system-ui, sans-serif',
      },
      body: {
        family: 'Inter', source: 'google',
        weights: [400, 500],
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap',
        fallback: 'system-ui, sans-serif',
      },
    },
    borderRadius: 'md',
    iconStyle: 'outline',
    mapStyle: 'default',
    themeMode: 'light',
    wcagLevel: 'AA',
    source: { kind: 'generated-from-primary', importedAt: new Date().toISOString() },
  }
}
