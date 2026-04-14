// ═══ PDF DEBUG — Diagnostic tool to understand why PDF extraction fails ═══
// Dumps all operator types and their counts from a PDF file.
// Use this to understand what operators the PDF actually contains.

import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// Reverse map of OPS values to names
const OPS_NAMES: Record<number, string> = {}
for (const [name, value] of Object.entries(pdfjsLib.OPS)) {
  if (typeof value === 'number') OPS_NAMES[value] = name
}

export interface PDFDiagnostic {
  pageCount: number
  pageWidth: number
  pageHeight: number
  operatorCounts: Record<string, number>
  totalOperators: number
  textCount: number
  sampleTexts: string[]
  lineWidths: number[]
  hasConstructPath: boolean
  hasRectangle: boolean
  hasMoveTo: boolean
  hasLineTo: boolean
  hasCurveTo: boolean
  hasStroke: boolean
  hasFill: boolean
  sampleArgs: { op: string; args: string }[]
}

export async function diagnosePDF(file: File): Promise<PDFDiagnostic> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })

  const opList = await page.getOperatorList()
  const textContent = await page.getTextContent()

  // Count operators
  const counts: Record<string, number> = {}
  const lineWidths: number[] = []
  const sampleArgs: { op: string; args: string }[] = []

  for (let i = 0; i < opList.fnArray.length; i++) {
    const opCode = opList.fnArray[i]
    const opName = OPS_NAMES[opCode] ?? `unknown_${opCode}`
    counts[opName] = (counts[opName] ?? 0) + 1

    // Collect line widths
    if (opCode === pdfjsLib.OPS.setLineWidth) {
      lineWidths.push(opList.argsArray[i][0])
    }

    // Sample first 5 of each interesting operator
    if (['constructPath', 'rectangle', 'moveTo', 'lineTo', 'stroke', 'fill', 'paintImageXObject'].includes(opName)) {
      if (sampleArgs.filter(s => s.op === opName).length < 3) {
        try {
          const args = opList.argsArray[i]
          sampleArgs.push({
            op: opName,
            args: JSON.stringify(args).slice(0, 200),
          })
        } catch { /* ignore */ }
      }
    }
  }

  const texts = textContent.items
    .filter((item): item is pdfjsLib.TextItem => 'str' in item)
    .map(item => item.str.trim())
    .filter(t => t.length > 0)

  return {
    pageCount: pdf.numPages,
    pageWidth: viewport.width,
    pageHeight: viewport.height,
    operatorCounts: counts,
    totalOperators: opList.fnArray.length,
    textCount: texts.length,
    sampleTexts: texts.slice(0, 20),
    lineWidths: [...new Set(lineWidths)].sort((a, b) => a - b).slice(0, 20),
    hasConstructPath: !!counts['constructPath'],
    hasRectangle: !!counts['rectangle'],
    hasMoveTo: !!counts['moveTo'],
    hasLineTo: !!counts['lineTo'],
    hasCurveTo: !!counts['curveTo'],
    hasStroke: !!counts['stroke'],
    hasFill: !!counts['fill'] || !!counts['eoFill'],
    sampleArgs,
  }
}
