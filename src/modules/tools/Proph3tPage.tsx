// ═══ PROPH3T AI — Chat standalone ═══

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Globe2, FolderOpen, Shield, Plus } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string; time: string }
interface Conv { id: string; title: string; date: string; preview: string }

const CONVERSATIONS: Conv[] = [
  { id: '1', title: 'Analyse occupancy RDC', date: '28/03/2026', preview: 'Le taux d\'occupancy du RDC est de 92%...' },
  { id: '2', title: 'Audit caméras B1', date: '25/03/2026', preview: 'J\'ai identifié 3 angles morts au niveau B1...' },
  { id: '3', title: 'Recommandation mix enseigne', date: '20/03/2026', preview: 'Pour optimiser le mix, je recommande...' },
  { id: '4', title: 'Rapport APSAD R82', date: '15/03/2026', preview: 'Le rapport de conformité est prêt...' },
  { id: '5', title: 'Budget CAPEX sécurité', date: '10/03/2026', preview: 'Le budget total s\'élève à 147M FCFA...' },
]

const DEMO_MESSAGES: Message[] = [
  { role: 'user', content: 'Quel est le taux d\'occupancy actuel du centre ?', time: '09:15' },
  { role: 'assistant', content: 'Le taux d\'occupancy global de Cosmos Angré est actuellement de **92%** :\n\n- **RDC** : 95% (15/16 cellules occupées)\n- **R+1** : 88% (7/8 cellules occupées)\n- **B1** : 100% (parking complet)\n\nLa cellule vacante au RDC (réf. C-08, 120 m²) est située dans l\'aile Est, face au food court. C\'est un emplacement premium avec un flux piéton estimé à 2 400 visiteurs/jour.\n\nJe recommande de cibler une enseigne de restauration rapide ou de cosmétiques pour maximiser la synergie avec le food court adjacent.', time: '09:15' },
  { role: 'user', content: 'Quelles enseignes recommandes-tu pour la cellule C-08 ?', time: '09:18' },
  { role: 'assistant', content: 'Pour la cellule **C-08** (120 m², RDC aile Est, face food court), voici mes 3 recommandations :\n\n**1. KFC** — Restauration rapide\n- Loyer estimé : 18 000 FCFA/m²/an → 2 160 000 FCFA/an\n- Synergy score : 94/100 (proximité food court)\n- Déjà présent dans 3 malls CFAO en CI\n\n**2. MAC Cosmetics** — Beauté premium\n- Loyer estimé : 22 000 FCFA/m²/an → 2 640 000 FCFA/an  \n- Synergy score : 78/100\n- Cible la clientèle premium du quartier Angré\n\n**3. Orange Money Boutique** — Services financiers\n- Loyer estimé : 15 000 FCFA/m²/an → 1 800 000 FCFA/an\n- Synergy score : 85/100 (fort trafic)\n- Service à forte demande en zone UEMOA\n\nVoulez-vous que je prépare un dossier de prospection pour l\'une de ces enseignes ?', time: '09:18' },
]

const NORMS = ['APSAD R82', 'ISO 7010', 'SYSCOHADA', 'EN 62676', 'NF S 61-938']

export default function Proph3tPage() {
  const [activeConv, setActiveConv] = useState('1')
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    setMessages([...messages, { role: 'user', content: input, time: now }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant', time: now,
        content: 'Je suis en train d\'analyser votre demande en croisant les données de Cosmos Angré avec les référentiels SYSCOHADA et APSAD R82. Un instant...\n\n*Cette fonctionnalité sera connectée à Ollama (Proph3t LLaMA 3.1) en production, avec Claude API en fallback.*',
      }])
    }, 1200)
  }

  return (
    <div className="flex h-full" style={{ background: '#1a1d23', color: '#e2e8f0' }}>
      {/* Left: Conversations */}
      <div className="w-64 flex-shrink-0 border-r border-white/[0.05] flex flex-col" style={{ background: '#0a0f1a' }}>
        <div className="p-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-atlas-500/15 flex items-center justify-center">
              <Sparkles size={14} className="text-atlas-400" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">Proph3t</p>
              <p className="text-[9px] text-atlas-400">Expert Vivant</p>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlas-600/20 border border-atlas-500/20 text-atlas-300 text-[11px] font-medium hover:bg-atlas-600/30 transition-colors">
            <Plus size={12} /> Nouvelle conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {CONVERSATIONS.map(c => (
            <button key={c.id} onClick={() => setActiveConv(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-white/[0.03] transition-colors ${
                activeConv === c.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}>
              <p className="text-[11px] font-medium text-white truncate">{c.title}</p>
              <p className="text-[10px] text-gray-600 truncate mt-0.5">{c.preview}</p>
              <p className="text-[9px] text-gray-700 mt-1">{c.date}</p>
            </button>
          ))}
        </div>

        {/* Context badges */}
        <div className="p-3 border-t border-white/[0.04] space-y-1.5">
          <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">Contexte actif</p>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400"><Globe2 size={10} className="text-atlas-400" /> New Heaven SA</div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400"><FolderOpen size={10} className="text-amber-400" /> Cosmos Angré</div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400"><Shield size={10} className="text-emerald-400" /> DG (super_admin)</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {NORMS.map(n => (
              <span key={n} className="text-[8px] px-1.5 py-0.5 rounded bg-atlas-500/10 text-atlas-300/70 border border-atlas-500/15">{n}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Chat */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-atlas-500/20 border border-atlas-500/20 text-white'
                  : 'bg-[#262a31] border border-white/[0.06] text-gray-300'
              }`}>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={11} className="text-atlas-400" />
                    <span className="text-[10px] text-atlas-400 font-medium">Proph3t</span>
                    <span className="text-[9px] text-gray-600">{m.time}</span>
                  </div>
                )}
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.content}</div>
                {m.role === 'user' && <p className="text-[9px] text-gray-500 text-right mt-1">{m.time}</p>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/[0.04] p-4" style={{ background: '#0a0f1a' }}>
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Posez une question à Proph3t..."
              className="flex-1 bg-[#141e2e] text-white text-sm rounded-xl px-4 py-3 border border-white/[0.08] outline-none focus:border-atlas-500/40 placeholder:text-gray-600" />
            <button onClick={handleSend}
              className="px-4 py-3 rounded-xl bg-atlas-600 hover:bg-atlas-500 text-white transition-colors">
              <Send size={16} />
            </button>
          </div>
          <p className="text-[9px] text-gray-700 text-center mt-2">
            Proph3t utilise Ollama (LLaMA 3.1 fine-tuné) en priorité, Claude API en fallback.
          </p>
        </div>
      </div>
    </div>
  )
}
