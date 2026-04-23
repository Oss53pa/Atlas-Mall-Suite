import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Mail, Lock, User, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.password) { toast.error('Tous les champs sont requis'); return }
    if (form.password !== form.confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); toast.success('Compte créé'); navigate('/onboard/org') }, 800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1d23' }}>
      <div className="relative w-full max-w-md px-4 sm:px-6 py-8">
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-atlas-500 to-purple-600 shadow-lg mb-4">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Atlas BIM</h1>
          <p className="text-sm text-gray-500 mt-1">Créez votre compte administrateur</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] p-6 sm:p-8" style={{ background: '#262a31' }}>
          <h2 className="text-lg font-semibold text-white mb-1">Inscription</h2>
          <p className="text-sm text-gray-500 mb-6">Étape 1/4 — Créer votre compte</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-[11px] text-gray-500 mb-1 block">Nom complet</label>
              <div className="relative"><User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Cheick Sanankoua"
                className="w-full bg-[#141e2e] text-white text-sm rounded-xl pl-9 pr-3 py-2.5 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600" /></div></div>
            <div><label className="text-[11px] text-gray-500 mb-1 block">Email professionnel</label>
              <div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="nom@entreprise.ci"
                className="w-full bg-[#141e2e] text-white text-sm rounded-xl pl-9 pr-3 py-2.5 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600" /></div></div>
            <div><label className="text-[11px] text-gray-500 mb-1 block">Mot de passe</label>
              <div className="relative"><Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min. 8 caractères"
                className="w-full bg-[#141e2e] text-white text-sm rounded-xl pl-9 pr-3 py-2.5 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600" /></div></div>
            <div><label className="text-[11px] text-gray-500 mb-1 block">Confirmer</label>
              <div className="relative"><Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} placeholder="••••••••"
                className="w-full bg-[#141e2e] text-white text-sm rounded-xl pl-9 pr-3 py-2.5 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600" /></div></div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-atlas-500 hover:bg-atlas-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>
          <div className="mt-5 text-center">
            <Link to="/login" className="text-sm text-atlas-400 hover:text-atlas-300 transition-colors">Déjà un compte ? Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
