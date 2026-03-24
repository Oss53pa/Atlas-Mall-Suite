// ═══ PERSONA SIMULATOR — Types ═══

export interface Persona {
  id: string
  name: string
  age: number
  description: string
  avatar: string
  occupation: string
  visitFrequency: string
  budget: 'low' | 'medium' | 'high' | 'premium'
  interests: string[]
  preferredPOIs: string[]
  walkingSpeedMPerS: number
  dwellTimeMultiplier: number
  pmrRequired: boolean
  typicalRoute: string[]
  painPoints: string[]
  color: string
}

export interface JourneyStep {
  poiId: string
  poiLabel: string
  floorId: string
  x: number
  y: number
  arrivalTimeSec: number
  dwellTimeSec: number
  departureTimeSec: number
  emotion: 'excited' | 'satisfied' | 'neutral' | 'frustrated' | 'confused'
  frictionPoints: string[]
}

export interface PersonaJourneySimulation {
  personaId: string
  personaName: string
  steps: JourneyStep[]
  totalTimeSec: number
  totalDistanceM: number
  floorsVisited: string[]
  frictionCount: number
  experienceScore: number
  recommendations: string[]
  dwellTimeByZone: Record<string, number>
}
