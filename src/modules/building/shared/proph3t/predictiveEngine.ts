// ═══ PROPH3T — Moteur Prédictif ═══
// Prévision fréquentation, risque sécuritaire et performance enseignes

import type { Zone, Camera, Door, POI } from './types'

// ─── Types ─────────────────────────────────────────────────

export interface FrequentationPrediction {
  datetime: string
  zone_id: string
  zone_label: string
  predicted_visitors: number
  confidence: number
  saturation_risk: boolean
  recommendation?: string
}

export interface PredictionFactors {
  dayOfWeek: number
  hour: number
  isWeekend: boolean
  isHoliday: boolean
  hasEvent: boolean
  weatherScore: number
  weekNumber: number
}

export interface SaturationAlert {
  zone_id: string
  zone_label: string
  datetime: string
  predicted_visitors: number
  capacity: number
  risk_level: 'warning' | 'critical'
  recommendation: string
}

export interface SecurityRiskPrediction {
  zone_id: string
  zone_label: string
  datetime: string
  risk_level: 'faible' | 'moyen' | 'élevé' | 'critique'
  risk_factors: string[]
  recommended_actions: string[]
  staffing_required: number
}

export interface Incident {
  id: string
  type: string
  zone_id: string
  hour: number
  dayOfWeek: number
  resolved: boolean
  response_time: number
  created_at: string
  statut: 'ouvert' | 'assigné' | 'en_cours' | 'résolu' | 'clôturé'
}

export interface TenantPerformancePrediction {
  poi_id: string
  tenant_name: string
  predicted_traffic_daily: number
  predicted_ca_monthly_fcfa: number
  conversion_rate_estimate: number
  position_score: number
  recommendations: string[]
}

export interface HeatmapData {
  zone_id: string
  hour: number
  dayOfWeek: number
  visitors: number
}

// ─── Données fréquentation historique mock ────────────────

const WEEKDAY_PROFILES: Record<string, number[]> = {
  lundi:    [200,150,100,80,60,80,120,350,520,680,750,820,780,740,700,720,800,850,780,650,500,350,200,100],
  mardi:    [180,140,90,70,55,75,110,320,490,650,720,790,760,720,680,700,780,830,760,630,480,330,190,95],
  mercredi: [220,160,110,85,65,85,130,380,560,720,800,860,820,780,740,760,840,890,820,680,520,370,210,105],
  jeudi:    [200,150,100,80,60,80,120,350,520,680,750,820,780,740,700,720,800,850,780,650,500,350,200,100],
  vendredi: [220,170,115,90,70,90,135,400,580,760,840,920,880,840,800,820,900,980,920,800,640,460,270,135],
  samedi:   [300,220,150,120,90,120,180,520,780,1020,1120,1240,1200,1140,1080,1100,1200,1300,1220,1020,820,580,340,170],
  dimanche: [260,190,130,100,75,100,155,440,660,860,960,1060,1020,980,940,960,1060,1140,1060,880,700,500,290,145],
}

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

const ZONE_DISTRIBUTION: Record<string, number> = {
  parking: 0.25,
  commerce: 0.22,
  restauration: 0.18,
  circulation: 0.20,
  loisirs: 0.10,
  services: 0.05,
}

const ZONE_CAPACITIES: Record<string, number> = {
  parking: 800,
  commerce: 1200,
  restauration: 600,
  circulation: 1500,
  loisirs: 400,
  services: 200,
  technique: 50,
  backoffice: 80,
  financier: 100,
  sortie_secours: 2000,
  hotel: 300,
  bureaux: 200,
  exterieur: 3000,
}

// ─── Benchmarks UEMOA par catégorie (FCFA/m²/mois) ──────

const BENCHMARK_CA_M2: Record<string, number> = {
  commerce: 180_000,
  restauration: 220_000,
  services: 120_000,
  loisirs: 140_000,
  hotel: 250_000,
}

const CONVERSION_RATES: Record<string, number> = {
  commerce: 0.22,
  restauration: 0.65,
  services: 0.35,
  loisirs: 0.45,
  hotel: 0.80,
}

// ─── Moteur Prédictif Fréquentation ──────────────────────

function getMultiplier(factors: PredictionFactors): number {
  let mult = 1.0
  if (factors.isWeekend) mult *= 1.4
  if (factors.isHoliday) mult *= 1.4
  if (factors.hasEvent) mult *= 2.1
  // Mauvais temps = plus de monde au mall
  if (factors.weatherScore < 0.3) mult *= 1.3
  // Heures de pointe
  if (factors.hour >= 12 && factors.hour <= 13) mult *= 1.2
  if (factors.hour >= 17 && factors.hour <= 20) mult *= 1.15
  return mult
}

export function predictFrequentation(
  factors: PredictionFactors,
  zones: Zone[],
): FrequentationPrediction[] {
  const dayName = DAY_NAMES[factors.dayOfWeek] ?? 'lundi'
  const hourlyProfile = WEEKDAY_PROFILES[dayName] ?? WEEKDAY_PROFILES.lundi
  const baseVisitors = hourlyProfile[factors.hour] ?? 500
  const multiplier = getMultiplier(factors)
  const totalVisitors = Math.round(baseVisitors * multiplier)

  const dt = new Date()
  dt.setHours(factors.hour, 0, 0, 0)
  const datetime = dt.toISOString()

  return zones.map((zone) => {
    const dist = ZONE_DISTRIBUTION[zone.type] ?? 0.05
    const predicted = Math.round(totalVisitors * dist)
    const capacity = ZONE_CAPACITIES[zone.type] ?? 500
    const saturation_risk = predicted > capacity * 0.8

    return {
      datetime,
      zone_id: zone.id,
      zone_label: zone.label,
      predicted_visitors: predicted,
      confidence: 0.72 + Math.random() * 0.15,
      saturation_risk,
      recommendation: saturation_risk
        ? `Zone ${zone.label} : ${predicted} visiteurs prévus (capacité ${capacity}). Activer les voies de circulation alternatives.`
        : undefined,
    }
  })
}

export function predictNextWeek(zones: Zone[]): FrequentationPrediction[] {
  const predictions: FrequentationPrediction[] = []
  const now = new Date()

  for (let day = 0; day < 7; day++) {
    const target = new Date(now)
    target.setDate(now.getDate() + day)
    const dayOfWeek = target.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    for (let hour = 6; hour <= 22; hour++) {
      const factors: PredictionFactors = {
        dayOfWeek,
        hour,
        isWeekend,
        isHoliday: false,
        hasEvent: false,
        weatherScore: 0.7,
        weekNumber: Math.ceil(
          (target.getTime() - new Date(target.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000),
        ),
      }
      predictions.push(...predictFrequentation(factors, zones))
    }
  }

  return predictions
}

export function getNextSaturationAlert(
  predictions: FrequentationPrediction[],
): SaturationAlert | null {
  const saturated = predictions.find((p) => p.saturation_risk)
  if (!saturated) return null

  const capacity = 800 // fallback
  return {
    zone_id: saturated.zone_id,
    zone_label: saturated.zone_label,
    datetime: saturated.datetime,
    predicted_visitors: saturated.predicted_visitors,
    capacity,
    risk_level: saturated.predicted_visitors > capacity ? 'critical' : 'warning',
    recommendation:
      saturated.recommendation ?? 'Ouvrir voie de circulation alternative.',
  }
}

// ─── Prévision Risque Sécuritaire ────────────────────────

export function predictSecurityRisk(
  zones: Zone[],
  cameras: Camera[],
  doors: Door[],
  incidents: Incident[],
  frequentationPredictions: FrequentationPrediction[],
): SecurityRiskPrediction[] {
  const predictions: SecurityRiskPrediction[] = []
  const now = new Date()

  for (let hourOffset = 0; hourOffset < 48; hourOffset++) {
    const target = new Date(now.getTime() + hourOffset * 3600_000)
    const hour = target.getHours()
    const isNight = hour < 6 || hour > 22

    for (const zone of zones) {
      const risk_factors: string[] = []
      let riskScore = 0

      // Check camera coverage for this zone
      const zoneCameras = cameras.filter((c) => c.floorId === zone.floorId)
      if (zoneCameras.length === 0) {
        risk_factors.push('Aucune caméra dans cette zone')
        riskScore += 8
      }

      const offlineCameras = zoneCameras.filter(
        (c) => (c as Camera & { status?: string }).status === 'offline',
      )
      if (offlineCameras.length > 0) {
        risk_factors.push(`${offlineCameras.length} caméra(s) hors ligne`)
        riskScore += offlineCameras.length * 5
      }

      // Night + technical zone = intrusion risk
      if (isNight && (zone.type === 'technique' || zone.type === 'backoffice')) {
        risk_factors.push('Zone technique de nuit')
        riskScore += 4
      }

      // High traffic + commerce = theft risk
      const freqPred = frequentationPredictions.find(
        (p) => p.zone_id === zone.id,
      )
      if (freqPred && freqPred.predicted_visitors > 500 && zone.type === 'commerce') {
        risk_factors.push('Trafic élevé en zone commerce')
        riskScore += 3
      }

      // Historical incidents in this zone at this hour
      const zoneIncidents = incidents.filter(
        (i) => i.zone_id === zone.id && i.hour === hour,
      )
      if (zoneIncidents.length >= 2) {
        risk_factors.push(`${zoneIncidents.length} incidents historiques à cette heure`)
        riskScore += zoneIncidents.length * 2
      }

      // Saturation + insufficient exits = evacuation risk
      if (freqPred?.saturation_risk) {
        const exits = doors.filter((d) => d.floorId === zone.floorId && d.isExit)
        if (exits.length < 2) {
          risk_factors.push('Saturation prévue avec sorties insuffisantes')
          riskScore += 6
        }
      }

      let risk_level: SecurityRiskPrediction['risk_level'] = 'faible'
      if (riskScore >= 15) risk_level = 'critique'
      else if (riskScore >= 10) risk_level = 'élevé'
      else if (riskScore >= 5) risk_level = 'moyen'

      const recommended_actions: string[] = []
      if (risk_level === 'critique' || risk_level === 'élevé') {
        recommended_actions.push('Renforcer la présence agents de surface')
        if (offlineCameras.length > 0) {
          recommended_actions.push('Rétablir les caméras hors ligne en urgence')
        }
        if (isNight) {
          recommended_actions.push('Intensifier les rondes nocturnes')
        }
      }

      // Staffing required
      let staffing = 1
      if (risk_level === 'élevé') staffing = 2
      if (risk_level === 'critique') staffing = 3

      if (risk_factors.length > 0) {
        predictions.push({
          zone_id: zone.id,
          zone_label: zone.label,
          datetime: target.toISOString(),
          risk_level,
          risk_factors,
          recommended_actions,
          staffing_required: staffing,
        })
      }
    }
  }

  return predictions
}

// ─── Prévision Performance Enseignes ─────────────────────

export function predictTenantPerformance(
  poi: POI,
  zone: Zone,
  frequentationData: FrequentationPrediction[],
  neighborPois: POI[],
): TenantPerformancePrediction {
  // Traffic estimation based on zone frequentation
  const zonePredictions = frequentationData.filter(
    (p) => p.zone_id === zone.id,
  )
  const avgDailyVisitors =
    zonePredictions.length > 0
      ? Math.round(
          zonePredictions.reduce((s, p) => s + p.predicted_visitors, 0) /
            Math.max(zonePredictions.length, 1),
        )
      : 500

  // Position score based on proximity to entrances and visibility
  const nearEntrance = zone.type === 'circulation' ? 85 : 60
  const neighborBonus = Math.min(neighborPois.length * 3, 15)
  const position_score = Math.min(100, nearEntrance + neighborBonus)

  // Conversion rate from benchmark
  const conversion = CONVERSION_RATES[zone.type] ?? 0.20
  const panierMoyen = zone.type === 'restauration' ? 4500 : 8500 // FCFA

  const predicted_traffic_daily = Math.round(avgDailyVisitors * 0.3)
  const dailyCA = predicted_traffic_daily * conversion * panierMoyen
  const predicted_ca_monthly_fcfa = Math.round(dailyCA * 26)

  const recommendations: string[] = []
  if (position_score < 50) {
    recommendations.push('Position peu visible — envisager une signalétique directionnelle')
  }
  if (conversion < 0.2) {
    recommendations.push('Taux de conversion faible — optimiser la vitrine et l\'offre promotionnelle')
  }
  if (neighborPois.length > 5) {
    recommendations.push('Forte concurrence directe — différencier l\'offre ou ajuster le positionnement')
  }
  if (predicted_ca_monthly_fcfa < (BENCHMARK_CA_M2[zone.type] ?? 150_000) * (zone.surfaceM2 ?? 100)) {
    recommendations.push('CA estimé inférieur au benchmark UEMOA — revoir le mix produit')
  }

  return {
    poi_id: poi.id,
    tenant_name: poi.label,
    predicted_traffic_daily,
    predicted_ca_monthly_fcfa,
    conversion_rate_estimate: conversion,
    position_score,
    recommendations,
  }
}
