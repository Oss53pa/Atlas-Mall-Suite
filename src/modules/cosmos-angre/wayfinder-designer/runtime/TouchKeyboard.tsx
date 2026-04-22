// ═══ TouchKeyboard — clavier tactile virtuel pour borne ═══
//
// CDC §08 : "Clavier tactile AZERTY/QWERTY/personnalisé"
// Sanitisation des entrées (CDC §10 sécurité borne).

import { Delete, Space } from 'lucide-react'

interface Props {
  layout: 'azerty' | 'qwerty' | 'custom'
  value: string
  onChange: (v: string) => void
}

const AZERTY = [
  ['a','z','e','r','t','y','u','i','o','p'],
  ['q','s','d','f','g','h','j','k','l','m'],
  ['w','x','c','v','b','n',"'",'-','é','è'],
]

const QWERTY = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l',';'],
  ['z','x','c','v','b','n','m',',','.',"'"],
]

export function TouchKeyboard({ layout, value, onChange }: Props) {
  const rows = layout === 'qwerty' ? QWERTY : AZERTY
  const append = (k: string) => {
    // Sanitisation : limite longueur 100, pas de caractères de contrôle
    const next = (value + k).replace(/[\x00-\x1f]/g, '').slice(0, 100)
    onChange(next)
  }
  const backspace = () => onChange(value.slice(0, -1))
  const space = () => append(' ')
  const clear = () => onChange('')

  return (
    <div className="border-t bg-slate-50 dark:bg-surface-1 p-3"
      style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
      {rows.map((row, i) => (
        <div key={i} className="flex justify-center gap-1.5 mb-1.5">
          {row.map(k => (
            <button
              key={k}
              onClick={() => append(k)}
              className="w-12 h-12 rounded-lg text-lg font-semibold bg-white border border-slate-300 text-slate-900 active:bg-indigo-100"
              aria-label={`Touche ${k}`}
            >
              {k}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-2 mt-1">
        <button
          onClick={space}
          className="w-72 h-12 rounded-lg bg-white border border-slate-300 text-slate-900 active:bg-indigo-100 flex items-center justify-center gap-2"
          aria-label="Espace"
        >
          <Space size={14} /> Espace
        </button>
        <button
          onClick={backspace}
          className="w-20 h-12 rounded-lg bg-white border border-slate-300 text-slate-900 active:bg-indigo-100 flex items-center justify-center"
          aria-label="Effacer"
        >
          <Delete size={18} />
        </button>
        <button
          onClick={clear}
          className="w-20 h-12 rounded-lg bg-red-50 border border-red-200 text-red-700 active:bg-red-100"
          aria-label="Tout effacer"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
