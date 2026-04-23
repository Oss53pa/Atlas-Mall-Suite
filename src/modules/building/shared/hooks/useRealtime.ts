import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ═══ TYPES ═══

export interface Collaborator {
  id: string
  name: string
  color: string
  x: number
  y: number
  lastSeen: number
}

type BroadcastEvent =
  | { type: 'cursor_move'; userId: string; x: number; y: number }
  | { type: 'entity_added'; userId: string; entityType: string; entityId: string }
  | { type: 'entity_updated'; userId: string; entityType: string; entityId: string }
  | { type: 'entity_deleted'; userId: string; entityType: string; entityId: string }
  | { type: 'user_join'; userId: string; name: string; color: string }
  | { type: 'user_leave'; userId: string }

interface RealtimeResult {
  collaborators: Collaborator[]
  broadcastCursor: (x: number, y: number) => void
  broadcastChange: (
    changeType: 'entity_added' | 'entity_updated' | 'entity_deleted',
    entityType: string,
    entityId: string
  ) => void
  isConnected: boolean
}

// ═══ HELPERS ═══

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined

function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !SUPABASE_URL.includes('placeholder')
}

const COLLABORATOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#a77d4c', '#ec4899',
]

function pickColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length]
}

const STALE_THRESHOLD_MS = 30_000
const CURSOR_THROTTLE_MS = 50

// ═══ HOOK ═══

export function useRealtime(projectId: string, userId: string): RealtimeResult {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastCursorSendRef = useRef(0)
  const userName = useRef(`User-${userId.slice(0, 6)}`)

  // Prune stale collaborators periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCollaborators((prev) =>
        prev.filter((c) => now - c.lastSeen < STALE_THRESHOLD_MS)
      )
    }, 10_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured() || !projectId || !userId) {
      setIsConnected(false)
      return
    }

    const channelName = `plan:${projectId}`
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'sync' }, ({ payload }) => {
        const event = payload as BroadcastEvent

        switch (event.type) {
          case 'cursor_move':
            setCollaborators((prev) => {
              const exists = prev.find((c) => c.id === event.userId)
              if (exists) {
                return prev.map((c) =>
                  c.id === event.userId
                    ? { ...c, x: event.x, y: event.y, lastSeen: Date.now() }
                    : c
                )
              }
              return [
                ...prev,
                {
                  id: event.userId,
                  name: `User-${event.userId.slice(0, 6)}`,
                  color: pickColor(event.userId),
                  x: event.x,
                  y: event.y,
                  lastSeen: Date.now(),
                },
              ]
            })
            break

          case 'user_join':
            setCollaborators((prev) => {
              const exists = prev.find((c) => c.id === event.userId)
              if (exists) {
                return prev.map((c) =>
                  c.id === event.userId
                    ? { ...c, name: event.name, color: event.color, lastSeen: Date.now() }
                    : c
                )
              }
              return [
                ...prev,
                {
                  id: event.userId,
                  name: event.name,
                  color: event.color,
                  x: 0,
                  y: 0,
                  lastSeen: Date.now(),
                },
              ]
            })
            break

          case 'user_leave':
            setCollaborators((prev) => prev.filter((c) => c.id !== event.userId))
            break

          // entity_added / entity_updated / entity_deleted are informational;
          // actual data refresh is handled by useSupabase / react-query invalidation
          default:
            break
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          // Announce our presence
          void channel.send({
            type: 'broadcast',
            event: 'sync',
            payload: {
              type: 'user_join',
              userId,
              name: userName.current,
              color: pickColor(userId),
            } satisfies BroadcastEvent,
          })
        }
      })

    channelRef.current = channel

    return () => {
      // Announce departure
      void channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: { type: 'user_leave', userId } satisfies BroadcastEvent,
      })
      void supabase.removeChannel(channel)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [projectId, userId])

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now()
      if (now - lastCursorSendRef.current < CURSOR_THROTTLE_MS) return
      lastCursorSendRef.current = now

      if (!channelRef.current) return
      void channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: { type: 'cursor_move', userId, x, y } satisfies BroadcastEvent,
      })
    },
    [userId]
  )

  const broadcastChange = useCallback(
    (
      changeType: 'entity_added' | 'entity_updated' | 'entity_deleted',
      entityType: string,
      entityId: string
    ) => {
      if (!channelRef.current) return
      void channelRef.current.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          type: changeType,
          userId,
          entityType,
          entityId,
        } satisfies BroadcastEvent,
      })
    },
    [userId]
  )

  return {
    collaborators,
    broadcastCursor,
    broadcastChange,
    isConnected,
  }
}
