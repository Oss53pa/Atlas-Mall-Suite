// ═══ Template kiosk-landscape : 1920×1080 ═══
//
// Borne horizontale (CDC §04) :
//   - Plan à gauche (60 %)
//   - Panneau latéral droite (40 %) avec recherche, catégories, infos

import React from 'react'
import type { Template, TemplateProps, TemplateMetadata, TemplateFormat } from '../types'
import { MapRenderer } from './shared/MapRenderer'
import { TemplateHeader, TemplateFooter, TemplateLegend } from './shared/Chrome'

const META: TemplateMetadata = {
  id: 'kiosk-landscape-default',
  format: 'kiosk-landscape-1920x1080',
  kind: 'digital-kiosk',
  label: 'Borne horizontale 1920×1080',
  description: 'Borne tactile paysage. Plan à gauche, panneau latéral à droite.',
  dimensions: { unit: 'px', width: 1920, height: 1080 },
  aspectRatio: 1920 / 1080,
  safeMargin: 24,
  bleed: 0,
  tags: ['landscape', 'borne', 'tactile', 'digital'],
  schemaVersion: '1.0',
}

const KioskLandscape: React.FC<TemplateProps> = ({ config, planData }) => {
  const W = META.dimensions.width
  const H = META.dimensions.height
  const headerH = 80
  const footerH = 80
  const sidebarW = W * 0.4
  const planW = W - sidebarW
  const planH = H - headerH - footerH
  const palette = config.brand.palette
  const isDark = config.previewMode === 'dark'
  const placeholder = config.i18nStrings[config.project.activeLocale]?.searchPlaceholder ?? 'Que cherchez-vous ?'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: isDark ? palette.backgroundDark : palette.background }}>

      {/* Header */}
      <TemplateHeader config={config} width={W} height={headerH} planData={planData} />

      {/* Plan gauche */}
      <g transform={`translate(0, ${headerH})`}>
        <MapRenderer config={config} planData={planData}
          width={planW} height={planH} svgId="kiosk-landscape-map" />
      </g>

      {/* Sidebar droite */}
      <g transform={`translate(${planW}, ${headerH})`}>
        <rect width={sidebarW} height={planH}
          fill={isDark ? '#0b1120' : '#f1f5f9'} />

        {/* Search */}
        <rect x={32} y={32} width={sidebarW - 64} height={64}
          rx={32} fill={isDark ? '#0f172a' : '#fff'}
          stroke={palette.primary} strokeOpacity={0.3} strokeWidth={2} />
        <text x={64} y={70}
          fontSize={22} fontFamily="var(--wdr-font-body)"
          fill={isDark ? palette.foregroundDark : '#94a3b8'}>
          🔍 {placeholder}
        </text>

        {/* Catégories */}
        <text x={32} y={140} fontSize={16} fontWeight={700}
          fontFamily="var(--wdr-font-heading)"
          fill={isDark ? palette.foregroundDark : palette.foreground}>
          Catégories
        </text>
        {config.search.suggestCategories.slice(0, 6).map((cat, i) => {
          const yRow = 160 + i * 56
          return (
            <g key={cat} transform={`translate(32, ${yRow})`}>
              <rect width={sidebarW - 64} height={48} rx={12}
                fill={palette.primary} fillOpacity={0.08}
                stroke={palette.primary} strokeOpacity={0.2} />
              <text x={20} y={30}
                fontSize={18} fontFamily="var(--wdr-font-body)"
                fontWeight={600}
                fill={palette.primary}>
                {cat}
              </text>
              <text x={sidebarW - 84} y={30}
                fontSize={20} fill={palette.primary}>
                ›
              </text>
            </g>
          )
        })}

        {/* Légende */}
        <TemplateLegend config={config} planData={planData}
          x={32} y={Math.min(planH - 280, 160 + 6 * 56 + 24)}
          width={sidebarW - 64} height={260} />
      </g>

      {/* Footer */}
      <TemplateFooter config={config} width={W} height={footerH}
        y={H - footerH} scaleMeters={20} />
    </svg>
  )
}

export const kioskLandscapeTemplate: Template = {
  metadata: META,
  render: (props) => <KioskLandscape {...props} />,
  getMetadata: () => META,
  getSupportedFormats: (): TemplateFormat[] => ['kiosk-landscape-1920x1080'],
}
