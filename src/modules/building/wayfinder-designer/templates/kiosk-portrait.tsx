// ═══ Template kiosk-portrait : 1080×1920 ═══
//
// Borne verticale (CDC §04) :
//   - Zone plan 60% (haut)
//   - Zone search 20% (milieu)
//   - Zone infos 20% (bas)

import React from 'react'
import type { Template, TemplateProps, TemplateMetadata, TemplateFormat } from '../types'
import { MapRenderer } from './shared/MapRenderer'
import { TemplateHeader, TemplateFooter } from './shared/Chrome'

const META: TemplateMetadata = {
  id: 'kiosk-portrait-default',
  format: 'kiosk-portrait-1080x1920',
  kind: 'digital-kiosk',
  label: 'Borne verticale 1080×1920',
  description: 'Borne tactile portrait. Plan 60 % haut · Recherche 20 % · Infos 20 %.',
  dimensions: { unit: 'px', width: 1080, height: 1920 },
  aspectRatio: 1080 / 1920,
  safeMargin: 24,
  bleed: 0,
  tags: ['portrait', 'borne', 'tactile', 'digital'],
  schemaVersion: '1.0',
}

const KioskPortrait: React.FC<TemplateProps> = ({ config, planData }) => {
  const W = META.dimensions.width
  const H = META.dimensions.height
  const headerH = (config.header.height / 100) * H
  const footerH = 120
  const planH = H * 0.60 - headerH
  const searchH = H * 0.20
  const infosH = H * 0.20 - footerH
  const palette = config.brand.palette
  const isDark = config.previewMode === 'dark'

  const placeholder = config.i18nStrings[config.project.activeLocale]?.searchPlaceholder ?? 'Que cherchez-vous ?'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: isDark ? palette.backgroundDark : palette.background }}>

      {/* Header */}
      <TemplateHeader config={config} width={W} height={headerH} planData={planData} />

      {/* Zone plan */}
      <g transform={`translate(0, ${headerH})`}>
        <MapRenderer config={config} planData={planData}
          width={W} height={planH} svgId="kiosk-portrait-map" />
      </g>

      {/* Zone search */}
      <g transform={`translate(0, ${headerH + planH})`}>
        <rect width={W} height={searchH}
          fill={isDark ? '#1e293b' : '#f8fafc'} />
        <rect x={48} y={searchH * 0.2} width={W - 96} height={searchH * 0.6}
          rx={searchH * 0.3} fill={isDark ? '#0f172a' : '#fff'}
          stroke={palette.neutral} strokeOpacity={0.3} strokeWidth={1.5} />
        <text x={88} y={searchH * 0.55}
          fontSize={36} fontFamily="var(--wdr-font-body)"
          fill={isDark ? palette.foregroundDark : '#94a3b8'}>
          🔍 {placeholder}
        </text>
      </g>

      {/* Zone infos / catégories */}
      <g transform={`translate(0, ${headerH + planH + searchH})`}>
        <rect width={W} height={infosH}
          fill={isDark ? palette.backgroundDark : palette.background} />
        {config.search.suggestCategories.slice(0, 4).map((cat, i) => {
          const cellW = (W - 96) / 4
          const cx = 48 + i * cellW
          return (
            <g key={cat} transform={`translate(${cx}, ${infosH * 0.15})`}>
              <rect width={cellW - 16} height={infosH * 0.7} rx={16}
                fill={palette.primary} fillOpacity={0.1}
                stroke={palette.primary} strokeOpacity={0.3} />
              <text x={(cellW - 16) / 2} y={infosH * 0.4}
                textAnchor="middle"
                fontSize={32} fontFamily="var(--wdr-font-heading)"
                fontWeight={600}
                fill={palette.primary}>
                {cat}
              </text>
            </g>
          )
        })}
      </g>

      {/* Footer */}
      <TemplateFooter config={config} width={W} height={footerH}
        y={H - footerH} scaleMeters={20} />
    </svg>
  )
}

export const kioskPortraitTemplate: Template = {
  metadata: META,
  render: (props) => <KioskPortrait {...props} />,
  getMetadata: () => META,
  getSupportedFormats: (): TemplateFormat[] => ['kiosk-portrait-1080x1920'],
}
