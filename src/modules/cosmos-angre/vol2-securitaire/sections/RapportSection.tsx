import { useCallback, useState } from 'react'
import { FileText, Download, Loader2, FileSpreadsheet } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'
import { useContentStore } from '../../shared/store/contentStore'
import EditableText from '../../shared/components/EditableText'

export default function RapportSection() {
  const projectName = useVol2Store((s) => s.projectName)
  const score = useVol2Store((s) => s.score)
  const cameras = useVol2Store((s) => s.cameras)
  const doors = useVol2Store((s) => s.doors)
  const evacResult = useVol2Store((s) => s.evacResult)
  const address = useContentStore((s) => s.vol2RapportAddress)
  const setField = useContentStore((s) => s.setField)
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExportPDF = useCallback(async (format: 'A1' | 'A3') => {
    setExporting(`pdf-${format}`)
    try {
      const { jsPDF } = await import('jspdf')
      const dims = format === 'A1' ? { w: 841, h: 594 } : { w: 420, h: 297 }
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [dims.w, dims.h] })

      doc.setFontSize(24)
      doc.text('RAPPORT APSAD R82', 30, 30)
      doc.setFontSize(12)
      doc.text(projectName, 30, 42)
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 30, 52)
      doc.text(`Numero : APSAD-R82-${new Date().toISOString().slice(0, 10)}`, 30, 62)

      let y = 80
      doc.setFontSize(16)
      doc.text('1. Dispositif Videosurveillance', 30, y)
      y += 12
      doc.setFontSize(10)
      doc.text(`Nombre de cameras : ${cameras.length}`, 30, y); y += 8
      cameras.forEach((cam) => {
        doc.text(`  - ${cam.label} (${cam.model}) — FOV ${cam.fov} — Portee ${cam.rangeM}m`, 30, y)
        y += 6
      })

      y += 10
      doc.setFontSize(16)
      doc.text('2. Controle d\'Acces', 30, y)
      y += 12
      doc.setFontSize(10)
      doc.text(`Nombre de points d'acces : ${doors.length}`, 30, y); y += 8
      doors.forEach((d) => {
        doc.text(`  - ${d.label} — ${d.ref} — ${d.hasBadge ? 'Badge' : ''} ${d.hasBiometric ? 'Bio' : ''} ${d.isExit ? 'Sortie' : ''}`, 30, y)
        y += 6
      })

      y += 10
      doc.setFontSize(16)
      doc.text('3. Conformite APSAD R82 & NF S 61-938', 30, y)
      y += 12
      doc.setFontSize(10)
      doc.text(`Score global : ${score?.total ?? 0}/100`, 30, y); y += 8
      if (score?.issues.length) {
        score.issues.forEach((issue) => {
          doc.text(`  [NC] ${issue}`, 30, y); y += 6
        })
      }

      if (evacResult) {
        y += 10
        doc.setFontSize(16)
        doc.text('4. Simulation Evacuation', 30, y)
        y += 12
        doc.setFontSize(10)
        doc.text(`Temps total : ${Math.floor(evacResult.totalTimeSec / 60)}min ${evacResult.totalTimeSec % 60}s`, 30, y); y += 8
        doc.text(`Conforme NF S 61-938 : ${evacResult.conformNFS61938 ? 'OUI' : 'NON'}`, 30, y)
      }

      doc.setFontSize(8)
      doc.text('Genere par Proph3t — Atlas Studio', 30, dims.h - 15)

      doc.save(`APSAD-R82-${projectName.replace(/\s/g, '-')}-${format}.pdf`)
    } catch {
      // PDF generation failed silently
    }
    setExporting(null)
  }, [projectName, score, cameras, doors, evacResult])

  const handleExportWord = useCallback(async () => {
    setExporting('word')
    try {
      const docx = await import('docx')
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: [
            new docx.Paragraph({
              text: 'RAPPORT APSAD R82',
              heading: docx.HeadingLevel.HEADING_1,
            }),
            new docx.Paragraph({ text: projectName }),
            new docx.Paragraph({ text: `Date : ${new Date().toLocaleDateString('fr-FR')}` }),
            new docx.Paragraph({ text: '' }),
            new docx.Paragraph({
              text: '1. Dispositif Videosurveillance',
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({ text: `${cameras.length} cameras installees.` }),
            ...cameras.map((cam) =>
              new docx.Paragraph({
                text: `${cam.label} — ${cam.model} — FOV ${cam.fov} — Portee ${cam.rangeM}m`,
                bullet: { level: 0 },
              })
            ),
            new docx.Paragraph({ text: '' }),
            new docx.Paragraph({
              text: '2. Score Securitaire',
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({ text: `Score APSAD R82 : ${score?.total ?? 0}/100` }),
            ...(score?.issues ?? []).map((issue) =>
              new docx.Paragraph({
                text: `[NC] ${issue}`,
                bullet: { level: 0 },
              })
            ),
            new docx.Paragraph({ text: '' }),
            new docx.Paragraph({ text: 'Genere par Proph3t — Atlas Studio' }),
          ],
        }],
      })
      const blob = await docx.Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `APSAD-R82-${projectName.replace(/\s/g, '-')}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Word generation failed silently
    }
    setExporting(null)
  }, [projectName, score, cameras])

  const sections = [
    { num: 1, title: 'Dispositif Videosurveillance', count: `${cameras.length} cameras`, ok: cameras.length >= 10 },
    { num: 2, title: 'Controle d\'Acces', count: `${doors.length} points`, ok: doors.length >= 3 },
    { num: 3, title: 'Conformite APSAD R82', count: `${score?.total ?? 0}/100`, ok: (score?.total ?? 0) >= 70 },
    { num: 4, title: 'Simulation Evacuation', count: evacResult ? `${Math.floor(evacResult.totalTimeSec / 60)}min` : 'N/A', ok: evacResult?.conformNFS61938 ?? false },
    { num: 5, title: 'Recommandations Proph3t', count: `${score?.issues.length ?? 0} NC`, ok: (score?.issues.length ?? 0) === 0 },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-950">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-bold text-red-400">Rapport APSAD R82</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">Generation et export du rapport securitaire</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Cartouche Preview */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <div className="text-xs text-gray-500 font-mono mb-2">CARTOUCHE</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Etablissement</span>
              <span className="text-white">{projectName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Adresse</span>
              <EditableText
                value={address}
                onChange={(v) => setField('vol2RapportAddress', v)}
                className="text-white text-xs"
                tag="span"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span className="text-white">{new Date().toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Numero</span>
              <span className="text-white font-mono">APSAD-R82-{new Date().toISOString().slice(0, 10)}</span>
            </div>
          </div>
        </div>

        {/* Report Sections Preview */}
        <div>
          <div className="text-xs text-gray-500 font-mono mb-2">SECTIONS</div>
          <div className="space-y-1.5">
            {sections.map((s) => (
              <div key={s.num} className="flex items-center gap-3 text-xs bg-gray-900/50 border border-gray-800 rounded px-3 py-2">
                <span className="w-5 h-5 rounded-full bg-red-900/30 text-red-400 text-[10px] flex items-center justify-center font-bold shrink-0">
                  {s.num}
                </span>
                <span className="flex-1 text-gray-300">{s.title}</span>
                <span className="text-gray-500">{s.count}</span>
                <div className={`w-2 h-2 rounded-full ${s.ok ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-mono mb-1">EXPORT</div>
          <button
            onClick={() => handleExportPDF('A1')}
            disabled={exporting !== null}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-600/15 border border-red-500/30 text-red-300 text-xs font-medium hover:bg-red-600/25 disabled:opacity-50 transition-colors"
          >
            {exporting === 'pdf-A1' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            PDF Vectoriel A1 (841 x 594mm)
          </button>
          <button
            onClick={() => handleExportPDF('A3')}
            disabled={exporting !== null}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {exporting === 'pdf-A3' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF A3
          </button>
          <button
            onClick={handleExportWord}
            disabled={exporting !== null}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {exporting === 'word' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Word DOCX
          </button>
        </div>
      </div>
    </div>
  )
}
