// ═══ LECTEUR PDF DE PLANS — supporte AutoCAD, ArchiCAD, Revit ═══
// Handles: OPS.constructPath, OPS.rectangle, moveTo/lineTo/curveTo
// Filters by line width to separate walls from annotations/hatches

import * as pdfjsLib from 'pdfjs-dist'
import type { PDFPlanPage, PDFPath, PDFText, PathCommand, BoundingBox } from './planReaderTypes'
import type { SpaceType, Zone } from '../proph3t/types'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// ── Wall thickness threshold (points) ────────────────────────
// AutoCAD exports: walls = 0.5-3pt, annotations = 0.1-0.3pt, hatches = 0pt fill
const WALL_MIN_WIDTH = 0.4
const ANNOTATION_MAX_WIDTH = 0.35

// ─── LECTURE PDF → PAGES ─────────────────────────────────────

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

// ─── EXTRACTION CHEMINS VECTORIELS (rewritten for AutoCAD) ───

function extractPathsFromOperatorList(
  opList: pdfjsLib.PDFOperatorList,
  viewport: pdfjsLib.PageViewport
): PDFPath[] {
  const paths: PDFPath[] = []
  let currentCommands: PathCommand[] = []
  let currentLineWidth = 1
  let currentStrokeColor = '#000000'
  let currentFillColor = '#000000'
  let isFillMode = false
  let pathId = 0

  const ops = opList.fnArray
  const args = opList.argsArray
  const H = viewport.height

  function flushPath(mode: 'stroke' | 'fill' | 'fillStroke') {
    if (currentCommands.length === 0) return

    const bb = computeBoundingBox(currentCommands)
    const isClosed = currentCommands.some(c => c.type === 'Z')
    const isHatch = mode === 'fill' && currentLineWidth < 0.1
    const isAnnotation = currentLineWidth > 0 && currentLineWidth <= ANNOTATION_MAX_WIDTH
    const isWall = currentLineWidth >= WALL_MIN_WIDTH

    paths.push({
      id: `path-${pathId++}`,
      commands: [...currentCommands],
      strokeColor: currentStrokeColor,
      lineWidth: currentLineWidth,
      isClosed,
      boundingBox: bb,
      estimatedType: classifyPath(currentCommands, currentLineWidth, isClosed, bb, isHatch, isWall),
    })
    currentCommands = []
  }

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    const arg = args[i]

    try {
    switch (op) {
      // ── Basic path construction ──
      case pdfjsLib.OPS.moveTo:
        currentCommands.push({ type: 'M', x: arg[0], y: H - arg[1] })
        break

      case pdfjsLib.OPS.lineTo:
        currentCommands.push({ type: 'L', x: arg[0], y: H - arg[1] })
        break

      case pdfjsLib.OPS.curveTo:
        currentCommands.push({
          type: 'C',
          x1: arg[0], y1: H - arg[1],
          x2: arg[2], y2: H - arg[3],
          x: arg[4], y: H - arg[5],
        })
        break

      case pdfjsLib.OPS.closePath:
        currentCommands.push({ type: 'Z' })
        break

      // ── AutoCAD's constructPath (batched path commands) ──
      case pdfjsLib.OPS.constructPath: {
        if (!Array.isArray(arg?.[0]) || !Array.isArray(arg?.[1])) break
        const subOps = arg[0] as number[]
        const subArgs = arg[1] as number[]
        let argIdx = 0

        for (const subOp of subOps) {
          if (argIdx >= subArgs.length) break
          switch (subOp) {
            case pdfjsLib.OPS.moveTo:
              if (argIdx + 1 < subArgs.length) {
                currentCommands.push({ type: 'M', x: subArgs[argIdx], y: H - subArgs[argIdx + 1] })
              }
              argIdx += 2
              break
            case pdfjsLib.OPS.lineTo:
              if (argIdx + 1 < subArgs.length) {
                currentCommands.push({ type: 'L', x: subArgs[argIdx], y: H - subArgs[argIdx + 1] })
              }
              argIdx += 2
              break
            case pdfjsLib.OPS.curveTo:
              if (argIdx + 5 < subArgs.length) {
                currentCommands.push({
                  type: 'C',
                  x1: subArgs[argIdx], y1: H - subArgs[argIdx + 1],
                  x2: subArgs[argIdx + 2], y2: H - subArgs[argIdx + 3],
                  x: subArgs[argIdx + 4], y: H - subArgs[argIdx + 5],
                })
              }
              argIdx += 6
              break
            case pdfjsLib.OPS.closePath:
              currentCommands.push({ type: 'Z' })
              break
            // OPS.rectangle inside constructPath
            case pdfjsLib.OPS.rectangle:
              if (argIdx + 3 < subArgs.length) {
                const rx = subArgs[argIdx], ry = subArgs[argIdx + 1]
                const rw = subArgs[argIdx + 2], rh = subArgs[argIdx + 3]
                currentCommands.push(
                  { type: 'M', x: rx, y: H - ry },
                  { type: 'L', x: rx + rw, y: H - ry },
                  { type: 'L', x: rx + rw, y: H - (ry + rh) },
                  { type: 'L', x: rx, y: H - (ry + rh) },
                  { type: 'Z' },
                )
              }
              argIdx += 4
              break
            default:
              // Unknown sub-op — try to skip safely
              argIdx += 2
              break
          }
        }
        break
      }

      // ── Rectangle (common in AutoCAD for rooms/cells) ──
      case pdfjsLib.OPS.rectangle: {
        const [rx, ry, rw, rh] = arg
        currentCommands.push(
          { type: 'M', x: rx, y: H - ry },
          { type: 'L', x: rx + rw, y: H - ry },
          { type: 'L', x: rx + rw, y: H - (ry + rh) },
          { type: 'L', x: rx, y: H - (ry + rh) },
          { type: 'Z' },
        )
        break
      }

      // ── State changes ──
      case pdfjsLib.OPS.setLineWidth:
        currentLineWidth = arg[0]
        break

      case pdfjsLib.OPS.setStrokeRGBColor:
        currentStrokeColor = rgbToHex(arg[0], arg[1], arg[2])
        break

      case pdfjsLib.OPS.setFillRGBColor:
        currentFillColor = rgbToHex(arg[0], arg[1], arg[2])
        isFillMode = true
        break

      case pdfjsLib.OPS.setStrokeGray:
        currentStrokeColor = grayToHex(arg[0])
        break

      case pdfjsLib.OPS.setFillGray:
        currentFillColor = grayToHex(arg[0])
        isFillMode = true
        break

      // ── Path rendering (flush) ──
      case pdfjsLib.OPS.stroke:
        flushPath('stroke')
        break
      case pdfjsLib.OPS.fill:
      case pdfjsLib.OPS.eoFill:
        flushPath('fill')
        break
      case pdfjsLib.OPS.fillStroke:
      case pdfjsLib.OPS.eoFillStroke:
        flushPath('fillStroke')
        break

      // ── Save/restore ignore current path ──
      case pdfjsLib.OPS.save:
      case pdfjsLib.OPS.restore:
        break

      // ── End path without drawing (discard) ──
      case pdfjsLib.OPS.endPath:
        currentCommands = []
        break
    }
    } catch {
      // Skip malformed operator — don't crash the entire extraction
      continue
    }
  }

  return paths
}

// ─── PATH CLASSIFICATION ─────────────────────────────────────

function classifyPath(
  cmds: PathCommand[],
  lineWidth: number,
  isClosed: boolean,
  bb: BoundingBox,
  isHatch: boolean,
  isWall: boolean,
): PDFPath['estimatedType'] {
  // Hatches: thin filled areas → skip
  if (isHatch) return 'hatch'

  const area = bb.w * bb.h
  const pointCount = cmds.filter(c => c.type !== 'Z').length

  // Dimension lines: thin, short, 2 points
  if (lineWidth < ANNOTATION_MAX_WIDTH && !isClosed && pointCount === 2) {
    const pts = cmds.filter(c => c.x !== undefined)
    if (pts.length >= 2) {
      const length = Math.sqrt((pts[1].x! - pts[0].x!) ** 2 + (pts[1].y! - pts[0].y!) ** 2)
      if (length < 30) return 'dimension_line'
    }
    return 'annotation'
  }

  // Closed rectangles with thick lines → zone boundary (rooms/cells)
  if (isClosed && isWall && area > 200) return 'zone_boundary'

  // Closed paths with decent area → potential zone
  if (isClosed && area > 500) return 'zone_boundary'

  // Thick open lines → walls
  if (isWall && !isClosed) return 'wall'

  // Thin lines → annotations
  if (lineWidth <= ANNOTATION_MAX_WIDTH) return 'annotation'

  return 'unknown'
}

// ─── BOUNDING BOX ────────────────────────────────────────────

function computeBoundingBox(cmds: PathCommand[]): BoundingBox {
  const xs: number[] = []
  const ys: number[] = []
  for (const c of cmds) {
    if (c.x !== undefined) xs.push(c.x)
    if (c.y !== undefined) ys.push(c.y)
    if ('x1' in c && c.x1 !== undefined) xs.push(c.x1)
    if ('y1' in c && c.y1 !== undefined) ys.push(c.y1)
    if ('x2' in c && c.x2 !== undefined) xs.push(c.x2)
    if ('y2' in c && c.y2 !== undefined) ys.push(c.y2)
  }
  if (xs.length === 0 || ys.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

// ─── TEXT EXTRACTION ─────────────────────────────────────────

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
  // Room labels: short uppercase text, or contains cell/local references
  if (t.length < 40 && (/^[A-Z][- ]?\d/.test(t) || /CELLULE|LOCAL|LOT|BOUTIQUE|RESTAURANT/i.test(t))) return 'room_label'
  if (t.length < 30 && t === t.toUpperCase() && /[A-Z]/.test(t)) return 'room_label'
  return 'annotation'
}

export function detectFloorLevelFromTexts(texts: PDFText[]): string | undefined {
  const levels = ['B2', 'B1', 'RDC', 'R+1', 'R+2', 'R+3', 'SOUS-SOL', 'REZ-DE-CHAUSSEE', 'REZ DE CHAUSSEE', 'TERRASSE']
  for (const text of texts) {
    const upper = text.content.toUpperCase()
    for (const level of levels) {
      if (upper.includes(level)) return level.includes('REZ') ? 'RDC' : level
    }
  }
  return undefined
}

// ─── CONVERSION PDF → ZONES (with text-based labeling) ───────

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

    // Get zone boundaries (filtered: skip hatches and annotations)
    const zonePaths = page.paths.filter(p =>
      p.estimatedType === 'zone_boundary' &&
      p.boundingBox.w > 10 && p.boundingBox.h > 10  // skip tiny rectangles
    )

    // Deduplicate overlapping zones (AutoCAD often draws same rect multiple times)
    const deduped = deduplicateZones(zonePaths)

    for (const path of deduped) {
      const normX = path.boundingBox.x / W
      const normY = path.boundingBox.y / H
      const normW = path.boundingBox.w / W
      const normH = path.boundingBox.h / H

      // Find texts INSIDE this zone boundary
      const innerTexts = page.texts.filter(t =>
        t.x >= path.boundingBox.x - 5 && t.x <= path.boundingBox.x + path.boundingBox.w + 5 &&
        t.y >= path.boundingBox.y - 5 && t.y <= path.boundingBox.y + path.boundingBox.h + 5
      )

      // Prefer room_label texts, then any text
      const roomLabels = innerTexts.filter(t => t.estimatedRole === 'room_label')
      const label = roomLabels[0]?.content ?? innerTexts.find(t => t.content.length > 1 && t.content.length < 40)?.content ?? 'Zone sans nom'

      zones.push({
        label,
        x: normX, y: normY, w: normW, h: normH,
        type: inferSpaceTypeFromLabel(label),
        niveau: 1,
        color: '#0a2a15',
        floorId: '',
      })
    }

    // Extract walls (thick open paths)
    for (const path of page.paths.filter(p => p.estimatedType === 'wall')) {
      const cmds = path.commands.filter(c => c.x !== undefined)
      for (let j = 0; j < cmds.length - 1; j++) {
        if (cmds[j].x !== undefined && cmds[j + 1].x !== undefined) {
          walls.push({
            x1: cmds[j].x! / W, y1: cmds[j].y! / H,
            x2: cmds[j + 1].x! / W, y2: cmds[j + 1].y! / H,
          })
        }
      }
    }

    // Extract dimensions
    for (const text of page.texts.filter(t => t.estimatedRole === 'dimension')) {
      dims.push({ text: text.content, x: text.x / W, y: text.y / H })
    }
  }

  return { zones, walls, dims }
}

// ─── DEDUPLICATION ───────────────────────────────────────────
// AutoCAD PDFs often have duplicate/overlapping rectangles

function deduplicateZones(paths: PDFPath[]): PDFPath[] {
  const result: PDFPath[] = []
  for (const p of paths) {
    const isDuplicate = result.some(existing => {
      const dx = Math.abs(existing.boundingBox.x - p.boundingBox.x)
      const dy = Math.abs(existing.boundingBox.y - p.boundingBox.y)
      const dw = Math.abs(existing.boundingBox.w - p.boundingBox.w)
      const dh = Math.abs(existing.boundingBox.h - p.boundingBox.h)
      return dx < 3 && dy < 3 && dw < 5 && dh < 5
    })
    if (!isDuplicate) result.push(p)
  }
  return result
}

// ─── SPACE TYPE INFERENCE ────────────────────────────────────

function inferSpaceTypeFromLabel(label: string): SpaceType {
  const l = label.toLowerCase()
  if (l.includes('parking') || l.includes('garage'))                             return 'parking'
  if (l.includes('restaurant') || l.includes('food') || l.includes('cuisine'))   return 'restauration'
  if (l.includes('tech') || l.includes('local') || l.includes('chauff') || l.includes('gaine')) return 'technique'
  if (l.includes('bureau') || l.includes('direction') || l.includes('admin'))    return 'bureaux'
  if (l.includes('couloir') || l.includes('circulation') || l.includes('hall') || l.includes('allee')) return 'circulation'
  if (l.includes('back') || l.includes('reserve') || l.includes('stock'))        return 'backoffice'
  if (l.includes('hotel') || l.includes('chambre'))                              return 'hotel'
  if (l.includes('loisir') || l.includes('jeux') || l.includes('cinema'))        return 'loisirs'
  if (l.includes('sortie') || l.includes('secours') || l.includes('issue'))      return 'sortie_secours'
  if (l.includes('service') || l.includes('sante') || l.includes('pharm'))       return 'services'
  if (l.includes('escalier') || l.includes('ascenseur') || l.includes('rampe'))  return 'circulation'
  if (l.includes('sanitaire') || l.includes('wc') || l.includes('toilette'))     return 'technique'
  return 'commerce'
}

// ─── UTILITIES ───────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function grayToHex(v: number): string {
  const hex = Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${hex}${hex}${hex}`
}
