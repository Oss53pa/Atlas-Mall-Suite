import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useJourneyStore } from '../store/journeyStore'
import type { JourneyStage, JourneyStep, JourneyTouchpoint, JourneyDepartment } from '../store/journeyStore'

/* ═══════════════════════════════════ HELPERS ═══════════════════════════════════ */

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const PRESET_COLORS = ['#34d399', '#38bdf8', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

const EMOJI_CYCLE = ['\u{1F914}', '\u{1F60C}', '\u{1F62E}', '\u{1F929}', '\u{1F60A}', '\u{1F604}', '\u{2764}\u{FE0F}', '\u{1F44D}', '\u{1F389}', '\u{1F31F}', '\u{1F525}', '\u{1F4A1}', '\u{1F60D}', '\u{1F622}', '\u{1F620}', '\u{1F610}']

/* ═══════════════════════════════════ THEME ═══════════════════════════════════ */

const T = { bg: '#080c14', surface: '#141e2e', surface2: '#0f1623', border: '#1e2a3a', text: '#e2e8f0', muted: '#4a5568', accent: '#60a5fa' } as const

/* ═══════════════════════════════════ INLINE EDIT ═══════════════════════════════ */

function InlineEdit({
  value,
  editingId,
  itemId,
  onSave,
  style,
  inputStyle,
}: {
  value: string
  editingId: string | null
  itemId: string
  onSave: (val: string) => void
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
}) {
  const store = useJourneyStore
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEditing = editingId === itemId

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (isEditing) inputRef.current?.focus() }, [isEditing])

  if (!isEditing) return <span style={style}>{value}</span>

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onSave(draft); store.getState().setEditingId(null) }
        if (e.key === 'Escape') { setDraft(value); store.getState().setEditingId(null) }
      }}
      onBlur={() => { onSave(draft); store.getState().setEditingId(null) }}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${T.accent}`,
        borderRadius: 4,
        color: T.text,
        fontSize: 'inherit',
        fontWeight: 'inherit',
        padding: '2px 6px',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box' as const,
        ...inputStyle,
      }}
    />
  )
}

/* ═══════════════════════════════════ HOVER DELETE BTN ═══════════════════════════ */

function DeleteBtn({ onClick, style }: { onClick: (e: React.MouseEvent) => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute' as const,
        top: 2, right: 2,
        width: 16, height: 16,
        borderRadius: '50%',
        border: 'none',
        background: hovered ? '#ef4444' : 'rgba(239,68,68,0.3)',
        color: '#fff',
        fontSize: 10,
        lineHeight: '16px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0,
        transition: 'opacity 0.15s',
        ...style,
      }}
    >
      \u00D7
    </button>
  )
}

/* ═══════════════════════════════════ ADD BTN ═══════════════════════════════════ */

function AddBtn({ label, onClick, style }: { label: string; onClick: () => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px dashed ${hovered ? T.accent : T.border}`,
        background: hovered ? 'rgba(96,165,250,0.06)' : 'transparent',
        borderRadius: 6,
        padding: '6px 12px',
        color: hovered ? T.accent : T.muted,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
        ...style,
      }}
    >
      + {label}
    </button>
  )
}

/* ═══════════════════════════════════ SECTION LABEL ═══════════════════════════ */

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '36px 0 14px' }}>
      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: T.muted, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>
        {children}
      </span>
      <span style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

/* ═══════════════════════════════════ STAGE PANEL ═══════════════════════════════ */

function StagePanel({ stage, onClose }: { stage: JourneyStage; onClose: () => void }) {
  const { updateStage, deleteStage, setSelectedStage } = useJourneyStore()
  const [name, setName] = useState(stage.label)
  const [duration, setDuration] = useState(stage.duration)
  const [color, setColor] = useState(stage.color)
  const [customHex, setCustomHex] = useState(stage.color)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { setName(stage.label); setDuration(stage.duration); setColor(stage.color); setCustomHex(stage.color); setConfirmDelete(false) }, [stage])

  const save = useCallback(() => {
    updateStage(stage.id, { label: name, duration, color })
  }, [stage.id, name, duration, color, updateStage])

  useEffect(() => { save() }, [name, duration, color, save])

  return (
    <div style={{
      position: 'fixed' as const, top: 80, right: 32,
      width: 280, background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: 20, zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Stage</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18 }}>\u00D7</button>
      </div>

      {/* Name */}
      <label style={{ fontSize: 10, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nom</label>
      <input
        value={name} onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, padding: '8px 10px', fontSize: 13, outline: 'none', marginBottom: 12 }}
      />

      {/* Duration */}
      <label style={{ fontSize: 10, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Dur\u00E9e</label>
      <input
        value={duration} onChange={(e) => setDuration(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, padding: '8px 10px', fontSize: 13, outline: 'none', marginBottom: 12 }}
      />

      {/* Color picker */}
      <label style={{ fontSize: 10, color: T.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Couleur</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 8 }}>
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { setColor(c); setCustomHex(c) }}
            style={{
              width: 28, height: 28, borderRadius: 6, border: c === color ? '2px solid #fff' : '2px solid transparent',
              background: c, cursor: 'pointer', transition: 'border 0.1s',
            }}
          />
        ))}
      </div>
      <input
        value={customHex}
        onChange={(e) => { setCustomHex(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setColor(e.target.value) }}
        placeholder="#hex"
        style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, padding: '6px 10px', fontSize: 12, outline: 'none', marginBottom: 16 }}
      />

      {/* Delete */}
      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ width: '100%', padding: '8px 0', borderRadius: 6, border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Supprimer cette \u00E9tape
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { deleteStage(stage.id); setSelectedStage(null) }}
            style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Confirmer
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, fontSize: 12, cursor: 'pointer' }}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════ EMOTION SLIDER ═══════════════════════════ */

function EmotionSlider({ stageId, level, onClose }: { stageId: string; level: number; onClose: () => void }) {
  const { updateEmotion } = useJourneyStore()
  return (
    <div
      style={{
        position: 'absolute' as const, bottom: '100%', left: '50%', transform: 'translateX(-50%)',
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
        padding: '8px 12px', zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        whiteSpace: 'nowrap' as const,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: T.muted }}>1</span>
        <input
          type="range" min={1} max={5} step={0.5} value={level}
          onChange={(e) => updateEmotion(stageId, { level: parseFloat(e.target.value) })}
          style={{ width: 100, accentColor: T.accent }}
        />
        <span style={{ fontSize: 10, color: T.muted }}>5</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 12, marginLeft: 4 }}>\u00D7</button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════ MAIN ═══════════════════════════════════ */

export default function JourneyMapSection() {
  const {
    stages, steps, emotions, touchpoints, departments,
    selectedStageId, editingId,
    addStage, updateStage, deleteStage,
    addStep, updateStep, deleteStep,
    updateEmotion,
    addTouchpoint, updateTouchpoint, deleteTouchpoint, toggleTouchpointStage,
    addDepartment, updateDepartment, deleteDepartment, toggleDepartmentStage,
    setSelectedStage, setEditingId,
  } = useJourneyStore()

  const [emotionSliderId, setEmotionSliderId] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  /* ── Derived ── */
  const stepsForStage = useCallback((stageId: string) => steps.filter((s) => s.stageId === stageId), [steps])

  const touchpointCountPerStage = stages.map((st) =>
    touchpoints.filter((tp) => tp.activeStageIds.includes(st.id)).length,
  )

  const deptCountPerStage = stages.map((st) =>
    departments.filter((d) => d.activeStageIds.includes(st.id)).length,
  )

  const selectedStage = stages.find((s) => s.id === selectedStageId) || null

  /* ── Hover helper — reveals delete buttons via CSS-in-JS ── */
  const hoverParent = (itemId: string): React.CSSProperties => ({
    position: 'relative' as const,
    cursor: 'pointer',
  })

  /* Inline style helper: show delete on hover */
  const deleteBtnVisibility = (itemId: string): React.CSSProperties => ({
    opacity: hoveredItem === itemId ? 1 : 0,
  })

  /* ── Add stage handler ── */
  const handleAddStage = () => {
    const id = uid()
    const color = PRESET_COLORS[stages.length % PRESET_COLORS.length]
    addStage({ id, label: 'Nouvelle \u00E9tape', color, duration: '~5 min', durationPct: 5 })
    setEditingId(`stage-label-${id}`)
  }

  /* ── Add step handler ── */
  const handleAddStep = (stageId: string) => {
    const id = uid()
    addStep({ id, stageId, label: 'Nouveau step' })
    setEditingId(`step-${id}`)
  }

  /* ── Emoji cycle ── */
  const cycleEmoji = (stageId: string, current: string) => {
    const idx = EMOJI_CYCLE.indexOf(current)
    const next = EMOJI_CYCLE[(idx + 1) % EMOJI_CYCLE.length]
    updateEmotion(stageId, { emoji: next })
  }

  /* ── Add touchpoint ── */
  const handleAddTouchpoint = () => {
    const id = uid()
    addTouchpoint({ id, name: 'Nouveau touchpoint', activeStageIds: [] })
    setEditingId(`tp-name-${id}`)
  }

  /* ── Add department ── */
  const handleAddDepartment = () => {
    const id = uid()
    addDepartment({ id, name: 'Nouveau d\u00E9partement', activeStageIds: [] })
    setEditingId(`dept-name-${id}`)
  }

  return (
    <div style={{ background: T.bg, minHeight: '100%', padding: '40px 32px', color: T.text }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Title ── */}
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 300, color: '#fff', margin: 0 }}>
            CUSTOMER JOURNEY <strong style={{ fontWeight: 800 }}>LAYERS</strong>
          </h1>
        </div>

        {/* ════════════════ SECTION 1: STAGES (Chevron arrows) ════════════════ */}
        <SectionLabel>Customer Journey Stages</SectionLabel>

        <div style={{ display: 'flex', position: 'relative' }}>
          {stages.map((s, i) => {
            const isFirst = i === 0
            const isLast = i === stages.length - 1
            const clip = isFirst
              ? 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)'
              : isLast
                ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 24px 50%)'
                : 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%, 24px 50%)'
            const isSelected = selectedStageId === s.id
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStage(isSelected ? null : s.id)}
                onMouseEnter={() => setHoveredItem(`chevron-${s.id}`)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  flex: 1,
                  clipPath: clip,
                  background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
                  padding: '16px 32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 56,
                  marginLeft: i > 0 ? -12 : 0,
                  zIndex: stages.length - i,
                  cursor: 'pointer',
                  outline: isSelected ? '2px solid #fff' : 'none',
                  outlineOffset: -2,
                  filter: isSelected ? 'brightness(1.15)' : 'none',
                  transition: 'filter 0.15s',
                }}
              >
                <span
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingId(`stage-label-${s.id}`) }}
                  style={{ fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.3)', textAlign: 'center' as const, width: '100%' }}
                >
                  {editingId === `stage-label-${s.id}` ? (
                    <input
                      autoFocus
                      defaultValue={s.label}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { updateStage(s.id, { label: (e.target as HTMLInputElement).value }); setEditingId(null) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={(e) => { updateStage(s.id, { label: e.target.value }); setEditingId(null) }}
                      style={{
                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.5)',
                        borderRadius: 4, color: '#fff', fontSize: 13, fontWeight: 700,
                        textAlign: 'center' as const, padding: '2px 6px', outline: 'none', width: '80%',
                      }}
                    />
                  ) : (
                    s.label.toUpperCase()
                  )}
                </span>
              </div>
            )
          })}
          {/* Add stage button */}
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
            <AddBtn label="Ajouter \u00E9tape" onClick={handleAddStage} style={{ whiteSpace: 'nowrap' as const, minHeight: 56 }} />
          </div>
        </div>

        {/* ════════════════ SECTION 2: STEPS (cards in colored boxes) ════════════════ */}
        <SectionLabel>Customer Journey Steps</SectionLabel>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: 6 }}>
          {stages.map((s) => (
            <div key={s.id}>
              {stepsForStage(s.id).map((step) => (
                <div
                  key={step.id}
                  onMouseEnter={() => setHoveredItem(`step-${step.id}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    ...hoverParent(`step-${step.id}`),
                    background: `${s.color}18`,
                    border: `1px solid ${hoveredItem === `step-${step.id}` ? `${s.color}60` : `${s.color}30`}`,
                    borderRadius: 6,
                    padding: '8px 10px',
                    marginBottom: 4,
                    transition: 'border 0.15s',
                  }}
                  onClick={() => setEditingId(`step-${step.id}`)}
                >
                  {editingId === `step-${step.id}` ? (
                    <input
                      autoFocus
                      defaultValue={step.label}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { updateStep(step.id, { label: (e.target as HTMLInputElement).value }); setEditingId(null) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={(e) => { updateStep(step.id, { label: e.target.value }); setEditingId(null) }}
                      style={{
                        background: 'transparent', border: `1px solid ${T.accent}`,
                        borderRadius: 4, color: T.text, fontSize: 10.5, padding: '2px 4px',
                        outline: 'none', width: '100%', boxSizing: 'border-box' as const,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 10.5, color: T.text, lineHeight: 1.4, display: 'block' }}>{step.label}</span>
                  )}
                  <DeleteBtn
                    onClick={() => deleteStep(step.id)}
                    style={deleteBtnVisibility(`step-${step.id}`)}
                  />
                </div>
              ))}
              <AddBtn label="Ajouter" onClick={() => handleAddStep(s.id)} style={{ width: '100%', marginTop: 2, padding: '4px 8px', fontSize: 10 }} />
            </div>
          ))}
        </div>

        {/* ════════════════ SECTION 2.5: EMOTIONS ════════════════ */}
        <SectionLabel>Customer Journey Emotions</SectionLabel>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '24px 20px 16px' }}>
          {/* Emotion curve visual */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: 6, marginBottom: 8 }}>
            {stages.map((s) => {
              const emotion = emotions.find((e) => e.stageId === s.id)
              if (!emotion) return <div key={s.id} />
              const pct = ((emotion.level - 1) / 4) * 100
              return (
                <div key={s.id} style={{ textAlign: 'center' as const, position: 'relative' as const }}>
                  {/* Emoji */}
                  <div
                    onClick={() => cycleEmoji(s.id, emotion.emoji)}
                    style={{ fontSize: 22, cursor: 'pointer', marginBottom: 4, userSelect: 'none' as const }}
                    title="Cliquer pour changer l\u2019emoji"
                  >
                    {emotion.emoji}
                  </div>

                  {/* Level bar */}
                  <div
                    style={{ position: 'relative' as const, height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => setEmotionSliderId(emotionSliderId === s.id ? null : s.id)}
                  >
                    <div style={{
                      width: 24, height: `${pct}%`, borderRadius: 4,
                      background: `linear-gradient(to top, ${s.color}40, ${s.color})`,
                      transition: 'height 0.3s',
                    }} />
                    {emotionSliderId === s.id && (
                      <EmotionSlider stageId={s.id} level={emotion.level} onClose={() => setEmotionSliderId(null)} />
                    )}
                  </div>

                  {/* Label */}
                  <div
                    onClick={(e) => { e.stopPropagation(); setEditingId(`emo-label-${s.id}`) }}
                    style={{ marginTop: 4, cursor: 'pointer' }}
                  >
                    {editingId === `emo-label-${s.id}` ? (
                      <input
                        autoFocus
                        defaultValue={emotion.label}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { updateEmotion(s.id, { label: (e.target as HTMLInputElement).value }); setEditingId(null) }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={(e) => { updateEmotion(s.id, { label: e.target.value }); setEditingId(null) }}
                        style={{
                          background: 'transparent', border: `1px solid ${T.accent}`, borderRadius: 4,
                          color: T.text, fontSize: 10, padding: '1px 4px', outline: 'none',
                          width: '90%', textAlign: 'center' as const,
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 10, color: T.muted }}>{emotion.label}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ════════════════ SECTION 3: TOUCHPOINTS (rotated labels + dots) ════════════════ */}
        <SectionLabel>Customer Journey Touchpoints</SectionLabel>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '24px 20px 16px', overflowX: 'auto' }}>
          {/* Rotated touchpoint names */}
          <div style={{ display: 'flex', gap: 0, paddingLeft: 0, marginBottom: 0 }}>
            {touchpoints.map((tp) => (
              <div
                key={tp.id}
                onMouseEnter={() => setHoveredItem(`tp-header-${tp.id}`)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  flex: '0 0 36px',
                  height: 120,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  position: 'relative' as const,
                }}
              >
                {editingId === `tp-name-${tp.id}` ? (
                  <input
                    autoFocus
                    defaultValue={tp.name}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { updateTouchpoint(tp.id, { name: (e.target as HTMLInputElement).value }); setEditingId(null) }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={(e) => { updateTouchpoint(tp.id, { name: e.target.value }); setEditingId(null) }}
                    style={{
                      position: 'absolute' as const, bottom: 0, left: 0,
                      width: 100, background: T.surface2, border: `1px solid ${T.accent}`,
                      borderRadius: 4, color: T.text, fontSize: 10, padding: '2px 4px',
                      outline: 'none', zIndex: 20,
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingId(`tp-name-${tp.id}`)}
                    style={{
                      position: 'absolute' as const,
                      bottom: 0,
                      left: '50%',
                      transformOrigin: 'bottom left',
                      transform: 'rotate(-55deg) translateX(-50%)',
                      fontSize: 10,
                      color: T.text,
                      opacity: 0.8,
                      whiteSpace: 'nowrap' as const,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {tp.name}
                  </span>
                )}
                {/* Delete touchpoint */}
                <DeleteBtn
                  onClick={() => deleteTouchpoint(tp.id)}
                  style={{ ...deleteBtnVisibility(`tp-header-${tp.id}`), top: 0, right: -2 }}
                />
              </div>
            ))}
          </div>

          {/* Dot rows — one row per stage */}
          {stages.map((s, si) => {
            const hasAny = touchpoints.some((tp) => tp.activeStageIds.includes(s.id))
            // Show all stage rows so dots can be toggled on
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  gap: 0,
                  padding: '4px 0',
                  borderTop: si === 0 ? `1px solid ${T.border}` : 'none',
                }}
              >
                {touchpoints.map((tp) => {
                  const isActive = tp.activeStageIds.includes(s.id)
                  return (
                    <div
                      key={tp.id}
                      onClick={() => toggleTouchpointStage(tp.id, s.id)}
                      style={{ flex: '0 0 36px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: 20, cursor: 'pointer' }}
                      title={`${tp.name} \u2014 ${s.label}: ${isActive ? 'actif' : 'inactif'}`}
                    >
                      {isActive ? (
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, display: 'inline-block', boxShadow: `0 0 6px ${s.color}40`, transition: 'all 0.15s' }} />
                      ) : (
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: T.border, opacity: 0.2, display: 'inline-block', transition: 'all 0.15s' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Add touchpoint button */}
          <div style={{ marginTop: 8 }}>
            <AddBtn label="Ajouter touchpoint" onClick={handleAddTouchpoint} style={{ width: '100%' }} />
          </div>

          {/* Touchpoint count badges per stage */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
            {stages.map((s, si) => (
              <div key={s.id} style={{ textAlign: 'center' as const }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 28,
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 800,
                    background: `${s.color}18`,
                    color: s.color,
                  }}
                >
                  {touchpointCountPerStage[si]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════ SECTION 4: DEPARTMENTS (dot matrix) ════════════════ */}
        <SectionLabel>Customer Journey Departments</SectionLabel>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '20px 24px', overflowX: 'auto' }}>
          {departments.map((dept) => (
            <div
              key={dept.id}
              onMouseEnter={() => setHoveredItem(`dept-row-${dept.id}`)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: `200px repeat(${stages.length}, 1fr)`,
                alignItems: 'center',
                padding: '5px 0',
                borderBottom: `1px solid ${T.border}`,
                position: 'relative' as const,
              }}
            >
              {/* Department name */}
              <span
                onClick={() => setEditingId(`dept-name-${dept.id}`)}
                style={{ fontSize: 11, color: T.text, opacity: 0.8, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', paddingRight: 20 }}
              >
                {editingId === `dept-name-${dept.id}` ? (
                  <input
                    autoFocus
                    defaultValue={dept.name}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { updateDepartment(dept.id, { name: (e.target as HTMLInputElement).value }); setEditingId(null) }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={(e) => { updateDepartment(dept.id, { name: e.target.value }); setEditingId(null) }}
                    style={{
                      background: 'transparent', border: `1px solid ${T.accent}`, borderRadius: 4,
                      color: T.text, fontSize: 11, padding: '1px 4px', outline: 'none', width: '90%',
                    }}
                  />
                ) : (
                  dept.name
                )}
              </span>

              {/* Dots */}
              {stages.map((s) => {
                const isActive = dept.activeStageIds.includes(s.id)
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleDepartmentStage(dept.id, s.id)}
                    style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
                    title={`${dept.name} \u2014 ${s.label}: ${isActive ? 'actif' : 'inactif'}`}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: isActive ? s.color : T.border,
                        opacity: isActive ? 1 : 0.2,
                        display: 'inline-block',
                        boxShadow: isActive ? `0 0 6px ${s.color}40` : 'none',
                        transition: 'all 0.15s',
                      }}
                    />
                  </div>
                )
              })}

              {/* Delete dept */}
              <DeleteBtn
                onClick={() => deleteDepartment(dept.id)}
                style={{ ...deleteBtnVisibility(`dept-row-${dept.id}`), top: '50%', right: -8, transform: 'translateY(-50%)' }}
              />
            </div>
          ))}

          {/* Add department button */}
          <div style={{ marginTop: 8 }}>
            <AddBtn label="Ajouter d\u00E9partement" onClick={handleAddDepartment} style={{ width: '100%' }} />
          </div>

          {/* Department count badges */}
          <div style={{ display: 'grid', gridTemplateColumns: `200px repeat(${stages.length}, 1fr)`, marginTop: 12 }}>
            <span />
            {deptCountPerStage.map((count, ci) => (
              <div key={stages[ci].id} style={{ display: 'flex', justifyContent: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 28,
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 800,
                    background: `${stages[ci].color}18`,
                    color: stages[ci].color,
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════ SECTION 5: DURATION BAR ════════════════ */}
        <SectionLabel>Customer Journey Duration</SectionLabel>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '20px 24px' }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 44 }}>
            {stages.filter((s) => s.durationPct > 0).map((s) => (
              <div
                key={s.id}
                style={{
                  flex: s.durationPct,
                  background: `linear-gradient(180deg, ${s.color}, ${s.color}cc)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column' as const,
                  borderRight: `2px solid ${T.bg}`,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{s.label}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>{s.duration}</span>
              </div>
            ))}
          </div>

          {/* Fidélisation / continu stages */}
          {stages.filter((s) => s.durationPct === 0).map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: T.muted }}>Cycle permanent :</span>
              <span style={{
                padding: '4px 14px', borderRadius: 20,
                background: `${s.color}18`, border: `1px solid ${s.color}40`,
                fontSize: 11, fontWeight: 600, color: s.color,
              }}>
                {s.label} \u2014 {s.duration}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* ════════════════ FLOATING STAGE PANEL ════════════════ */}
      {selectedStage && (
        <StagePanel stage={selectedStage} onClose={() => setSelectedStage(null)} />
      )}
    </div>
  )
}
