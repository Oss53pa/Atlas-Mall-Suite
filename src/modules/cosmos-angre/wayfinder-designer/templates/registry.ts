// ═══ WAYFINDER DESIGNER — Registry de templates ═══
//
// Registry centralisé de tous les templates Wayfinder Designer.
// Les templates sont des composants React PURS (sans useState, useEffect)
// acceptant uniquement DesignerConfig + planData en props, ce qui garantit :
//   - Rendu déterministe (même entrée = même sortie)
//   - SSR/headless-safe (export PDF/HTML via Playwright sans DOM React live)
//   - Testabilité stricte (snapshot testing)
//
// Référence CDC §04 — "Chaque template expose obligatoirement :
//   render(config), getMetadata(), getSupportedFormats()"

import type { Template, TemplateFormat, TemplateMetadata } from '../types'

import { kioskPortraitTemplate } from './kiosk-portrait'
import { kioskLandscapeTemplate } from './kiosk-landscape'
import { webResponsiveTemplate } from './web-responsive'
import { tabletPortraitTemplate } from './tablet-portrait'
import { posterA0Template } from './poster-a0'
import { posterA1Template } from './poster-a1'
import { posterA2Template } from './poster-a2'

// ─── Registry ─────────────────────────────────────

const TEMPLATES: Template[] = [
  kioskPortraitTemplate,
  kioskLandscapeTemplate,
  webResponsiveTemplate,
  tabletPortraitTemplate,
  posterA0Template,
  posterA1Template,
  posterA2Template,
]

export function getTemplate(id: string): Template | null {
  return TEMPLATES.find(t => t.metadata.id === id) ?? null
}

export function getTemplateByFormat(format: TemplateFormat): Template | null {
  return TEMPLATES.find(t => t.metadata.format === format) ?? null
}

export function listTemplates(): Template[] {
  return TEMPLATES
}

export function listTemplatesByKind(kind: Template['metadata']['kind']): Template[] {
  return TEMPLATES.filter(t => t.metadata.kind === kind)
}

export function listMetadata(): TemplateMetadata[] {
  return TEMPLATES.map(t => t.metadata)
}

// ─── Groupage UI (galerie §03 onglet 3) ───────────

export interface TemplateGalleryGroup {
  key: 'digital' | 'print'
  label: string
  items: TemplateMetadata[]
}

export function getGalleryGroups(): TemplateGalleryGroup[] {
  return [
    {
      key: 'digital',
      label: 'Digital interactif',
      items: TEMPLATES
        .filter(t => t.metadata.kind !== 'print-poster')
        .map(t => t.metadata),
    },
    {
      key: 'print',
      label: 'Impression grand format',
      items: TEMPLATES
        .filter(t => t.metadata.kind === 'print-poster')
        .map(t => t.metadata),
    },
  ]
}

// ─── Validation — détecte un template non conforme à l'interface §04 ─

export function validateTemplate(t: Template): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  const m = t.metadata
  if (!m.id) issues.push('metadata.id manquant')
  if (!m.format) issues.push('metadata.format manquant')
  if (!m.dimensions) issues.push('metadata.dimensions manquant')
  if (typeof t.render !== 'function') issues.push('render() non défini')
  if (typeof t.getMetadata !== 'function') issues.push('getMetadata() non défini')
  if (typeof t.getSupportedFormats !== 'function') issues.push('getSupportedFormats() non défini')
  const sup = t.getSupportedFormats()
  if (!sup.includes(m.format)) issues.push(`metadata.format ${m.format} non listé dans getSupportedFormats()`)
  return { valid: issues.length === 0, issues }
}

export function validateAllTemplates(): Array<{ id: string; valid: boolean; issues: string[] }> {
  return TEMPLATES.map(t => ({
    id: t.metadata.id,
    ...validateTemplate(t),
  }))
}
