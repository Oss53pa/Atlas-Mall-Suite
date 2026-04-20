// ═══ DXF Exporter ═══
//
// Génère un fichier DXF R2013 ASCII minimaliste compatible AutoCAD / QCAD /
// FreeCAD / BricsCAD. Inclut :
//   - Layer par catégorie de type d'espace (coloré)
//   - LWPOLYLINE pour chaque polygone fermé
//   - LINE pour chaque segment mural
//   - TEXT pour les labels d'espaces
//
// Structure DXF (version R2013 = AC1027) :
//   0 SECTION → HEADER, TABLES (LAYER), ENTITIES, EOF
//
// Référence : DXF Reference 2013 (Autodesk) — les codes de couleur ACI
// utilisés ici (1-255) sont la palette standard AutoCAD.

import type { ParsedPlan } from '../../shared/planReader/planEngineTypes'
import { SPACE_TYPE_META, type SpaceTypeKey } from '../../shared/proph3t/libraries/spaceTypeLibrary'

// Palette ACI approximative (quelques couleurs clés)
const ACI = {
  red: 1, yellow: 2, green: 3, cyan: 4, blue: 5, magenta: 6,
  white: 7, gray: 8, lightgray: 9, darkgray: 250,
}

export function exportPlanDxf(plan: ParsedPlan): string {
  const lines: string[] = []

  // ── Header minimal ──
  lines.push(
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER',  '1', 'AC1027',       // R2013
    '9', '$INSUNITS', '70', '6',            // 6 = metres
    '9', '$EXTMIN',   '10', String(plan.bounds.minX), '20', String(plan.bounds.minY), '30', '0.0',
    '9', '$EXTMAX',   '10', String(plan.bounds.minX + plan.bounds.width),
                       '20', String(plan.bounds.minY + plan.bounds.height), '30', '0.0',
    '0', 'ENDSEC',
  )

  // ── Tables (LAYER) ──
  lines.push('0', 'SECTION', '2', 'TABLES')
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '0')

  // Layers métiers
  const layers = [
    { name: 'ATLAS_WALLS',  aci: ACI.white },
    { name: 'ATLAS_SPACES', aci: ACI.cyan },
    { name: 'ATLAS_LABELS', aci: ACI.white },
    { name: 'ATLAS_DIMS',   aci: ACI.yellow },
    // Un layer par catégorie d'espace pour séparation facile dans AutoCAD
    { name: 'ATLAS_ACCES',       aci: ACI.green },
    { name: 'ATLAS_COMMERCES',   aci: ACI.magenta },
    { name: 'ATLAS_EQUIPEMENTS', aci: ACI.yellow },
    { name: 'ATLAS_INFRA',       aci: ACI.gray },
    { name: 'ATLAS_PARKING',     aci: ACI.blue },
  ]
  for (const l of layers) {
    lines.push(
      '0', 'LAYER',
      '2', l.name,
      '70', '0',
      '62', String(l.aci),
      '6', 'Continuous',
    )
  }
  lines.push('0', 'ENDTAB', '0', 'ENDSEC')

  // ── Entities ──
  lines.push('0', 'SECTION', '2', 'ENTITIES')

  // Murs → LINE sur ATLAS_WALLS
  for (const w of plan.wallSegments) {
    lines.push(
      '0', 'LINE',
      '8', 'ATLAS_WALLS',
      '10', String(w.x1), '20', String(w.y1), '30', '0.0',
      '11', String(w.x2), '21', String(w.y2), '31', '0.0',
    )
  }

  // Polygones d'espaces → LWPOLYLINE sur layer catégorie
  for (const sp of plan.spaces) {
    if (!sp.polygon || sp.polygon.length < 3) continue
    const layerName = categoryToLayer(sp.type as SpaceTypeKey)
    lines.push(
      '0', 'LWPOLYLINE',
      '8', layerName,
      '90', String(sp.polygon.length),
      '70', '1',  // closed
    )
    for (const [x, y] of sp.polygon) {
      lines.push('10', String(x), '20', String(y))
    }

    // Label = TEXT au centre
    const cx = sp.polygon.reduce((s, p) => s + p[0], 0) / sp.polygon.length
    const cy = sp.polygon.reduce((s, p) => s + p[1], 0) / sp.polygon.length
    lines.push(
      '0', 'TEXT',
      '8', 'ATLAS_LABELS',
      '10', String(cx), '20', String(cy), '30', '0.0',
      '40', '0.8',                   // hauteur texte 80 cm
      '1', sanitizeText(sp.label),
      '72', '1', '73', '2',          // centré H + V
      '11', String(cx), '21', String(cy), '31', '0.0',
    )
  }

  // Cotes → LINE + TEXT sur ATLAS_DIMS
  if (plan.dimensions) {
    for (const d of plan.dimensions) {
      lines.push(
        '0', 'LINE',
        '8', 'ATLAS_DIMS',
        '10', String(d.p1[0]), '20', String(d.p1[1]), '30', '0.0',
        '11', String(d.p2[0]), '21', String(d.p2[1]), '31', '0.0',
      )
      lines.push(
        '0', 'TEXT',
        '8', 'ATLAS_DIMS',
        '10', String(d.textPos[0]), '20', String(d.textPos[1]), '30', '0.0',
        '40', '0.6',
        '1', sanitizeText(d.text),
      )
    }
  }

  lines.push('0', 'ENDSEC', '0', 'EOF')

  // DXF = pairs code/valeur, un par ligne, CRLF conseillé
  return lines.join('\r\n') + '\r\n'
}

function categoryToLayer(typeKey: SpaceTypeKey): string {
  const meta = SPACE_TYPE_META[typeKey]
  if (!meta) return 'ATLAS_SPACES'
  switch (meta.category) {
    case 'acces-circulation':   return 'ATLAS_ACCES'
    case 'commerces-services':  return 'ATLAS_COMMERCES'
    case 'equipements':         return 'ATLAS_EQUIPEMENTS'
    case 'infrastructure':
      return /^parking/.test(typeKey) ? 'ATLAS_PARKING' : 'ATLAS_INFRA'
    default:                    return 'ATLAS_SPACES'
  }
}

function sanitizeText(s: string): string {
  // DXF TEXT : interdire retour ligne, caractères spéciaux problématiques
  return s.replace(/[\r\n]/g, ' ').replace(/[\x00-\x1f]/g, '').slice(0, 120)
}
