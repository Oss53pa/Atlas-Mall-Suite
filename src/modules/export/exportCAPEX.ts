// ═══ EXPORT CAPEX EXCEL ═══

import * as XLSX from 'xlsx'
import type { CAPEXBreakdown } from '../cosmos-angre/shared/proph3t/technicalCalculator'

export function exportCAPEXExcel(capex: CAPEXBreakdown): Blob {
  const wb = XLSX.utils.book_new()
  for (const cat of capex.categories) {
    const data = [
      ...cat.items.map(i => ({ 'Désignation': i.designation, 'Référence': i.reference, 'Qté': i.quantity, 'PU HT (FCFA)': i.unitPriceFcfa, 'Total HT (FCFA)': i.totalPriceFcfa, 'Total HT (EUR)': Math.round(i.totalPriceFcfa / capex.fcfaToEurRate) })),
      { 'Désignation': 'SOUS-TOTAL', 'Référence': '', 'Qté': 0, 'PU HT (FCFA)': 0, 'Total HT (FCFA)': cat.subtotalFcfa, 'Total HT (EUR)': Math.round(cat.subtotalFcfa / capex.fcfaToEurRate) },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 15 }, { wch: 18 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, ws, cat.name.substring(0, 31))
  }
  const summary = [
    { Poste: 'Total Équipements', 'FCFA': capex.equipmentTotalFcfa, 'EUR': capex.totalHTEur },
    { Poste: 'Câblage (15%)', 'FCFA': capex.cablingFcfa, 'EUR': Math.round(capex.cablingFcfa / capex.fcfaToEurRate) },
    { Poste: 'Installation (20%)', 'FCFA': capex.installationFcfa, 'EUR': Math.round(capex.installationFcfa / capex.fcfaToEurRate) },
    { Poste: 'Ingénierie (10%)', 'FCFA': capex.engineeringFcfa, 'EUR': Math.round(capex.engineeringFcfa / capex.fcfaToEurRate) },
    { Poste: 'TOTAL HT', 'FCFA': capex.totalHTFcfa, 'EUR': capex.totalHTEur },
    { Poste: 'TVA 18%', 'FCFA': capex.tva18Fcfa, 'EUR': Math.round(capex.tva18Fcfa / capex.fcfaToEurRate) },
    { Poste: 'TOTAL TTC', 'FCFA': capex.totalTTCFcfa, 'EUR': capex.totalTTCEur },
  ]
  const ws2 = XLSX.utils.json_to_sheet(summary)
  ws2['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'TOTAL')
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
