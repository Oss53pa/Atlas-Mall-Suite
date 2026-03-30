// ═══ EXPORT QR CODES PDF BATCH ═══

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { POI } from '../cosmos-angre/shared/proph3t/types'
import { registerPDFFonts, setHeadingFont, setBodyFont } from './pdfFonts'

export async function exportQRCodesPDF(pois: POI[]): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  await registerPDFFonts(doc)
  for (let i = 0; i < pois.length; i++) {
    if (i > 0) doc.addPage()
    const poi = pois[i]
    const url = poi.qrUrl || `https://cosmos-angre.app/poi/${poi.id}`
    const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
    setHeadingFont(doc, 24)
    doc.text(poi.label, 105, 30, { align: 'center' })
    setBodyFont(doc, 14)
    doc.text(`Étage : ${poi.floorId}`, 105, 42, { align: 'center' })
    doc.text(`Type : ${poi.type}`, 105, 50, { align: 'center' })
    doc.addImage(qrDataUrl, 'PNG', 42.5, 60, 120, 120)
    setBodyFont(doc, 12)
    doc.text("Scannez ce QR code avec l'application Cosmos Club", 105, 195, { align: 'center' })
    setBodyFont(doc, 8)
    doc.setTextColor(150)
    doc.text(`Cosmos Angré — ${poi.id}`, 105, 280, { align: 'center' })
    doc.setTextColor(0)
  }
  return doc.output('blob')
}
