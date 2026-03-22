import React, { useCallback } from 'react'
import type { ChatMessage, Floor, Camera, Door, Zone, TransitionNode, BlindSpot, SecurityScore, ProjectMemorySummary } from '../../shared/proph3t/types'
import type { FullProjectContext } from '../../shared/proph3t/chatEngine'
import { proph3tAnswer } from '../../shared/proph3t/chatEngine'
import Proph3tChat from '../../shared/components/Proph3tChat'

interface ChatSectionProps {
  messages: ChatMessage[]
  floors: Floor[]
  activeFloorId: string
  cameras: Camera[]
  doors: Door[]
  zones: Zone[]
  transitions: TransitionNode[]
  blindSpots: BlindSpot[]
  score: SecurityScore | null
  memory: ProjectMemorySummary | null
  onAddMessage: (msg: ChatMessage) => void
  onClear: () => void
}

export default function ChatSection({
  messages, floors, activeFloorId, cameras, doors, zones,
  transitions, blindSpots, score, memory, onAddMessage, onClear,
}: ChatSectionProps) {
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
