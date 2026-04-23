// ═══ SIGNAGE EXPORT ENGINE ═══
// Exports livrables pour les parties prenantes :
//   - Excel : Cahier des charges signalétique (coordonnées, type, message, norme, fournisseur)
//   - DXF  : Plan nettoyé (entités filtrées par layerCleaningEngine)
//   - JSON : Wayfinding app mobile (déjà exporté par navGraphEngine)

import ExcelJS from 'exceljs'
import type { PlacedPanel } from './signagePlacementEngine'
import type { FlowAnalysisResult } from './flowPathEngine'
import type { ParsedPlan } from '../../planReader/planEngineTypes'
import { CATEGORY_META as SIGN_CAT_META } from '../../stores/spaceCorrectionsStore'

// ─── Mapping type panneau → fournisseur recommandé ──

interface SupplierReco {
  /** Hauteur de pose standard (m) depuis le sol. */
  postHeightM: number
  /** Dimensions standards (cm). */
  widthCm: number
  heightCm: number
  /** Matériau recommandé. */
  material: string
  /** Fournisseurs types (CI + Afrique). */
  suppliersCI: string[]
  /** Prix indicatif unitaire en FCFA. */
  priceFcfa: number
}

const SUPPLIER_MAP: Record<PlacedPanel['kind'], SupplierReco> = {
  welcome:          { postHeightM: 2.20, widthCm: 120, heightCm: 80, material: 'Alu composite 3mm + impression UV',  suppliersCI: ['Signalétique CI', 'ASG Industries', 'LM Signa'], priceFcfa: 350000 },
  directional:      { postHeightM: 2.50, widthCm: 80,  heightCm: 30, material: 'Alu composite + flèches découpées',   suppliersCI: ['Signalétique CI', 'LM Signa'],                   priceFcfa: 85000 },
  'you-are-here':   { postHeightM: 1.60, widthCm: 60,  heightCm: 80, material: 'Totem sur pied alu brossé + plexi',    suppliersCI: ['Pôle Graphique', 'ASG Industries'],              priceFcfa: 280000 },
  information:      { postHeightM: 1.60, widthCm: 50,  heightCm: 70, material: 'Mural plexi 5mm + impression digitale', suppliersCI: ['Pôle Graphique'],                                priceFcfa: 75000 },
  exit:             { postHeightM: 2.20, widthCm: 50,  heightCm: 15, material: 'Pictogramme ISO 7010 + éclairage BAES', suppliersCI: ['Hager CI', 'Legrand CI'],                        priceFcfa: 120000 },
  'emergency-plan': { postHeightM: 1.60, widthCm: 80,  heightCm: 60, material: 'Plexi 5mm + impression vernis',        suppliersCI: ['Pôle Graphique', 'Signalétique CI'],             priceFcfa: 180000 },
  'emergency-exit': { postHeightM: 2.20, widthCm: 50,  heightCm: 15, material: 'BAES NF EN 60598 + pictogramme E001',  suppliersCI: ['Hager CI', 'Legrand CI', 'Schneider CI'],        priceFcfa: 145000 },
  'exit-direction': { postHeightM: 2.20, widthCm: 60,  heightCm: 20, material: 'BAES directionnel + picto E006',        suppliersCI: ['Hager CI', 'Legrand CI'],                        priceFcfa: 135000 },
  'pmr-direction':  { postHeightM: 1.60, widthCm: 40,  heightCm: 40, material: 'Pictogramme bleu international ISO 7001', suppliersCI: ['Signalétique CI', 'ASG Industries'],             priceFcfa: 65000 },
}

// ─── Excel — Cahier des Charges Signalétique ──────────

export async function exportSignageCDC(
  flowResult: FlowAnalysisResult,
  projectName: string,
  floorLabel: string,
): Promise<Blob> {
  const panels = flowResult.placement?.panels ?? []

  const wb = new ExcelJS.Workbook()
  wb.creator = 'PROPH3T · Atlas BIM'
  wb.created = new Date()

  // ── Feuille 1 : Liste des panneaux ─────────────────
  const ws = wb.addWorksheet('Signalétique')
  ws.columns = [
    { header: 'N°', key: 'num', width: 6 },
    { header: 'Type', key: 'type', width: 22 },
    { header: 'Priorité', key: 'priority', width: 12 },
    { header: 'X (m)', key: 'x', width: 10 },
    { header: 'Y (m)', key: 'y', width: 10 },
    { header: 'Hauteur pose (m)', key: 'height', width: 16 },
    { header: 'Pose', key: 'mount', width: 10 },
    { header: 'Dimensions (cm)', key: 'dims', width: 16 },
    { header: 'Matériau', key: 'material', width: 42 },
    { header: 'Message / contenu', key: 'content', width: 50 },
    { header: 'Direction', key: 'direction', width: 12 },
    { header: 'Norme', key: 'standard', width: 36 },
    { header: 'Fournisseur CI (3 options)', key: 'suppliers', width: 38 },
    { header: 'Prix unitaire FCFA', key: 'price', width: 16 },
    { header: 'Motif placement', key: 'reason', width: 70 },
  ]
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }

  let totalPrice = 0
  panels.forEach((p, i) => {
    const supp = SUPPLIER_MAP[p.kind]
    totalPrice += supp.priceFcfa
    const direction = p.orientationDeg !== undefined
      ? cardinalFromDeg(p.orientationDeg)
      : '—'
    const row = ws.addRow({
      num: i + 1,
      type: humanKind(p.kind),
      priority: humanPrio(p.priority),
      x: p.x.toFixed(2),
      y: p.y.toFixed(2),
      height: supp.postHeightM.toFixed(2),
      mount: p.mount,
      dims: `${supp.widthCm} × ${supp.heightCm}`,
      material: supp.material,
      content: p.content,
      direction,
      standard: p.standard ?? '—',
      suppliers: supp.suppliersCI.join(' / '),
      price: supp.priceFcfa.toLocaleString('fr-FR'),
      reason: p.reason,
    })
    // Coloration priorité
    const colorMap: Record<PlacedPanel['priority'], string> = {
      mandatory: 'FFFECACA', critical: 'FFFED7AA',
      high: 'FFFEF3C7', medium: 'FFDBEAFE', low: 'FFF1F5F9',
    }
    row.getCell('priority').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorMap[p.priority] } }
  })

  // Ligne total
  const totalRow = ws.addRow({
    num: '', type: 'TOTAL', priority: '',
    x: '', y: '', height: '', mount: '', dims: '', material: '',
    content: `${panels.length} panneaux`,
    direction: '', standard: '', suppliers: '',
    price: totalPrice.toLocaleString('fr-FR'),
    reason: `Estimation fournisseur + pose à partir de référentiel CI 2026`,
  })
  totalRow.font = { bold: true }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }

  // ── Feuille 2 : Score de cohérence ────────────────
  const wsScore = wb.addWorksheet('Score cohérence')
  wsScore.columns = [
    { header: 'Composante', key: 'label', width: 38 },
    { header: 'Valeur /100', key: 'value', width: 14 },
    { header: 'Pondération', key: 'weight', width: 14 },
    { header: 'Contribution', key: 'contrib', width: 14 },
  ]
  wsScore.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsScore.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }

  if (flowResult.placement?.coherence) {
    const c = flowResult.placement.coherence
    const rows = [
      { label: 'Couverture nœuds de décision', value: c.breakdown.decisionCoverage, weight: 40 },
      { label: 'Continuité de guidage (ERP)', value: c.breakdown.guidanceContinuity, weight: 30 },
      { label: 'Lisibilité panneaux', value: c.breakdown.readability, weight: 20 },
      { label: 'Accessibilité PMR', value: c.breakdown.pmrAccessibility, weight: 10 },
    ]
    rows.forEach(r => wsScore.addRow({
      label: r.label, value: r.value, weight: `${r.weight} %`,
      contrib: (r.value * r.weight / 100).toFixed(1),
    }))
    const totalRow = wsScore.addRow({
      label: 'SCORE TOTAL', value: c.total, weight: '100 %',
      contrib: c.total,
    })
    totalRow.font = { bold: true }
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }

    wsScore.addRow({})
    wsScore.addRow({ label: 'Justifications', value: '', weight: '', contrib: '' }).font = { bold: true }
    c.justifications.forEach(j => {
      wsScore.addRow({ label: j, value: '', weight: '', contrib: '' })
    })
  }

  // ── Feuille 3 : Stats flux ────────────────────────
  const wsFlux = wb.addWorksheet('Flux')
  wsFlux.columns = [
    { header: 'Trajet', key: 'trajet', width: 50 },
    { header: 'Distance (m)', key: 'dist', width: 14 },
    { header: 'Durée (min)', key: 'duree', width: 12 },
    { header: 'Poids', key: 'poids', width: 10 },
  ]
  wsFlux.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsFlux.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
  flowResult.paths.forEach(p => {
    wsFlux.addRow({
      trajet: `${p.from.label} → ${p.to.label}`,
      dist: p.distanceM.toFixed(0),
      duree: p.durationMin.toFixed(1),
      poids: p.weight.toFixed(2),
    })
  })

  // ── Feuille 4 : PMR ────────────────────────────────
  if (flowResult.pmr) {
    const wsPmr = wb.addWorksheet('PMR')
    wsPmr.columns = [
      { header: 'Segment', key: 'id', width: 20 },
      { header: 'Longueur (m)', key: 'len', width: 14 },
      { header: 'Largeur (m)', key: 'width', width: 14 },
      { header: 'Pente (%)', key: 'slope', width: 12 },
      { header: 'Conforme', key: 'compliant', width: 12 },
      { header: 'Issues', key: 'issues', width: 80 },
    ]
    wsPmr.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    wsPmr.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    flowResult.pmr.edgeAnalyses.forEach(e => {
      const row = wsPmr.addRow({
        id: e.edgeId, len: e.lengthM.toFixed(1),
        width: e.widthM.toFixed(2), slope: e.slopePct.toFixed(1),
        compliant: e.compliant ? '✓' : '✗',
        issues: e.issues.map(i => `[${i.severity}] ${i.message}`).join(' | '),
      })
      if (!e.compliant) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      }
    })
  }

  // ── Feuille 0 : Metadata ────────────────────────
  const wsMeta = wb.addWorksheet('Métadonnées')
  wsMeta.columns = [{ header: 'Clé', key: 'k', width: 30 }, { header: 'Valeur', key: 'v', width: 50 }]
  wsMeta.getRow(1).font = { bold: true }
  ;[
    { k: 'Projet', v: projectName },
    { k: 'Étage', v: floorLabel },
    { k: 'Date génération', v: new Date().toLocaleString('fr-FR') },
    { k: 'Générateur', v: 'PROPH3T · Atlas BIM' },
    { k: 'Nombre chemins', v: flowResult.paths.length },
    { k: 'Nombre panneaux', v: panels.length },
    { k: 'Total FCFA estimé', v: totalPrice.toLocaleString('fr-FR') },
    { k: 'Score cohérence /100', v: flowResult.placement?.coherence.total ?? '—' },
  ].forEach(r => wsMeta.addRow(r))

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// ─── DXF nettoyé ─────────────────────────────────────

/**
 * Génère un fichier DXF ASCII minimal contenant uniquement :
 *   - Les calques conservés (d'après layerCleaningEngine)
 *   - Les entités LINE / LWPOLYLINE / TEXT sur ces calques
 * Format DXF R2000 (AC1015) minimal compatible AutoCAD, BricsCAD, QCAD.
 */
export function exportCleanedDxf(plan: ParsedPlan, projectName: string): Blob {
  const lines: string[] = []

  // ─── Header minimal ─────
  lines.push('0', 'SECTION', '2', 'HEADER')
  lines.push('9', '$ACADVER', '1', 'AC1015')
  lines.push('9', '$INSUNITS', '70', '6') // mètres
  lines.push('0', 'ENDSEC')

  // ─── Tables (calques) ───
  lines.push('0', 'SECTION', '2', 'TABLES')
  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(plan.layers.length))
  for (const l of plan.layers) {
    lines.push('0', 'LAYER', '2', l.name, '70', '0', '62', '7', '6', 'CONTINUOUS')
  }
  lines.push('0', 'ENDTAB', '0', 'ENDSEC')

  // ─── Blocs (vide) ───────
  lines.push('0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC')

  // ─── Entités ────────────
  lines.push('0', 'SECTION', '2', 'ENTITIES')
  let exported = 0
  for (const e of plan.entities) {
    const g = e.geometry
    if (g.kind === 'line') {
      lines.push('0', 'LINE', '8', e.layer,
        '10', g.x1.toFixed(3), '20', g.y1.toFixed(3), '30', '0.0',
        '11', g.x2.toFixed(3), '21', g.y2.toFixed(3), '31', '0.0',
      )
      exported++
    } else if (g.kind === 'polyline') {
      lines.push('0', 'LWPOLYLINE', '8', e.layer, '90', String(g.vertices.length),
        '70', g.closed ? '1' : '0')
      for (const v of g.vertices) {
        lines.push('10', v.x.toFixed(3), '20', v.y.toFixed(3))
      }
      exported++
    } else if (g.kind === 'text') {
      lines.push('0', 'TEXT', '8', e.layer,
        '10', g.x.toFixed(3), '20', g.y.toFixed(3), '30', '0.0',
        '40', String(g.height || 1),
        '1', g.text,
      )
      exported++
    } else if (g.kind === 'circle') {
      lines.push('0', 'CIRCLE', '8', e.layer,
        '10', g.cx.toFixed(3), '20', g.cy.toFixed(3), '30', '0.0',
        '40', g.radius.toFixed(3),
      )
      exported++
    }
  }
  lines.push('0', 'ENDSEC')

  // ─── Fin ────────────────
  lines.push('0', 'EOF')

   
  console.log(`[DXF export] ${exported}/${plan.entities.length} entités exportées dans ${plan.layers.length} calques pour ${projectName}`)

  return new Blob([lines.join('\n')], { type: 'application/dxf' })
}

// ═══ EXPORT DXF ENRICHI ═══
// Plan nettoyé + calques PROPH3T distincts :
//   PROPH3T_ESPACES       — polygones des espaces identifiés (type, nom)
//   PROPH3T_CHEMINS       — chemins flux entrée→sortie
//   PROPH3T_ENTREES       — ancres entrées
//   PROPH3T_SORTIES       — ancres sorties
//   PROPH3T_PANNEAUX      — cercles + labels aux positions des panneaux
//   PROPH3T_NAVGRAPH      — graphe de navigation (nœuds + arêtes)
//   PROPH3T_NODES         — nœuds de décision (junctions)
//   PROPH3T_PMR           — segments non conformes PMR (si analysé)

export interface EnrichedDxfInput {
  plan: ParsedPlan
  projectName: string
  flow?: import('./flowPathEngine').FlowAnalysisResult
  signagePanels?: Array<{
    id: string; code?: string; x: number; y: number;
    content?: string; priority?: string
  }>
}

export function exportEnrichedDxf(input: EnrichedDxfInput): Blob {
  const { plan, projectName, flow, signagePanels } = input
  const lines: string[] = []

  // ─── Header ─────
  lines.push('0', 'SECTION', '2', 'HEADER')
  lines.push('9', '$ACADVER', '1', 'AC1015')
  lines.push('9', '$INSUNITS', '70', '6')
  lines.push('0', 'ENDSEC')

  // ─── Tables (calques DXF + calques PROPH3T) ───
  const proph3tLayers = [
    { name: 'PROPH3T_ESPACES',  color: '5' },   // bleu
    { name: 'PROPH3T_CHEMINS',  color: '3' },   // vert
    { name: 'PROPH3T_ENTREES',  color: '3' },
    { name: 'PROPH3T_SORTIES',  color: '1' },   // rouge
    { name: 'PROPH3T_PANNEAUX', color: '2' },   // jaune
    { name: 'PROPH3T_NAVGRAPH', color: '4' },   // cyan
    { name: 'PROPH3T_NODES',    color: '6' },   // magenta
    { name: 'PROPH3T_PMR',      color: '7' },   // blanc
  ]

  const allLayers = [...plan.layers.map(l => ({ name: l.name, color: '7' })), ...proph3tLayers]
  lines.push('0', 'SECTION', '2', 'TABLES')
  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(allLayers.length))
  for (const l of allLayers) {
    lines.push('0', 'LAYER', '2', l.name, '70', '0', '62', l.color, '6', 'CONTINUOUS')
  }
  lines.push('0', 'ENDTAB', '0', 'ENDSEC')
  lines.push('0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC')

  // ─── Entités ────
  lines.push('0', 'SECTION', '2', 'ENTITIES')

  // Entités plan existant
  for (const e of plan.entities) {
    writeEntity(lines, e)
  }

  // Espaces : polygones sur PROPH3T_ESPACES + label TEXT au centroïde
  for (const s of plan.spaces ?? []) {
    if (!s.polygon || s.polygon.length < 3) continue
    lines.push('0', 'LWPOLYLINE', '8', 'PROPH3T_ESPACES',
      '90', String(s.polygon.length), '70', '1')
    for (const [x, y] of s.polygon) {
      lines.push('10', x.toFixed(3), '20', y.toFixed(3))
    }
    // label
    let cx = 0, cy = 0
    for (const [x, y] of s.polygon) { cx += x; cy += y }
    cx /= s.polygon.length; cy /= s.polygon.length
    lines.push('0', 'TEXT', '8', 'PROPH3T_ESPACES',
      '10', cx.toFixed(3), '20', cy.toFixed(3), '30', '0.0',
      '40', '0.5',
      '1', escapeDxfText(s.label ?? s.id.slice(0, 8)),
    )
  }

  if (flow) {
    // Chemins : polylines
    for (const p of flow.paths) {
      if (p.waypoints.length < 2) continue
      lines.push('0', 'LWPOLYLINE', '8', 'PROPH3T_CHEMINS',
        '90', String(p.waypoints.length), '70', '0')
      for (const wp of p.waypoints) {
        lines.push('10', wp.x.toFixed(3), '20', wp.y.toFixed(3))
      }
    }

    // Entrées : cercles + texte
    for (const e of flow.entrances) {
      lines.push('0', 'CIRCLE', '8', 'PROPH3T_ENTREES',
        '10', e.x.toFixed(3), '20', e.y.toFixed(3), '30', '0.0',
        '40', '2.0')
      lines.push('0', 'TEXT', '8', 'PROPH3T_ENTREES',
        '10', e.x.toFixed(3), '20', (e.y + 2.5).toFixed(3), '30', '0.0',
        '40', '0.8', '1', escapeDxfText('E-' + (e.label ?? '')))
    }

    // Sorties : cercles + texte
    for (const e of flow.exits) {
      lines.push('0', 'CIRCLE', '8', 'PROPH3T_SORTIES',
        '10', e.x.toFixed(3), '20', e.y.toFixed(3), '30', '0.0',
        '40', '2.0')
      lines.push('0', 'TEXT', '8', 'PROPH3T_SORTIES',
        '10', e.x.toFixed(3), '20', (e.y + 2.5).toFixed(3), '30', '0.0',
        '40', '0.8', '1', escapeDxfText('S-' + (e.label ?? '')))
    }

    // navGraph : arêtes + nœuds
    if (flow.navGraph) {
      for (const edge of flow.navGraph.edges) {
        const from = flow.navGraph.nodes.find(n => n.id === edge.fromId)
        const to = flow.navGraph.nodes.find(n => n.id === edge.toId)
        if (!from || !to) continue
        const pts = [{ x: from.x, y: from.y }, ...edge.waypoints, { x: to.x, y: to.y }]
        lines.push('0', 'LWPOLYLINE', '8', 'PROPH3T_NAVGRAPH',
          '90', String(pts.length), '70', '0')
        for (const p of pts) {
          lines.push('10', p.x.toFixed(3), '20', p.y.toFixed(3))
        }
      }

      // Nœuds : circles sur PROPH3T_NODES
      for (const n of flow.navGraph.nodes) {
        if (n.kind !== 'junction' && n.kind !== 'endpoint') continue
        const radius = n.kind === 'junction' ? 0.8 : 0.4
        lines.push('0', 'CIRCLE', '8', 'PROPH3T_NODES',
          '10', n.x.toFixed(3), '20', n.y.toFixed(3), '30', '0.0',
          '40', radius.toFixed(3))
      }
    }

    // Panneaux existants dans flowResult.placement
    const placedPanels = flow.placement?.panels ?? []
    for (const p of placedPanels) {
      lines.push('0', 'CIRCLE', '8', 'PROPH3T_PANNEAUX',
        '10', p.x.toFixed(3), '20', p.y.toFixed(3), '30', '0.0',
        '40', p.priority === 'mandatory' ? '1.5' : '1.0')
      lines.push('0', 'TEXT', '8', 'PROPH3T_PANNEAUX',
        '10', (p.x + 1.0).toFixed(3), '20', p.y.toFixed(3), '30', '0.0',
        '40', '0.6', '1', escapeDxfText(p.id.slice(0, 20)))
    }
  }

  // Panneaux fournis séparément (depuis signageQuantityEngine)
  if (signagePanels) {
    for (const p of signagePanels) {
      lines.push('0', 'CIRCLE', '8', 'PROPH3T_PANNEAUX',
        '10', p.x.toFixed(3), '20', p.y.toFixed(3), '30', '0.0',
        '40', p.priority === 'P1' ? '1.5' : '1.0')
      const label = `${p.code ?? ''} ${(p.content ?? '').slice(0, 30)}`
      lines.push('0', 'TEXT', '8', 'PROPH3T_PANNEAUX',
        '10', (p.x + 1.0).toFixed(3), '20', p.y.toFixed(3), '30', '0.0',
        '40', '0.6', '1', escapeDxfText(label))
    }
  }

  // PMR : segments non conformes si présents
  const pmrFlow = flow?.pmr
  if (pmrFlow) {
    for (const rec of pmrFlow.recommendations) {
      for (const edgeId of rec.edgeIds) {
        const edge = flow?.navGraph?.edges.find(e => e.id === edgeId)
        if (!edge) continue
        const from = flow?.navGraph?.nodes.find(n => n.id === edge.fromId)
        const to = flow?.navGraph?.nodes.find(n => n.id === edge.toId)
        if (!from || !to) continue
        lines.push('0', 'LINE', '8', 'PROPH3T_PMR',
          '10', from.x.toFixed(3), '20', from.y.toFixed(3), '30', '0.0',
          '11', to.x.toFixed(3), '21', to.y.toFixed(3), '31', '0.0')
      }
    }
  }

  lines.push('0', 'ENDSEC')
  lines.push('0', 'EOF')

   
  console.log(`[DXF enriched] export ${projectName} · ${allLayers.length} calques · ${plan.entities.length} entités plan + overlays`)

  return new Blob([lines.join('\n')], { type: 'application/dxf' })
}

function escapeDxfText(s: string): string {
  return (s ?? '').replace(/[^\x20-\x7EÀ-ÖØ-öø-ÿ]/g, '?').slice(0, 80)
}

function writeEntity(lines: string[], e: import('../../planReader/planEngineTypes').PlanEntity): void {
  const g = e.geometry
  if (g.kind === 'line') {
    lines.push('0', 'LINE', '8', e.layer,
      '10', g.x1.toFixed(3), '20', g.y1.toFixed(3), '30', '0.0',
      '11', g.x2.toFixed(3), '21', g.y2.toFixed(3), '31', '0.0')
  } else if (g.kind === 'polyline') {
    lines.push('0', 'LWPOLYLINE', '8', e.layer, '90', String(g.vertices.length),
      '70', g.closed ? '1' : '0')
    for (const v of g.vertices) {
      lines.push('10', v.x.toFixed(3), '20', v.y.toFixed(3))
    }
  } else if (g.kind === 'text') {
    lines.push('0', 'TEXT', '8', e.layer,
      '10', g.x.toFixed(3), '20', g.y.toFixed(3), '30', '0.0',
      '40', String(g.height || 1),
      '1', escapeDxfText(g.text))
  } else if (g.kind === 'circle') {
    lines.push('0', 'CIRCLE', '8', e.layer,
      '10', g.cx.toFixed(3), '20', g.cy.toFixed(3), '30', '0.0',
      '40', g.radius.toFixed(3))
  }
}

// ═══ EXPORT JSON GRAPHE WAYFINDING VOL.4 ═══
// Format riche : nœuds + arêtes + metadata espaces + entrées/sorties typés
// + panneaux pour overlay borne.

export interface Vol4WayfindingExport {
  version: '2.0.0-vol4'
  generatedAt: string
  project: string
  planBounds: { width: number; height: number }
  nodes: Array<{
    id: string
    x: number; y: number
    kind: string
    label?: string
    category?: string
  }>
  edges: Array<{
    id: string
    from: string; to: string
    lengthM: number
    waypoints: Array<{ x: number; y: number }>
    pmrCompliant?: boolean
  }>
  entrances: Array<{ id: string; label: string; x: number; y: number; nodeId?: string }>
  exits: Array<{ id: string; label: string; x: number; y: number; nodeId?: string }>
  pointsOfInterest: Array<{
    id: string; label: string; type: string
    x: number; y: number
    description?: string
  }>
  signagePanels?: Array<{
    id: string; code: string
    x: number; y: number
    content: string
  }>
  metrics: {
    nodeCount: number
    edgeCount: number
    totalPathLengthM: number
    pmrCompliant: boolean
    signageCount: number
  }
}

export function exportVol4Wayfinding(
  flow: import('./flowPathEngine').FlowAnalysisResult,
  spaces: Array<{ id: string; label: string; type: string; areaSqm: number; polygon: [number, number][] }>,
  projectName: string,
  planBounds: { width: number; height: number },
  signagePanels?: Array<{ id: string; code: string; x: number; y: number; content: string }>,
): Vol4WayfindingExport {
  // Noeuds/arêtes depuis le navGraph
  const nodes: Vol4WayfindingExport['nodes'] = []
  const edges: Vol4WayfindingExport['edges'] = []
  if (flow.navGraph) {
    for (const n of flow.navGraph.nodes) {
      nodes.push({ id: n.id, x: n.x, y: n.y, kind: n.kind, label: n.label })
    }
    for (const e of flow.navGraph.edges) {
      edges.push({
        id: e.id, from: e.fromId, to: e.toId, lengthM: e.lengthM,
        waypoints: e.waypoints,
      })
    }
  }

  const findNearestNodeId = (x: number, y: number): string | undefined => {
    let best: string | undefined
    let bestD = Infinity
    for (const n of nodes) {
      const d = Math.hypot(n.x - x, n.y - y)
      if (d < bestD) { bestD = d; best = n.id }
    }
    return best
  }

  // POIs : spaces commerciaux/services/loisirs comme destinations recherchables
  const pointsOfInterest: Vol4WayfindingExport['pointsOfInterest'] = []
  const commercialTypes = new Set([
    'local_commerce', 'restauration', 'loisirs', 'services',
    'grande_surface', 'kiosque', 'sanitaires', 'point_information',
  ])
  for (const s of spaces) {
    if (!commercialTypes.has(s.type)) continue
    let cx = 0, cy = 0
    for (const [x, y] of s.polygon) { cx += x; cy += y }
    cx /= s.polygon.length; cy /= s.polygon.length
    pointsOfInterest.push({
      id: s.id, label: s.label, type: s.type, x: cx, y: cy,
      description: `${s.label} · ${s.areaSqm.toFixed(0)} m²`,
    })
  }

  return {
    version: '2.0.0-vol4',
    generatedAt: new Date().toISOString(),
    project: projectName,
    planBounds,
    nodes, edges,
    entrances: flow.entrances.map(e => ({
      id: e.id, label: e.label, x: e.x, y: e.y,
      nodeId: findNearestNodeId(e.x, e.y),
    })),
    exits: flow.exits.map(e => ({
      id: e.id, label: e.label, x: e.x, y: e.y,
      nodeId: findNearestNodeId(e.x, e.y),
    })),
    pointsOfInterest,
    signagePanels,
    metrics: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      totalPathLengthM: edges.reduce((s, e) => s + e.lengthM, 0),
      pmrCompliant: flow.pmr?.compliant ?? false,
      signageCount: (flow.placement?.panels.length ?? 0) + (signagePanels?.length ?? 0),
    },
  }
}

// ─── Helpers ─────────────────────────────────────────

function humanKind(k: PlacedPanel['kind']): string {
  switch (k) {
    case 'welcome': return 'Accueil + plan'
    case 'directional': return 'Directionnel'
    case 'you-are-here': return 'Vous êtes ici'
    case 'information': return 'Information'
    case 'exit': return 'Sortie (indication)'
    case 'emergency-plan': return 'Plan d\'évacuation ERP'
    case 'emergency-exit': return 'Sortie secours ISO 7010'
    case 'exit-direction': return 'Direction sortie secours'
    case 'pmr-direction': return 'Direction PMR'
  }
}

function humanPrio(p: PlacedPanel['priority']): string {
  switch (p) {
    case 'mandatory': return 'Obligatoire'
    case 'critical': return 'Critique'
    case 'high': return 'Élevée'
    case 'medium': return 'Moyenne'
    case 'low': return 'Faible'
  }
}

function cardinalFromDeg(deg: number): string {
  const a = ((deg % 360) + 360) % 360
  if (a < 22.5) return 'E →'
  if (a < 67.5) return 'SE ↘'
  if (a < 112.5) return 'S ↓'
  if (a < 157.5) return 'SO ↙'
  if (a < 202.5) return 'O ←'
  if (a < 247.5) return 'NO ↖'
  if (a < 292.5) return 'N ↑'
  if (a < 337.5) return 'NE ↗'
  return 'E →'
}

// Trick compilateur : import SIGN_CAT_META juste pour forcer la référence
// vers le store des catégories (module side-effect) afin d'éviter que le
// bundler tree-shake la constante partagée ailleurs.
void SIGN_CAT_META
