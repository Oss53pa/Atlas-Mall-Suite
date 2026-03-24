// ═══ LECTEUR PDF DE PLANS VECTORIELS ═══

import * as pdfjsLib from 'pdfjs-dist'
import type { PDFPlanPage, PDFPath, PDFText, PathCommand, BoundingBox } from './planReaderTypes'
import type { SpaceType, Zone } from '../proph3t/types'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// ─── LECTURE PDF → PAGES ───

export async function readPDFPlan(file: File): Promise<PDFPlanPage[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: PDFPlanPage[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })

    const operatorList = await page.getOperatorList()
    const paths = extractPathsFromOperatorList(operatorList, viewport)

    const textContent = await page.getTextContent()
    const texts = extractTextsFromContent(textContent, viewport)

    const estimatedFloorLevel = detectFloorLevelFromTexts(texts)

    pages.push({
      pageNumber: pageNum,
      width: viewport.width,
      height: viewport.height,
      paths,
      texts,
      estimatedFloorLevel,
    })
  }

  return pages
}

// ─── EXTRACTION CHEMINS VECTORIELS ───

function extractPathsFromOperatorList(
  opList: pdfjsLib.PDFOperatorList,
  viewport: pdfjsLib.PageViewport
): PDFPath[] {
  const paths: PDFPath[] = []
  let currentCommands: PathCommand[] = []
  let currentLineWidth = 1
  let currentStrokeColor = '#000000'
  let pathId = 0

  const ops = opList.fnArray
  const args = opList.argsArray

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const arg = args[i]

    switch (op) {
      case pdfjsLib.OPS.moveTo:
        currentCommands.push({ type: 'M', x: arg[0], y: viewport.height - arg[1] })
        break
      case pdfjsLib.OPS.lineTo:
        currentCommands.push({ type: 'L', x: arg[0], y: viewport.height - arg[1] })
        break
      case pdfjsLib.OPS.curveTo:
        currentCommands.push({
          type: 'C',
          x1: arg[0], y1: viewport.height - arg[1],
          x2: arg[2], y2: viewport.height - arg[3],
          x: arg[4], y: viewport.height - arg[5],
        })
        break
      case pdfjsLib.OPS.closePath:
        currentCommands.push({ type: 'Z' })
        break
      case pdfjsLib.OPS.setLineWidth:
        currentLineWidth = arg[0]
        break
      case pdfjsLib.OPS.setStrokeRGBColor:
        currentStrokeColor = `rgb(${Math.round(arg[0] * 255)},${Math.round(arg[1] * 255)},${Math.round(arg[2] * 255)})`
        break
      case pdfjsLib.OPS.stroke:
      case pdfjsLib.OPS.fill:
      case pdfjsLib.OPS.fillStroke:
        if (currentCommands.length > 0) {
          const bb = computeBoundingBox(currentCommands)
          const isClosed = currentCommands.some(c => c.type === 'Z')
          paths.push({
            id: `path-${pathId++}`,
            commands: [...currentCommands],
            strokeColor: currentStrokeColor,
            lineWidth: currentLineWidth,
            isClosed,
            boundingBox: bb,
            estimatedType: classifyPath(currentCommands, currentLineWidth, isClosed, bb),
          })
          currentCommands = []
        }
        break
    }
  }

  return paths
}

function classifyPath(
  cmds: PathCommand[],
  lineWidth: number,
  isClosed: boolean,
  bb: BoundingBox,
): PDFPath['estimatedType'] {
  const area = bb.w * bb.h
  const pointCount = cmds.filter(c => c.type === 'L' || c.type === 'M').length

  if (lineWidth < 1.5 && !isClosed && pointCount === 2) {
    const first = cmds[0]
    const last = cmds[cmds.length - 1]
    if (first.x !== undefined && last.x !== undefined && first.y !== undefined && last.y !== undefined) {
      const length = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2)
      if (length < 20) return 'dimension_line'
      return 'wall'
    }
  }

  if (isClosed && area > 500) return 'zone_boundary'

  return 'unknown'
}

function computeBoundingBox(cmds: PathCommand[]): BoundingBox {
  const xs = cmds.filter(c => c.x !== undefined).map(c => c.x!)
  const ys = cmds.filter(c => c.y !== undefined).map(c => c.y!)
  if (xs.length === 0 || ys.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// ─── EXTRACTION TEXTES ───

function extractTextsFromContent(
  textContent: pdfjsLib.TextContent,
  viewport: pdfjsLib.PageViewport
): PDFText[] {
  return textContent.items
    .filter((item): item is pdfjsLib.TextItem => 'str' in item && item.str.trim().length > 0)
    .map((item, idx): PDFText => {
      const tx = item.transform[4]
      const ty = viewport.height - item.transform[5]
      const fontSize = Math.abs(item.transform[3])
      return {
        id: `txt-${idx}`,
        content: item.str.trim(),
        x: tx,
        y: ty,
        fontSize,
        estimatedRole: classifyPDFText(item.str, fontSize),
      }
    })
}

function classifyPDFText(text: string, fontSize: number): PDFText['estimatedRole'] {
  const t = text.trim()
  if (/^\d+([.,]\d+)?\s*(m|mm|cm|m²)?$/.test(t)) return 'dimension'
  if (fontSize > 14) return 'title'
  if (/^1\s*[:\/]\s*\d+/.test(t)) return 'scale'
  if (t.length < 30 && t === t.toUpperCase() && /[A-Z]/.test(t)) return 'room_label'
  return 'annotation'
}

export function detectFloorLevelFromTexts(texts: PDFText[]): string | undefined {
  const levels = ['B2', 'B1', 'RDC', 'R+1', 'R+2', 'R+3', 'SOUS-SOL', 'REZ-DE-CHAUSSEE', 'TERRASSE']
  for (const text of texts) {
    const upper = text.content.toUpperCase()
    for (const level of levels) {
      if (upper.includes(level)) return level === 'REZ-DE-CHAUSSEE' ? 'RDC' : level
    }
  }
  return undefined
}

// ─── CONVERSION PDF → ZONES ───

export function convertPDFToZones(pages: PDFPlanPage[]): {
  zones: Partial<Zone>[]
  walls: { x1: number; y1: number; x2: number; y2: number }[]
  dims: { text: string; x: number; y: number }[]
} {
  const zones: Partial<Zone>[] = []
  const walls: { x1: number; y1: number; x2: number; y2: number }[] = []
  const dims: { text: string; x: number; y: number }[] = []

  for (const page of pages) {
    const W = page.width, H = page.height

    for (const path of page.paths.filter(p => p.estimatedType === 'zone_boundary')) {
      const normX = path.boundingBox.x / W
      const normY = path.boundingBox.y / H
      const normW = path.boundingBox.w / W
      const normH = path.boundingBox.h / H

      const innerTexts = page.texts.filter(t =>
        t.estimatedRole === 'room_label' &&
        t.x >= path.boundingBox.x && t.x <= path.boundingBox.x + path.boundingBox.w &&
        t.y >= path.boundingBox.y && t.y <= path.boundingBox.y + path.boundingBox.h
      )
      const label = innerTexts[0]?.content ?? 'Zone sans nom'

      zones.push({
        label,
        x: normX, y: normY, w: normW, h: normH,
        type: inferSpaceTypeFromLabel(label),
        niveau: 1,
        color: '#0a2a15',
        floorId: '',
      })
    }

    for (const path of page.paths.filter(p => p.estimatedType === 'wall')) {
      const cmds = path.commands.filter(c => c.x !== undefined)
      if (cmds.length >= 2) {
        walls.push({
          x1: cmds[0].x! / W, y1: cmds[0].y! / H,
          x2: cmds[cmds.length - 1].x! / W, y2: cmds[cmds.length - 1].y! / H,
        })
      }
    }

    for (const text of page.texts.filter(t => t.estimatedRole === 'dimension')) {
      dims.push({ text: text.content, x: text.x / W, y: text.y / H })
    }
  }

  return { zones, walls, dims }
}

function inferSpaceTypeFromLabel(label: string): SpaceType {
  const l = label.toLowerCase()
  if (l.includes('parking') || l.includes('garage'))                            return 'parking'
  if (l.includes('restaurant') || l.includes('food'))                           return 'restauration'
  if (l.includes('tech') || l.includes('local') || l.includes('chauff'))        return 'technique'
  if (l.includes('bureau') || l.includes('direction'))                          return 'bureaux'
  if (l.includes('couloir') || l.includes('circulation') || l.includes('hall')) return 'circulation'
  if (l.includes('back') || l.includes('reserve'))                              return 'backoffice'
  if (l.includes('hotel') || l.includes('chambre'))                             return 'hotel'
  if (l.includes('loisir') || l.includes('jeux') || l.includes('cinema'))       return 'loisirs'
  return 'commerce'
}
