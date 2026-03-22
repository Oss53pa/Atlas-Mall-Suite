import React, { useCallback, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'
import type { ChatMessage } from '../../shared/proph3t/types'

function uid(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const SUGGESTIONS = [
  'Score exp\u00e9rience ?',
  'Signal\u00e9tique ?',
  'Itin\u00e9raire PMR ?',
  'Moments cl\u00e9s ?',
  'Cosmos Club ?',
  'Benchmark ?',
]

export default function ChatSection() {
  const chatMessages = useVol3Store((s) => s.chatMessages)
  const addChatMessage = useVol3Store((s) => s.addChatMessage)
  const clearChat = useVol3Store((s) => s.clearChat)
  const pois = useVol3Store((s) => s.pois)
  const signageItems = useVol3Store((s) => s.signageItems)
  const moments = useVol3Store((s) => s.moments)

  const [input, setInput] = useState('')

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, timestamp: new Date().toISOString() }
    addChatMessage(userMsg)
    setInput('')

    const q = text.toLowerCase()
    let reply = ''
    const refs: string[] = []

    if (q.includes('score') || q.includes('experience')) {
      const score = Math.min(95, 45 + pois.length * 3 + moments.length * 4)
      reply = `Score exp\u00e9rience Proph3t : ${score}/100.\n${pois.length} POI, ${moments.length} moments cl\u00e9s, ${signageItems.length} \u00e9l\u00e9ments signal\u00e9tiques.`
      refs.push('NF P96-105')
    } else if (q.includes('pmr') || q.includes('accessib')) {
      const pmrPois = pois.filter(p => p.pmr)
      reply = `${pmrPois.length}/${pois.length} POI accessibles PMR (${pois.length > 0 ? Math.round(pmrPois.length / pois.length * 100) : 0}%).\nPOI PMR : ${pmrPois.map(p => p.label).join(', ') || 'Aucun'}.`
      refs.push('NF P96-105', 'ISO 7001')
    } else if (q.includes('moment') || q.includes('parcours')) {
      const addressed = moments.filter(m => m.signageItems.length > 0).length
      reply = `${moments.length}/7 moments cl\u00e9s g\u00e9n\u00e9r\u00e9s.\n${addressed} adress\u00e9s avec signal\u00e9tique.`
    } else if (q.includes('signal') || q.includes('totem') || q.includes('panneau')) {
      const byType: Record<string, number> = {}
      signageItems.forEach(s => { byType[s.type] = (byType[s.type] ?? 0) + 1 })
      reply = `${signageItems.length} \u00e9l\u00e9ments signal\u00e9tiques.\n${Object.entries(byType).map(([t, n]) => `${t}: ${n}`).join('\n')}`
      refs.push('ISO 7010', 'NF X 08-003')
    } else if (q.includes('cosmos') || q.includes('club') || q.includes('fid')) {
      const cosmosClubPoi = pois.find(p => p.type === 'cosmos_club')
      reply = cosmosClubPoi ? `Cosmos Club : ${cosmosClubPoi.label}\nOffre : ${cosmosClubPoi.cosmosClubOffre ?? 'Non d\u00e9finie'}` : 'Aucun point Cosmos Club configur\u00e9.'
    } else if (q.includes('benchmark') || q.includes('comparatif')) {
      reply = `Benchmark 50+ malls africains Classe A :\n\u2022 Score parcours moyen : 68/100\n\u2022 Densit\u00e9 signal\u00e9tique : 0.7/100m\u00b2\n\u2022 Vos m\u00e9triques : ${moments.length} moments, ${pois.length} POI, ${signageItems.length} signal\u00e9tique`
    } else {
      reply = `Proph3t Parcours \u2014 Je peux aider avec :\n\u2022 Score exp\u00e9rience\n\u2022 PMR & accessibilit\u00e9\n\u2022 Moments cl\u00e9s\n\u2022 Signal\u00e9tique\n\u2022 Wayfinding\n\u2022 Cosmos Club\n\u2022 Benchmark`
    }

    setTimeout(() => {
      addChatMessage({
        id: uid(), role: 'proph3t', content: reply, timestamp: new Date().toISOString(), references: refs.length > 0 ? refs : undefined,
      })
    }, 300)
  }, [pois, signageItems, moments, addChatMessage])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-purple-400" />
        </div>
        <h3 className="text-sm font-semibold text-purple-300">Proph3t \u2014 Parcours</h3>
        <div className="flex-1" />
        <button onClick={clearChat} className="text-[10px] text-gray-500 hover:text-gray-300">Effacer</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
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
              <div className="text-[10px] text-purple-500 font-mono mb-1">Proph3t IA locale</div>
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
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
