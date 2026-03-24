// ═══ TECHNICAL CALCULATOR — Real Engineering Formulas ═══

import type { Door, Zone } from './types'

export interface PlanScale {
  pixelsPerMeter: number
  sourceType: 'dxf_cotation' | 'manual' | 'estimated'
  confidence: number
}

export interface FOVCalculation {
  horizontalAngleDeg: number
  verticalAngleDeg: number
  groundCoverageM2: number
  detectionMaxM: number
  observationMaxM: number
  recognitionMaxM: number
  identificationMaxM: number
  effectiveResolutionPxPerM: number
  coveragePolygon: { x: number; y: number }[]
}

export interface NetworkCalculation {
  totalBandwidthMbps: number
  peakBandwidthMbps: number
  storageRequiredTB: number
  storageDays: number
  perCamera: { cameraId: string; model: string; bitrateMbps: number; storagePerDayGB: number }[]
  switchPortsRequired: number
  recommendedSwitches: string
}

export interface PowerCalculation {
  totalWatts: number
  totalAmps230V: number
  perEquipment: { id: string; type: string; watts: number; poe: boolean }[]
  poeWattsTotal: number
  nonPoeWattsTotal: number
  upsRecommendation: { capacityVA: number; autonomyMin: number; model: string }
  circuitBreakers: number
}

export interface EvacuationCalculation {
  totalTimeSec: number
  conformeNFS61938: boolean
  totalOccupancy: number
  totalExitWidthUP: number
  flowRatePerMin: number
  exitDetails: { doorId: string; label: string; widthM: number; unitPassageUP: number; flowPerMin: number; timeToEvacSec: number; isSufficient: boolean }[]
  insufficientExits: string[]
  recommendations: string[]
}

export interface RealDimensions {
  widthM: number
  heightM: number
  surfaceM2: number
  perimeterM: number
}

export interface CAPEXBreakdown {
  categories: { name: string; items: { designation: string; reference: string; quantity: number; unitPriceFcfa: number; totalPriceFcfa: number }[]; subtotalFcfa: number }[]
  equipmentTotalFcfa: number
  cablingFcfa: number
  installationFcfa: number
  engineeringFcfa: number
  totalHTFcfa: number
  tva18Fcfa: number
  totalTTCFcfa: number
  totalHTEur: number
  totalTTCEur: number
  fcfaToEurRate: number
}

// ─── Constants ───

const SENSOR_SIZES: Record<string, { width: number; height: number }> = {
  '1/3"': { width: 4.8, height: 3.6 },
  '1/2.8"': { width: 5.13, height: 3.84 },
  '1/2.7"': { width: 5.37, height: 4.04 },
  '1/2.5"': { width: 5.76, height: 4.29 },
  '1/1.8"': { width: 7.18, height: 5.32 },
}

const IPVM = { detection: 25, observation: 62.5, recognition: 125, identification: 250 }

const RES_PX: Record<string, { h: number; v: number }> = {
  '2MP': { h: 1920, v: 1080 }, '4MP': { h: 2560, v: 1440 }, '5MP': { h: 2592, v: 1944 },
  '4x2MP': { h: 4096, v: 1800 }, '8MP': { h: 3840, v: 2160 }, '4K': { h: 3840, v: 2160 },
  '12MP': { h: 4000, v: 3000 },
}

const H265_BR: Record<string, { motion: number; static_: number }> = {
  '2MP': { motion: 2, static_: 0.5 }, '4MP': { motion: 4, static_: 1 }, '5MP': { motion: 5, static_: 1.2 },
  '4x2MP': { motion: 6, static_: 1.5 }, '8MP': { motion: 8, static_: 2 }, '4K': { motion: 12, static_: 3 },
  '12MP': { motion: 14, static_: 3.5 },
}

const PWR: Record<string, number> = {
  camera_dome: 12, camera_bullet: 12, camera_ptz: 60, camera_multidirectional: 25,
  camera_fisheye: 15, nvr: 150, badge_reader: 5, biometric_reader: 15,
  electric_lock: 8, door_controller: 20, smoke_detector: 0.5, fire_alarm_panel: 200,
  emergency_light: 8, digital_signage: 150, wayfinding_totem: 200,
}

const FCFA_EUR = 655.957

// ─── Functions ───

export function calculateCameraFOV(
  resolution: string, fovDeg: number, mountHeightM: number,
  tiltDeg = 45, sensorSize = '1/2.8"'
): FOVCalculation {
  const sensor = SENSOR_SIZES[sensorSize] || SENSOR_SIZES['1/2.8"']
  const res = RES_PX[resolution] || RES_PX['4MP']
  const hRad = (fovDeg * Math.PI) / 180
  const vRad = hRad * (sensor.height / sensor.width)
  const vDeg = (vRad * 180) / Math.PI
  const tRad = (tiltDeg * Math.PI) / 180

  const nearDist = Math.max(0, mountHeightM * Math.tan(tRad - vRad / 2))
  const farDist = mountHeightM * Math.tan(Math.min(tRad + vRad / 2, Math.PI / 2 - 0.01))
  const midDist = (nearDist + farDist) / 2
  const nearW = 2 * nearDist * Math.tan(hRad / 2)
  const farW = 2 * farDist * Math.tan(hRad / 2)
  const coverage = ((nearW + farW) / 2) * (farDist - nearDist)
  const widthAtMid = 2 * midDist * Math.tan(hRad / 2)
  const ppm = widthAtMid > 0 ? res.h / widthAtMid : 0
  const tanHalf = Math.tan(hRad / 2)
  const maxDist = (std: number) => tanHalf > 0 ? res.h / (std * 2 * tanHalf) : 0

  return {
    horizontalAngleDeg: fovDeg, verticalAngleDeg: vDeg,
    groundCoverageM2: Math.max(0, coverage),
    detectionMaxM: maxDist(IPVM.detection),
    observationMaxM: maxDist(IPVM.observation),
    recognitionMaxM: maxDist(IPVM.recognition),
    identificationMaxM: maxDist(IPVM.identification),
    effectiveResolutionPxPerM: ppm,
    coveragePolygon: [
      { x: -nearW / 2, y: nearDist }, { x: nearW / 2, y: nearDist },
      { x: farW / 2, y: farDist }, { x: -farW / 2, y: farDist },
    ],
  }
}

export function calculateBandwidth(
  cameras: { id: string; model: string; resolution: string }[],
  retentionDays = 30, simultaneityFactor = 0.7
): NetworkCalculation {
  const perCamera = cameras.map(cam => {
    const br = H265_BR[cam.resolution] || H265_BR['4MP']
    const avg = br.motion * 0.3 + br.static_ * 0.7
    return { cameraId: cam.id, model: cam.model, bitrateMbps: avg, storagePerDayGB: (avg * 1e6 / 8) * 86400 / 1e9 }
  })
  const totalBw = perCamera.reduce((s, c) => s + c.bitrateMbps, 0)
  const totalStorageDay = perCamera.reduce((s, c) => s + c.storagePerDayGB, 0)
  const ports = cameras.length + Math.ceil(cameras.length / 24)
  return {
    totalBandwidthMbps: totalBw * simultaneityFactor, peakBandwidthMbps: totalBw,
    storageRequiredTB: (totalStorageDay * retentionDays) / 1000, storageDays: retentionDays,
    perCamera, switchPortsRequired: ports,
    recommendedSwitches: ports <= 24 ? '1x switch PoE+ 24 ports' : ports <= 48 ? '1x switch PoE+ 48 ports' : `${Math.ceil(ports / 48)}x switch PoE+ 48 ports + 1 switch core`,
  }
}

export function calculatePowerRequirements(
  equipment: { id: string; type: string; watts?: number; poe?: boolean }[]
): PowerCalculation {
  const perEq = equipment.map(eq => ({
    id: eq.id, type: eq.type,
    watts: eq.watts || PWR[eq.type] || 10,
    poe: eq.poe ?? (eq.type.startsWith('camera') || eq.type.includes('reader')),
  }))
  const totalW = perEq.reduce((s, e) => s + e.watts, 0)
  const poeW = perEq.filter(e => e.poe).reduce((s, e) => s + e.watts, 0)
  const va = Math.ceil(totalW * 1.3 / 100) * 100
  return {
    totalWatts: totalW, totalAmps230V: Math.round(totalW / 230 * 100) / 100,
    perEquipment: perEq, poeWattsTotal: poeW, nonPoeWattsTotal: totalW - poeW,
    upsRecommendation: {
      capacityVA: va,
      autonomyMin: totalW > 0 ? Math.round((va * 0.6 * 30) / totalW) : 0,
      model: va > 3000 ? 'APC Smart-UPS 5000VA' : va > 1500 ? 'APC Smart-UPS 3000VA' : 'APC Smart-UPS 1500VA',
    },
    circuitBreakers: Math.ceil(totalW / 2300),
  }
}

export function calculateEvacuationTime(
  _zones: Zone[], exits: Door[], totalOccupancy: number
): EvacuationCalculation {
  const exitDetails = exits.filter(d => d.isExit).map(door => {
    const up = Math.floor(door.widthM / 0.6)
    const flow = up * 60
    return {
      doorId: door.id, label: door.label, widthM: door.widthM,
      unitPassageUP: up, flowPerMin: flow,
      timeToEvacSec: flow > 0 ? (totalOccupancy / flow) * 60 : Infinity,
      isSufficient: up >= 1,
    }
  })
  const totalFlow = exitDetails.reduce((s, e) => s + e.flowPerMin, 0)
  const totalUP = exitDetails.reduce((s, e) => s + e.unitPassageUP, 0)
  const time = totalFlow > 0 ? (totalOccupancy / totalFlow) * 60 : Infinity
  const ok = time <= 180
  const recs: string[] = []
  if (!ok) {
    const need = Math.ceil(totalOccupancy / 180)
    recs.push(`Temps ${Math.round(time)}s > 180s. ${need - totalUP} UP supplémentaires nécessaires.`)
  }
  if (exitDetails.length < 2) recs.push('Minimum 2 sorties de secours réglementaires.')
  const insuf = exitDetails.filter(e => !e.isSufficient).map(e => e.doorId)
  if (insuf.length) recs.push(`${insuf.length} sortie(s) avec largeur < 0.6m.`)
  return {
    totalTimeSec: Math.round(time), conformeNFS61938: ok,
    totalOccupancy, totalExitWidthUP: totalUP, flowRatePerMin: totalFlow,
    exitDetails, insufficientExits: insuf, recommendations: recs,
  }
}

export function calculateRealDimensions(
  entity: { x: number; y: number; w?: number; h?: number }, scale: PlanScale
): RealDimensions {
  const w = (entity.w || 0) / scale.pixelsPerMeter
  const h = (entity.h || 0) / scale.pixelsPerMeter
  return {
    widthM: Math.round(w * 100) / 100, heightM: Math.round(h * 100) / 100,
    surfaceM2: Math.round(w * h * 100) / 100, perimeterM: Math.round(2 * (w + h) * 100) / 100,
  }
}

export function calculateCAPEX(
  items: { designation: string; reference: string; quantity: number; unitPriceFcfa: number; category: string }[]
): CAPEXBreakdown {
  const catMap = new Map<string, typeof items>()
  for (const it of items) {
    const c = it.category || 'Divers'
    if (!catMap.has(c)) catMap.set(c, [])
    catMap.get(c)!.push(it)
  }
  const categories = Array.from(catMap.entries()).map(([name, ci]) => ({
    name,
    items: ci.map(i => ({ designation: i.designation, reference: i.reference, quantity: i.quantity, unitPriceFcfa: i.unitPriceFcfa, totalPriceFcfa: i.quantity * i.unitPriceFcfa })),
    subtotalFcfa: ci.reduce((s, i) => s + i.quantity * i.unitPriceFcfa, 0),
  }))
  const eqTotal = categories.reduce((s, c) => s + c.subtotalFcfa, 0)
  const cable = Math.round(eqTotal * 0.15)
  const install = Math.round(eqTotal * 0.20)
  const eng = Math.round(eqTotal * 0.10)
  const ht = eqTotal + cable + install + eng
  const tva = Math.round(ht * 0.18)
  return {
    categories, equipmentTotalFcfa: eqTotal, cablingFcfa: cable,
    installationFcfa: install, engineeringFcfa: eng,
    totalHTFcfa: ht, tva18Fcfa: tva, totalTTCFcfa: ht + tva,
    totalHTEur: Math.round(ht / FCFA_EUR), totalTTCEur: Math.round((ht + tva) / FCFA_EUR),
    fcfaToEurRate: FCFA_EUR,
  }
}
