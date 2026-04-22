// ═══ VOL.2 — Mode Audit Existant (F2.10) ═══

import React, { useState } from 'react'
import { Upload, Camera, AlertTriangle, CheckCircle, XCircle, ArrowRight, FileText } from 'lucide-react'

type AuditStatus = 'conforme' | 'non_conforme' | 'obsolete' | 'manquant'

interface ExistingCamera {
  id: string
  reference: string
  type: string
  manufacturer: string
  model: string
  installYear: number
  position: { x: number; y: number }
  floor: string
  status: AuditStatus
  issues: string[]
}

const statusConfig: Record<AuditStatus, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  conforme: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', label: 'Conforme', icon: CheckCircle },
  non_conforme: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Non conforme', icon: AlertTriangle },
  obsolete: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'Obsolète', icon: XCircle },
  manquant: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Manquant', icon: XCircle },
}

export default function AuditExistant() {
  // Liste alimentée par import CSV/XLSX utilisateur — vide tant que rien n'a été importé.
  const [existing, _setExisting] = useState<ExistingCamera[]>([])
  const imported = existing.length > 0

  const conformeCount = existing.filter(c => c.status === 'conforme').length
  const obsoleteCount = existing.filter(c => c.status === 'obsolete').length
  const nonConformeCount = existing.length - conformeCount
  const conformityRate = existing.length > 0 ? Math.round((conformeCount / existing.length) * 100) : 0
  const upgradeCost = nonConformeCount * 450_000 // coût moyen de remplacement par caméra, FCFA

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SÉCURITAIRE</p>
        <h1 className="text-[28px] font-light text-white mb-2">Audit de l'existant</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>
          Import des caméras existantes, détection des non-conformités et estimation du coût de mise en conformité.
        </p>
      </div>

      {/* Import zone */}
      {!imported && (
        <div className="rounded-xl p-8 text-center border-2 border-dashed" style={{ borderColor: '#1e2a3a' }}>
          <Upload size={32} className="mx-auto mb-3 text-slate-500" />
          <p className="text-white font-medium mb-2">Importer l'existant</p>
          <p className="text-[12px] text-slate-500 mb-4">
            CSV ou XLSX avec position, type, modèle des caméras existantes.
          </p>
          <button
            disabled
            className="text-[12px] px-4 py-2 rounded-lg opacity-60 cursor-not-allowed"
            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8' }}
            title="Parseur CSV/XLSX à brancher"
          >
            Sélectionner un fichier (à brancher)
          </button>
        </div>
      )}

      {/* Summary */}
      {imported && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <Camera size={18} className="mx-auto mb-2 text-slate-400" />
            <p className="text-2xl font-bold text-white">{existing.length}</p>
            <p className="text-[10px]" style={{ color: '#4a5568' }}>Caméras existantes</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <CheckCircle size={18} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
            <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{conformityRate}%</p>
            <p className="text-[10px]" style={{ color: '#4a5568' }}>Conformité</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <XCircle size={18} className="mx-auto mb-2" style={{ color: '#ef4444' }} />
            <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{obsoleteCount}</p>
            <p className="text-[10px]" style={{ color: '#4a5568' }}>Obsolètes (&gt; 5 ans)</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{(upgradeCost / 1_000_000).toFixed(1)}M</p>
            <p className="text-[10px]" style={{ color: '#4a5568' }}>Coût mise en conformité (FCFA)</p>
          </div>
        </div>
      )}

      {/* Camera list */}
      {imported && (
        <div className="space-y-2">
          {existing.map((cam) => {
            const cfg = statusConfig[cam.status]
            const Icon = cfg.icon
            const age = new Date().getFullYear() - cam.installYear
            return (
              <div key={cam.id} className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Icon size={16} style={{ color: cfg.color }} />
                    <span className="text-white font-medium text-[13px]">{cam.reference}</span>
                    <span className="text-[11px]" style={{ color: '#4a5568' }}>{cam.type} · {cam.manufacturer} {cam.model}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: age > 5 ? '#ef4444' : '#4a5568' }}>{age} ans</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
                {cam.issues.length > 0 && (
                  <div className="ml-7 space-y-1">
                    {cam.issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <ArrowRight size={10} style={{ color: '#ef4444' }} />
                        <span className="text-slate-400">{issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {imported && (
        <div className="flex justify-end">
          <button className="flex items-center gap-2 text-[12px] px-4 py-2 rounded-lg" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8' }}>
            <FileText size={14} />
            Exporter rapport d'audit PDF
          </button>
        </div>
      )}
    </div>
  )
}
