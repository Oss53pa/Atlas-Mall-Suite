// ═══ Template poster-A0 : 841×1189 mm @ 150 DPI ═══
//
// Plan d'accueil mural grand format (CDC §04). Plan centré, légende complète,
// QR pied droit, repères de coupe optionnels via ExportOptions.bleed.

import React from 'react'
import type { Template, TemplateProps, TemplateMetadata, TemplateFormat } from '../types'
import { MapRenderer } from './shared/MapRenderer'
import { TemplateHeader, TemplateFooter, TemplateLegend } from './shared/Chrome'
import { PAPER_FORMATS_MM, mmToPx } from './shared/printDimensions'

const DPI = 150
const FORMAT = PAPER_FORMATS_MM.A0

const META: TemplateMetadata = {
  id: 'poster-a0-default',
  format: 'poster-A0',
  kind: 'print-poster',
  label: 'Poster A0 — 841 × 1189 mm',
  description: 'Plan grand format mural, vectoriel @ 150 DPI. Légende complète, QR.',
  dimensions: { unit: 'mm', width: FORMAT.w, height: FORMAT.h, dpi: DPI },
  aspectRatio: FORMAT.w / FORMAT.h,
  safeMargin: 30,    // mm
  bleed: 3,          // mm bleed standard imprimerie
  tags: ['poster', 'A0', 'print', 'mural', 'grand-format'],
  schemaVersion: '1.0',
}

const PosterA0: React.FC<TemplateProps> = ({ config, planData }) => {
  const W = mmToPx(FORMAT.w, DPI)
  const H = mmToPx(FORMAT.h, DPI)
  const headerH = mmToPx(80, DPI)
  const footerH = mmToPx(60, DPI)
  const legendW = mmToPx(220, DPI)
  const margin = mmToPx(30, DPI)
  const planW = W - 2 * margin - legendW - mmToPx(20, DPI)
  const planH = H - headerH - footerH - 2 * margin
  const palette = config.brand.palette

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ background: palette.background }}>

      <TemplateHeader config={config} width={W} height={headerH} planData={planData} />

      {/* Plan vectoriel */}
      <g transform={`translate(${margin}, ${headerH + margin})`}>
        <MapRenderer config={config} planData={planData}
          width={planW} height={planH} svgId="poster-a0-map" readOnly />
      </g>

      {/* Légende latérale droite */}
      <TemplateLegend config={config} planData={planData}
        x={margin + planW + mmToPx(20, DPI)}
        y={headerH + margin}
        width={legendW}
        height={planH} />

      {/* Footer */}
      <TemplateFooter config={config} width={W} height={footerH}
        y={H - footerH} scaleMeters={20} />
    </svg>
  )
}

export const posterA0Template: Template = {
  metadata: META,
  render: (props) => <PosterA0 {...props} />,
  getMetadata: () => META,
  getSupportedFormats: (): TemplateFormat[] => ['poster-A0'],
}
