import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, X, Loader2, Sparkles, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface Invite { email: string; role: string }

export default function TeamOnboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([{ email: '', role: 'admin' }])

  const handleSubmit = () => {
    const valid = invites.filter(i => i.email.trim())
    if (valid.length > 0) {
      setLoading(true)
      setTimeout(() => { setLoading(false); toast.success(`${valid.length} invitation(s) envoyée(s)`); navigate('/dashboard') }, 600)
    } else { navigate('/dashboard') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060a13' }}>
      <div className="relative w-full max-w-lg px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4"><Sparkles className="h-6 w-6 text-white" /></div>
          <div className="flex items-center gap-2 mb-2">{[1,2,3,4].map(i=><div key={i} className="w-8 h-1 rounded-full bg-indigo-500"/>)}</div>
          <p className="text-sm text-gray-500">Étape 4/4 — Inviter votre équipe</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] p-8" style={{ background: '#0e1629' }}>
          <div className="flex items-center gap-2 mb-6"><Users size={18} className="text-emerald-400"/><h2 className="text-lg font-semibold text-white">Inviter des collaborateurs</h2></div>
          <p className="text-sm text-gray-500 mb-5">Ajoutez des membres. Vous pourrez en ajouter d'autres plus tard.</p>
          <div className="space-y-3 mb-4">
            {invites.map((inv,i)=>(
              <div key={i} className="flex items-center gap-2">
                <div className="relative flex-1"><Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"/>
                  <input value={inv.email} onChange={e=>{const n=[...invites];n[i].email=e.target.value;setInvites(n)}} type="email" placeholder="email@entreprise.ci"
                    className="w-full bg-[#141e2e] text-white text-sm rounded-xl pl-9 pr-3 py-2 border border-white/[0.08] outline-none placeholder:text-gray-600"/></div>
                <select value={inv.role} onChange={e=>{const n=[...invites];n[i].role=e.target.value;setInvites(n)}}
                  className="bg-[#141e2e] text-white text-xs rounded-xl px-2 py-2 border border-white/[0.08] outline-none w-32">
                  <option value="admin">Administrateur</option><option value="consultant">Consultant</option><option value="viewer">Lecteur</option></select>
                {invites.length>1&&<button onClick={()=>setInvites(invites.filter((_,idx)=>idx!==i))} className="text-gray-600 hover:text-red-400 p-1"><X size={14}/></button>}
              </div>))}
          </div>
          <button onClick={()=>setInvites([...invites,{email:'',role:'viewer'}])} className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mb-6"><Plus size={14}/>Ajouter</button>
          <div className="flex justify-between pt-4 border-t border-white/[0.04]">
            <button onClick={()=>navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-300">Passer</button>
            <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium">
              {loading&&<Loader2 size={14} className="animate-spin"/>}Terminer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
