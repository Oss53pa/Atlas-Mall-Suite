// ═══ VOL.3 — Chat Proph3t Parcours (Faille #4 corrigee) ═══
// Connexion IA reelle : Ollama → Claude API → keyword matching fallback

import React, { useCallback, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'
import type { ChatMessage } from '../../shared/proph3t/types'
import {
  askProph3t, buildMallContext, getSourceIndicator,
  type AISource, type AIMessage,
} from '../../shared/proph3t/proph3tService'

function uid(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Suggestions contextuelles selon l'activite
const SUGGESTIONS = [
  'Score experience global ?',
  'Quelle zone optimiser pour Tabaski ?',
  'Itineraire PMR entre parking et food court ?',
  'Moments cles manquants ?',
  'Programme Cosmos Club — projections ?',
  'Benchmark vs malls CI Classe A ?',
  'Comparer Noel et Rentree',
  'Combien de signages installer ?',
]

export default function ChatSection() {
  const chatMessages = useVol3Store((s) => s.chatMessages)
  const addChatMessage = useVol3Store((s) => s.addChatMessage)
  const clearChat = useVol3Store((s) => s.clearChat)
  const pois = useVol3Store((s) => s.pois)
  const zones = useVol3Store((s) => s.zones)
  const signageItems = useVol3Store((s) => s.signageItems)
  const moments = useVol3Store((s) => s.moments)

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastSource, setLastSource] = useState<AISource | null>(null)

  // Historique de conversation pour le contexte
  const conversationHistory: AIMessage[] = chatMessages.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }))

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, timestamp: new Date().toISOString() }
    addChatMessage(userMsg)
    setInput('')
    setIsLoading(true)

    try {
      // Construire le contexte du mall
      const systemPrompt = buildMallContext({
        zoneCount: zones.length,
        storeCount: pois.filter(p => p.type === 'enseigne').length,
        kpis: {
          pois: pois.length,
          moments: moments.length,
          signageItems: signageItems.length,
          pmrRate: pois.length > 0 ? Math.round(pois.filter(p => p.pmr).length / pois.length * 100) : 0,
        },
      })

      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Garder les 10 derniers messages pour le contexte
        { role: 'user', content: text },
      ]

      const response = await askProph3t(messages, {
        projectData: {
          pois: pois.length,
          zones: zones.length,
          moments: moments.length,
          signageItems: signageItems.length,
        },
      })

      setLastSource(response.source)

      // Si mode offline, utiliser le keyword matching comme avant
      let reply = response.text
      const refs: string[] = []

      if (response.source === 'offline') {
        const q = text.toLowerCase()
        if (q.includes('score') || q.includes('experience')) {
          const score = Math.min(95, 45 + pois.length * 3 + moments.length * 4)
          reply = `Score experience Proph3t : ${score}/100.\n${pois.length} POI, ${moments.length} moments cles, ${signageItems.length} elements signaletiques.`
          refs.push('NF P96-105')
        } else if (q.includes('pmr') || q.includes('accessib')) {
          const pmrPois = pois.filter(p => p.pmr)
          reply = `${pmrPois.length}/${pois.length} POI accessibles PMR (${pois.length > 0 ? Math.round(pmrPois.length / pois.length * 100) : 0}%).`
          refs.push('NF P96-105', 'ISO 7001')
        } else if (q.includes('signal') || q.includes('totem')) {
          reply = `${signageItems.length} elements signaletiques configures.`
          refs.push('ISO 7010')
        } else {
          reply = `Mode hors-ligne. ${pois.length} POI, ${moments.length} moments, ${signageItems.length} signages configures.\nPour une analyse complete, connectez Ollama ou configurez la cle Claude API.`
        }
      }

      addChatMessage({
        id: uid(),
        role: 'proph3t',
        content: reply,
        timestamp: new Date().toISOString(),
        references: refs.length > 0 ? refs : undefined,
      })
    } catch {
      addChatMessage({
        id: uid(),
        role: 'proph3t',
        content: 'Erreur de communication avec Proph3t. Reessayez.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }, [pois, zones, signageItems, moments, addChatMessage, isLoading, conversationHistory])

  const sourceInfo = lastSource ? getSourceIndicator(lastSource) : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-purple-400" />
        </div>
        <h3 className="text-sm font-semibold text-purple-300">Proph3t — Parcours</h3>
        {/* Indicateur source IA */}
        {sourceInfo && (
          <span className="text-[9px] flex items-center gap-1 ml-auto mr-2" style={{ color: sourceInfo.color }}>
            {sourceInfo.emoji} {sourceInfo.label}
          </span>
        )}
        <button onClick={clearChat} className="text-[10px] text-gray-500 hover:text-gray-300">Effacer</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <div className="space-y-2 mt-4">
            <div className="text-xs text-gray-600 text-center mb-3">Suggestions :</div>
            <div className="grid grid-cols-2 gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-[11px] text-gray-400 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 hover:border-emerald-500/30 hover:text-gray-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm rounded-lg px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-emerald-900/30 border border-emerald-800/30 text-gray-200 ml-6'
                : 'bg-purple-900/20 border border-purple-800/30 text-gray-300 mr-6'
            }`}
          >
            {msg.role === 'proph3t' && (
              <div className="text-[10px] text-purple-500 font-mono mb-1">
                Proph3t {sourceInfo ? `(${sourceInfo.label})` : ''}
              </div>
            )}
            <p className="leading-relaxed whitespace-pre-line">{msg.content}</p>
            {msg.references && msg.references.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {msg.references.map((r) => (
                  <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-mono">{r}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg px-3 py-2 mr-6">
            <div className="flex items-center gap-2 text-purple-400 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Proph3t reflechit...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-800 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input) } }}
            placeholder="Question sur le parcours..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
