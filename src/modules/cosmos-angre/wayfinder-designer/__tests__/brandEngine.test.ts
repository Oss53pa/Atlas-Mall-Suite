// ═══ Tests unitaires brandEngine ═══
// CDC §10 : "Tests unitaires sur brandEngine (contrastes WCAG)"

import { describe, it, expect } from 'vitest'
import {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb,
  contrastRatio, evaluateContrast, adjustForContrast,
  generatePaletteFromPrimary, auditPalette,
  simulateColorBlindness, relativeLuminance,
  generateCssVariables, dirFromLocale,
  exportBrandJson, importBrandJson,
  buildBrandFromPrimary,
} from '../engines/brandEngine'

describe('brandEngine — couleurs', () => {
  it('hexToRgb / rgbToHex sont inverses', () => {
    expect(rgbToHex(hexToRgb('#0ea5e9'))).toBe('#0ea5e9')
    expect(rgbToHex(hexToRgb('#ffffff'))).toBe('#ffffff')
    expect(rgbToHex(hexToRgb('#000000'))).toBe('#000000')
  })

  it('rgbToHsl / hslToRgb sont quasi-inverses', () => {
    const original = { r: 100, g: 150, b: 200 }
    const back = hslToRgb(rgbToHsl(original))
    expect(back.r).toBeCloseTo(original.r, 0)
    expect(back.g).toBeCloseTo(original.g, 0)
    expect(back.b).toBeCloseTo(original.b, 0)
  })

  it('hex 3-chars sont étendus correctement', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe('brandEngine — contraste WCAG', () => {
  it('contraste blanc/noir = 21:1 (max théorique)', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0)
  })

  it('contraste identique = 1:1', () => {
    expect(contrastRatio('#abcdef', '#abcdef')).toBeCloseTo(1, 1)
  })

  it('evaluateContrast — détection AA/AAA correcte', () => {
    // Texte noir sur blanc : 21:1 → AAA
    const r1 = evaluateContrast('#000000', '#ffffff')
    expect(r1.passesAA).toBe(true)
    expect(r1.passesAAA).toBe(true)
    expect(r1.level).toBe('AAA')

    // Gris #949494 sur blanc : ~3.5:1 → fail AA mais OK AALarge
    const r2 = evaluateContrast('#949494', '#ffffff')
    expect(r2.passesAA).toBe(false)
    expect(r2.passesAALarge).toBe(true)
  })
})

describe('brandEngine — auto-correction contraste', () => {
  it('adjustForContrast trouve une couleur conforme AA', () => {
    // Bleu très clair sur blanc → trop faible
    const fixed = adjustForContrast('#a8d4f0', '#ffffff', 4.5)
    const ratio = contrastRatio(fixed, '#ffffff')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('adjustForContrast préserve une couleur déjà conforme', () => {
    const already = '#0066cc'
    expect(adjustForContrast(already, '#ffffff', 4.5)).toBe(already)
  })

  it('adjustForContrast fallback à blanc/noir si nécessaire', () => {
    // Couleur très contraintée
    const result = adjustForContrast('#888888', '#888888', 4.5)
    // Doit produire blanc ou noir (extrêmes)
    expect(['#000000', '#ffffff']).toContain(result)
  })
})

describe('brandEngine — palette generation', () => {
  it('generatePaletteFromPrimary produit une scale 50-950 cohérente', () => {
    const p = generatePaletteFromPrimary('#0ea5e9')
    expect(p.scale[50]).toBeDefined()
    expect(p.scale[500]).toBeDefined()
    expect(p.scale[950]).toBeDefined()
    // 50 = très clair → luminance haute
    const l50 = relativeLuminance(hexToRgb(p.scale[50]))
    const l950 = relativeLuminance(hexToRgb(p.scale[950]))
    expect(l50).toBeGreaterThan(l950)
  })

  it('foreground/background respectent WCAG AA après generation', () => {
    const p = generatePaletteFromPrimary('#0ea5e9')
    const r1 = contrastRatio(p.foreground, p.background)
    const r2 = contrastRatio(p.foregroundDark, p.backgroundDark)
    expect(r1).toBeGreaterThanOrEqual(4.5)
    expect(r2).toBeGreaterThanOrEqual(4.5)
  })

  it('buildBrandFromPrimary produit BrandConfig WCAG AA valide', () => {
    const brand = buildBrandFromPrimary('#0ea5e9')
    const audit = auditPalette(brand.palette, 'AA')
    // Au moins texte foreground/background OK
    const fgBgCheck = audit.checks.find(c => c.pair === 'Texte principal sur fond clair')
    expect(fgBgCheck?.passes).toBe(true)
  })
})

describe('brandEngine — simulation daltonisme', () => {
  it('simulateColorBlindness produit une couleur valide', () => {
    const sim = simulateColorBlindness('#dc2626', 'protanopia')
    expect(sim).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('simulation produit des couleurs valides pour les 3 types', () => {
    for (const type of ['protanopia', 'deuteranopia', 'tritanopia'] as const) {
      const sim = simulateColorBlindness('#808080', type)
      expect(sim).toMatch(/^#[0-9a-f]{6}$/i)
      const { r, g, b } = hexToRgb(sim)
      // Bornes [0..255] respectées
      expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(255)
      expect(g).toBeGreaterThanOrEqual(0); expect(g).toBeLessThanOrEqual(255)
      expect(b).toBeGreaterThanOrEqual(0); expect(b).toBeLessThanOrEqual(255)
    }
  })

  it('rouge et vert tendent à converger en deuteranopia', () => {
    const red = simulateColorBlindness('#ff0000', 'deuteranopia')
    const green = simulateColorBlindness('#00ff00', 'deuteranopia')
    const dR = hexToRgb(red), dG = hexToRgb(green)
    // Distance euclidienne plus petite après simulation
    const d = Math.hypot(dR.r - dG.r, dR.g - dG.g, dR.b - dG.b)
    const dOriginal = Math.hypot(255, 255, 0) // rouge vs vert pur
    expect(d).toBeLessThan(dOriginal)
  })
})

describe('brandEngine — direction RTL', () => {
  it('arabe et hébreu sont RTL', () => {
    expect(dirFromLocale('ar-MA')).toBe('rtl')
    expect(dirFromLocale('he-IL')).toBe('rtl')
  })

  it('français/anglais/dioula sont LTR', () => {
    expect(dirFromLocale('fr-FR')).toBe('ltr')
    expect(dirFromLocale('en-US')).toBe('ltr')
    expect(dirFromLocale('dyu-CI')).toBe('ltr')
  })
})

describe('brandEngine — export/import JSON', () => {
  it('round-trip export → import', () => {
    const brand = buildBrandFromPrimary('#0ea5e9')
    const json = exportBrandJson(brand)
    const result = importBrandJson(json)
    expect(result.success).toBe(true)
    expect(result.brand?.palette.primary).toBe(brand.palette.primary)
  })

  it('import rejette schéma incompatible', () => {
    const result = importBrandJson(JSON.stringify({ schema: 'wrong-schema', brand: {} }))
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Schema/)
  })

  it('import rejette JSON invalide', () => {
    const result = importBrandJson('not valid json {{{')
    expect(result.success).toBe(false)
  })
})

describe('brandEngine — CSS variables', () => {
  it('generateCssVariables produit du CSS valide', () => {
    const brand = buildBrandFromPrimary('#0ea5e9')
    const css = generateCssVariables(brand)
    expect(css).toContain(':root')
    expect(css).toContain('--wdr-primary:')
    expect(css).toContain('--wdr-bg:')
    expect(css).toContain('--wdr-radius:')
    expect(css).toContain('--wdr-font-heading:')
  })

  it('mode dark utilise backgroundDark', () => {
    const brand = buildBrandFromPrimary('#0ea5e9')
    const cssLight = generateCssVariables(brand, { themeMode: 'light' })
    const cssDark = generateCssVariables(brand, { themeMode: 'dark' })
    expect(cssLight).toContain(brand.palette.background)
    expect(cssDark).toContain(brand.palette.backgroundDark)
  })
})
