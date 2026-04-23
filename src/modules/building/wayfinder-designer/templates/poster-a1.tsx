// ═══ Template poster-A1 : 594×841 mm @ 150 DPI ═══
//
// Plan de site synthétique (CDC §04). Plus compact, optimisé pour distance
// de lecture moyenne (1-2m).

import React from 'react'
import type { Template, TemplateProps, TemplateMetadata, TemplateFormat } from '../types'
import { MapRenderer } from './shared/MapRenderer'
import { TemplateHeader, TemplateFooter, TemplateLegend } from './shared/Chrome'
import { PAPER_FORMATS_MM, mmToPx } from './shared/printDimensions'

const DPI = 150
const FORMAT = PAPER_FORMATS_MM.A1

const META: TemplateMetadata = {
  id: 'poster-a1-default',
  format: 'poster-A1',
  kind: 'print-poster',
  label: 'Poster A1 — 594 × 841 mm',
  description: 'Plan de site synthétique grand format, vectoriel @ 150 DPI.',
  dimensions: { unit: 'mm', width: FORMAT.w, height: FORMAT.h, dpi: DPI },
  aspectRatio: FORMAT.w / FORMAT.h,
  safeMargin: 22,
  bleed: 3,
  tags: ['poster', 'A1', 'print', 'mural'],
  schemaVersion: '1.0',
}

const PosterA1: React.FC<TemplateProps> = ({ config, planData }) => {
  const W = mmToPx(FORMAT.w, DPI)
  const H = mmToPx(FORMAT.h, DPI)
  const headerH = mmToPx(60, DPI)
  const footerH = mmToPx(45, DPI)
  const margin = mmToPx(22, DPI)
  const legendH = mmToPx(140, DPI)
  const planW = W - 2 * margin
  const planH = H - headerH - footerH - 2 * margin - legendH - mmToPx(15, DPI)
  const palette = config.brand.palette

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: palette.background }}>

      <TemplateHeader config={config} width={W} height={headerH} planData={planData} />

      {/* Plan haut */}
      <g transform={`translate(${margin}, ${headerH + margin})`}>
        <MapRenderer config={config} planData={planData}
          width={planW} height={planH} svgId="poster-a1-map" readOnly />
      </g>

      {/* Légende horizontale en bas */}
      <TemplateLegend config={config} planData={planData}
        x={margin}
        y={headerH + margin + planH + mmToPx(15, DPI)}
        width={planW}
        height={legendH} />

      <TemplateFooter config={config} width={W} height={footerH}
        y={H - footerH} scaleMeters={20} />
    </svg>
  )
}

export const posterA1Template: Template = {
  metadata: META,
  render: (props) => <PosterA1 {...props} />,
  getMetadata: () => META,
  getSupportedFormats: (): TemplateFormat[] => ['poster-A1'],
}
