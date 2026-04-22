// ═══ ADVERTISING CAMPAIGN STORE — Campagnes publicitaires GOD MODE ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdvertisingCampaign } from '../engines/godModeSignageEngine'

interface CampaignStoreState {
  campaigns: AdvertisingCampaign[]

  /** Ajouter une campagne. */
  addCampaign: (c: Omit<AdvertisingCampaign, 'id'>) => string
  /** Modifier une campagne. */
  updateCampaign: (id: string, patch: Partial<AdvertisingCampaign>) => void
  /** Supprimer une campagne. */
  deleteCampaign: (id: string) => void
  /** Remplacer toutes les campagnes (import CSV). */
  setCampaigns: (cs: AdvertisingCampaign[]) => void
  /** Campagnes actives à une date donnée. */
  activeCampaignsAt: (date?: Date) => AdvertisingCampaign[]
}

export const useAdvertisingCampaignStore = create<CampaignStoreState>()(
  persist(
    (set, get) => ({
      campaigns: [],

      addCampaign: (c) => {
        const id = `camp-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        set((s) => ({ campaigns: [...s.campaigns, { ...c, id }] }))
        return id
      },

      updateCampaign: (id, patch) =>
        set((s) => ({
          campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      deleteCampaign: (id) =>
        set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),

      setCampaigns: (cs) => set({ campaigns: cs }),

      activeCampaignsAt: (date = new Date()) => {
        const iso = date.toISOString()
        return get().campaigns.filter(
          (c) => c.startDate <= iso && c.endDate >= iso,
        )
      },
    }),
    { name: 'atlas-advertising-campaigns-v1' },
  ),
)
