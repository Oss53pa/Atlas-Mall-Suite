// ═══ Hook — useCompliance ═══

import { useState, useMemo } from 'react'

export interface ComplianceItem {
  id: string
  category: 'incendie' | 'surete' | 'accessibilite' | 'signaletique' | 'data_privacy' | 'hygiene'
  label: string
  normRef: string
  status: 'conforme' | 'partiel' | 'non_conforme' | 'a_verifier'
  dueDate: string
  responsible: string
  note?: string
}

export interface ComplianceScore {
  total: number
  conforme: number
  partiel: number
  nonConforme: number
  aVerifier: number
  scorePercent: number
}

const INITIAL_ITEMS: ComplianceItem[] = [
  { id: 'c01', category: 'incendie', label: 'SSI categorie A operationnel', normRef: 'NF S 61-970', status: 'conforme', dueDate: '2026-06-01', responsible: 'DSI' },
  { id: 'c02', category: 'incendie', label: 'Exercice evacuation trimestriel', normRef: 'Code du Travail R4227-39', status: 'conforme', dueDate: '2026-04-15', responsible: 'QHSE' },
  { id: 'c03', category: 'incendie', label: 'BAES conformes NF C 71-800', normRef: 'NF C 71-800', status: 'partiel', dueDate: '2026-05-01', responsible: 'Maintenance', note: '12 blocs a remplacer' },
  { id: 'c04', category: 'incendie', label: 'Plans evacuation affiches', normRef: 'NF X 08-070', status: 'conforme', dueDate: '2026-04-01', responsible: 'Signaletique' },
  { id: 'c05', category: 'surete', label: 'Cameras APSAD R82', normRef: 'APSAD R82', status: 'conforme', dueDate: '2026-09-01', responsible: 'Surete' },
  { id: 'c06', category: 'surete', label: 'Controle acces zones techniques', normRef: 'EN 60839', status: 'conforme', dueDate: '2026-06-01', responsible: 'Surete' },
  { id: 'c07', category: 'surete', label: 'Stockage video 30 jours', normRef: 'Loi CI 2013-450', status: 'conforme', dueDate: '2026-12-31', responsible: 'DSI' },
  { id: 'c08', category: 'surete', label: 'Audit penetration annuel', normRef: 'ISO 27001', status: 'a_verifier', dueDate: '2026-07-01', responsible: 'DSI', note: 'Prestataire a selectionner' },
  { id: 'c09', category: 'accessibilite', label: 'Parcours PMR complet', normRef: 'NF P 98-350', status: 'partiel', dueDate: '2026-08-01', responsible: 'Architecture', note: 'R+2 a completer' },
  { id: 'c10', category: 'accessibilite', label: 'Signalisation tactile', normRef: 'NF EN 81-70', status: 'non_conforme', dueDate: '2026-07-15', responsible: 'Signaletique', note: 'Pas encore installe' },
  { id: 'c11', category: 'signaletique', label: 'Conformite ISO 7010', normRef: 'ISO 7010', status: 'conforme', dueDate: '2026-06-01', responsible: 'Signaletique' },
  { id: 'c12', category: 'signaletique', label: 'Pictogrammes securite bilingues', normRef: 'NF X 08-003', status: 'partiel', dueDate: '2026-06-15', responsible: 'Signaletique', note: '80% installe' },
  { id: 'c13', category: 'data_privacy', label: 'Panneaux RGPD videosurveillance', normRef: 'RGPD Art.13', status: 'conforme', dueDate: '2026-05-01', responsible: 'Juridique' },
  { id: 'c14', category: 'data_privacy', label: 'DPO designe', normRef: 'Loi CI 2013-450', status: 'conforme', dueDate: '2026-03-01', responsible: 'Direction' },
  { id: 'c15', category: 'hygiene', label: 'Controle legionelle trimestriel', normRef: 'Arrete 01/02/2010', status: 'a_verifier', dueDate: '2026-04-30', responsible: 'Maintenance' },
  { id: 'c16', category: 'hygiene', label: 'Nettoyage CTA semestriel', normRef: 'RSDT Art. L1321', status: 'conforme', dueDate: '2026-06-01', responsible: 'Maintenance' },
]

export function useCompliance() {
  const [items, setItems] = useState<ComplianceItem[]>(INITIAL_ITEMS)

  const score = useMemo<ComplianceScore>(() => {
    const total = items.length
    const conforme = items.filter(i => i.status === 'conforme').length
    const partiel = items.filter(i => i.status === 'partiel').length
    const nonConforme = items.filter(i => i.status === 'non_conforme').length
    const aVerifier = items.filter(i => i.status === 'a_verifier').length
    const scorePercent = total > 0 ? Math.round(((conforme + partiel * 0.5) / total) * 100) : 0
    return { total, conforme, partiel, nonConforme, aVerifier, scorePercent }
  }, [items])

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category))
    return Array.from(cats)
  }, [items])

  const updateStatus = (itemId: string, status: ComplianceItem['status']) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i))
  }

  return { items, score, categories, updateStatus }
}
