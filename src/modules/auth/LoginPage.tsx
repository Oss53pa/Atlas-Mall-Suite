import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Email et mot de passe requis'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); toast.success('Connexion réussie'); navigate('/dashboard') }, 800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1d23' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[100px]" style={{ background: '#7e5e3c' }} />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[80px]" style={{ background: '#38bdf8' }} />
      </div>
      <div className="relative w-full max-w-md px-6">
        <div className="flex flex-col items-center mb-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-atlas-500 to-purple-600 shadow-lg mb-4">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Atlas BIM</h1>
          <p className="text-sm text-gray-500 mt-1">Plateforme de pilotage immobilier commercial</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] p-8" style={{ background: '#262a31' }}>
          <h2 className="text-lg font-semibold text-white mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 mb-6">Accédez à votre espace de travail</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Adresse email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nom@entreprise.ci"
                  className="w-full bg-[#141e2e] text-white text-sm rounded-xl pl-9 pr-3 py-2.5 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">Mot de passe</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-[#141e2e] text-white text-sm rounded-xl pl-9 pr-10 py-2.5 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-atlas-500 hover:bg-atlas-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <div className="mt-5 text-center">
            <Link to="/register" className="text-sm text-atlas-400 hover:text-atlas-300 transition-colors">
              Pas encore de compte ? Créer une organisation
            </Link>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-700 mt-6">Atlas Studio &middot; SYSCOHADA &middot; UEMOA/CEMAC</p>
      </div>
    </div>
  )
}
