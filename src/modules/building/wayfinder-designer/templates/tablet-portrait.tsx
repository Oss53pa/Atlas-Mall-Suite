// ═══ Template tablet-portrait : 768×1024 ═══
//
// Tablette murale (CDC §04). Layout simplifié, gros boutons tactiles.

import React from 'react'
import type { Template, TemplateProps, TemplateMetadata, TemplateFormat } from '../types'
import { MapRenderer } from './shared/MapRenderer'
import { TemplateHeader, TemplateFooter } from './shared/Chrome'

const META: TemplateMetadata = {
  id: 'tablet-portrait-default',
  format: 'tablet-portrait-768x1024',
  kind: 'digital-tablet',
  label: 'Tablette murale 768×1024',
  description: 'Tablette portrait. Plan central, gros boutons catégories.',
  dimensions: { unit: 'px', width: 768, height: 1024 },
  aspectRatio: 768 / 1024,
  safeMargin: 20,
  bleed: 0,
  tags: ['portrait', 'tablette', 'tactile', 'digital'],
  schemaVersion: '1.0',
}

const TabletPortrait: React.FC<TemplateProps> = ({ config, planData }) => {
  const W = META.dimensions.width
  const H = META.dimensions.height
  const headerH = 88
  const footerH = 70
  const planH = H * 0.55
  const buttonsH = H - headerH - footerH - planH
  const palette = config.brand.palette
  const isDark = config.previewMode === 'dark'
  const placeholder = config.i18nStrings[config.project.activeLocale]?.searchPlaceholder ?? 'Rechercher'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: isDark ? palette.backgroundDark : palette.background }}>

      <TemplateHeader config={config} width={W} height={headerH} planData={planData} />

      {/* Plan */}
      <g transform={`translate(0, ${headerH})`}>
        <MapRenderer config={config} planData={planData}
          width={W} height={planH} svgId="tablet-portrait-map" />
      </g>

      {/* Search bar */}
      <g transform={`translate(20, ${headerH + planH + 8})`}>
        <rect width={W - 40} height={56} rx={28}
          fill={isDark ? '#0f172a' : '#fff'}
          stroke={palette.primary} strokeOpacity={0.3} strokeWidth={2} />
        <text x={32} y={36}
          fontSize={20} fontFamily="var(--wdr-font-body)"
          fill={isDark ? palette.foregroundDark : '#94a3b8'}>
          🔍 {placeholder}
        </text>
      </g>

      {/* Boutons catégories */}
      <g transform={`translate(20, ${headerH + planH + 80})`}>
        {config.search.suggestCategories.slice(0, 4).map((cat, i) => {
          const cellW = (W - 40 - 16) / 2
          const cellH = (buttonsH - 80 - 16) / 2
          const x = (i % 2) * (cellW + 16)
          const y = Math.floor(i / 2) * (cellH + 16)
          return (
            <g key={cat} transform={`translate(${x}, ${y})`}>
              <rect width={cellW} height={Math.max(60, cellH)} rx={12}
                fill={palette.primary} fillOpacity={0.12}
                stroke={palette.primary} strokeOpacity={0.3} />
              <text x={cellW / 2} y={Math.max(60, cellH) / 2 + 6}
                textAnchor="middle"
                fontSize={22} fontWeight={600}
                fontFamily="var(--wdr-font-heading)"
                fill={palette.primary}>
                {cat}
              </text>
            </g>
          )
        })}
      </g>

      <TemplateFooter config={config} width={W} height={footerH}
        y={H - footerH} scaleMeters={20} />
    </svg>
  )
}

export const tabletPortraitTemplate: Template = {
  metadata: META,
  render: (props) => <TabletPortrait {...props} />,
  getMetadata: () => META,
  getSupportedFormats: (): TemplateFormat[] => ['tablet-portrait-768x1024'],
}
