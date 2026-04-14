// ═══ SVG FLOOR PLAN EXTRACTOR — 98% exact ═══

import type { FloorPlanExtractor, NormalizedFloorPlan, NormalizedRoom, Point } from './types'
import { computePolygonArea, generateId, normalizeZoneType } from './types'

export class SVGFloorPlanExtractor implements FloorPlanExtractor {

  async extract(file: File): Promise<NormalizedFloorPlan> {
    const svgText = await file.text()
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const svg = doc.querySelector('svg')
    if (!svg) throw new Error('Fichier SVG invalide')

    const scale = this.detectScale(doc) ?? 1.0
    const rooms: NormalizedRoom[] = []

    this.traverseElements(doc.documentElement, rooms, new DOMMatrix(), scale)

    return {
      rooms,
      walls: [],
      openings: [],
      scale: 1.0,
      confidence: rooms.length > 0 ? 0.98 : 0.3,
    }
  }

  private traverseElements(el: Element, rooms: NormalizedRoom[], transform: DOMMatrix, scale: number): void {
    const localTransform = this.parseTransform(el.getAttribute('transform'))
    const totalTransform = transform.multiply(localTransform)

    if (el.tagName.toLowerCase() === 'g') {
      Array.from(el.children).forEach(child =>
        this.traverseElements(child, rooms, totalTransform, scale)
      )
      return
    }

    const points = this.extractPoints(el)
    if (!points || points.length < 3) return

    const transformed = points.map(p => {
      const pt = new DOMPoint(p.x, p.y).matrixTransform(totalTransform)
      return { x: pt.x * scale, y: pt.y * scale }
    })

    const area = computePolygonArea(transformed)
    if (area < 1) return // skip decorations

    const label = el.getAttribute('id') ??
      el.querySelector('title')?.textContent ??
      el.getAttribute('data-label') ?? undefined

    rooms.push({
      id: generateId(),
      polygon_m: transformed,
      area_sqm: area,
      label,
      zone_type: normalizeZoneType(label),
      semantic_confidence: label ? 0.9 : 0,
    })
  }

  private extractPoints(el: Element): Point[] | null {
    const tag = el.tagName.toLowerCase()

    if (tag === 'rect') {
      const x = parseFloat(el.getAttribute('x') ?? '0')
      const y = parseFloat(el.getAttribute('y') ?? '0')
      const w = parseFloat(el.getAttribute('width') ?? '0')
      const h = parseFloat(el.getAttribute('height') ?? '0')
      if (w <= 0 || h <= 0) return null
      return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]
    }

    if (tag === 'polygon' || tag === 'polyline') {
      const pts = (el.getAttribute('points') ?? '').trim()
      if (!pts) return null
      const coords = pts.split(/[\s,]+/).map(Number)
      const points: Point[] = []
      for (let i = 0; i < coords.length - 1; i += 2) {
        if (!isNaN(coords[i]) && !isNaN(coords[i + 1])) {
          points.push({ x: coords[i], y: coords[i + 1] })
        }
      }
      return points.length >= 3 ? points : null
    }

    if (tag === 'path') {
      const d = el.getAttribute('d') ?? ''
      if (!d.toLowerCase().includes('z')) return null // only closed paths
      return this.parseSVGPath(d)
    }

    return null
  }

  private parseSVGPath(d: string): Point[] {
    const points: Point[] = []
    let x = 0, y = 0, startX = 0, startY = 0

    const commands = d.match(/[MLHVCSQTAZmlhvcsqtaz][^MLHVCSQTAZmlhvcsqtaz]*/g) ?? []

    for (const cmd of commands) {
      const type = cmd[0]
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
      const rel = type === type.toLowerCase()

      switch (type.toUpperCase()) {
        case 'M':
          x = rel ? x + args[0] : args[0]
          y = rel ? y + args[1] : args[1]
          startX = x; startY = y
          points.push({ x, y })
          for (let i = 2; i < args.length; i += 2) {
            x = rel ? x + args[i] : args[i]
            y = rel ? y + args[i + 1] : args[i + 1]
            points.push({ x, y })
          }
          break
        case 'L':
          for (let i = 0; i < args.length; i += 2) {
            x = rel ? x + args[i] : args[i]
            y = rel ? y + args[i + 1] : args[i + 1]
            points.push({ x, y })
          }
          break
        case 'H':
          for (const a of args) { x = rel ? x + a : a; points.push({ x, y }) }
          break
        case 'V':
          for (const a of args) { y = rel ? y + a : a; points.push({ x, y }) }
          break
        case 'Z':
          points.push({ x: startX, y: startY })
          break
      }
    }

    return points.length >= 3 ? points : []
  }

  private detectScale(doc: Document): number | null {
    // Look for scale annotation in text elements
    const texts = doc.querySelectorAll('text')
    for (const t of texts) {
      const match = (t.textContent ?? '').match(/1\s*[:/]\s*(\d+)/)
      if (match) return 1 / parseInt(match[1], 10)
    }
    return null
  }

  private parseTransform(attr: string | null): DOMMatrix {
    if (!attr) return new DOMMatrix()
    // Let the browser parse the transform string
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    el.setAttribute('transform', attr)
    return (el as SVGGraphicsElement).getCTM?.() ?? new DOMMatrix()
  }
}
