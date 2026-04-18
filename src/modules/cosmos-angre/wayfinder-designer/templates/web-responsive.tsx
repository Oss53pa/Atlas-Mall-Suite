// ═══ Template web-responsive ═══
//
// Site web responsive WCAG AA (CDC §04) — breakpoints 375 / 768 / 1280 / 1920.
// Le template SVG est dimensionné à 1280×800 par défaut (desktop) avec viewBox
// adaptatif. L'export HTML produit du HTML responsive (cf. digitalEngine LOT 3)
// avec media queries CSS générées à partir des breakpoints.

import React from 'react'
import type { Template, TemplateProps, TemplateMetadata, TemplateFormat } from '../types'
import { MapRenderer } from './shared/MapRenderer'
import { TemplateHeader, TemplateFooter, TemplateLegend } from './shared/Chrome'

const BREAKPOINTS = [375, 768, 1280, 1920]
const PREVIEW_W = 1280
const PREVIEW_H = 800

const META: TemplateMetadata = {
  id: 'web-responsive-default',
  format: 'web-responsive',
  kind: 'digital-web',
  label: 'Web responsive',
  description: 'Site web wayfinder responsive WCAG AA. Mobile / tablette / desktop / TV.',
  dimensions: { unit: 'px', width: PREVIEW_W, height: PREVIEW_H },
  breakpoints: BREAKPOINTS,
  aspectRatio: PREVIEW_W / PREVIEW_H,
  safeMargin: 16,
  bleed: 0,
  tags: ['web', 'responsive', 'AA', 'desktop', 'mobile'],
  schemaVersion: '1.0',
}

const WebResponsive: React.FC<TemplateProps> = ({ config, planData }) => {
  const W = PREVIEW_W
  const H = PREVIEW_H
  const headerH = 72
  const footerH = 60
  const sidebarW = 320     // breakpoint desktop
  const planW = W - sidebarW
  const planH = H - headerH - footerH
  const palette = config.brand.palette
  const isDark = config.previewMode === 'dark'
  const placeholder = config.i18nStrings[config.project.activeLocale]?.searchPlaceholder ?? 'Rechercher'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: isDark ? palette.backgroundDark : palette.background }}>

      {/* Header (sticky web) */}
      <TemplateHeader config={config} width={W} height={headerH} planData={planData} />

      {/* Layout principal */}
      <g transform={`translate(0, ${headerH})`}>
        {/* Plan central */}
        <MapRenderer config={config} planData={planData}
          width={planW} height={planH} svgId="web-responsive-map" />

        {/* Sidebar droite */}
        <g transform={`translate(${planW}, 0)`}>
          <rect width={sidebarW} height={planH}
            fill={isDark ? '#0b1120' : '#f8fafc'} />

          {/* Search */}
          <g transform={`translate(20, 20)`}>
            <rect width={sidebarW - 40} height={48} rx={24}
              fill={isDark ? '#0f172a' : '#fff'}
              stroke={palette.neutral} strokeOpacity={0.3} />
            <text x={20} y={32} fontSize={14}
              fontFamily="var(--wdr-font-body)"
              fill={isDark ? palette.foregroundDark : '#94a3b8'}>
              🔍 {placeholder}
            </text>
          </g>

          {/* Catégories tags */}
          <g transform="translate(20, 88)">
            <text fontSize={12} fontWeight={600} y={14}
              fontFamily="var(--wdr-font-heading)"
              fill={isDark ? palette.foregroundDark : palette.foreground}>
              Filtrer par catégorie
            </text>
            {config.search.suggestCategories.slice(0, 8).map((cat, i) => {
              const x = (i % 2) * 140
              const y = 28 + Math.floor(i / 2) * 36
              return (
                <g key={cat} transform={`translate(${x}, ${y})`}>
                  <rect width={130} height={28} rx={14}
                    fill={palette.primary} fillOpacity={0.1}
                    stroke={palette.primary} strokeOpacity={0.3} />
                  <text x={14} y={18} fontSize={11}
                    fontFamily="var(--wdr-font-body)"
                    fill={palette.primary}>
                    {cat}
                  </text>
                </g>
              )
            })}
          </g>

          {/* Légende */}
          <TemplateLegend config={config} planData={planData}
            x={20} y={Math.min(planH - 240, 240)}
            width={sidebarW - 40} height={220} />
        </g>
      </g>

      {/* Footer */}
      <TemplateFooter config={config} width={W} height={footerH}
        y={H - footerH} scaleMeters={20} />

      {/* Note breakpoints (visible uniquement en preview Designer) */}
      <text x={16} y={H - 8} fontSize={9}
        fill={palette.neutral} fillOpacity={0.5}>
        Breakpoints : {BREAKPOINTS.join(' · ')} px · WCAG 2.1 AA
      </text>
    </svg>
  )
}

export const webResponsiveTemplate: Template = {
  metadata: META,
  render: (props) => <WebResponsive {...props} />,
  getMetadata: () => META,
  getSupportedFormats: (): TemplateFormat[] => ['web-responsive'],
}
