// ═══ GLOBAL SETTINGS STORE ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light' | 'auto'
export type Language = 'fr' | 'en'
export type Units = 'metric' | 'imperial'

interface SettingsState {
  // Apparence
  theme: ThemeMode
  language: Language
  units: Units
  // Profil
  userName: string
  userRole: string
  companyName: string
  // Préférences
  autoSave: boolean
  showWelcome: boolean
  defaultView: '2d' | '3d'
  // Actions
  setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'fr',
      units: 'metric',
      userName: '',
      userRole: '',
      companyName: 'Praedium Tech',
      autoSave: true,
      showWelcome: true,
      defaultView: '2d',
      setSetting: (key, value) => set({ [key]: value } as any),
    }),
    { name: 'atlas-settings' }
  )
)
