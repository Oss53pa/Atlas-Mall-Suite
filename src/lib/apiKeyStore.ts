// ═══ API KEY STORE — clé Claude (Anthropic) stockée côté client ═══
//
// Contraintes :
//   - La clé n'apparaît JAMAIS dans le code source ni dans un .env bundlé
//   - Elle est saisie par l'utilisateur via l'écran Paramètres
//   - Persistée en localStorage sous un namespace dédié
//   - Transmise uniquement via header `x-client-key` vers l'Edge Function Supabase
//     (ou directement vers api.anthropic.com si app 100% locale)
//   - JAMAIS envoyée dans une URL, JAMAIS loggée
//
// Format attendu : `sk-ant-…` (préfixe Anthropic).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ApiKeyStatus = 'unset' | 'ok' | 'invalid' | 'testing' | 'network-error'

interface ApiKeyState {
  /** Clé brute (sk-ant-…) saisie par l'utilisateur. Jamais exportée telle quelle. */
  claudeApiKey: string
  /** Résultat du dernier test de validité. */
  status: ApiKeyStatus
  /** Dernier message d'erreur pour diagnostic. */
  lastError?: string
  /** Timestamp ISO du dernier test réussi. */
  lastTestedAt?: string

  /** Enregistre la clé (trim + validation préfixe). */
  setKey: (raw: string) => void
  /** Efface la clé. */
  clear: () => void
  /** Met à jour le status après un appel test / usage réel. */
  setStatus: (status: ApiKeyStatus, error?: string) => void

  /** Accesseur — retourne la clé si valide, sinon undefined. */
  getValidKey: () => string | undefined
  /** Masque la clé pour affichage (ex: sk-ant-…abcd). */
  getMaskedKey: () => string
}

const PREFIX = 'sk-ant-'

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set, get) => ({
      claudeApiKey: '',
      status: 'unset',

      setKey: (raw) => {
        const trimmed = (raw ?? '').trim()
        if (!trimmed) {
          set({ claudeApiKey: '', status: 'unset', lastError: undefined })
          return
        }
        if (!trimmed.startsWith(PREFIX)) {
          set({ claudeApiKey: trimmed, status: 'invalid', lastError: `La clé doit commencer par "${PREFIX}"` })
          return
        }
        set({ claudeApiKey: trimmed, status: 'ok', lastError: undefined })
      },

      clear: () => set({
        claudeApiKey: '',
        status: 'unset',
        lastError: undefined,
        lastTestedAt: undefined,
      }),

      setStatus: (status, error) => set({
        status,
        lastError: error,
        lastTestedAt: status === 'ok' ? new Date().toISOString() : get().lastTestedAt,
      }),

      getValidKey: () => {
        const k = get().claudeApiKey
        return k && k.startsWith(PREFIX) ? k : undefined
      },

      getMaskedKey: () => {
        const k = get().claudeApiKey
        if (!k) return ''
        if (k.length < 12) return '•'.repeat(k.length)
        return `${k.slice(0, 8)}${'•'.repeat(16)}${k.slice(-4)}`
      },
    }),
    {
      name: 'atlas-api-key-v1',
      storage: createJSONStorage(() => localStorage),
      // Ne persiste QUE la clé et le status — pas les champs dérivés
      partialize: (s) => ({
        claudeApiKey: s.claudeApiKey,
        status: s.status,
        lastTestedAt: s.lastTestedAt,
      }),
    },
  ),
)

/** Accesseur non-React (pour être utilisé dans les moteurs et fetch). */
export function getClaudeApiKey(): string | undefined {
  return useApiKeyStore.getState().getValidKey()
}
