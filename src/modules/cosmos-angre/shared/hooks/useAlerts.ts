// ═══ Hook — useAlerts ═══

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertEngine, type Alert, type AlertEngineState } from '../proph3t/alertEngine'

export function useAlerts(state?: Partial<AlertEngineState>, intervalMs = 10_000) {
  const engineRef = useRef(new AlertEngine())
  const [alerts, setAlerts] = useState<Alert[]>([])

  const evaluate = useCallback(() => {
    if (!state) return
    const fullState: AlertEngineState = {
      cameras: state.cameras ?? [],
      zones: state.zones ?? [],
      doors: state.doors ?? [],
      incidents: state.incidents ?? [],
      planActions: state.planActions ?? [],
      predictions: state.predictions ?? [],
      coveragePercent: state.coveragePercent ?? 95,
      npsScore: state.npsScore ?? 55,
      cosmosClubChurnRate: state.cosmosClubChurnRate ?? 0.08,
    }
    engineRef.current.evaluate(fullState)
    setAlerts(engineRef.current.getActiveAlerts())
  }, [state])

  useEffect(() => {
    evaluate()
    const id = setInterval(evaluate, intervalMs)
    return () => clearInterval(id)
  }, [evaluate, intervalMs])

  const acknowledge = useCallback((alertId: string, userId?: string) => {
    engineRef.current.acknowledge(alertId, userId)
    setAlerts(engineRef.current.getActiveAlerts())
  }, [])

  const resolve = useCallback((alertId: string) => {
    engineRef.current.resolve(alertId)
    setAlerts(engineRef.current.getActiveAlerts())
  }, [])

  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length

  return { alerts, acknowledge, resolve, criticalCount, warningCount, evaluate }
}
