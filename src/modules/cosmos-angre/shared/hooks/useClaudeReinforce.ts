import { useState, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useApiKeyStore } from '../../../../lib/apiKeyStore'
import type {
  Zone, Camera, Door, POI, SignageItem, TransitionNode, Floor,
} from '../proph3t/types'

interface ClaudeContext {
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  pois: POI[]
  signageItems: SignageItem[]
  transitions: TransitionNode[]
  floors: Floor[]
}

type Volume = 'vol2' | 'vol3'

interface ClaudeReinforceResult {
  answer: string
  isLoading: boolean
  error: string | null
  claudeKey: string
  setClaudeKey: (key: string) => void
  reinforce: (
    question: string,
    context: ClaudeContext,
    volume: Volume,
    proph3tAnswer: string
  ) => Promise<string | null>
}

/**
 * Hook to call the Supabase Edge Function for Claude reinforcement.
 * The Claude API key is stored in React state (user enters it in UI).
 * The key is NEVER sent directly to Anthropic — always via the Edge Function.
 */
export function useClaudeReinforce(): ClaudeReinforceResult {
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Clé lue depuis le store centralisé — l'utilisateur la configure dans
  // Paramètres → Intégrations IA. Le setter local ne sert plus qu'à
  // synchroniser ponctuellement l'UI si un composant héritant de ce hook
  // veut présenter un éditeur inline, mais il n'est plus source de vérité.
  const storedKey = useApiKeyStore(s => s.claudeApiKey)
  const setStoredKey = useApiKeyStore(s => s.setKey)
  const claudeKey = storedKey
  const setClaudeKey = setStoredKey

  const reinforce = useCallback(
    async (
      question: string,
      context: ClaudeContext,
      volume: Volume,
      proph3tAnswer: string
    ): Promise<string | null> => {
      if (!claudeKey) {
        setError('Clé Claude API requise. Configurez-la dans Paramètres → Intégrations IA.')
        return null
      }

      setIsLoading(true)
      setError(null)
      setAnswer('')

      try {
        const { data, error: fnError } = await supabase.functions.invoke<{ answer: string }>(
          'proph3t-claude',
          {
            body: {
              question,
              context: {
                zones: context.zones,
                cameras: context.cameras,
                doors: context.doors,
                pois: context.pois,
                signageItems: context.signageItems,
                transitions: context.transitions,
                floors: context.floors,
              },
              volume,
              proph3tAnswer,
            },
            headers: {
              'x-client-key': claudeKey,
            },
          }
        )

        if (fnError) {
          const msg = fnError.message || 'Erreur Edge Function proph3t-claude'
          setError(msg)
          return null
        }

        if (!data) {
          setError('Aucune réponse de Claude.')
          return null
        }

        setAnswer(data.answer)
        return data.answer
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue lors de l\'appel Claude'
        setError(msg)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [claudeKey]
  )

  return {
    answer,
    isLoading,
    error,
    claudeKey,
    setClaudeKey,
    reinforce,
  }
}
