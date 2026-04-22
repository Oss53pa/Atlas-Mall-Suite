// ═══ API KEY SECTION — saisie / test / effacement de la clé Claude ═══
//
// Affiché dans l'écran Paramètres. Gère :
//   - Saisie de la clé (masquée par défaut, toggle œil)
//   - Validation du préfixe sk-ant-
//   - Bouton Tester (ping Claude via /v1/messages avec 1 token)
//   - Bouton Enregistrer / Effacer
//   - Indicateur de statut visuel (ok / invalid / testing / network-error)
//
// La clé n'est jamais envoyée ailleurs que vers :
//   - api.anthropic.com (test direct depuis le navigateur en dev)
//   - Edge Function Supabase (production, via header x-client-key)

import { useMemo, useState } from 'react'
import {
  KeyRound, Eye, EyeOff, Save, Trash2, CheckCircle2, XCircle,
  Loader2, AlertTriangle, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApiKeyStore } from '../../../lib/apiKeyStore'

export default function ApiKeySection() {
  const store = useApiKeyStore()
  const [showKey, setShowKey] = useState(false)
  const [draft, setDraft] = useState(store.claudeApiKey)
  const [testing, setTesting] = useState(false)

  const dirty = draft !== store.claudeApiKey
  const prefixValid = draft.length === 0 || draft.trim().startsWith('sk-ant-')

  const statusBadge = useMemo(() => {
    switch (store.status) {
      case 'ok':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
          <CheckCircle2 className="w-3 h-3" /> Active
        </span>
      case 'invalid':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-900/40 text-red-300 border border-red-700/40">
          <XCircle className="w-3 h-3" /> Invalide
        </span>
      case 'testing':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/40">
          <Loader2 className="w-3 h-3 animate-spin" /> Test…
        </span>
      case 'network-error':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/40">
          <AlertTriangle className="w-3 h-3" /> Erreur réseau
        </span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-400 border border-white/10">
          Non configurée
        </span>
    }
  }, [store.status])

  const handleSave = () => {
    store.setKey(draft)
    if (draft && !draft.trim().startsWith('sk-ant-')) {
      toast.error('Clé invalide — doit commencer par sk-ant-')
    } else if (draft) {
      toast.success('Clé API enregistrée localement')
    } else {
      toast.success('Clé API effacée')
    }
  }

  const handleClear = () => {
    if (!confirm('Effacer la clé API Claude du navigateur ? Proph3t utilisera uniquement Ollama local.')) return
    store.clear()
    setDraft('')
    toast.success('Clé effacée')
  }

  const handleTest = async () => {
    const key = draft.trim()
    if (!key.startsWith('sk-ant-')) {
      toast.error('Préfixe sk-ant- requis')
      return
    }
    setTesting(true)
    store.setStatus('testing')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      })
      if (res.ok) {
        store.setKey(key) // sauvegarde la version testée
        store.setStatus('ok')
        toast.success('Clé API valide ✓')
      } else if (res.status === 401 || res.status === 403) {
        store.setStatus('invalid', `HTTP ${res.status} — authentification refusée`)
        toast.error(`Clé refusée par Anthropic (${res.status})`)
      } else {
        const txt = await res.text().catch(() => '')
        store.setStatus('invalid', `HTTP ${res.status} — ${txt.slice(0, 120)}`)
        toast.error(`Erreur API ${res.status}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Les erreurs CORS sont courantes ici (direct browser access)
      store.setStatus('network-error', msg)
      toast.error('Échec du test (réseau / CORS). La clé sera validée à l\'usage via Supabase.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status + infos */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">Clé API Claude (Anthropic)</span>
        </div>
        {statusBadge}
      </div>

      <p className="text-[12px] text-gray-400 leading-relaxed">
        Saisissez votre clé API personnelle pour activer le moteur Claude (fallback si Ollama local
        est indisponible). La clé est stockée <strong>uniquement dans votre navigateur</strong>
        (<code className="text-[11px] text-gray-300 font-mono">localStorage</code>), jamais envoyée à nos serveurs
        à part pour interroger l'API Anthropic via header sécurisé.
      </p>

      {/* Input clé */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-gray-500 uppercase tracking-wider">Clé secrète</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="sk-ant-api03-…"
              autoComplete="off"
              spellCheck={false}
              className={`w-full bg-[#141e2e] text-white text-sm rounded-lg pl-3 pr-10 py-2 border outline-none font-mono focus:border-indigo-500/50 ${
                !prefixValid ? 'border-red-500/50' : 'border-white/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/5 text-gray-500 hover:text-gray-300"
              title={showKey ? 'Masquer la clé' : 'Afficher la clé'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleTest}
            disabled={testing || !draft.trim()}
            className="px-3 py-2 rounded-lg text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Tester
          </button>
        </div>
        {!prefixValid && (
          <p className="text-[11px] text-red-400">La clé doit commencer par <code className="font-mono">sk-ant-</code></p>
        )}
        {store.lastError && (
          <p className="text-[11px] text-amber-400/80">{store.lastError}</p>
        )}
      </div>

      {/* Masque lorsque non-dirty et clé stockée */}
      {!dirty && store.claudeApiKey && (
        <div className="text-[11px] text-gray-500">
          Clé enregistrée : <code className="font-mono text-gray-300">{store.getMaskedKey()}</code>
          {store.lastTestedAt && (
            <span className="ml-2 text-gray-600">
              (testée le {new Date(store.lastTestedAt).toLocaleDateString('fr-FR')})
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
        >
          Obtenir une clé <ExternalLink className="w-3 h-3" />
        </a>
        <div className="flex items-center gap-2">
          {store.claudeApiKey && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Effacer
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || !prefixValid}
            className="px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
