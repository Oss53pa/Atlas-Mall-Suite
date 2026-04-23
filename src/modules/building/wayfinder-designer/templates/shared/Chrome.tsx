// ═══ Chrome templates partagés : Header, Footer, Legend, ScaleBar ═══
// Composants purs réutilisés par tous les templates du registry.

import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { DesignerConfig, InjectedPlanData } from '../../types'

// ─── Header ──────────────────────────────────────

export const TemplateHeader: React.FC<{
  config: DesignerConfig
  height: number            // px
  width: number             // px (fullwidth)
  planData: InjectedPlanData
}> = ({ config, height, width, planData }) => {
  if (!config.header.enabled) return null
  const { header, brand, project } = config
  const palette = brand.palette
  const isDark = config.previewMode === 'dark'
  const bg = isDark ? palette.backgroundDark : palette.primary
  const fg = '#ffffff'

  return (
    <g>
      <rect x={0} y={0} width={width} height={height} fill={bg} />
      {header.showLogo && project.logoUrl && (
        <image
          href={project.logoUrl}
          x={24}
          y={height * 0.2}
          height={height * 0.6}
          preserveAspectRatio="xMinYMid meet"
        />
      )}
      {header.showSiteName && (
        <text
          x={project.logoUrl ? 24 + height * 2 : 24}
          y={height * 0.45}
          fontSize={Math.max(16, height * 0.35)}
          fontWeight={700}
          fontFamily="var(--wdr-font-heading, sans-serif)"
          fill={fg}
        >
          {project.siteName || planData.projectName}
        </text>
      )}
      {header.showTagline && project.tagline && (
        <text
          x={project.logoUrl ? 24 + height * 2 : 24}
          y={height * 0.7}
          fontSize={Math.max(10, height * 0.18)}
          fontWeight={400}
          fontFamily="var(--wdr-font-body, sans-serif)"
          fill={fg}
          fillOpacity={0.85}
        >
          {project.tagline}
        </text>
      )}
      {header.showLanguageSwitch && project.locales.length > 1 && (
        <g transform={`translate(${width - 24}, ${height / 2})`}>
          {project.locales.slice(0, 4).map((loc, i) => {
            const isActive = loc === project.activeLocale
            const x = -i * 48
            return (
              <g key={loc} transform={`translate(${x}, 0)`}>
                <rect x={-20} y={-12} width={40} height={24} rx={12}
                  fill={isActive ? palette.accent : 'rgba(255,255,255,0.15)'} />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill={fg}
                >
                  {loc.split('-')[0].toUpperCase()}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </g>
  )
}

// ─── Footer ──────────────────────────────────────

export const TemplateFooter: React.FC<{
  config: DesignerConfig
  height: number
  width: number
  y: number               // offset Y dans le SVG parent
  /** Échelle du plan (m / unité SVG). */
  scaleMeters?: number
  qrTargetUrl?: string
}> = ({ config, height, width, y, scaleMeters, qrTargetUrl }) => {
  if (!config.footer.enabled) return null
  const { footer, brand, project } = config
  const palette = brand.palette
  const isDark = config.previewMode === 'dark'
  const bg = isDark ? palette.backgroundDark : palette.background
  const fg = isDark ? palette.foregroundDark : palette.foreground

  return (
    <g transform={`translate(0, ${y})`}>
      <line x1={24} y1={0} x2={width - 24} y2={0}
        stroke={palette.neutral} strokeOpacity={0.3} strokeWidth={0.5} />
      <rect x={0} y={0} width={width} height={height} fill={bg} />

      {/* Nord géographique */}
      {footer.showNorthArrow && (
        <g transform={`translate(40, ${height / 2})`}>
          <circle r={14} fill="none" stroke={fg} strokeOpacity={0.4} strokeWidth={1} />
          <path d="M 0 -10 L 4 6 L 0 3 L -4 6 Z" fill={palette.emergency} />
          <text y={22} textAnchor="middle" fontSize={9}
            fontFamily="var(--wdr-font-body, sans-serif)"
            fill={fg} fillOpacity={0.7}>N</text>
        </g>
      )}

      {/* Échelle graphique */}
      {footer.showScaleBar && scaleMeters && (
        <g transform={`translate(100, ${height / 2})`}>
          <rect x={0} y={-3} width={80} height={6} fill={fg} fillOpacity={0.15} />
          <rect x={0} y={-3} width={40} height={6} fill={fg} fillOpacity={0.8} />
          <text y={18} fontSize={9} fill={fg} fillOpacity={0.7}
            fontFamily="var(--wdr-font-body, sans-serif)">
            0 — {scaleMeters.toFixed(0)} m
          </text>
        </g>
      )}

      {/* Version + date */}
      {footer.showVersion && (
        <text x={width / 2} y={height / 2 + 4}
          textAnchor="middle" fontSize={9}
          fontFamily="var(--wdr-font-body, sans-serif)"
          fill={fg} fillOpacity={0.5}>
          {project.siteName} · v{project.version} · {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
        </text>
      )}

      {/* Custom mention légale */}
      {footer.customText && (
        <text x={width / 2} y={height - 8}
          textAnchor="middle" fontSize={8}
          fill={fg} fillOpacity={0.45}>
          {footer.customText}
        </text>
      )}

      {/* QR code bas-droite */}
      {footer.showQrCode && (footer.qrUrl || qrTargetUrl) && (
        <g transform={`translate(${width - height}, ${0})`}>
          <foreignObject x={4} y={4} width={height - 8} height={height - 8}>
            <QRCodeSVG
              value={footer.qrUrl ?? qrTargetUrl ?? ''}
              size={height - 8}
              bgColor="transparent"
              fgColor={fg}
              level="M"
              includeMargin={false}
            />
          </foreignObject>
        </g>
      )}
    </g>
  )
}

// ─── Légende ─────────────────────────────────────

export const TemplateLegend: React.FC<{
  config: DesignerConfig
  planData: InjectedPlanData
  x: number
  y: number
  width: number
  height: number
}> = ({ config, planData, x, y, width, height }) => {
  if (!config.legend.enabled) return null
  const palette = config.brand.palette
  const isDark = config.previewMode === 'dark'
  const fg = isDark ? palette.foregroundDark : palette.foreground
  const bg = isDark ? palette.backgroundDark : palette.background

  // Regroupe les POIs par type
  const byCategory = new Map<string, number>()
  for (const p of planData.pois) {
    byCategory.set(p.type, (byCategory.get(p.type) ?? 0) + 1)
  }
  const items = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, config.legend.maxItems ?? 30)

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect width={width} height={height} rx={8} fill={bg}
        stroke={palette.neutral} strokeOpacity={0.2} strokeWidth={1} />
      <text x={16} y={22} fontSize={14} fontWeight={700}
        fontFamily="var(--wdr-font-heading, sans-serif)"
        fill={fg}>
        Légende
      </text>
      {items.map(([cat, count], i) => {
        const yRow = 40 + i * 22
        if (yRow > height - 14) return null
        return (
          <g key={cat} transform={`translate(16, ${yRow})`}>
            <circle r={6} fill={palette.accent} />
            <text x={14} fontSize={11}
              fontFamily="var(--wdr-font-body, sans-serif)"
              fill={fg}>
              {humanizeCategory(cat)}
            </text>
            <text x={width - 32} textAnchor="end" fontSize={10}
              fill={fg} fillOpacity={0.5}>
              {count}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function humanizeCategory(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase())
}
