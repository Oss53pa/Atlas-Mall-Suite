import React, { useCallback } from 'react'
import type { ChatMessage } from '../../shared/proph3t/types'
import type { FullProjectContext } from '../../shared/proph3t/chatEngine'
import { proph3tAnswer } from '../../shared/proph3t/chatEngine'
import Proph3tChat from '../../shared/components/Proph3tChat'
import { useVol2Store } from '../store/vol2Store'

export default function ChatSection() {
  const messages = useVol2Store((s) => s.chatMessages)
  const floors = useVol2Store((s) => s.floors)
  const activeFloorId = useVol2Store((s) => s.activeFloorId)
  const cameras = useVol2Store((s) => s.cameras)
  const doors = useVol2Store((s) => s.doors)
  const zones = useVol2Store((s) => s.zones)
  const transitions = useVol2Store((s) => s.transitions)
  const blindSpots = useVol2Store((s) => s.blindSpots)
  const score = useVol2Store((s) => s.score)
  const memory = useVol2Store((s) => s.memory)
  const onAddMessage = useVol2Store((s) => s.addChatMessage)
  const onClear = useVol2Store((s) => s.clearChat)
  const handleSend = useCallback((text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    onAddMessage(userMsg)

    try {
      const ctx: FullProjectContext = {
        floors,
        activeFloorId,
        cameras,
        doors,
        zones,
        transitions,
        blindSpots,
        score,
        pois: [],
        signageItems: [],
        parcours: [],
        memory,
        volume: 'vol2',
      }
      const answer = proph3tAnswer(text, ctx)
      onAddMessage({
        id: `msg-${Date.now()}-ans`,
        role: 'proph3t',
        content: answer.text,
        timestamp: new Date().toISOString(),
        references: answer.references,
      })
    } catch {
      onAddMessage({
        id: `msg-${Date.now()}-err`,
        role: 'proph3t',
        content: 'Erreur lors du traitement de votre question.',
        timestamp: new Date().toISOString(),
      })
    }
  }, [floors, activeFloorId, cameras, doors, zones, transitions, blindSpots, score, memory, onAddMessage])

  return <Proph3tChat messages={messages} onSend={handleSend} onClear={onClear} />
}
