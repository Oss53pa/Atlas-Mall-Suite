// ═══ Hook — useWhatIf ═══

import { useState, useCallback } from 'react'
import type { Camera, Zone, Door, POI } from '../proph3t/types'
import { simulateWhatIf, PREDEFINED_SCENARIOS, type WhatIfScenario, type WhatIfResult } from '../proph3t/whatIfEngine'

export function useWhatIf(
  cameras: Camera[],
  zones: Zone[],
  doors: Door[],
  pois: POI[],
) {
  const [results, setResults] = useState<WhatIfResult[]>([])
  const [activeScenario, setActiveScenario] = useState<WhatIfScenario | null>(null)
  const [loading, setLoading] = useState(false)

  const simulate = useCallback((scenario: WhatIfScenario) => {
    setLoading(true)
    setActiveScenario(scenario)

    // Simulate async delay for UX
    setTimeout(() => {
      const result = simulateWhatIf(scenario, cameras, zones, doors, pois)
      setResults(prev => [result, ...prev])
      setLoading(false)
    }, 400)
  }, [cameras, zones, doors, pois])

  const simulateAll = useCallback(() => {
    setLoading(true)
    const allResults = PREDEFINED_SCENARIOS.map(s =>
      simulateWhatIf(s, cameras, zones, doors, pois)
    )
    setResults(allResults)
    setLoading(false)
  }, [cameras, zones, doors, pois])

  const clear = useCallback(() => {
    setResults([])
    setActiveScenario(null)
  }, [])

  return {
    scenarios: PREDEFINED_SCENARIOS,
    results,
    activeScenario,
    loading,
    simulate,
    simulateAll,
    clear,
  }
}
