// ═══ EXPORT DXF SECURITE — Format ASCII AutoCAD 2000 (AC1015) ═══
// Layers : CAMERAS, FOV_CONES, ZONES_SURVEILLANCE, LABELS, PERIMETRE
// Compatible AutoCAD / LibreCAD / BricsCAD

import type { Camera, Zone, Door } from '../cosmos-angre/shared/proph3t/types'

interface PlanDimensions {
  widthM: number
  heightM: number
  scaleX: number
  scaleY: number
}

export function exportSecurityDXF(
  cameras: Camera[],
  zones: Zone[],
  doors: Door[],
  dimensions: PlanDimensions
): string {
  const lines: string[] = []
  const { widthM, heightM, scaleX, scaleY } = dimensions

  // ── En-tete DXF ──
  lines.push('0', 'SECTION', '2', 'HEADER')
  lines.push('9', '$ACADVER', '1', 'AC1015')
  lines.push('9', '$EXTMIN', '10', '0', '20', '0', '30', '0')
  lines.push('9', '$EXTMAX', '10', String(widthM), '20', String(heightM), '30', '5')
  lines.push('0', 'ENDSEC')

  // ── Section TABLES (layers) ──
  lines.push('0', 'SECTION', '2', 'TABLES')
  lines.push('0', 'TABLE', '2', 'LAYER')

  const LAYERS = [
    { name: 'CAMERAS', color: 5 },          // Bleu
    { name: 'FOV_CONES', color: 4 },        // Cyan
    { name: 'ZONES_SURVEILLANCE', color: 3 },// Vert
    { name: 'LABELS', color: 7 },           // Blanc
    { name: 'PERIMETRE', color: 1 },        // Rouge
    { name: 'PORTES', color: 6 },           // Magenta
  ]

  for (const layer of LAYERS) {
    lines.push('0', 'LAYER', '2', layer.name, '70', '0', '62', String(layer.color), '6', 'CONTINUOUS')
  }

  lines.push('0', 'ENDTAB')
  lines.push('0', 'ENDSEC')

  // ── Section ENTITIES ──
  lines.push('0', 'SECTION', '2', 'ENTITIES')

  // Perimetre du plan
  lines.push(
    '0', 'LWPOLYLINE', '8', 'PERIMETRE', '90', '4', '70', '1',
    '10', '0', '20', '0',
    '10', String(widthM), '20', '0',
    '10', String(widthM), '20', String(heightM),
    '10', '0', '20', String(heightM),
  )

  // Cameras : cercle + cone de vision + label
  for (const cam of cameras) {
    const x = cam.x * scaleX
    const y = (1 - cam.y) * scaleY // Flip Y pour DXF (Y up)

    // Position camera (cercle)
    lines.push('0', 'CIRCLE', '8', 'CAMERAS', '10', String(x), '20', String(y), '30', '0', '40', '0.3')

    // Cone de vision (ARC)
    const halfFov = (cam.fov ?? 90) / 2
    const startAngle = ((cam.angle - halfFov) + 360) % 360
    const endAngle = ((cam.angle + halfFov) + 360) % 360
    const rangeM = cam.rangeM ?? 12
    lines.push('0', 'ARC', '8', 'FOV_CONES',
      '10', String(x), '20', String(y), '30', '0',
      '40', String(rangeM * scaleX / widthM),
      '50', String(startAngle), '51', String(endAngle),
    )

    // Label
    lines.push('0', 'TEXT', '8', 'LABELS',
      '10', String(x + 0.4), '20', String(y + 0.4), '30', '0',
      '40', '0.25', '1', cam.label || cam.id,
    )
  }

  // Zones de surveillance
  for (const zone of zones) {
    const zx = zone.x * scaleX
    const zy = (1 - zone.y - zone.h) * scaleY
    const zw = zone.w * scaleX
    const zh = zone.h * scaleY

    lines.push(
      '0', 'LWPOLYLINE', '8', 'ZONES_SURVEILLANCE', '90', '4', '70', '1',
      '10', String(zx), '20', String(zy),
      '10', String(zx + zw), '20', String(zy),
      '10', String(zx + zw), '20', String(zy + zh),
      '10', String(zx), '20', String(zy + zh),
    )

    // Label zone
    lines.push('0', 'TEXT', '8', 'LABELS',
      '10', String(zx + zw / 2), '20', String(zy + zh / 2), '30', '0',
      '40', '0.2', '1', zone.label || zone.type,
    )
  }

  // Portes
  for (const door of doors) {
    const dx = door.x * scaleX
    const dy = (1 - door.y) * scaleY

    // Porte : rectangle
    lines.push('0', 'CIRCLE', '8', 'PORTES',
      '10', String(dx), '20', String(dy), '30', '0', '40', '0.2',
    )

    // Label porte
    const doorLabel = door.isExit ? `EXIT ${door.label}` : door.label
    lines.push('0', 'TEXT', '8', 'LABELS',
      '10', String(dx + 0.3), '20', String(dy + 0.3), '30', '0',
      '40', '0.15', '1', doorLabel,
    )
  }

  lines.push('0', 'ENDSEC')
  lines.push('0', 'EOF')

  return lines.join('\n')
}

export function downloadDXF(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/dxf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
