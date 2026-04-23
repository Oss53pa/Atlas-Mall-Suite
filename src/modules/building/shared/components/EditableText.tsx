import React, { useCallback, useEffect, useRef, useState } from 'react'

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  className?: string
  style?: React.CSSProperties
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'div'
  multiline?: boolean
  placeholder?: string
}

export default function EditableText({
  value, onChange, className = '', style, tag = 'p', multiline = false, placeholder = 'Cliquer pour editer...',
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }, [draft, value, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit() }
    if (e.key === 'Enter' && multiline && e.ctrlKey) { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(value); setEditing(false) }
  }, [commit, multiline, value])

  if (editing) {
    const sharedProps = {
      ref: inputRef as React.RefObject<HTMLTextAreaElement & HTMLInputElement>,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: handleKeyDown,
      className: `w-full bg-gray-800/80 border border-blue-500/50 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 ${className}`,
      style,
      placeholder,
    }

    if (multiline) {
      return <textarea {...sharedProps} rows={Math.max(3, draft.split('\n').length)} />
    }
    return <input type="text" {...sharedProps} />
  }

  const Tag = tag
  return (
    <Tag
      className={`cursor-text hover:bg-white/5 rounded px-1 -mx-1 transition-colors group relative ${className}`}
      style={style}
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
    >
      {value || <span className="opacity-40 italic">{placeholder}</span>}
      <span className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 text-blue-400 text-[10px] pointer-events-none">
        &#9998;
      </span>
    </Tag>
  )
}

// ─── Editable stat card value ───

interface EditableStatProps {
  value: string
  onChange: (value: string) => void
  className?: string
  style?: React.CSSProperties
}

export function EditableStat({ value, onChange, className = '', style }: EditableStatProps) {
  return (
    <EditableText
      value={value}
      onChange={onChange}
      className={className}
      style={style}
      tag="span"
    />
  )
}

// ─── Editable KPI value ───

interface EditableKpiProps {
  value: string
  onChange: (value: string) => void
  status?: 'conforme' | 'surveiller' | 'non_conforme'
  className?: string
}

export function EditableKpi({ value, onChange, className = '' }: EditableKpiProps) {
  return (
    <EditableText
      value={value}
      onChange={onChange}
      className={className}
      tag="span"
    />
  )
}
