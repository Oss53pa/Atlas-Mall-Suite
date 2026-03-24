import React, { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Trash2, Bot, User } from 'lucide-react'
import type { ChatMessage } from '../proph3t/types'

interface Proph3tChatProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  onClear: () => void
  isProcessing?: boolean
  placeholder?: string
}

export default function Proph3tChat({ messages, onSend, onClear, isProcessing, placeholder = 'Demandez a Proph3t...' }: Proph3tChatProps) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-surface-1 border-l border-white/[0.04]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-surface-1" />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-white">Proph3t</span>
            <span className="text-[10px] text-gray-500 ml-1.5">Expert Vivant</span>
          </div>
        </div>
        <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-white/[0.04] text-gray-500 hover:text-gray-300 transition-colors" title="Effacer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-12 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-purple-500/50" />
            </div>
            <p className="text-[13px] text-gray-500 font-medium">Proph3t est pret a vous assister.</p>
            <p className="text-[12px] text-gray-600 mt-1">Posez une question sur votre projet.</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            {msg.role !== 'user' && (
              <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center flex-none mt-0.5">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-atlas-700 text-white rounded-br-sm'
                : 'bg-surface-3 text-gray-200 border border-white/[0.04] rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-atlas-700/20 flex items-center justify-center flex-none mt-0.5">
                <User className="w-3.5 h-3.5 text-atlas-400" />
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-2.5 justify-start animate-fade-in">
            <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center flex-none">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="bg-surface-3 border border-white/[0.04] rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={placeholder}
            className="input-dark flex-1 !py-2.5 !rounded-xl !text-[13px]"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 shadow-glow-purple hover:shadow-glow-purple"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
