import React, { useMemo } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Shield, FileCheck, Camera, Lock, Flame, DoorOpen, Eye } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'

interface NormRequirement {
  id: string
  norm: string
  title: string
  description: string
  icon: React.ElementType
  checkFn: (state: ReturnType<typeof useVol2Store.getState>) => { status: 'conforme' | 'non_conforme' | 'partiel'; score: number; details: string[] }
}

const NORM_REQUIREMENTS: NormRequirement[] = [
  {
    id: 'apsad-r82',
    norm: 'APSAD R82',
    title: 'Videoprotection',
    description: 'Regles d\'installation et de maintenance des systemes de videoprotection',
    icon: Camera,
    checkFn: (s) => {
      const issues: string[] = []
      const cams = s.cameras
      const zones = s.zones
      if (cams.length < 10) issues.push(`Cameras insuffisantes : ${cams.length}/10 minimum`)
      const critZones = zones.filter(z => z.niveau >= 4)
      const uncoveredCrit = critZones.filter(z => !cams.some(c =>
        c.floorId === z.floorId && c.x >= z.x && c.x <= z.x + z.w && c.y >= z.y && c.y <= z.y + z.h
      ))
      if (uncoveredCrit.length > 0) issues.push(`${uncoveredCrit.length} zone(s) critique(s) N4/N5 sans camera`)
      const score = Math.max(0, 100 - issues.length * 25)
      return { status: issues.length === 0 ? 'conforme' : issues.length <= 1 ? 'partiel' : 'non_conforme', score, details: issues.length ? issues : ['Toutes les zones critiques sont couvertes'] }
    },
  },
  {
    id: 'nf-s-61-938',
    norm: 'NF S 61-938',
    title: 'Securite incendie ERP',
    description: 'Systemes de securite incendie pour les etablissements recevant du public type M',
    icon: Flame,
    checkFn: (s) => {
      const issues: string[] = []
      const exits = s.doors.filter(d => d.isExit)
      if (exits.length < 3) issues.push(`Sorties de secours : ${exits.length}/3 minimum requis`)
      const totalWidth = exits.reduce((sum, d) => sum + d.widthM, 0)
      if (totalWidth < 2.7) issues.push(`Largeur cumulee sorties : ${totalWidth.toFixed(1)}m (min 2.7m pour ERP M)`)
      const exitWithPanic = exits.filter(d => d.ref?.includes('PB1000') || d.ref?.includes('anti-panique'))
      if (exitWithPanic.length < exits.length && exits.length > 0) issues.push(`${exits.length - exitWithPanic.length} sortie(s) sans barre anti-panique`)
      const score = Math.max(0, 100 - issues.length * 25)
      return { status: issues.length === 0 ? 'conforme' : issues.length <= 1 ? 'partiel' : 'non_conforme', score, details: issues.length ? issues : ['Conforme aux exigences NF S 61-938'] }
    },
  },
  {
    id: 'en-62676',
    norm: 'EN 62676',
    title: 'Systemes de videosurveillance',
    description: 'Exigences techniques pour les composants et systemes de videosurveillance',
    icon: Eye,
    checkFn: (s) => {
      const issues: string[] = []
      const cams = s.cameras
      const nonNorm = cams.filter(c => !['XNV-8080R', 'QNV-8080R', 'PTZ QNP-9300RWB', 'PNM-9000VQ', 'QNO-8080R', 'XNF-9300RV', 'DS-2CD2T47G2', 'IPC-HDW3849H'].includes(c.model))
      if (nonNorm.length > 0) issues.push(`${nonNorm.length} camera(s) avec modele non certifie EN 62676`)
      if (cams.length > 0 && cams.every(c => c.fov < 90)) issues.push('Aucune camera grand angle (FOV >= 90 deg) installee')
      const score = Math.max(0, 100 - issues.length * 30)
      return { status: issues.length === 0 ? 'conforme' : 'partiel', score, details: issues.length ? issues : ['Tous les modeles sont certifies EN 62676'] }
    },
  },
  {
    id: 'en-1125',
    norm: 'EN 1125',
    title: 'Fermetures anti-panique',
    description: 'Dispositifs de verrouillage anti-panique pour les issues de secours',
    icon: DoorOpen,
    checkFn: (s) => {
      const issues: string[] = []
      const exits = s.doors.filter(d => d.isExit)
      if (exits.length === 0) { issues.push('Aucune sortie de secours configuree'); return { status: 'non_conforme', score: 0, details: issues } }
      const withoutPanic = exits.filter(d => !d.ref?.includes('PB1000') && !d.ref?.includes('anti-panique') && !d.ref?.includes('ASSA ABLOY'))
      if (withoutPanic.length > 0) issues.push(`${withoutPanic.length}/${exits.length} sortie(s) sans dispositif anti-panique certifie`)
      const score = exits.length > 0 ? Math.round(((exits.length - withoutPanic.length) / exits.length) * 100) : 0
      return { status: withoutPanic.length === 0 ? 'conforme' : 'partiel', score, details: issues.length ? issues : ['Tous les dispositifs anti-panique sont conformes'] }
    },
  },
  {
    id: 'en-1303',
    norm: 'EN 1303',
    title: 'Cylindres de serrure',
    description: 'Cylindres pour serrures de securite — exigences et methodes d\'essai',
    icon: Lock,
    checkFn: (s) => {
      const issues: string[] = []
      const securedDoors = s.doors.filter(d => ['technique', 'backoffice', 'financier', 'bureaux'].includes(d.zoneType))
      const withoutBadge = securedDoors.filter(d => !d.hasBadge)
      if (withoutBadge.length > 0) issues.push(`${withoutBadge.length} acces zone sensible sans controle d'acces`)
      const score = securedDoors.length > 0 ? Math.round(((securedDoors.length - withoutBadge.length) / securedDoors.length) * 100) : 100
      return { status: withoutBadge.length === 0 ? 'conforme' : 'partiel', score, details: issues.length ? issues : ['Tous les acces sensibles sont securises'] }
    },
  },
  {
    id: 'iso-19794',
    norm: 'ISO 19794',
    title: 'Biometrie',
    description: 'Formats d\'echange de donnees biometriques',
    icon: Shield,
    checkFn: (s) => {
      const issues: string[] = []
      const financialDoors = s.doors.filter(d => d.zoneType === 'financier')
      const withoutBio = financialDoors.filter(d => !d.hasBiometric)
      if (withoutBio.length > 0) issues.push(`${withoutBio.length} acces zone financiere sans biometrie`)
      const backDoors = s.doors.filter(d => d.zoneType === 'backoffice')
      const backWithoutSas = backDoors.filter(d => !d.hasSas)
      if (backWithoutSas.length > 0) issues.push(`${backWithoutSas.length} back-office sans SAS biometrique`)
      const score = Math.max(0, 100 - issues.length * 30)
      return { status: issues.length === 0 ? 'conforme' : issues.length <= 1 ? 'partiel' : 'non_conforme', score, details: issues.length ? issues : ['Biometrie deployee sur toutes les zones requises'] }
    },
  },
  {
    id: 'nf-p-25-362',
    norm: 'NF P 25-362',
    title: 'SAS de securite',
    description: 'Blocs-portes de securite pour locaux bancaires et financiers',
    icon: Shield,
    checkFn: (s) => {
      const issues: string[] = []
      const financialDoors = s.doors.filter(d => d.zoneType === 'financier')
      const withoutSas = financialDoors.filter(d => !d.hasSas)
      if (withoutSas.length > 0) issues.push(`${withoutSas.length} acces financier sans SAS triple verification`)
      const score = financialDoors.length > 0 ? Math.round(((financialDoors.length - withoutSas.length) / financialDoors.length) * 100) : 100
      return { status: withoutSas.length === 0 ? 'conforme' : 'non_conforme', score, details: issues.length ? issues : ['SAS de securite deployes sur toutes les zones financieres'] }
    },
  },
]

const statusConfig = {
  conforme: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', label: 'Conforme', icon: CheckCircle2 },
  partiel: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'Partiel', icon: AlertTriangle },
  non_conforme: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Non conforme', icon: XCircle },
}

export default function ComplianceTracker() {
  const store = useVol2Store()

  const results = useMemo(() => {
    return NORM_REQUIREMENTS.map(req => ({
      ...req,
      result: req.checkFn(store),
    }))
  }, [store.cameras, store.doors, store.zones])

  const overallScore = useMemo(() => {
    if (results.length === 0) return 0
    return Math.round(results.reduce((sum, r) => sum + r.result.score, 0) / results.length)
  }, [results])

  const conformeCount = results.filter(r => r.result.status === 'conforme').length
  const partielCount = results.filter(r => r.result.status === 'partiel').length
  const nonConformeCount = results.filter(r => r.result.status === 'non_conforme').length

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 -- PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Conformite APSAD</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Suivi de conformite aux 7 normes de reference du dispositif securitaire.
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-[10px] p-5 flex flex-col items-center text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <FileCheck size={20} style={{ color: '#38bdf8' }} className="mb-3" />
          <span className="text-2xl font-semibold" style={{ color: '#38bdf8' }}>{overallScore}%</span>
          <span className="text-[10px] tracking-wider mt-1" style={{ color: '#4a5568' }}>SCORE GLOBAL</span>
        </div>
        <div className="rounded-[10px] p-5 flex flex-col items-center text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <CheckCircle2 size={20} style={{ color: '#22c55e' }} className="mb-3" />
          <span className="text-2xl font-semibold" style={{ color: '#22c55e' }}>{conformeCount}</span>
          <span className="text-[10px] tracking-wider mt-1" style={{ color: '#4a5568' }}>CONFORMES</span>
        </div>
        <div className="rounded-[10px] p-5 flex flex-col items-center text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <AlertTriangle size={20} style={{ color: '#f59e0b' }} className="mb-3" />
          <span className="text-2xl font-semibold" style={{ color: '#f59e0b' }}>{partielCount}</span>
          <span className="text-[10px] tracking-wider mt-1" style={{ color: '#4a5568' }}>PARTIELS</span>
        </div>
        <div className="rounded-[10px] p-5 flex flex-col items-center text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <XCircle size={20} style={{ color: '#ef4444' }} className="mb-3" />
          <span className="text-2xl font-semibold" style={{ color: '#ef4444' }}>{nonConformeCount}</span>
          <span className="text-[10px] tracking-wider mt-1" style={{ color: '#4a5568' }}>NON CONFORMES</span>
        </div>
      </div>

      {/* Norm cards */}
      <div className="space-y-3">
        {results.map(({ id, norm, title, description, icon: NormIcon, result }) => {
          const cfg = statusConfig[result.status]
          const StatusIcon = cfg.icon
          return (
            <div
              key={id}
              className="rounded-xl p-5"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <NormIcon size={20} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[13px] font-semibold text-white">{norm}</span>
                    <span className="text-[11px]" style={{ color: '#6b7280' }}>{title}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <StatusIcon size={14} style={{ color: cfg.color }} />
                      <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  </div>
                  <p className="text-[11px] mb-3" style={{ color: '#4a5568' }}>{description}</p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${result.score}%`, background: cfg.color }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-medium" style={{ color: cfg.color }}>{result.score}%</span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    {result.details.map((detail, idx) => (
                      <p key={idx} className="text-[11px]" style={{ color: result.status === 'conforme' ? '#22c55e' : '#94a3b8' }}>
                        {result.status === 'conforme' ? '✓' : '⚠'} {detail}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
