// ═══ Ollama Setup Panel — UI installation guidée ═══
//
// CDC §4.2 + Fix 3 :
//   - Détecte automatiquement les modèles installés / manquants
//   - Affiche le statut par tâche
//   - Génère + télécharge le script d'installation
//   - Génère le Dockerfile pour déploiement serveur
//   - Indique les fallbacks Claude actifs

import { useEffect, useState } from 'react'
import {
  CheckCircle, XCircle, Loader2, Download, Server, RefreshCw,
  AlertTriangle, Cpu, HardDrive,
} from 'lucide-react'
import {
  EMBEDDED_MODELS, checkOllamaHealth, generateInstallScript,
  type OllamaHealth,
} from '../ollamaModelRegistry'

interface Props {
  ollamaUrl?: string
  onClose?: () => void
}

export function OllamaSetupPanel({ ollamaUrl = 'http://localhost:11434', onClose }: Props) {
  const [health, setHealth] = useState<OllamaHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const h = await checkOllamaHealth(ollamaUrl)
      setHealth(h)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [ollamaUrl])

  // Auto-refresh toutes les 8s pendant qu'un téléchargement est en cours
  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(refresh, 8_000)
    return () => clearInterval(t)
  }, [autoRefresh])

  const downloadInstallScript = () => {
    const script = generateInstallScript()
    downloadBlob(new Blob([script], { type: 'text/x-shellscript' }), 'install-ollama-models.sh')
  }

  const downloadDockerfile = () => {
    const dockerfile = `FROM ollama/ollama:latest
RUN /bin/bash -c "ollama serve & \\
    sleep 5 && \\
    ${EMBEDDED_MODELS.map(m => `ollama pull ${m.modelName}`).join(' && ')} && \\
    kill %1 || true"
EXPOSE 11434
CMD ["serve"]`
    downloadBlob(new Blob([dockerfile], { type: 'text/plain' }), 'Dockerfile.ollama')
  }

  const installedCount = health?.modelStatus.filter(s => s.installed).length ?? 0
  const totalCount = EMBEDDED_MODELS.length
  const fallbackCount = health?.modelStatus.filter(s => !s.installed && s.fallbackAvailable).length ?? 0
  const missingCount = totalCount - installedCount - fallbackCount

  return (
    <div className="bg-surface-0 border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-surface-1">
        <div className="flex items-center gap-2">
          <Cpu className="text-atlas-400" size={16} />
          <h3 className="text-sm font-bold text-white">Modèles Ollama embarqués (CDC §4.2)</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title="Recharger"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
          )}
        </div>
      </div>

      {/* Status synthèse */}
      <div className="px-5 py-3 grid grid-cols-4 gap-2 border-b border-white/5 bg-surface-0/50">
        <Stat label="Ollama serveur" value={health?.available ? '✓ En ligne' : '✗ Hors ligne'} ok={health?.available} />
        <Stat label="Installés" value={`${installedCount}/${totalCount}`} ok={installedCount === totalCount} />
        <Stat label="Fallbacks" value={String(fallbackCount)} ok={fallbackCount === 0} />
        <Stat label="Manquants" value={String(missingCount)} ok={missingCount === 0} />
      </div>

      {/* Erreur réseau */}
      {!health?.available && (
        <div className="mx-5 my-3 px-3 py-2 rounded bg-amber-950/40 border border-amber-900/50 text-amber-200 text-[11px] flex items-start gap-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>Ollama non détecté à {ollamaUrl}.</strong>
            <p className="mt-1">PROPH3T basculera automatiquement sur Claude API en fallback (config Paramètres → Intégrations IA).</p>
            <p className="mt-1">Pour activer Ollama local :</p>
            <ol className="list-decimal pl-5 mt-1 space-y-0.5">
              <li>Installer Ollama : <code className="text-amber-300">curl -fsSL https://ollama.com/install.sh | sh</code></li>
              <li>Démarrer le serveur : <code className="text-amber-300">ollama serve</code></li>
              <li>Télécharger les modèles via le bouton ci-dessous</li>
            </ol>
          </div>
        </div>
      )}

      {/* Liste détaillée */}
      <div className="p-3 space-y-2">
        {EMBEDDED_MODELS.map(spec => {
          const status = health?.modelStatus.find(s => s.task === spec.task)
          return (
            <ModelRow
              key={spec.task}
              name={spec.modelName}
              task={spec.task}
              description={spec.description}
              constraints={spec.constraints}
              installed={status?.installed ?? false}
              fallbackUsed={status?.fallbackUsed}
            />
          )
        })}
      </div>

      {/* Actions install */}
      <div className="border-t border-white/5 p-4 bg-surface-1/50 space-y-2">
        <h4 className="text-[11px] font-bold text-white uppercase tracking-wider mb-1">Installation</h4>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={downloadInstallScript}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-atlas-500 hover:bg-atlas-500 text-white text-[11px] font-semibold"
          >
            <Download size={12} /> Script bash
          </button>

          <button
            onClick={downloadDockerfile}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold"
            title="Image Docker prête-à-l'emploi avec modèles pré-pullés"
          >
            <Server size={12} /> Dockerfile
          </button>

          <button
            onClick={() => navigator.clipboard.writeText(EMBEDDED_MODELS.map(m => `ollama pull ${m.modelName}`).join('\n'))}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold"
          >
            <HardDrive size={12} /> Copier cmds
          </button>
        </div>

        <p className="text-[10px] text-slate-500 mt-2">
          Espace disque requis : ~13 Go (Llava 4.5 Go + Mistral 4 Go + Llama 3.1 4.7 Go).
          Premier téléchargement peut prendre 10-30 min selon connexion.
        </p>
      </div>
    </div>
  )
}

// ─── Sous-composants ─────────────────────────

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? 'text-slate-300' : ok ? 'text-emerald-400' : 'text-amber-400'
  return (
    <div className="text-center">
      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  )
}

function ModelRow({
  name, task, description, constraints, installed, fallbackUsed,
}: {
  name: string; task: string; description: string
  constraints: { maxRamGb?: number; maxVramGb?: number; cpuOnly?: boolean }
  installed: boolean; fallbackUsed?: string
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded border ${
      installed ? 'border-emerald-900/50 bg-emerald-950/20'
      : fallbackUsed ? 'border-amber-900/50 bg-amber-950/20'
      : 'border-red-900/50 bg-red-950/20'
    }`}>
      <div className="flex-shrink-0 mt-0.5">
        {installed
          ? <CheckCircle className="text-emerald-400" size={16} />
          : fallbackUsed
          ? <AlertTriangle className="text-amber-400" size={16} />
          : <XCircle className="text-red-400" size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-[12px] font-bold text-white">{name}</code>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{task}</span>
          {fallbackUsed && (
            <span className="text-[9px] text-amber-400">→ fallback {fallbackUsed}</span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>
        <div className="flex gap-3 text-[9px] text-slate-600 mt-1">
          {constraints.maxRamGb && <span>RAM ≤ {constraints.maxRamGb} Go</span>}
          {constraints.maxVramGb && <span>VRAM ≤ {constraints.maxVramGb} Go</span>}
          {constraints.cpuOnly && <span>CPU only</span>}
        </div>
        {!installed && (
          <code className="block mt-1 text-[10px] text-slate-300 bg-surface-0 px-2 py-1 rounded font-mono">
            ollama pull {name}
          </code>
        )}
      </div>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
