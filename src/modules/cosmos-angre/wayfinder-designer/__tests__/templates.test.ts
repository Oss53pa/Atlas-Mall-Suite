// ═══ Tests templates ═══
// CDC §10 : "Tests unitaires sur templateEngine (rendu déterministe)"

import { describe, it, expect } from 'vitest'
import { listTemplates, getTemplate, getTemplateByFormat,
         validateAllTemplates, getGalleryGroups } from '../templates/registry'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { buildDefaultConfig } from '../store/designerStore'
import type { InjectedPlanData } from '../types'

const FAKE_PLAN: InjectedPlanData = {
  projectName: 'Test Mall',
  floors: [{
    id: 'rdc', label: 'RDC', order: 0,
    walls: [{ x1: 0, y1: 0, x2: 100, y2: 0 }],
    spaces: [{
      id: 's1', label: 'Boutique 1', type: 'local_commerce',
      polygon: [[10, 10], [30, 10], [30, 30], [10, 30]],
    }],
    bounds: { width: 100, height: 100 },
  }],
  pois: [{ id: 'p1', label: 'Café', type: 'restauration', x: 50, y: 50 }],
  entrances: [{ id: 'e1', label: 'Entrée', x: 0, y: 50 }],
  exits: [],
}

describe('templates registry', () => {
  it('contient bien 7 templates (4 digital + 3 print)', () => {
    const all = listTemplates()
    expect(all).toHaveLength(7)
    const digital = all.filter(t => t.metadata.kind !== 'print-poster')
    const print = all.filter(t => t.metadata.kind === 'print-poster')
    expect(digital).toHaveLength(4)
    expect(print).toHaveLength(3)
  })

  it('chaque template implémente l\'interface complète (CDC §04)', () => {
    const validations = validateAllTemplates()
    for (const v of validations) {
      expect(v.valid, `${v.id} : ${v.issues.join(', ')}`).toBe(true)
    }
  })

  it('getTemplate retourne null pour un id inconnu', () => {
    expect(getTemplate('not-found')).toBeNull()
  })

  it('getTemplateByFormat fonctionne pour chaque format', () => {
    const formats = [
      'kiosk-portrait-1080x1920', 'kiosk-landscape-1920x1080',
      'web-responsive', 'tablet-portrait-768x1024',
      'poster-A0', 'poster-A1', 'poster-A2',
    ] as const
    for (const f of formats) {
      const t = getTemplateByFormat(f)
      expect(t, `Template manquant pour ${f}`).not.toBeNull()
      expect(t?.metadata.format).toBe(f)
    }
  })

  it('getGalleryGroups produit 2 groupes (digital + print)', () => {
    const groups = getGalleryGroups()
    expect(groups.map(g => g.key)).toEqual(['digital', 'print'])
    expect(groups[0].items.length).toBe(4)
    expect(groups[1].items.length).toBe(3)
  })
})

describe('templates rendu déterministe', () => {
  it('même config + planData → même SVG (idempotence)', () => {
    const config = buildDefaultConfig()
    const t = getTemplate('kiosk-portrait-default')!
    const svg1 = renderToStaticMarkup(
      React.createElement(t.render as any, {
        config, metadata: t.metadata, planData: FAKE_PLAN, renderMode: 'export',
      }),
    )
    const svg2 = renderToStaticMarkup(
      React.createElement(t.render as any, {
        config, metadata: t.metadata, planData: FAKE_PLAN, renderMode: 'export',
      }),
    )
    expect(svg1).toBe(svg2)
  })

  it('chaque template rend un SVG non vide', () => {
    const config = buildDefaultConfig()
    for (const t of listTemplates()) {
      const svg = renderToStaticMarkup(
        React.createElement(t.render as any, {
          config, metadata: t.metadata, planData: FAKE_PLAN, renderMode: 'export',
        }),
      )
      expect(svg.length, `Template ${t.metadata.id} produit un SVG vide`).toBeGreaterThan(100)
      expect(svg).toContain('<svg')
    }
  })

  it('changement de palette → SVG différent', () => {
    const config1 = buildDefaultConfig()
    const config2 = { ...config1, brand: { ...config1.brand, palette: { ...config1.brand.palette, primary: '#ff0000' } } }
    const t = getTemplate('kiosk-portrait-default')!
    const svg1 = renderToStaticMarkup(
      React.createElement(t.render as any, {
        config: config1, metadata: t.metadata, planData: FAKE_PLAN, renderMode: 'export',
      }),
    )
    const svg2 = renderToStaticMarkup(
      React.createElement(t.render as any, {
        config: config2, metadata: t.metadata, planData: FAKE_PLAN, renderMode: 'export',
      }),
    )
    expect(svg1).not.toBe(svg2)
    expect(svg2).toContain('ff0000')   // nouvelle couleur présente
  })
})

describe('templates dimensions', () => {
  it('templates print sont en mm avec DPI', () => {
    const print = listTemplates().filter(t => t.metadata.kind === 'print-poster')
    for (const t of print) {
      expect(t.metadata.dimensions.unit).toBe('mm')
      expect((t.metadata.dimensions as any).dpi).toBeGreaterThanOrEqual(150)
      expect(t.metadata.bleed).toBeGreaterThanOrEqual(3)
    }
  })

  it('templates digitaux sont en px', () => {
    const digital = listTemplates().filter(t => t.metadata.kind !== 'print-poster')
    for (const t of digital) {
      expect(t.metadata.dimensions.unit).toBe('px')
      expect(t.metadata.bleed).toBe(0)
    }
  })

  it('A0 = 841×1189 mm, A1 = 594×841, A2 = 420×594', () => {
    const a0 = getTemplateByFormat('poster-A0')!.metadata.dimensions
    const a1 = getTemplateByFormat('poster-A1')!.metadata.dimensions
    const a2 = getTemplateByFormat('poster-A2')!.metadata.dimensions
    expect(a0.width).toBe(841); expect(a0.height).toBe(1189)
    expect(a1.width).toBe(594); expect(a1.height).toBe(841)
    expect(a2.width).toBe(420); expect(a2.height).toBe(594)
  })
})
