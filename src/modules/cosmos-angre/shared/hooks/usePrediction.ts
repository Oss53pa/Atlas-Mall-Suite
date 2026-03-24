// ═══ Hook — usePrediction ═══

import { useState, useEffect, useMemo } from 'react'
import type { Zone, Camera, Door, POI } from '../proph3t/types'
import type { Incident, FrequentationPrediction, SecurityRiskPrediction } from '../proph3t/predictiveEngine'
import { predictFrequentation, predictSecurityRisk } from '../proph3t/predictiveEngine'

export function usePrediction(
  zones: Zone[],
  cameras: Camera[],
  doors: Door[],
  _pois: POI[],
  incidents: Incident[],
) {
  const [frequentation, setFrequentation] = useState<FrequentationPrediction[]>([])
  const [securityRisks, setSecurityRisks] = useState<SecurityRiskPrediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (zones.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Generate predictions for next 24 hours
    const now = new Date()
    const predictions: FrequentationPrediction[] = []

    for (let h = 0; h < 24; h++) {
      const target = new Date(now.getTime() + h * 3600_000)
      const preds = predictFrequentation(
        {
          dayOfWeek: target.getDay(),
          hour: target.getHours(),
          isWeekend: target.getDay() === 0 || target.getDay() === 6,
          isHoliday: false,
          hasEvent: false,
          weatherScore: 0.7,
          weekNumber: Math.ceil((target.getTime() - new Date(target.getFullYear(), 0, 1).getTime()) / (7 * 86_400_000)),
        },
        zones,
      )
      predictions.push(...preds)
    }
    setFrequentation(predictions)

    const risks = predictSecurityRisk(zones, cameras, doors, incidents, predictions)
    setSecurityRisks(risks)

    setLoading(false)
  }, [zones, cameras, doors, incidents])

  const saturationAlerts = useMemo(
    () => frequentation.filter(p => p.saturation_risk),
    [frequentation],
  )

  const criticalRisks = useMemo(
    () => securityRisks.filter(r => r.risk_level === 'critique' || r.risk_level === 'élevé'),
    [securityRisks],
  )

  return {
    frequentation,
    securityRisks,
    saturationAlerts,
    criticalRisks,
    loading,
  }
}
