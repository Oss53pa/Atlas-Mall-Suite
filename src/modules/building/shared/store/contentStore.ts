// ═══ STORE CONTENU ÉDITABLE — Sections Vol.2 & Vol.3 ═══

import { create } from 'zustand'

interface StatItem {
  value: string
  label: string
}

interface KpiItem {
  label: string
  cible: string
  valeurActuelle: string
  frequence: string
  source: string
  status: 'conforme' | 'surveiller' | 'non_conforme'
}

interface KpiGroup {
  title: string
  kpis: KpiItem[]
}

interface ContentState {
  // Vol.2 Intro
  vol2IntroSubtitle: string
  vol2IntroDescription: string
  vol2IntroText1: string
  vol2IntroText2: string
  vol2IntroInsightScore: string
  vol2IntroInsightText: string
  vol2IntroStats: StatItem[]

  // Vol.2 Rapport
  vol2RapportAddress: string

  // Vol.2 KPIs
  vol2KpiGroups: KpiGroup[]

  // Vol.3 Intro
  vol3IntroSubtitle: string
  vol3IntroDescription: string
  vol3IntroText1: string

  // Generic content map for extensibility
  content: Record<string, string>

  // Actions
  setField: (key: keyof Omit<ContentState, 'content' | 'setField' | 'setContent' | 'setVol2IntroStat' | 'setVol2Kpi' | 'vol2KpiGroups' | 'vol2IntroStats'>, value: string) => void
  setContent: (key: string, value: string) => void
  setVol2IntroStat: (index: number, updates: Partial<StatItem>) => void
  setVol2Kpi: (groupIndex: number, kpiIndex: number, updates: Partial<KpiItem>) => void
}

export const useContentStore = create<ContentState>()((set) => ({
  // ── Vol.2 Intro ──
  vol2IntroSubtitle: 'VOL. 2 — PLAN SECURITAIRE',
  vol2IntroDescription: "Dispositif de surete et securite incendie — controle d'acces, videoprotection, procedures d'urgence et formation.",
  vol2IntroText1: "Le centre commercial The Mall deploie un dispositif de securite integre couvrant cinq perimetres complementaires : la surveillance perimetrique exterieure, le controle d'acces physique et electronique, un reseau de videosurveillance intelligent de plus de 120 cameras, un systeme de securite incendie conforme ERP categorie 1, et un programme de procedures operationnelles et de formation continue.",
  vol2IntroText2: "L'ensemble est pilote depuis un PC securite central operationnel 24h/24, 7j/7, sous la direction d'un Directeur Surete et de deux chefs de poste (jour/nuit) encadrant 12 agents SSIAP qualifies. Le temps d'intervention cible est inferieur a 3 minutes sur l'ensemble du site.",
  vol2IntroInsightScore: '87/100',
  vol2IntroInsightText: "Le dispositif est globalement conforme aux normes APSAD R82 et EN 62676. Points d'attention : renforcer la couverture video en zone parking niveau -2 (angle mort detecte secteur C) et planifier l'exercice d'evacuation T1 2026 conformement a la reglementation ERP.",
  vol2IntroStats: [
    { value: '120+', label: 'CAMERAS' },
    { value: '24/7', label: 'PC SECURITE' },
    { value: '5', label: 'ZONES' },
    { value: '<3min', label: 'INTERVENTION' },
  ],

  // ── Vol.2 Rapport ──
  vol2RapportAddress: "Abidjan, Cote d'Ivoire",

  // ── Vol.2 KPIs ──
  vol2KpiGroups: [
    {
      title: 'Trafic & Acces',
      kpis: [
        { label: 'Visiteurs journaliers', cible: '> 4 000/j', valeurActuelle: '4 250/j', frequence: 'Quotidien', source: 'Compteurs flux', status: 'conforme' },
        { label: 'Delai moyen controle acces', cible: '< 8 sec', valeurActuelle: '6.2 sec', frequence: 'Temps reel', source: 'Badges RFID', status: 'conforme' },
        { label: 'Incidents signales / mois', cible: '< 5', valeurActuelle: '3', frequence: 'Mensuel', source: 'Journal PC securite', status: 'conforme' },
        { label: 'Taux resolution < 15 min', cible: '> 90%', valeurActuelle: '87%', frequence: 'Mensuel', source: 'Journal interventions', status: 'surveiller' },
      ],
    },
    {
      title: 'Videosurveillance',
      kpis: [
        { label: 'Couverture zones communes', cible: '100%', valeurActuelle: '96%', frequence: 'Hebdomadaire', source: 'Audit cameras', status: 'surveiller' },
        { label: 'Disponibilite systeme CCTV', cible: '> 99.5%', valeurActuelle: '99.7%', frequence: 'Temps reel', source: 'DSI monitoring', status: 'conforme' },
        { label: 'Duree stockage images', cible: '30 jours', valeurActuelle: '30 jours', frequence: 'Continu', source: 'Serveur NVR', status: 'conforme' },
        { label: 'Temps reponse alarme IA', cible: '< 3 sec', valeurActuelle: '2.1 sec', frequence: 'Temps reel', source: 'Analyse video', status: 'conforme' },
      ],
    },
    {
      title: 'Securite incendie',
      kpis: [
        { label: 'Delai evacuation simule', cible: '< 3 min', valeurActuelle: '2 min 45s', frequence: 'Trimestriel', source: 'Exercices trimestriels', status: 'conforme' },
        { label: 'Disponibilite sprinklers', cible: '100%', valeurActuelle: '100%', frequence: 'Mensuel', source: 'Maintenance SSI', status: 'conforme' },
        { label: 'Tests detecteurs fumee', cible: 'Trimestriel', valeurActuelle: 'Dernier: Jan 2026', frequence: 'Trimestriel', source: 'Prestataire SSI', status: 'conforme' },
      ],
    },
  ],

  // ── Vol.3 Intro ──
  vol3IntroSubtitle: 'VOL. 3 — PARCOURS CLIENT',
  vol3IntroDescription: "Experience visiteur, signaletique, wayfinding et parcours client optimise.",
  vol3IntroText1: '',

  // ── Generic content ──
  content: {},

  // ── Actions ──
  setField: (key, value) => set({ [key]: value }),

  setContent: (key, value) => set((s) => ({
    content: { ...s.content, [key]: value },
  })),

  setVol2IntroStat: (index, updates) => set((s) => ({
    vol2IntroStats: s.vol2IntroStats.map((stat, i) =>
      i === index ? { ...stat, ...updates } : stat
    ),
  })),

  setVol2Kpi: (groupIndex, kpiIndex, updates) => set((s) => ({
    vol2KpiGroups: s.vol2KpiGroups.map((group, gi) =>
      gi === groupIndex
        ? {
            ...group,
            kpis: group.kpis.map((kpi, ki) =>
              ki === kpiIndex ? { ...kpi, ...updates } : kpi
            ),
          }
        : group
    ),
  })),
}))
