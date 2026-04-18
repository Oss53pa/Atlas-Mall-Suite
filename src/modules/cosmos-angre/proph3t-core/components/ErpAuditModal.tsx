// ═══ ERP Audit Modal ═══
//
// Modale plein-écran qui affiche le rapport ErpAuditResult :
//   - Statut global (compliant / minor / major / blocking)
//   - Score conformité ring
//   - Compteurs par criticité (critique / majeur / mineur / observation)
//   - Filtres par catégorie + criticité
//   - Liste détaillée avec citation article + correction + coût FCFA
//   - Export PDF (impression directe)
//
// Référence CDC §3.3 SEC-02/03/06.

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  ShieldAlert, X, Filter, Printer, AlertTriangle, AlertCircle,
  Info, CheckCircle, FileText, MapPin,
} from 'lucide-react'
import type {
  ErpAuditResult, NonConformity, Criticality,
} from '../../vol2-securitaire/engines/erpGlobalAuditEngine'
import { CRITICALITY_META } from '../../vol2-securitaire/engines/erpGlobalAuditEngine'

interface Props {
  audit: ErpAuditResult
  onClose: () => void
  /** Callback pour pointer la non-conformité sur le plan. */
  onFocusIssue?: (issue: NonConformity) => void
}

const STATUS_META = {
  compliant: { label: 'Conforme', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-900/50' },
  'minor-issues': { label: 'Réserves mineures', color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-900/50' },
  'major-issues': { label: 'Réserves majeures', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-900/50' },
  blocking: { label: 'Blocant ouverture', color: 'text-red-400', bg: 'bg-red-950/40 border-red-900/50' },
}

const CRIT_ICON: Record<Criticality, React.ComponentType<any>> = {
  critical: AlertTriangle,
  major: AlertCircle,
  minor: Info,
  observation: CheckCircle,
}

export function ErpAuditModal({ audit, onClose, onFocusIssue }: Props) {
  const [filterCrit, setFilterCrit] = useState<Criticality | 'all'>('all')
  const [filterCat, setFilterCat] = useState<NonConformity['category'] | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return audit.nonConformities.filter(nc => {
      if (filterCrit !== 'all' && nc.criticality !== filterCrit) return false
      if (filterCat !== 'all' && nc.category !== filterCat) return false
      return true
    })
  }, [audit.nonConformities, filterCrit, filterCat])

  const statusMeta = STATUS_META[audit.status]

  const handlePrint = () => window.print()

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/85 overflow-y-auto py-6 print:bg-white"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[1100px] max-w-[95vw] bg-slate-950 rounded-lg border border-white/10 shadow-2xl print:w-full print:max-w-none print:rounded-none print:border-0">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-white/10 rounded-t-lg print:hidden">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-amber-400" size={18} />
            <h2 className="text-sm font-bold text-white">Audit Conformité ERP</h2>
            <code className="text-[10px] text-slate-500 ml-2">{audit.reportRef}</code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-amber-600 hover:bg-amber-500 text-white"
            >
              <Printer size={13} /> Imprimer / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </header>

        {/* En-tête imprimable */}
        <div className="hidden print:block bg-slate-900 text-white p-6">
          <h1 className="text-2xl font-bold m-0">Audit Conformité ERP</h1>
          <p className="text-sm m-0 mt-1 opacity-80">
            {audit.reportRef} · Généré le {new Date(audit.generatedAt).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* Statut global */}
        <div className="p-6">
          <div className={`p-5 rounded-lg border-2 ${statusMeta.bg}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert size={20} className={statusMeta.color} />
                  <h3 className={`text-xl font-bold m-0 ${statusMeta.color}`}>
                    {statusMeta.label}
                  </h3>
                </div>
                <p className="text-[12px] text-slate-300 m-0 mt-1">
                  Score de conformité : <strong className="text-white">{audit.conformityScore}/100</strong>
                </p>
                <p className="text-[11px] text-slate-400 m-0 mt-1">
                  {audit.nonConformities.length} non-conformité{audit.nonConformities.length > 1 ? 's' : ''} ·
                  Coût correction estimé : <strong className="text-white">{audit.totalCorrectionCostFcfa.toLocaleString('fr-FR')} FCFA</strong>
                </p>
              </div>

              {/* Compteurs */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {(['critical', 'major', 'minor', 'observation'] as const).map(crit => {
                  const meta = CRITICALITY_META[crit]
                  const count = audit.byCriticality[crit]
                  return (
                    <div key={crit} className="px-3">
                      <div className="text-2xl font-bold tabular-nums" style={{ color: meta.color }}>
                        {count}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{meta.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex items-center gap-3 mt-5 print:hidden">
            <Filter className="text-slate-500" size={13} />
            <select
              value={filterCrit}
              onChange={e => setFilterCrit(e.target.value as Criticality | 'all')}
              className="bg-slate-900 border border-white/10 text-[11px] text-slate-300 px-2 py-1 rounded"
            >
              <option value="all">Toutes criticités</option>
              <option value="critical">Critique uniquement</option>
              <option value="major">Majeur</option>
              <option value="minor">Mineur</option>
              <option value="observation">Observation</option>
            </select>
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value as NonConformity['category'] | 'all')}
              className="bg-slate-900 border border-white/10 text-[11px] text-slate-300 px-2 py-1 rounded"
            >
              <option value="all">Toutes catégories</option>
              {(Object.keys(audit.byCategory) as NonConformity['category'][])
                .filter(c => audit.byCategory[c] > 0)
                .map(c => (
                  <option key={c} value={c}>{c} ({audit.byCategory[c]})</option>
                ))}
            </select>
            <span className="text-[10px] text-slate-500">{filtered.length} non-conformité(s) affichée(s)</span>
          </div>

          {/* Liste */}
          <div className="mt-4 space-y-2">
            {filtered.map(nc => {
              const meta = CRITICALITY_META[nc.criticality]
              const Icon = CRIT_ICON[nc.criticality]
              const isOpen = expandedId === nc.id
              return (
                <div
                  key={nc.id}
                  className="rounded border-l-4 border border-white/10 bg-slate-900/50"
                  style={{ borderLeftColor: meta.color }}
                >
                  <button
                    onClick={() => setExpandedId(isOpen ? null : nc.id)}
                    className="w-full text-left p-3 hover:bg-white/5"
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={14} style={{ color: meta.color }} className="flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                            style={{ background: `${meta.color}25`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-500">{nc.category}</span>
                          <code className="text-[10px] text-blue-400 font-mono">Art. {nc.article}</code>
                        </div>
                        <p className="text-[12px] text-slate-200 m-0">{nc.description}</p>
                        <p className="text-[10px] text-slate-500 m-0 mt-0.5">
                          {nc.norm}
                        </p>
                      </div>
                      {nc.estimatedCostFcfa !== undefined && nc.estimatedCostFcfa > 0 && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] text-slate-500 uppercase">Correction</div>
                          <div className="text-[12px] font-bold text-amber-400 tabular-nums">
                            {nc.estimatedCostFcfa.toLocaleString('fr-FR')} FCFA
                          </div>
                        </div>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/5 px-3 py-3 space-y-2 bg-slate-950/40">
                      {nc.requiredValue && (
                        <Detail label="Exigé">{nc.requiredValue}</Detail>
                      )}
                      {nc.observedValue && (
                        <Detail label="Observé" warn>{nc.observedValue}</Detail>
                      )}
                      <Detail label="Correction">{nc.correction}</Detail>
                      {nc.position && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            <MapPin size={10} className="inline mr-1" />
                            Position : ({nc.position.x.toFixed(1)}, {nc.position.y.toFixed(1)}) m
                          </span>
                          {onFocusIssue && (
                            <button
                              onClick={() => onFocusIssue(nc)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                            >
                              Voir sur le plan →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
                <p className="text-sm m-0">Aucune non-conformité avec ces filtres.</p>
              </div>
            )}
          </div>

          {/* Pied méthodologie */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-start gap-2 text-[10px] text-slate-500">
              <FileText size={12} />
              <p className="m-0 leading-relaxed">
                <strong className="text-slate-400">Référentiel</strong> — Arrêté du 25 juin 1980 (FR/UEMOA)
                · ISO 7010 · NF C71-800 · NF S 61-938 · EN 1125 · Décret CI 2009-264 · Loi CI 2014-388
                · Loi 2005-102 (PMR).<br />
                Audit généré automatiquement par PROPH3T. Validation finale par bureau de contrôle agréé requise.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function Detail({ label, warn, children }: { label: string; warn?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-[11px]">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider w-20 flex-shrink-0">{label}</span>
      <span className={warn ? 'text-amber-300' : 'text-slate-300'}>{children}</span>
    </div>
  )
}
