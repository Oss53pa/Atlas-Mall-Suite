// ═══ CAD CONVERSION SERVICE — Client-side interface to convert-cad Edge Function ═══
//
// Handles DWG→DXF (via ODA) and RVT→IFC (via Autodesk APS) server-side conversions.
// Falls back to local binary parsing if the conversion server is unavailable.

import { supabase } from '../lib/supabase'

// ═══ TYPES ═══

export interface ConversionStatus {
  converters: {
    dwg_to_dxf: { available: boolean; method: string }
    rvt_to_ifc: { available: boolean; method: string }
  }
}

export interface DwgConversionResult {
  success: true
  format: 'dxf'
  sourceFormat: 'dwg'
  version: string
  dxfContent: string
  fileName: string
}

export interface RvtConversionResult {
  success: true
  format: 'ifc'
  sourceFormat: 'rvt'
  ifcUrl: string
  urn: string
  fileName: string
}

export interface ConversionError {
  success?: false
  error: string
}

export type ConversionResult = DwgConversionResult | RvtConversionResult | ConversionError

// ═══ EDGE FUNCTION URL ═══

function getConvertCadUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string ?? ''
  if (!supabaseUrl) return ''
  return `${supabaseUrl}/functions/v1/convert-cad`
}

// ═══ CHECK SERVER AVAILABILITY ═══

let cachedStatus: ConversionStatus | null = null
let statusCheckedAt = 0
const STATUS_CACHE_MS = 60_000 // re-check every minute

export async function checkConversionServer(): Promise<ConversionStatus> {
  if (cachedStatus && Date.now() - statusCheckedAt < STATUS_CACHE_MS) {
    return cachedStatus
  }

  const url = getConvertCadUrl()
  if (!url) {
    return {
      converters: {
        dwg_to_dxf: { available: false, method: 'none' },
        rvt_to_ifc: { available: false, method: 'none' },
      },
    }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action: 'status' }),
    })

    if (res.ok) {
      cachedStatus = await res.json()
      statusCheckedAt = Date.now()
      return cachedStatus!
    }
  } catch {
    // Server unavailable
  }

  cachedStatus = {
    converters: {
      dwg_to_dxf: { available: false, method: 'none' },
      rvt_to_ifc: { available: false, method: 'none' },
    },
  }
  statusCheckedAt = Date.now()
  return cachedStatus
}

// ═══ CONVERT DWG → DXF ═══

export async function convertDwgToDxf(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<DwgConversionResult> {
  const url = getConvertCadUrl()
  if (!url) {
    throw new Error('Serveur de conversion non configure (VITE_SUPABASE_URL manquant)')
  }

  onProgress?.(10)

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const formData = new FormData()
  formData.append('file', file)
  formData.append('format', 'dwg')

  onProgress?.(20)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  onProgress?.(80)

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(errData.error ?? `Erreur serveur: ${res.status}`)
  }

  const result: ConversionResult = await res.json()

  if ('error' in result) {
    throw new Error(result.error)
  }

  onProgress?.(100)
  return result as DwgConversionResult
}

// ═══ CONVERT RVT → IFC ═══

export async function convertRvtToIfc(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<RvtConversionResult> {
  const url = getConvertCadUrl()
  if (!url) {
    throw new Error('Serveur de conversion non configure (VITE_SUPABASE_URL manquant)')
  }

  onProgress?.(5)

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const formData = new FormData()
  formData.append('file', file)
  formData.append('format', 'rvt')

  onProgress?.(10)

  // RVT conversion can take several minutes (Autodesk APS translation)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    signal: AbortSignal.timeout(360_000), // 6 minute timeout
  })

  onProgress?.(90)

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(errData.error ?? `Erreur serveur: ${res.status}`)
  }

  const result: ConversionResult = await res.json()

  if ('error' in result) {
    throw new Error(result.error)
  }

  onProgress?.(100)
  return result as RvtConversionResult
}

// ═══ DOWNLOAD IFC FROM URL ═══

export async function downloadIfcFromUrl(ifcUrl: string): Promise<File> {
  const res = await fetch(ifcUrl)
  if (!res.ok) throw new Error(`Echec du telechargement IFC: ${res.status}`)
  const blob = await res.blob()
  return new File([blob], 'converted.ifc', { type: 'application/x-step' })
}

// ═══ UTILITY: IS SERVER CONVERSION AVAILABLE ═══

export async function isDwgServerConversionAvailable(): Promise<boolean> {
  const status = await checkConversionServer()
  return status.converters.dwg_to_dxf.available
}

export async function isRvtConversionAvailable(): Promise<boolean> {
  const status = await checkConversionServer()
  return status.converters.rvt_to_ifc.available
}
