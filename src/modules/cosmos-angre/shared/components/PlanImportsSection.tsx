// ═══ SECTION — Liste des Plans Importés + Import PDF/Image/DXF ═══

import React, { useState, useCallback } from 'react'
import {
  Upload, FileText, Image, FileCode2, Trash2, Eye,
  CheckCircle, XCircle, Clock, AlertTriangle, Layers,
  ChevronDown, ChevronUp, X, ZoomIn, Maximize2,
} from 'lucide-react'
import { usePlanImportStore, type PlanImportRecord, type ImportStatus } from '../stores/planImportStore'
import { MapPin } from 'lucide-react'
import type { PlanSourceType, CalibrationResult, DimEntity } from '../planReader/planReaderTypes'
import type { Zone, Floor } from '../proph3t/types'
import PlanImportWizard from './PlanImportWizard'

interface PlanImportsSectionProps {
  /** Label couleur du volume courant */
  volumeColor: string
  volumeLabel: string
  /** Etages disponibles */
  floors: Floor[]
  activeFloorId: string
  /** Callback quand un import est terminé → le parent peut injecter les zones dans son store */
  onImportComplete: (zones: Partial<Zone>[], dims: DimEntity[], calibration: CalibrationResult, floorId: string, planImageUrl?: string, fileInfo?: { fileName: string; fileSize: number; sourceType: string }) => void
}

// ─── Helpers ──────────────────────────────────────────

const uid = () => `imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const sourceTypeConfig: Record<PlanSourceType, { icon: React.ElementType; label: string; color: string }> = {
  dxf: { icon: FileCode2, label: 'DXF', color: '#38bdf8' },
  dwg: { icon: FileCode2, label: 'DWG', color: '#6366f1' },
  ifc: { icon: Layers, label: 'IFC / BIM', color: '#22c55e' },
  pdf: { icon: FileText, label: 'PDF vectoriel', color: '#ef4444' },
  image_raster: { icon: Image, label: 'Image (scan)', color: '#f59e0b' },
  svg: { icon: FileCode2, label: 'SVG', color: '#8b5cf6' },
}

const statusConfig: Record<ImportStatus, { icon: React.ElementType; label: string; color: string }> = {
  processing: { icon: Clock, label: 'En cours...', color: '#f59e0b' },
  reviewing: { icon: Eye, label: 'En revue', color: '#38bdf8' },
  success: { icon: CheckCircle, label: 'Importé', color: '#22c55e' },
  error: { icon: XCircle, label: 'Erreur', color: '#ef4444' },
}

// ─── Main Component ───────────────────────────────────

export default function PlanImportsSection({
  volumeColor, volumeLabel, floors, activeFloorId,
  onImportComplete,
}: PlanImportsSectionProps) {
  const imports = usePlanImportStore((s) => s.imports)
  const addImport = usePlanImportStore((s) => s.addImport)
  const updateImport = usePlanImportStore((s) => s.updateImport)
  const removeImport = usePlanImportStore((s) => s.removeImport)
  const clearAll = usePlanImportStore((s) => s.clearAll)
  const activePlanPerFloor = usePlanImportStore((s) => s.activePlanPerFloor)
  const setActivePlan = usePlanImportStore((s) => s.setActivePlan)

  const [showWizard, setShowWizard] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<ImportStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<PlanSourceType | 'all'>('all')
  const [previewRecord, setPreviewRecord] = useState<PlanImportRecord | null>(null)

  // Handle wizard completion
  const handleImportComplete = useCallback(
    (zones: Partial<Zone>[], dims: DimEntity[], calibration: CalibrationResult, floorId: string, planImageUrl?: string, fileInfo?: { fileName: string; fileSize: number; sourceType: string }) => {
      const floor = floors.find((f) => f.id === floorId)
      const importId = uid()
      addImport({
        id: importId,
        fileName: fileInfo?.fileName || 'Import',
        fileSize: fileInfo?.fileSize || 0,
        sourceType: (fileInfo?.sourceType ?? 'image_raster') as PlanSourceType,
        floorId,
        floorLevel: floor?.level ?? floorId,
        status: 'success',
        importedAt: new Date().toISOString(),
        zonesDetected: zones.length,
        dimsDetected: dims.length,
        calibrationMethod: calibration.method,
        calibrationConfidence: calibration.confidence,
        planImageUrl: planImageUrl ?? undefined,
        thumbnailUrl: planImageUrl ?? undefined,
        warnings: [],
      })
      // Definir automatiquement comme plan actif pour cet etage
      setActivePlan(floorId, importId)
      onImportComplete(zones, dims, calibration, floorId, planImageUrl, fileInfo)
      setShowWizard(false)
    },
    [floors, addImport, setActivePlan, onImportComplete],
  )

  // Filtered list
  const filtered = imports.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterType !== 'all' && r.sourceType !== filterType) return false
    return true
  })

  const successCount = imports.filter((r) => r.status === 'success').length
  const totalZones = imports.filter((r) => r.status === 'success').reduce((s, r) => s + r.zonesDetected, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: volumeColor }}>
            {volumeLabel}
          </p>
          <h1 className="text-[28px] font-light text-white mb-2">Plans Importés</h1>
          <p className="text-[13px]" style={{ color: '#4a5568' }}>
            Importez vos plans en DXF, DWG, IFC, PDF vectoriel ou image scannée (JPG/PNG). Proph3t Vision reconnaît
            automatiquement les zones sur les images.
          </p>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
          style={{
            background: `${volumeColor}15`,
            border: `1px solid ${volumeColor}40`,
            color: volumeColor,
          }}
        >
          <Upload size={16} />
          Importer un plan
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Plans importés" value={String(imports.length)} color={volumeColor} />
        <SummaryCard label="Réussis" value={String(successCount)} color="#22c55e" />
        <SummaryCard label="Zones détectées" value={String(totalZones)} color="#38bdf8" />
        <SummaryCard
          label="Formats"
          value={String(new Set(imports.map((r) => r.sourceType)).size)}
          color="#8b5cf6"
        />
      </div>

      {/* Accepted formats reminder */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-slate-500">Formats acceptés :</span>
        {Object.entries(sourceTypeConfig).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <span
              key={key}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}25`, color: cfg.color }}
            >
              <Icon size={10} />
              {cfg.label}
            </span>
          )
        })}
      </div>

      {/* Filters */}
      {imports.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-[10px] text-slate-500">Filtrer :</span>
          <div className="flex gap-1.5">
            {(['all', 'success', 'error', 'processing'] as const).map((s) => {
              const label = s === 'all' ? 'Tous' : statusConfig[s].label
              const color = s === 'all' ? volumeColor : statusConfig[s].color
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                  style={{
                    background: filterStatus === s ? `${color}15` : 'transparent',
                    border: `1px solid ${filterStatus === s ? `${color}50` : '#1e2a3a'}`,
                    color: filterStatus === s ? color : '#4a5568',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: filterType === 'all' ? `${volumeColor}15` : 'transparent',
                border: `1px solid ${filterType === 'all' ? `${volumeColor}50` : '#1e2a3a'}`,
                color: filterType === 'all' ? volumeColor : '#4a5568',
              }}
            >
              Tous types
            </button>
            {(['pdf', 'image_raster', 'dxf', 'dwg', 'ifc'] as PlanSourceType[]).map((t) => {
              const cfg = sourceTypeConfig[t]
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: filterType === t ? `${cfg.color}15` : 'transparent',
                    border: `1px solid ${filterType === t ? `${cfg.color}50` : '#1e2a3a'}`,
                    color: filterType === t ? cfg.color : '#4a5568',
                  }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {imports.length > 3 && (
            <button
              onClick={clearAll}
              className="ml-auto text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
            >
              Vider l'historique
            </button>
          )}
        </div>
      )}

      {/* Import list */}
      {filtered.length === 0 && imports.length === 0 && (
        <EmptyState volumeColor={volumeColor} onImport={() => setShowWizard(true)} />
      )}

      {filtered.length === 0 && imports.length > 0 && (
        <p className="text-center text-slate-500 text-[13px] py-6">Aucun import ne correspond aux filtres.</p>
      )}

      <div className="space-y-2">
        {filtered.map((record) => (
          <ImportCard
            key={record.id}
            record={record}
            expanded={expandedId === record.id}
            onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
            onRemove={() => removeImport(record.id)}
            onSetAsBackground={() => setActivePlan(record.floorId, record.id)}
            onPreview={() => setPreviewRecord(record)}
            isActiveBackground={activePlanPerFloor[record.floorId] === record.id}
          />
        ))}
      </div>

      {/* Wizard modal */}
      {showWizard && (
        <PlanImportWizard
          floors={floors}
          activeFloorId={activeFloorId}
          onImportComplete={handleImportComplete}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* Preview modal */}
      {previewRecord && (
        <PlanPreviewModal record={previewRecord} onClose={() => setPreviewRecord(null)} />
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] mt-1" style={{ color: '#4a5568' }}>{label}</p>
    </div>
  )
}

function EmptyState({ volumeColor, onImport }: { volumeColor: string; onImport: () => void }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed p-12 text-center"
      style={{ borderColor: '#1e2a3a' }}
    >
      <Upload size={36} className="mx-auto mb-4 text-slate-600" />
      <p className="text-white font-medium mb-2">Aucun plan importé</p>
      <p className="text-[12px] text-slate-500 mb-6 max-w-md mx-auto">
        Importez un plan DXF, DWG, IFC, PDF vectoriel ou une image scannée (JPG/PNG/WebP).
        Proph3t Vision reconnaîtra automatiquement les zones sur les images.
      </p>
      <button
        onClick={onImport}
        className="inline-flex items-center gap-2 text-[13px] font-medium px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02]"
        style={{
          background: `${volumeColor}15`,
          border: `1px solid ${volumeColor}40`,
          color: volumeColor,
        }}
      >
        <Upload size={15} />
        Importer votre premier plan
      </button>
    </div>
  )
}

function ImportCard({
  record,
  expanded,
  onToggle,
  onRemove,
  onSetAsBackground,
  onPreview,
  isActiveBackground,
}: {
  record: PlanImportRecord
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
  onSetAsBackground: () => void
  onPreview: () => void
  isActiveBackground: boolean
}) {
  const stCfg = statusConfig[record.status]
  const srcCfg = sourceTypeConfig[record.sourceType]
  const StIcon = stCfg.icon
  const SrcIcon = srcCfg.icon
  const hasPlanImage = !!(record.planImageUrl || record.thumbnailUrl)

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
    >
      {/* Row */}
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 text-left">
        {/* Thumbnail or format icon */}
        {hasPlanImage ? (
          <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 relative group/thumb border border-white/[0.08]"
            onClick={(e) => { e.stopPropagation(); onPreview() }}>
            <img src={record.planImageUrl || record.thumbnailUrl} alt={record.fileName}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn size={14} className="text-white" />
            </div>
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${srcCfg.color}12`, border: `1px solid ${srcCfg.color}25` }}
          >
            <SrcIcon size={18} style={{ color: srcCfg.color }} />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-white truncate">{record.fileName}</p>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: `${srcCfg.color}12`, color: srcCfg.color }}
            >
              {srcCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] mt-0.5" style={{ color: '#4a5568' }}>
            <span>{record.floorLevel}</span>
            <span>{formatFileSize(record.fileSize)}</span>
            <span>{formatDate(record.importedAt)}</span>
          </div>
        </div>

        {/* Zones count */}
        <div className="text-center flex-shrink-0 mr-2">
          <p className="text-lg font-bold text-white">{record.zonesDetected}</p>
          <p className="text-[9px]" style={{ color: '#4a5568' }}>zones</p>
        </div>

        {/* Status */}
        <span
          className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            background: `${stCfg.color}10`,
            border: `1px solid ${stCfg.color}25`,
            color: stCfg.color,
          }}
        >
          <StIcon size={10} />
          {stCfg.label}
        </span>

        {expanded ? (
          <ChevronUp size={14} className="text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t space-y-3" style={{ borderColor: '#1e2a3a' }}>
          <div className="grid grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500">Format</span>
              <p className="text-white">{srcCfg.label}</p>
            </div>
            <div>
              <span className="text-slate-500">Calibration</span>
              <p className="text-white">{record.calibrationMethod ?? '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Confiance calibration</span>
              <p
                className="font-medium"
                style={{
                  color:
                    record.calibrationConfidence >= 0.8
                      ? '#22c55e'
                      : record.calibrationConfidence >= 0.5
                        ? '#f59e0b'
                        : '#ef4444',
                }}
              >
                {Math.round(record.calibrationConfidence * 100)}%
              </p>
            </div>
            <div>
              <span className="text-slate-500">Côtes détectées</span>
              <p className="text-white">{record.dimsDetected}</p>
            </div>
          </div>

          {record.errorMessage && (
            <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-[11px] text-red-400">{record.errorMessage}</p>
            </div>
          )}

          {record.warnings.length > 0 && (
            <div className="space-y-1">
              {record.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <AlertTriangle size={10} style={{ color: '#f59e0b' }} />
                  <span className="text-slate-400">{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            {hasPlanImage && (
              <button
                onClick={(e) => { e.stopPropagation(); onPreview() }}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg text-indigo-400 hover:bg-indigo-400/10 transition-colors"
              >
                <Maximize2 size={12} />
                Prévisualiser
              </button>
            )}
            {record.status === 'success' && (
              <button
                onClick={(e) => { e.stopPropagation(); onSetAsBackground() }}
                className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors ${
                  isActiveBackground
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-blue-400 hover:bg-blue-400/10'
                }`}
              >
                <MapPin size={12} />
                {isActiveBackground ? 'Fond actif' : 'Utiliser comme fond'}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={12} />
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Plan Preview Modal ─────────────────────────────

function PlanPreviewModal({ record, onClose }: { record: PlanImportRecord; onClose: () => void }) {
  const imageUrl = record.planImageUrl || record.thumbnailUrl
  if (!imageUrl) return null

  const srcCfg = sourceTypeConfig[record.sourceType]
  const stCfg = statusConfig[record.status]
  const confColor = record.calibrationConfidence >= 0.8 ? '#22c55e' : record.calibrationConfidence >= 0.5 ? '#f59e0b' : '#ef4444'

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="flex w-full h-full" onClick={(e) => e.stopPropagation()}>

        {/* ── Sidebar gauche : donnees du plan ── */}
        <div className="w-80 flex-shrink-0 h-full flex flex-col border-r border-white/[0.06] overflow-y-auto" style={{ background: '#0e1629' }}>
          {/* Header sidebar */}
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${srcCfg.color}15`, border: `1px solid ${srcCfg.color}30` }}>
                {React.createElement(srcCfg.icon, { size: 16, style: { color: srcCfg.color } })}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-display font-bold text-[14px] truncate">{record.fileName}</h2>
                <span className="text-[10px]" style={{ color: srcCfg.color }}>{srcCfg.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: `${stCfg.color}10`, border: `1px solid ${stCfg.color}25`, color: stCfg.color }}>
                {React.createElement(stCfg.icon, { size: 10 })} {stCfg.label}
              </span>
              <span className="text-[10px] text-gray-600">{formatDate(record.importedAt)}</span>
            </div>
          </div>

          {/* Infos du plan */}
          <div className="px-5 py-4 space-y-4">
            <InfoRow label="Etage" value={record.floorLevel} />
            <InfoRow label="Format" value={srcCfg.label} valueColor={srcCfg.color} />
            <InfoRow label="Taille fichier" value={formatFileSize(record.fileSize)} />
            <InfoRow label="Zones detectees" value={String(record.zonesDetected)} valueColor="#38bdf8" />
            <InfoRow label="Cotes detectees" value={String(record.dimsDetected)} />

            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Calibration</p>
              <InfoRow label="Methode" value={record.calibrationMethod ?? 'Non calibre'} />
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500">Confiance</span>
                  <span className="text-[12px] font-bold" style={{ color: confColor }}>
                    {Math.round(record.calibrationConfidence * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${record.calibrationConfidence * 100}%`, background: confColor }} />
                </div>
              </div>
            </div>

            {record.warnings.length > 0 && (
              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Avertissements</p>
                <div className="space-y-1.5">
                  {record.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]">
                      <AlertTriangle size={10} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-400">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {record.errorMessage && (
              <div className="rounded-lg p-3 bg-red-500/5 border border-red-500/15">
                <p className="text-[11px] text-red-400">{record.errorMessage}</p>
              </div>
            )}
          </div>

          {/* Actions en bas */}
          <div className="mt-auto px-5 py-4 border-t border-white/[0.06] space-y-2">
            <button onClick={onClose} className="w-full btn-ghost text-[12px] justify-center">
              Fermer
            </button>
          </div>
        </div>

        {/* ── Zone principale : image plein ecran ── */}
        <div className="flex-1 flex flex-col h-full" style={{ background: '#080c14' }}>
          {/* Barre simple */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] flex-shrink-0" style={{ background: '#0a0f1a' }}>
            <span className="text-[11px] text-slate-500">{record.floorLevel} — {record.fileName}</span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Image — affichee en entier, pas de zoom */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt={record.fileName}
              className="max-w-full max-h-full object-contain rounded-lg"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-[12px] text-white font-medium" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  )
}
