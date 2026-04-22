import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OrgOnboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', legal_form: 'SA', rccm: '', tax_id: '', city: 'Abidjan', address: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error("Nom de l'organisation requis"); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); toast.success('Organisation créée'); navigate('/onboard/project') }, 600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1d23' }}>
      <div className="relative w-full max-w-lg px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-atlas-500 to-purple-600 mb-4"><Sparkles className="h-6 w-6 text-white" /></div>
          <div className="flex items-center gap-2 mb-2">{[1,2,3,4].map(i => <div key={i} className={`w-8 h-1 rounded-full ${i<=2?'bg-atlas-500':'bg-gray-700'}`}/>)}</div>
          <p className="text-sm text-gray-500">Étape 2/4 — Votre organisation</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] p-8" style={{ background: '#262a31' }}>
          <div className="flex items-center gap-2 mb-6"><Building2 size={18} className="text-atlas-400" /><h2 className="text-lg font-semibold text-white">Informations de l'organisation</h2></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-[11px] text-gray-500 mb-1 block">Raison sociale *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="New Heaven SA"
                className="w-full bg-[#141e2e] text-white text-sm rounded-xl px-3 py-2.5 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[11px] text-gray-500 mb-1 block">Forme juridique</label>
                <select value={form.legal_form} onChange={e=>setForm({...form,legal_form:e.target.value})}
                  className="w-full bg-[#141e2e] text-white text-sm rounded-xl px-3 py-2.5 border border-white/[0.08] outline-none">
                  {['SA','SARL','SAS','EURL','GIE'].map(f=><option key={f}>{f}</option>)}</select></div>
              <div><label className="text-[11px] text-gray-500 mb-1 block">RCCM</label>
                <input value={form.rccm} onChange={e=>setForm({...form,rccm:e.target.value})} placeholder="CI-ABJ-2020-B-12345"
                  className="w-full bg-[#141e2e] text-white text-sm rounded-xl px-3 py-2.5 border border-white/[0.08] outline-none placeholder:text-gray-600"/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[11px] text-gray-500 mb-1 block">N° DGI</label>
                <input value={form.tax_id} onChange={e=>setForm({...form,tax_id:e.target.value})} placeholder="DGI-2020-00456"
                  className="w-full bg-[#141e2e] text-white text-sm rounded-xl px-3 py-2.5 border border-white/[0.08] outline-none placeholder:text-gray-600"/></div>
              <div><label className="text-[11px] text-gray-500 mb-1 block">Ville</label>
                <input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}
                  className="w-full bg-[#141e2e] text-white text-sm rounded-xl px-3 py-2.5 border border-white/[0.08] outline-none"/></div>
            </div>
            <div className="flex justify-between pt-4">
              <button type="button" onClick={()=>navigate('/login')} className="text-sm text-gray-500 hover:text-gray-300">Retour</button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-atlas-500 hover:bg-atlas-500 disabled:opacity-50 text-white text-sm font-medium">
                {loading&&<Loader2 size={14} className="animate-spin"/>}Continuer</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
