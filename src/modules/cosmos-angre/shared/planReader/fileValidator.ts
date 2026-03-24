import type { PlanSourceType } from './planReaderTypes'

export const FILE_LIMITS: Record<PlanSourceType, { maxBytes: number; label: string }> = {
  dxf:          { maxBytes: 50 * 1024 * 1024, label: '50 MB' },
  dwg:          { maxBytes: 50 * 1024 * 1024, label: '50 MB' },
  ifc:          { maxBytes: 50 * 1024 * 1024, label: '50 MB' },
  pdf:          { maxBytes: 30 * 1024 * 1024, label: '30 MB' },
  image_raster: { maxBytes:  8 * 1024 * 1024, label: '8 MB'  },
  svg:          { maxBytes: 10 * 1024 * 1024, label: '10 MB' },
}

export const VALID_EXTENSIONS: Record<PlanSourceType, string[]> = {
  dxf:          ['dxf'],
  dwg:          ['dwg'],
  ifc:          ['ifc'],
  pdf:          ['pdf'],
  image_raster: ['jpg', 'jpeg', 'png', 'webp'],
  svg:          ['svg'],
}

export const VALID_MIMES: Record<PlanSourceType, string[]> = {
  dxf:          ['application/dxf', 'application/acad', 'image/vnd.dxf', 'application/octet-stream'],
  dwg:          ['application/dwg', 'application/acad', 'application/octet-stream'],
  ifc:          ['application/ifc', 'application/octet-stream'],
  pdf:          ['application/pdf'],
  image_raster: ['image/jpeg', 'image/png', 'image/webp'],
  svg:          ['image/svg+xml'],
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  warning?: string
  detectedType: PlanSourceType | null
  fileSizeMB: number
}

export function detectPlanSourceType(file: File): PlanSourceType | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  for (const [type, exts] of Object.entries(VALID_EXTENSIONS)) {
    if (exts.includes(ext)) return type as PlanSourceType
  }
  for (const [type, mimes] of Object.entries(VALID_MIMES)) {
    if (mimes.includes(file.type)) return type as PlanSourceType
  }
  return null
}

export function validatePlanFile(file: File): FileValidationResult {
  const fileSizeMB = file.size / (1024 * 1024)
  const detectedType = detectPlanSourceType(file)

  if (!detectedType) {
    return {
      valid: false,
      error: 'Format non supporte. Formats acceptes : DXF, DWG, IFC, PDF, JPG, PNG, WebP, SVG.',
      detectedType: null,
      fileSizeMB,
    }
  }

  const limit = FILE_LIMITS[detectedType]
  if (file.size > limit.maxBytes) {
    return {
      valid: false,
      error: `Fichier trop volumineux : ${fileSizeMB.toFixed(1)} MB. Maximum pour ${detectedType.toUpperCase()} : ${limit.label}.`,
      detectedType,
      fileSizeMB,
    }
  }

  const warning = detectedType === 'image_raster' && file.size > 6 * 1024 * 1024
    ? `Image volumineuse (${fileSizeMB.toFixed(1)} MB) — la reconnaissance peut etre plus lente.`
    : undefined

  return { valid: true, warning, detectedType, fileSizeMB }
}
