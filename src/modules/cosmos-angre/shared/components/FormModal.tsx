// ═══ FormModal — Modal + formulaire reutilisable ═══
// Utilise dans TOUS les volumes pour creer/editer des entites

import { useState, type ReactNode } from 'react'
import { X, Save, Plus } from 'lucide-react'

// ── Modal wrapper ──

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${width} w-full mx-4 rounded-xl border border-white/[0.08] bg-surface-2 shadow-2xl animate-fade-in`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
          <h2 className="text-[14px] font-display font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Form field components ──

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  type?: 'text' | 'email' | 'tel' | 'url'
  disabled?: boolean
}

export function TextField({ label, value, onChange, placeholder, required, type = 'text', disabled }: TextFieldProps) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="input-dark text-[12px]"
      />
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  required?: boolean
}

export function NumberField({ label, value, onChange, min, max, step = 1, unit, required }: NumberFieldProps) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
        {label} {unit && <span className="text-gray-600">({unit})</span>} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        required={required}
        className="input-dark text-[12px]"
      />
    </div>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  placeholder?: string
}

export function SelectField({ label, value, onChange, options, required, placeholder }: SelectFieldProps) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="input-dark text-[12px]"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

interface DateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function DateField({ label, value, onChange, required }: DateFieldProps) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="input-dark text-[12px]"
      />
    </div>
  )
}

interface TextAreaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}

export function TextAreaField({ label, value, onChange, rows = 3, placeholder }: TextAreaFieldProps) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="input-dark text-[12px] resize-none"
      />
    </div>
  )
}

// ── Form actions bar ──

interface FormActionsProps {
  onSubmit: () => void
  onCancel: () => void
  submitLabel?: string
  isEdit?: boolean
  disabled?: boolean
}

export function FormActions({ onSubmit, onCancel, submitLabel, isEdit, disabled }: FormActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06] mt-4">
      <button onClick={onCancel} className="btn-ghost text-[12px]">Annuler</button>
      <button onClick={onSubmit} disabled={disabled} className="btn-primary text-[12px]">
        {isEdit ? <Save size={14} /> : <Plus size={14} />}
        {submitLabel ?? (isEdit ? 'Enregistrer' : 'Ajouter')}
      </button>
    </div>
  )
}

// ── Helper hook pour formulaires simples ──

export function useFormState<T extends Record<string, unknown>>(initial: T) {
  const [form, setForm] = useState<T>(initial)

  const setField = <K extends keyof T>(key: K, value: T[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const reset = () => setForm(initial)

  return { form, setField, reset, setForm }
}
