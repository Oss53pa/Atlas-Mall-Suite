import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProjectOnboarding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', city: 'Abidjan', phase: 'pre_opening', total_area_sqm: '', opening_date: '', volumes: ['vol1','vol2','vol3'] })

  const toggleVol = (id: string) => setForm(f => ({ ...f, volumes: f.volumes.includes(id) ? f.volumes.filter(v=>v!==id) : [...f.volumes, id] }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nom du projet requis'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); toast.success('Projet créé'); navigate('/onboard/team') }, 600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1d23' }}>
      <div className="relative w-full max-w-lg px-6">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-atlas-500 to-purple-600 mb-4"><Sparkles className="h-6 w-6 text-white" /></div>
          <div className="flex items-center gap-2 mb-2">{[1,2,3,4].map(i=><div key={i} className={`w-8 h-1 rounded-full ${i<=3?'bg-atlas-500':'bg-gray-700'}`}/>)}</div>
          <p className="text-sm text-gray-500">Étape 3/4 — Premier projet</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] p-8" style={{ background: '#262a31' }}>
          <div className="flex items-center gap-2 mb-6"><FolderOpen size={18} className="text-amber-400"/><h2 className="text-lg font-semibold text-white">Créez votre premier projet</h2></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-[11px] text-gray-500 mb-1 block">Nom du projet *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="The Mall Shopping Center"
                className="w-full bg-[#141e2e] text-white text-sm rounded-xl px-3 py-2.5 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[11px] text-gray-500 mb-1 block">Ville</label>
                <input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="w-full bg-[#141e2e] text-white text-sm rounded-xl px-3 py-2.5 border border-white/[0.08] outline-none"/></div>
              <div><label className="text-[11px] text-gray-500 mb-1 block">Surface (m²)</label>
                <input type="number" value={form.total_area_sqm} onChange={e=>setForm({...form,total_area_sqm:e.target.value})} placeholder="30000"
                  className="w-full bg-[#141e2e] text-white text-sm rounded-xl px-3 py-2.5 border border-white/[0.08] outline-none placeholder:text-gray-600"/></div>
            </div>
            <div><label className="text-[11px] text-gray-500 mb-2 block">Volumes à activer</label>
              <div className="space-y-2">
                {[{id:'vol1',label:'Vol.1 — Plan Commercial',color:'#f59e0b'},{id:'vol2',label:'Vol.2 — Plan Sécurité',color:'#38bdf8'},{id:'vol3',label:'Vol.3 — Parcours Client',color:'#34d399'}].map(v=>(
                  <button key={v.id} type="button" onClick={()=>toggleVol(v.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left text-sm transition-all"
                    style={{ background: form.volumes.includes(v.id)?`${v.color}08`:'transparent', borderColor: form.volumes.includes(v.id)?`${v.color}30`:'rgba(255,255,255,0.06)', color: form.volumes.includes(v.id)?v.color:'#6b7280' }}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${form.volumes.includes(v.id)?'border-current bg-current/20':'border-gray-600'}`}>
                      {form.volumes.includes(v.id)&&<span className="text-[10px]">✓</span>}</div>{v.label}</button>))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <button type="button" onClick={()=>navigate('/onboard/org')} className="text-sm text-gray-500 hover:text-gray-300">Retour</button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-atlas-500 hover:bg-atlas-500 disabled:opacity-50 text-white text-sm font-medium">
                {loading&&<Loader2 size={14} className="animate-spin"/>}Continuer</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
