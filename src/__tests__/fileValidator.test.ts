import { describe, it, expect } from 'vitest'
import { validatePlanFile, detectPlanSourceType } from '../modules/cosmos-angre/shared/planReader/fileValidator'

const makeFile = (name: string, sizeBytes: number, type = ''): File => {
  const blob = new Blob([new ArrayBuffer(sizeBytes)], { type })
  return new File([blob], name, { type })
}

describe('detectPlanSourceType', () => {
  it('detecte DXF', () => expect(detectPlanSourceType(makeFile('plan.dxf', 1000))).toBe('dxf'))
  it('detecte DWG', () => expect(detectPlanSourceType(makeFile('plan.dwg', 1000))).toBe('dwg'))
  it('detecte PDF', () => expect(detectPlanSourceType(makeFile('plan.pdf', 1000, 'application/pdf'))).toBe('pdf'))
  it('detecte JPEG', () => expect(detectPlanSourceType(makeFile('scan.jpg', 1000))).toBe('image_raster'))
  it('detecte PNG', () => expect(detectPlanSourceType(makeFile('scan.png', 1000))).toBe('image_raster'))
  it('detecte SVG', () => expect(detectPlanSourceType(makeFile('plan.svg', 1000))).toBe('svg'))
  it('retourne null pour format inconnu', () => expect(detectPlanSourceType(makeFile('plan.xyz', 1000))).toBeNull())
  it('retourne null pour exe', () => expect(detectPlanSourceType(makeFile('virus.exe', 1000))).toBeNull())
})

describe('validatePlanFile', () => {
  it('accepte un DXF valide', () => {
    const r = validatePlanFile(makeFile('plan.dxf', 1 * 1024 * 1024))
    expect(r.valid).toBe(true)
    expect(r.detectedType).toBe('dxf')
  })

  it('accepte un PDF valide', () => {
    const r = validatePlanFile(makeFile('plan.pdf', 5 * 1024 * 1024, 'application/pdf'))
    expect(r.valid).toBe(true)
  })

  it('rejette un DXF trop volumineux (> limite 500MB)', () => {
    const r = validatePlanFile(makeFile('plan.dxf', 600 * 1024 * 1024))
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/volumineux/i)
  })

  it('rejette un format inconnu', () => {
    const r = validatePlanFile(makeFile('plan.xyz', 100))
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/format/i)
  })

  it('avertit pour une image > 6MB', () => {
    const r = validatePlanFile(makeFile('scan.jpg', 7 * 1024 * 1024))
    expect(r.valid).toBe(true)
    expect(r.warning).toBeDefined()
    expect(r.warning).toMatch(/volumineuse/i)
  })

  it('pas d\'avertissement pour image < 6MB', () => {
    const r = validatePlanFile(makeFile('scan.jpg', 3 * 1024 * 1024))
    expect(r.valid).toBe(true)
    expect(r.warning).toBeUndefined()
  })

  it('retourne fileSizeMB correct', () => {
    const r = validatePlanFile(makeFile('plan.pdf', 5 * 1024 * 1024))
    expect(r.fileSizeMB).toBeCloseTo(5, 0)
  })

  it('rejette image > 8MB', () => {
    const r = validatePlanFile(makeFile('scan.png', 9 * 1024 * 1024))
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/volumineux/i)
  })
})
