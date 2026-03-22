import React, { useCallback, useState } from 'react'
import { FileText, Download, Loader2, QrCode, FileSpreadsheet } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'

export default function RapportSection() {
  const moments = useVol3Store((s) => s.moments)
  const pois = useVol3Store((s) => s.pois)
  const signageItems = useVol3Store((s) => s.signageItems)
  const projectName = 'Cosmos Angr\u00e9'
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExportPDF = useCallback(async () => {
    setExporting('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [841, 594] })

      doc.setFontSize(24)
      doc.text('RAPPORT PARCOURS CLIENT', 30, 30)
      doc.setFontSize(12)
      doc.text(`${projectName} — Plan de Circulation`, 30, 42)
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 30, 52)

      let y = 70
      doc.setFontSize(16)
      doc.text('1. Les 7 Moments-Cles', 30, y); y += 12
      doc.setFontSize(10)
      moments.forEach((m) => {
        doc.text(`  ${m.number}. ${m.name} — KPI: ${m.kpi}`, 30, y); y += 7
      })

      y += 10
      doc.setFontSize(16)
      doc.text('2. Inventaire POI', 30, y); y += 12
      doc.setFontSize(10)
      doc.text(`${pois.length} POI dont ${pois.filter(p => p.pmr).length} accessibles PMR`, 30, y); y += 8

      y += 10
      doc.setFontSize(16)
      doc.text('3. Signaletique', 30, y); y += 12
      doc.setFontSize(10)
      doc.text(`${signageItems.length} elements signaletiques`, 30, y)

      doc.setFontSize(8)
      doc.text('Genere par Proph3t — Atlas Studio / Praedium Tech', 30, 579)

      doc.save(`Parcours-Client-${projectName.replace(/\s/g, '-')}.pdf`)
    } catch {
      // PDF generation failed
    }
    setExporting(null)
  }, [projectName, moments, pois, signageItems])

  const handleExportQR = useCallback(async () => {
    setExporting('qr')
    try {
      const QRCode = (await import('qrcode')).default
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })

      const enseignePois = pois.filter((p) => p.type === 'enseigne')
      for (let i = 0; i < enseignePois.length; i++) {
        const poi = enseignePois[i]
        if (i > 0) doc.addPage()

        const url = poi.qrUrl ?? `/cosmos-angre/vol3/poi/${poi.id}`
        const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 })

        doc.setFontSize(18)
        doc.text(poi.label, 105, 30, { align: 'center' })
        doc.addImage(qrDataUrl, 'PNG', 52.5, 50, 100, 100)
        doc.setFontSize(10)
        doc.text(url, 105, 165, { align: 'center' })
      }

      doc.save(`QR-Codes-${projectName.replace(/\s/g, '-')}.pdf`)
    } catch {
      // QR generation failed
    }
    setExporting(null)
  }, [projectName, pois])

  const pmrCount = pois.filter((p) => p.pmr).length
  const enseigneCount = pois.filter((p) => p.type === 'enseigne').length
  const capexTotal = signageItems.reduce((sum, s) => sum + s.capexFcfa, 0)

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-950">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-bold text-emerald-400">Rapport Parcours Client</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">Generation et export</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Report Summary */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-gray-400">Moments-cles</span><span className="text-white">{moments.length}/7</span></div>
          <div className="flex justify-between"><span className="text-gray-400">POI total</span><span className="text-white">{pois.length}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">POI PMR</span><span className="text-cyan-400">{pmrCount}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Enseignes</span><span className="text-white">{enseigneCount}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Signaletique</span><span className="text-amber-400">{signageItems.length} elements</span></div>
          <div className="flex justify-between border-t border-gray-700 pt-2">
            <span className="text-gray-300">CAPEX Signaletique</span>
            <span className="text-green-400 font-semibold">{capexTotal.toLocaleString()} FCFA</span>
          </div>
        </div>

        {/* Sections Preview */}
        <div>
          <div className="text-[10px] text-gray-500 font-mono mb-2">SECTIONS</div>
          {['Vision & objectifs', 'Les 7 moments-cles', 'Inventaire POI', 'Analyse wayfinding', 'Recommandations signaletique', 'Programme Cosmos Club', 'Score experience'].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-800/50">
              <span className="w-4 h-4 rounded-full bg-emerald-900/30 text-emerald-400 text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
              <span className="text-gray-300">{s}</span>
            </div>
          ))}
        </div>

        {/* Export Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleExportPDF}
            disabled={exporting !== null}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-600/25 disabled:opacity-50 transition-colors"
          >
            {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            PDF Signaletique A1
          </button>
          <button
            onClick={handleExportQR}
            disabled={exporting !== null}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {exporting === 'qr' ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            QR Codes PDF (enseignes)
          </button>
        </div>
      </div>
    </div>
  )
}
