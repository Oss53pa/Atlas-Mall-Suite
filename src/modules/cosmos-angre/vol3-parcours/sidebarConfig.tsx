// F-004 : configuration sidebar extraite de Vol3Module.tsx.
// Conserve strictement la meme structure qu'auparavant — aucun changement de
// comportement. Un changement ici affecte l'ordre/libelle des onglets Vol.3.

import React from 'react'
import {
  Upload, Map, Pencil, Route, Navigation, Signpost, Flame, FileText,
  MessageSquare, Info, Eye, Layers, Users, User, Grid3X3, BarChart2,
  Calendar, Smartphone, LayoutDashboard, History, Send, Sparkles,
} from 'lucide-react'
import { ATLAS_STUDIO_GROUP_META } from '../shared/components/atlasStudioNav'

export type Vol3Tab =
  | 'plan'
  | 'plan_imports'
  | 'space_editor'
  | 'parcours'
  | 'wayfinding'
  | 'signaletique'
  | 'heatmap'
  | 'rapport'
  | 'chat'
  | 'intro'
  | 'journeymap'
  | 'parcoursvisuel'
  | 'swimlane'
  | 'personas'
  | 'awa_moussa'
  | 'serge'
  | 'pamela'
  | 'aminata'
  | 'touchpoints'
  | 'kpis'
  | 'action'
  | 'signaletique_page'
  | 'exp_dashboard'
  | 'action_tracker'
  | 'signa_tracker'
  | 'touch_tracker'
  | 'feedbacks'
  | 'dwell_time'
  | 'revenue_predictor'
  | 'seasonal'
  | 'tenant_mix_validator'
  | 'history'
  | 'reports'
  | 'god_mode_signage'

export interface NavItem {
  id: Vol3Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
  dot?: boolean
}

export interface NavGroup {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  items: NavItem[]
  separator?: boolean
}

// Factory plutot que const au niveau module : differe le spread de
// ATLAS_STUDIO_GROU_META jusqu'au render pour eviter un TDZ lie a l'ordre
// d'evaluation des chunks Vite (manualChunks).
export const buildNavGroups = (): NavGroup[] => [
  {
    ...ATLAS_STUDIO_GROUP_META,
    items: [
      { id: 'plan_imports', label: 'Plans importés', icon: Upload },
      { id: 'plan', label: 'Plan interactif', icon: Map },
      { id: 'space_editor', label: 'Éditer espaces', icon: Pencil },
      { id: 'parcours', label: 'Parcours client', icon: Route },
      { id: 'wayfinding', label: 'Wayfinding', icon: Navigation },
      { id: 'signaletique', label: 'Signalétique (plan)', icon: Signpost },
      { id: 'heatmap', label: 'Heatmap', icon: Flame },
      { id: 'rapport', label: 'Rapport', icon: FileText },
      { id: 'chat', label: 'Proph3t Chat', icon: MessageSquare },
    ],
  },
  {
    key: 'vue',
    label: "VUE D'ENSEMBLE",
    icon: LayoutDashboard,
    color: '#34d399',
    separator: true,
    items: [
      { id: 'intro', label: 'Introduction', icon: Info },
    ],
  },
  {
    key: 'journeymap',
    label: 'M1 — JOURNEY MAP',
    icon: Map,
    color: '#34d399',
    items: [
      { id: 'journeymap', label: 'Journey Map', icon: Map, dot: true },
      { id: 'parcoursvisuel', label: 'Parcours visuel', icon: Eye },
      { id: 'swimlane', label: 'Swimlane · 10 couches', icon: Layers },
    ],
  },
  {
    key: 'personas',
    label: 'M2 — PERSONAS',
    icon: Users,
    color: '#8b5cf6',
    items: [
      { id: 'personas', label: '4 Personas Cosmos', icon: Users },
      { id: 'awa_moussa', label: 'Awa & Moussa', icon: Users },
      { id: 'serge', label: 'Serge', icon: User },
      { id: 'pamela', label: 'Pamela', icon: User },
      { id: 'aminata', label: 'Aminata', icon: User },
    ],
  },
  {
    key: 'touchpoints',
    label: 'M3 — TOUCHPOINTS',
    icon: Grid3X3,
    color: '#f59e0b',
    items: [
      { id: 'touchpoints', label: 'Matrice touchpoints', icon: Grid3X3 },
    ],
  },
  {
    key: 'kpis',
    label: 'M4 — KPIS',
    icon: BarChart2,
    color: '#ef4444',
    items: [
      { id: 'kpis', label: 'Dashboard KPIs', icon: BarChart2 },
    ],
  },
  {
    key: 'action',
    label: "M5 — PLAN D'ACTION",
    icon: Calendar,
    color: '#06b6d4',
    items: [
      { id: 'action', label: "Plan d'action", icon: Calendar },
    ],
  },
  {
    key: 'signaletique_page',
    label: 'M6 — SIGNALÉTIQUE',
    icon: Signpost,
    color: '#22c55e',
    items: [
      { id: 'signaletique_page', label: 'Signalétique directionnelle', icon: Signpost },
    ],
  },
  {
    key: 'pilotage',
    label: 'PILOTAGE',
    icon: BarChart2,
    color: '#ef4444',
    separator: true,
    items: [
      { id: 'exp_dashboard', label: 'Dashboard expérience', icon: BarChart2, dot: true },
      { id: 'action_tracker', label: "Plan d'action A01-A13", icon: Calendar },
      { id: 'signa_tracker', label: 'Déploiement signalétique', icon: Signpost },
      { id: 'touch_tracker', label: 'Touchpoints', icon: Smartphone },
      { id: 'feedbacks', label: 'Réclamations visiteurs', icon: MessageSquare },
    ],
  },
  {
    key: 'advanced',
    label: 'ANALYSE AVANCÉE',
    icon: BarChart2,
    color: '#ec4899',
    separator: true,
    items: [
      { id: 'dwell_time', label: 'Dwell Time Optimizer', icon: Eye },
      { id: 'revenue_predictor', label: 'Revenue Predictor', icon: BarChart2 },
      { id: 'seasonal', label: 'Scénarios saisonniers', icon: Calendar },
      { id: 'tenant_mix_validator', label: 'Tenant Mix Validator', icon: Grid3X3 },
    ],
  },
  {
    key: 'god_mode',
    label: 'GOD MODE · PROPH3T',
    icon: Sparkles,
    color: '#a855f7',
    separator: true,
    items: [
      { id: 'god_mode_signage', label: 'Signalétique (institutionnelle + pub)', icon: Sparkles },
    ],
  },
  {
    key: 'collaboration',
    label: 'COLLABORATION',
    icon: Send,
    color: '#818cf8',
    separator: true,
    items: [
      { id: 'history', label: 'Historique du plan', icon: History },
      { id: 'reports', label: 'Rapports & partage', icon: Send },
    ],
  },
]
