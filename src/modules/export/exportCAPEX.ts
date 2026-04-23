// ═══ EXPORT CAPEX EXCEL ═══
// `exceljs` est lazy-loadé : bundle initial allégé, chargé uniquement quand
// l'utilisateur clique "Exporter CAPEX". Remplace xlsx (429 kB) par exceljs
// (déjà présent pour d'autres exports) — évite d'avoir 2 libs Excel.

import type { CAPEXBreakdown } from '../building/shared/proph3t/technicalCalculator'

export async function exportCAPEXExcel(capex: CAPEXBreakdown): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Atlas BIM · CAPEX Export'
  wb.created = new Date()

  for (const cat of capex.categories) {
    const ws = wb.addWorksheet(cat.name.substring(0, 31))
    ws.columns = [
      { header: 'Désignation',     key: 'desig',    width: 30 },
      { header: 'Référence',       key: 'ref',      width: 20 },
      { header: 'Qté',             key: 'qty',      width: 8  },
      { header: 'PU HT (FCFA)',    key: 'unitFcfa', width: 15 },
      { header: 'Total HT (FCFA)', key: 'totFcfa',  width: 18 },
      { header: 'Total HT (EUR)',  key: 'totEur',   width: 15 },
    ]
    // Header styling
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).alignment = { vertical: 'middle' }

    for (const i of cat.items) {
      ws.addRow({
        desig: i.designation,
        ref: i.reference,
        qty: i.quantity,
        unitFcfa: i.unitPriceFcfa,
        totFcfa: i.totalPriceFcfa,
        totEur: Math.round(i.totalPriceFcfa / capex.fcfaToEurRate),
      })
    }
    const subtotalRow = ws.addRow({
      desig: 'SOUS-TOTAL',
      ref: '', qty: 0, unitFcfa: 0,
      totFcfa: cat.subtotalFcfa,
      totEur: Math.round(cat.subtotalFcfa / capex.fcfaToEurRate),
    })
    subtotalRow.font = { bold: true }
  }

  const summary = wb.addWorksheet('TOTAL')
  summary.columns = [
    { header: 'Poste', key: 'post', width: 25 },
    { header: 'FCFA', key: 'fcfa', width: 20 },
    { header: 'EUR',  key: 'eur',  width: 15 },
  ]
  summary.getRow(1).font = { bold: true }
  const rows = [
    { post: 'Total Équipements',  fcfa: capex.equipmentTotalFcfa, eur: capex.totalHTEur },
    { post: 'Câblage (15%)',      fcfa: capex.cablingFcfa,        eur: Math.round(capex.cablingFcfa / capex.fcfaToEurRate) },
    { post: 'Installation (20%)', fcfa: capex.installationFcfa,   eur: Math.round(capex.installationFcfa / capex.fcfaToEurRate) },
    { post: 'Ingénierie (10%)',   fcfa: capex.engineeringFcfa,    eur: Math.round(capex.engineeringFcfa / capex.fcfaToEurRate) },
    { post: 'TOTAL HT',           fcfa: capex.totalHTFcfa,        eur: capex.totalHTEur },
    { post: 'TVA 18%',            fcfa: capex.tva18Fcfa,          eur: Math.round(capex.tva18Fcfa / capex.fcfaToEurRate) },
    { post: 'TOTAL TTC',          fcfa: capex.totalTTCFcfa,       eur: capex.totalTTCEur },
  ]
  for (const r of rows) {
    const row = summary.addRow(r)
    if (r.post === 'TOTAL HT' || r.post === 'TOTAL TTC') {
      row.font = { bold: true }
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
