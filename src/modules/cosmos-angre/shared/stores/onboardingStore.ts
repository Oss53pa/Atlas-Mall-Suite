// ═══ Onboarding Store — tracks whether first-launch wizard has been completed ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  completed: boolean
  projectName: string | null
  selectedVolumes: ('vol1' | 'vol2' | 'vol3' | 'vol4')[]
  floorCount: number
  markComplete: (name: string, volumes: ('vol1' | 'vol2' | 'vol3' | 'vol4')[], floors: number) => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      projectName: null,
      selectedVolumes: ['vol1', 'vol2', 'vol3'],
      floorCount: 3,
      markComplete: (name, volumes, floors) =>
        set({ completed: true, projectName: name, selectedVolumes: volumes, floorCount: floors }),
      reset: () =>
        set({ completed: false, projectName: null, selectedVolumes: ['vol1', 'vol2', 'vol3'], floorCount: 3 }),
    }),
    { name: 'atlas-onboarding' }
  )
)
