import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useJourneyStore } from '../store/journeyStore'
import type { JourneyStage, CarteTouchpoint } from '../store/journeyStore'

/* ═══════════════════════════════ HELPERS ═══════════════════════════════ */

const uid = () => `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

/* ═══════════════════════════════ LAYOUT ═══════════════════════════════ */

const W = 1300
const H = 720
const PAD_L = 60
const PAD_R = 20
const BAND_Y = H / 2
const BAND_H = 44
const CONTENT_W = W - PAD_L - PAD_R
const DOT_R = 7

function stageW(stageCount: number) {
  return CONTENT_W / stageCount
}

function tpX(tp: CarteTouchpoint, stages: JourneyStage[]): number {
  const idx = stages.findIndex(s => s.id === tp.stageId)
  if (idx < 0) return 0
  const sw = stageW(stages.length)
  const base = PAD_L + sw * idx + sw / 2
  const offset = (tp.col - 0.5) * sw * 0.45
  return base + offset
}

function tpY(tp: CarteTouchpoint): number {
  const gap = 36
  const spacing = 52
  if (tp.zone === 'digital') {
    return BAND_Y - BAND_H / 2 - gap - (tp.row - 1) * spacing
  }
  return BAND_Y + BAND_H / 2 + gap + (tp.row - 1) * spacing
}

function curvedConnector(px: number, py: number, zone: 'digital' | 'physical', stageIdx: number, stageCount: number): string {
  const sw = stageW(stageCount)
  const tx = PAD_L + sw * stageIdx + sw / 2
  const ty = zone === 'digital' ? BAND_Y - BAND_H / 2 : BAND_Y + BAND_H / 2
  const midX = (px + tx) / 2
  if (zone === 'digital') {
    const cp1y = py + (ty - py) * 0.15
    const cp2y = ty - (ty - py) * 0.15
    return `M${px},${py} C${px},${cp1y} ${midX},${cp2y} ${tx},${ty}`
  }
  const cp1y = py - (py - ty) * 0.15
  const cp2y = ty + (py - ty) * 0.15
  return `M${px},${py} C${px},${cp1y} ${midX},${cp2y} ${tx},${ty}`
}

/* ═══════════════════════════════ POPOVER ═══════════════════════════════ */

function TouchpointPopover({ tp, stages, onUpdate, onDelete, onClose }: {
  tp: CarteTouchpoint
  stages: JourneyStage[]
  onUpdate: (id: string, updates: Partial<CarteTouchpoint>) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const popRef = useRef<HTMLDivElement>(null)
  const stageColor = stages.find(s => s.id === tp.stageId)?.color ?? '#94a3b8'

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function handleClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick, true)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick, true)
    }
  }, [onClose])

  // Compute position in SVG coordinates, then convert to percentage-based positioning
  const px = tpX(tp, stages)
  const py = tpY(tp)
  const leftPct = (px / W) * 100
  const topPct = (py / H) * 100
  // Place popover to the right of the dot, or left if too close to right edge
  const placeLeft = leftPct > 70

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0f1623',
    border: '1px solid #1e2a3a',
    color: '#e2e8f0',
    borderRadius: 6,
    padding: '5px 8px',
    fontSize: 12,
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 600,
    letterSpacing: '0.05em',
    marginBottom: 3,
  }

  return (
    <div
      ref={popRef}
      style={{
        position: 'absolute',
        left: placeLeft ? undefined : `calc(${leftPct}% + 16px)`,
        right: placeLeft ? `calc(${100 - leftPct}% + 16px)` : undefined,
        top: `${topPct}%`,
        transform: 'translateY(-50%)',
        background: '#141e2e',
        border: '1px solid #1e2a3a',
        borderRadius: 12,
        padding: '14px 16px',
        width: 240,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 6, right: 8,
          background: 'none', border: 'none', color: '#64748b',
          fontSize: 16, cursor: 'pointer', lineHeight: 1,
        }}
      >
        &times;
      </button>

      {/* Label */}
      <div>
        <div style={labelStyle}>Label</div>
        <input
          style={inputStyle}
          value={tp.label}
          onChange={e => onUpdate(tp.id, { label: e.target.value })}
        />
      </div>

      {/* Type toggle */}
      <div>
        <div style={labelStyle}>Type</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['géré', 'gagné'] as const).map(t => (
            <button
              key={t}
              onClick={() => onUpdate(tp.id, { type: t })}
              style={{
                flex: 1,
                padding: '4px 0',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: `1px solid ${tp.type === t ? stageColor : '#1e2a3a'}`,
                background: tp.type === t ? stageColor : 'transparent',
                color: tp.type === t ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stage dropdown */}
      <div>
        <div style={labelStyle}>Etape</div>
        <select
          value={tp.stageId}
          onChange={e => onUpdate(tp.id, { stageId: e.target.value })}
          style={{
            ...inputStyle,
            cursor: 'pointer',
          }}
        >
          {stages.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Row slider */}
      <div>
        <div style={labelStyle}>Rang (distance) : {tp.row}</div>
        <input
          type="range"
          min={1} max={4} step={1}
          value={tp.row}
          onChange={e => onUpdate(tp.id, { row: parseInt(e.target.value) })}
          style={{ width: '100%', accentColor: stageColor }}
        />
      </div>

      {/* Col toggle */}
      <div>
        <div style={labelStyle}>Position horizontale</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1].map(c => (
            <button
              key={c}
              onClick={() => onUpdate(tp.id, { col: c })}
              style={{
                flex: 1,
                padding: '4px 0',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: `1px solid ${tp.col === c ? stageColor : '#1e2a3a'}`,
                background: tp.col === c ? stageColor : 'transparent',
                color: tp.col === c ? '#fff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {c === 0 ? 'Gauche' : 'Droite'}
            </button>
          ))}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => { onDelete(tp.id); onClose() }}
        style={{
          marginTop: 4,
          background: 'transparent',
          border: 'none',
          color: '#f87171',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '6px 0',
          borderRadius: 6,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(127,29,29,0.3)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        Supprimer ce touchpoint
      </button>
    </div>
  )
}

/* ═══════════════════════════════ COMPONENT ═══════════════════════════════ */

export default function SwimlaneSection() {
  /* ── Store ── */
  const stages = useJourneyStore(s => s.stages)
  const carteTouchpoints = useJourneyStore(s => s.carteTouchpoints)
  const updateCarteTouchpoint = useJourneyStore(s => s.updateCarteTouchpoint)
  const addCarteTouchpoint = useJourneyStore(s => s.addCarteTouchpoint)
  const deleteCarteTouchpoint = useJourneyStore(s => s.deleteCarteTouchpoint)
  const updateStage = useJourneyStore(s => s.updateStage)

  /* ── Local state ── */
  const [selectedTpId, setSelectedTpId] = useState<string | null>(null)
  const [hoveredTpId, setHoveredTpId] = useState<string | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  /* ── Derived ── */
  const sw = stageW(stages.length)
  const digitalTPs = carteTouchpoints.filter(t => t.zone === 'digital')
  const physicalTPs = carteTouchpoints.filter(t => t.zone === 'physical')
  const selectedTp = selectedTpId ? carteTouchpoints.find(t => t.id === selectedTpId) ?? null : null

  /* ── Helpers ── */
  const stageIndex = useCallback((stageId: string) => stages.findIndex(s => s.id === stageId), [stages])

  const handleAddTouchpoint = useCallback((zone: 'digital' | 'physical') => {
    const firstStage = stages[0]
    if (!firstStage) return
    const newId = uid()
    const newTp: CarteTouchpoint = {
      id: newId,
      label: 'Nouveau touchpoint',
      type: 'géré',
      stageId: firstStage.id,
      zone,
      col: 0,
      row: 1,
    }
    addCarteTouchpoint(newTp)
    setSelectedTpId(newId)
  }, [stages, addCarteTouchpoint])

  const commitStageRename = useCallback(() => {
    if (editingStageId && editingStageName.trim()) {
      updateStage(editingStageId, { label: editingStageName.trim() })
    }
    setEditingStageId(null)
  }, [editingStageId, editingStageName, updateStage])

  return (
    <div style={{ background: '#080c14', padding: '40px 32px' }}>
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: '0 auto 24px' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', fontWeight: 600, color: '#34d399', marginBottom: 6 }}>
          VOL. 3 — PARCOURS CLIENT
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 300, color: '#fff', margin: '0 0 6px' }}>
          Cartes du parcours client
        </h1>
        <p style={{ fontSize: 13, color: '#4a5568' }}>
          Centre commercial The Mall · Angré 8ème tranche, Abidjan
        </p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
          {stages.length} étapes · {carteTouchpoints.length} touchpoints · Géré vs Gagné
        </p>
      </div>

      {/* Add buttons */}
      <div style={{ maxWidth: 1300, margin: '0 auto 8px', display: 'flex', justifyContent: 'flex-end', gap: 10, paddingRight: 4 }}>
        <button
          onClick={() => handleAddTouchpoint('digital')}
          style={{
            background: '#141e2e',
            border: '1px solid #1e2a3a',
            color: '#94a3b8',
            borderRadius: 8,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.color = '#38bdf8' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a3a'; e.currentTarget.style.color = '#94a3b8' }}
        >
          + Ajouter numérique
        </button>
        <button
          onClick={() => handleAddTouchpoint('physical')}
          style={{
            background: '#141e2e',
            border: '1px solid #1e2a3a',
            color: '#94a3b8',
            borderRadius: 8,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#34d399'; e.currentTarget.style.color = '#34d399' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2a3a'; e.currentTarget.style.color = '#94a3b8' }}
        >
          + Ajouter physique
        </button>
      </div>

      {/* Main SVG + Popover container */}
      <div style={{ maxWidth: 1300, margin: '0 auto', overflowX: 'auto' }}>
        <div
          ref={containerRef}
          style={{
            background: '#0b1120',
            borderRadius: 12,
            border: '1px solid #1e2a3a',
            padding: '20px 0',
            position: 'relative',
          }}
          onClick={() => { setSelectedTpId(null); setSelectedStageId(null) }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 1000, height: 'auto', display: 'block' }}>
            <defs>
              {/* Stripe patterns per stage */}
              {stages.map((s, i) => (
                <pattern key={s.id} id={`stripe-s${i}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="4" height="4" fill={`${s.color}30`} />
                  <line x1="0" y1="0" x2="0" y2="4" stroke={s.color} strokeWidth="1.8" />
                </pattern>
              ))}
              {/* Legend stripe */}
              <pattern id="stripe-leg" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="4" height="4" fill="rgba(148,163,184,0.2)" />
                <line x1="0" y1="0" x2="0" y2="4" stroke="#94a3b8" strokeWidth="1.8" />
              </pattern>
            </defs>

            {/* ── Rotated side label: DIGITAL ── */}
            <text
              x={18} y={BAND_Y - BAND_H / 2 - 80}
              transform={`rotate(-90, 18, ${BAND_Y - BAND_H / 2 - 80})`}
              fill="#4a5568" fontSize={10} fontWeight={700} letterSpacing="0.15em"
              textAnchor="middle"
            >
              POINTS DE CONTACT NUMÉRIQUES
            </text>

            {/* ── Rotated side label: PHYSICAL ── */}
            <text
              x={18} y={BAND_Y + BAND_H / 2 + 80}
              transform={`rotate(-90, 18, ${BAND_Y + BAND_H / 2 + 80})`}
              fill="#4a5568" fontSize={10} fontWeight={700} letterSpacing="0.15em"
              textAnchor="middle"
            >
              POINTS DE CONTACT PHYSIQUES
            </text>

            {/* ── Dashed connectors: DIGITAL ── */}
            {digitalTPs.map(tp => {
              const px = tpX(tp, stages)
              const py = tpY(tp)
              const idx = stageIndex(tp.stageId)
              const color = stages[idx]?.color ?? '#94a3b8'
              const isHovered = hoveredTpId === tp.id
              return (
                <path
                  key={`dc-${tp.id}`}
                  d={curvedConnector(px, py, 'digital', idx, stages.length)}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.2}
                  strokeDasharray="5 4"
                  opacity={isHovered ? 0.7 : 0.4}
                  style={{ transition: 'opacity 0.15s' }}
                />
              )
            })}

            {/* ── Dashed connectors: PHYSICAL ── */}
            {physicalTPs.map(tp => {
              const px = tpX(tp, stages)
              const py = tpY(tp)
              const idx = stageIndex(tp.stageId)
              const color = stages[idx]?.color ?? '#94a3b8'
              const isHovered = hoveredTpId === tp.id
              return (
                <path
                  key={`pc-${tp.id}`}
                  d={curvedConnector(px, py, 'physical', idx, stages.length)}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.2}
                  strokeDasharray="5 4"
                  opacity={isHovered ? 0.7 : 0.4}
                  style={{ transition: 'opacity 0.15s' }}
                />
              )
            })}

            {/* ── Central timeline band ── */}
            <rect
              x={PAD_L} y={BAND_Y - BAND_H / 2}
              width={CONTENT_W} height={BAND_H}
              rx={BAND_H / 2} ry={BAND_H / 2}
              fill="none"
            />

            {/* Colored segments */}
            {stages.map((s, i) => {
              const x = PAD_L + sw * i
              const isFirst = i === 0
              const isLast = i === stages.length - 1
              const isSelected = selectedStageId === s.id
              return (
                <g key={s.id}>
                  <clipPath id={`clip-stage-${i}`}>
                    <rect
                      x={x} y={BAND_Y - BAND_H / 2}
                      width={sw} height={BAND_H}
                      rx={isFirst || isLast ? BAND_H / 2 : 0}
                    />
                  </clipPath>
                  <rect
                    x={x} y={BAND_Y - BAND_H / 2}
                    width={sw + 1} height={BAND_H}
                    fill={s.color}
                    clipPath={isFirst || isLast ? `url(#clip-stage-${i})` : undefined}
                    rx={isFirst ? BAND_H / 2 : isLast ? BAND_H / 2 : 0}
                    style={{
                      cursor: 'pointer',
                      filter: isSelected ? `drop-shadow(0 0 8px ${s.color})` : 'none',
                      transition: 'filter 0.15s',
                    }}
                    onClick={e => {
                      e.stopPropagation()
                      setSelectedStageId(isSelected ? null : s.id)
                      setSelectedTpId(null)
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation()
                      setEditingStageId(s.id)
                      setEditingStageName(s.label)
                    }}
                  />
                  {/* Highlight ring when selected */}
                  {isSelected && (
                    <rect
                      x={x - 1} y={BAND_Y - BAND_H / 2 - 1}
                      width={sw + 3} height={BAND_H + 2}
                      fill="none" stroke="#fff" strokeWidth={2} rx={isFirst || isLast ? BAND_H / 2 : 2}
                      clipPath={isFirst || isLast ? `url(#clip-stage-${i})` : undefined}
                      pointerEvents="none" opacity={0.5}
                    />
                  )}
                  {/* Stage label — editable via foreignObject */}
                  {editingStageId === s.id ? (
                    <foreignObject x={x + 4} y={BAND_Y - 12} width={sw - 8} height={24}>
                      <input
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        value={editingStageName}
                        onChange={e => setEditingStageName(e.target.value)}
                        onBlur={commitStageRename}
                        onKeyDown={e => { if (e.key === 'Enter') commitStageRename(); if (e.key === 'Escape') setEditingStageId(null) }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'rgba(0,0,0,0.5)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: 4,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          textAlign: 'center' as const,
                          outline: 'none',
                          padding: 0,
                        }}
                      />
                    </foreignObject>
                  ) : (
                    <text
                      x={x + sw / 2} y={BAND_Y + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#fff" fontSize={12} fontWeight={700}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)', pointerEvents: 'none' } as React.CSSProperties}
                    >
                      {s.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* ── DIGITAL touchpoint dots + labels ── */}
            {digitalTPs.map(tp => {
              const px = tpX(tp, stages)
              const py = tpY(tp)
              const idx = stageIndex(tp.stageId)
              const color = stages[idx]?.color ?? '#94a3b8'
              const isLeft = tp.col === 0
              const isHovered = hoveredTpId === tp.id
              const isSelected = selectedTpId === tp.id
              const dotScale = isHovered ? 1.3 : 1
              return (
                <g
                  key={`dt-${tp.id}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredTpId(tp.id)}
                  onMouseLeave={() => setHoveredTpId(null)}
                  onClick={e => { e.stopPropagation(); setSelectedTpId(tp.id); setSelectedStageId(null) }}
                >
                  {/* Hover glow */}
                  {isHovered && (
                    <circle cx={px} cy={py} r={DOT_R + 6} fill={color} opacity={0.15} />
                  )}
                  {/* Selection ring */}
                  {isSelected && (
                    <circle cx={px} cy={py} r={DOT_R + 4} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.6} />
                  )}
                  {/* Dot */}
                  <g transform={`translate(${px},${py}) scale(${dotScale}) translate(${-px},${-py})`} style={{ transition: 'transform 0.15s' }}>
                    {tp.type === 'gagné' ? (
                      <circle cx={px} cy={py} r={DOT_R} fill={`url(#stripe-s${idx})`} stroke={color} strokeWidth={1.5} />
                    ) : (
                      <circle cx={px} cy={py} r={DOT_R} fill={color} />
                    )}
                  </g>
                  {/* Label */}
                  <text
                    x={isLeft ? px - DOT_R - 5 : px + DOT_R + 5}
                    y={py + 1}
                    textAnchor={isLeft ? 'end' : 'start'}
                    dominantBaseline="middle"
                    fill={isHovered ? '#e2e8f0' : '#94a3b8'}
                    fontSize={10}
                    fontWeight={isHovered ? 700 : 500}
                    style={{ transition: 'fill 0.15s, font-weight 0.15s' }}
                  >
                    {tp.label}
                  </text>
                </g>
              )
            })}

            {/* ── PHYSICAL touchpoint dots + labels ── */}
            {physicalTPs.map(tp => {
              const px = tpX(tp, stages)
              const py = tpY(tp)
              const idx = stageIndex(tp.stageId)
              const color = stages[idx]?.color ?? '#94a3b8'
              const isLeft = tp.col === 0
              const isHovered = hoveredTpId === tp.id
              const isSelected = selectedTpId === tp.id
              const dotScale = isHovered ? 1.3 : 1
              return (
                <g
                  key={`pt-${tp.id}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredTpId(tp.id)}
                  onMouseLeave={() => setHoveredTpId(null)}
                  onClick={e => { e.stopPropagation(); setSelectedTpId(tp.id); setSelectedStageId(null) }}
                >
                  {isHovered && (
                    <circle cx={px} cy={py} r={DOT_R + 6} fill={color} opacity={0.15} />
                  )}
                  {isSelected && (
                    <circle cx={px} cy={py} r={DOT_R + 4} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.6} />
                  )}
                  <g transform={`translate(${px},${py}) scale(${dotScale}) translate(${-px},${-py})`} style={{ transition: 'transform 0.15s' }}>
                    {tp.type === 'gagné' ? (
                      <circle cx={px} cy={py} r={DOT_R} fill={`url(#stripe-s${idx})`} stroke={color} strokeWidth={1.5} />
                    ) : (
                      <circle cx={px} cy={py} r={DOT_R} fill={color} />
                    )}
                  </g>
                  <text
                    x={isLeft ? px - DOT_R - 5 : px + DOT_R + 5}
                    y={py + 1}
                    textAnchor={isLeft ? 'end' : 'start'}
                    dominantBaseline="middle"
                    fill={isHovered ? '#e2e8f0' : '#94a3b8'}
                    fontSize={10}
                    fontWeight={isHovered ? 700 : 500}
                    style={{ transition: 'fill 0.15s, font-weight 0.15s' }}
                  >
                    {tp.label}
                  </text>
                </g>
              )
            })}

            {/* ── Legend (bottom right) ── */}
            <g transform={`translate(${W - 200}, ${H - 40})`}>
              <circle cx={0} cy={0} r={5} fill="#94a3b8" />
              <text x={12} y={1} dominantBaseline="middle" fill="#94a3b8" fontSize={11} fontWeight={600}>Géré</text>
              <circle cx={85} cy={0} r={5} fill="url(#stripe-leg)" stroke="#94a3b8" strokeWidth={1.5} />
              <text x={97} y={1} dominantBaseline="middle" fill="#94a3b8" fontSize={11} fontWeight={600}>Gagné</text>
            </g>
          </svg>

          {/* ── Popover (HTML overlay) ── */}
          {selectedTp && (
            <TouchpointPopover
              tp={selectedTp}
              stages={stages}
              onUpdate={updateCarteTouchpoint}
              onDelete={deleteCarteTouchpoint}
              onClose={() => setSelectedTpId(null)}
            />
          )}
        </div>
      </div>

      {/* Stage color legend bar */}
      <div
        style={{
          maxWidth: 1100,
          margin: '20px auto 0',
          background: '#141e2e',
          border: '1px solid #1e2a3a',
          borderRadius: 10,
          padding: '12px 20px',
          display: 'flex',
          flexWrap: 'wrap' as const,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {stages.map((s, i) => (
          <React.Fragment key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              <span style={{ color: s.color, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
            </div>
            {i < stages.length - 1 && <span style={{ color: '#1e2a3a' }}>&rarr;</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
