import React, { useCallback, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import type { ChatMessage, POI, SignageItem, MomentCle, Zone } from '../../shared/proph3t/types'

interface ChatSectionProps {
  messages: ChatMessage[]
  pois: POI[]
  signageItems: SignageItem[]
  moments: MomentCle[]
  zones: Zone[]
  onAddMessage: (msg: ChatMessage) => void
  onClear: () => void
}

function uid(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const SUGGESTIONS = [
  'Quel est le score experience ?',
  'Combien de POI PMR ?',
  'Distance entre entree et food court ?',
  'Recommandations signaletique ?',
  'Moments-cles non adresses ?',
]

export default function ChatSection({ messages, pois, signageItems, moments, zones, onAddMessage, onClear }: ChatSectionProps) {
  const [input, setInput] = useState('')

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, timestamp: new Date().toISOString() }
    onAddMessage(userMsg)
    setInput('')

    // Local Proph3t response
    const q = text.toLowerCase()
    let reply = `Analyse de "${text}" en cours...`
    const refs: string[] = []

    if (q.includes('score') || q.includes('experience')) {
      const score = Math.min(95, 45 + pois.length * 3 + moments.length * 4)
      reply = `Score experience Proph3t : ${score}/100.\n${pois.length} POI, ${moments.length} moments-cles, ${signageItems.length} elements signaletiques.`
      refs.push('NF P96-105')
    } else if (q.includes('pmr')) {
      const pmrPois = pois.filter(p => p.pmr)
      reply = `${pmrPois.length}/${pois.length} POI sont accessibles PMR (${Math.round(pmrPois.length / pois.length * 100)}%).\nPOI PMR : ${pmrPois.map(p => p.label).join(', ')}.`
      refs.push('NF P96-105', 'ISO 7001')
    } else if (q.includes('moment') || q.includes('parcours')) {
      const addressed = moments.filter(m => m.signageItems.length > 0).length
      reply = `${moments.length}/7 moments-cles generes.\n${addressed} adresses avec signaletique.\nMoments non adresses : ${moments.filter(m => m.signageItems.length === 0).map(m => `${m.number}. ${m.name}`).join(', ') || 'Aucun'}.`
    } else if (q.includes('signal') || q.includes('totem') || q.includes('panneau')) {
      const byType: Record<string, number> = {}
      signageItems.forEach(s => { byType[s.type] = (byType[s.type] || 0) + 1 })
      reply = `${signageItems.length} elements signaletiques.\n${Object.entries(byType).map(([t, n]) => `${t}: ${n}`).join('\n')}`
      refs.push('NF P96-105')
    } else {
      reply = `Proph3t Parcours Client — Je peux vous aider avec :\n- Score experience\n- PMR & accessibilite\n- Moments-cles\n- Signaletique\n- Wayfinding\n- Cosmos Club`
    }

    setTimeout(() => {
      onAddMessage({
        id: uid(), role: 'proph3t', content: reply, timestamp: new Date().toISOString(), references: refs.length > 0 ? refs : undefined,
      })
    }, 300)
  }, [pois, signageItems, moments, onAddMessage])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-purple-400" />
        </div>
        <h3 className="text-sm font-semibold text-purple-300">Proph3t — Parcours</h3>
        <div className="flex-1" />
        <button onClick={onClear} className="text-[10px] text-gray-500 hover:text-gray-300">Effacer</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2 mt-4">
            <div className="text-xs text-gray-600 text-center mb-3">Suggestions :</div>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="w-full text-left text-[11px] text-gray-400 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 hover:border-emerald-500/30 hover:text-gray-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm rounded-lg px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-emerald-900/30 border border-emerald-800/30 text-gray-200 ml-6'
                : 'bg-purple-900/20 border border-purple-800/30 text-gray-300 mr-6'
            }`}
          >
            {msg.role === 'proph3t' && (
              <div className="text-[10px] text-purple-500 font-mono mb-1">Proph3t</div>
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
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
