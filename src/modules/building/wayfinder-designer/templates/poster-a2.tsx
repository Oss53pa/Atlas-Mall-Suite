// ═══ Template poster-A2 : 420×594 mm @ 150 DPI ═══
//
// Plan sectoriel ou étage unique (CDC §04). Format moyen, lecture proche (50cm).

import React from 'react'
import type { Template, TemplateProps, TemplateMetadata, TemplateFormat } from '../types'
import { MapRenderer } from './shared/MapRenderer'
import { TemplateHeader, TemplateFooter, TemplateLegend } from './shared/Chrome'
import { PAPER_FORMATS_MM, mmToPx } from './shared/printDimensions'

const DPI = 150
const FORMAT = PAPER_FORMATS_MM.A2

const META: TemplateMetadata = {
  id: 'poster-a2-default',
  format: 'poster-A2',
  kind: 'print-poster',
  label: 'Poster A2 — 420 × 594 mm',
  description: 'Plan sectoriel ou étage unique, vectoriel @ 150 DPI. Format compact.',
  dimensions: { unit: 'mm', width: FORMAT.w, height: FORMAT.h, dpi: DPI },
  aspectRatio: FORMAT.w / FORMAT.h,
  safeMargin: 18,
  bleed: 3,
  tags: ['poster', 'A2', 'print'],
  schemaVersion: '1.0',
}

const PosterA2: React.FC<TemplateProps> = ({ config, planData }) => {
  const W = mmToPx(FORMAT.w, DPI)
  const H = mmToPx(FORMAT.h, DPI)
  const headerH = mmToPx(50, DPI)
  const footerH = mmToPx(40, DPI)
  const margin = mmToPx(18, DPI)
  const legendW = mmToPx(110, DPI)
  const planW = W - 2 * margin - legendW - mmToPx(12, DPI)
  const planH = H - headerH - footerH - 2 * margin
  const palette = config.brand.palette

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: palette.background }}>

      <TemplateHeader config={config} width={W} height={headerH} planData={planData} />

      <g transform={`translate(${margin}, ${headerH + margin})`}>
        <MapRenderer config={config} planData={planData}
          width={planW} height={planH} svgId="poster-a2-map" readOnly />
      </g>

      <TemplateLegend config={config} planData={planData}
        x={margin + planW + mmToPx(12, DPI)}
        y={headerH + margin}
        width={legendW}
        height={planH} />

      <TemplateFooter config={config} width={W} height={footerH}
        y={H - footerH} scaleMeters={20} />
    </svg>
  )
}

export const posterA2Template: Template = {
  metadata: META,
  render: (props) => <PosterA2 {...props} />,
  getMetadata: () => META,
  getSupportedFormats: (): TemplateFormat[] => ['poster-A2'],
}
