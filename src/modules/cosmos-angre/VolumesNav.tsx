import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Route, Sparkles, Link2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface VolumeStat {
  value: string
  label: string
}

interface VolumeConfig {
  id: string
  number: number
  badge: string
  title: string
  subtitle: string
  description: string
  icon: typeof ShieldCheck
  accent: string
  gradientFrom: string
  gradientTo: string
  borderColor: string
  borderHover: string
  badgeBg: string
  badgeBorder: string
  stats: VolumeStat[]
  route: string
}

const volumes: VolumeConfig[] = [
  {
    id: 'vol2',
    number: 2,
    badge: 'VOL. 2',
    title: 'Plan Securitaire',
    subtitle: 'Surete \u00b7 Acces \u00b7 Videosurveillance \u00b7 Procedures',
    description:
      'Audit complet de la strategie securitaire du centre commercial. Placement intelligent des cameras, ' +
      'controle d\u2019acces, couverture des zones critiques, detection des angles morts et conformite APSAD R82.',
    icon: ShieldCheck,
    accent: '#38bdf8',
    gradientFrom: '#0f1e3d',
    gradientTo: '#0a1628',
    borderColor: '#1e3a5f',
    borderHover: 'rgba(56, 189, 248, 0.376)',
    badgeBg: 'rgba(56, 189, 248, 0.125)',
    badgeBorder: 'rgba(56, 189, 248, 0.25)',
    stats: [
      { value: '5', label: 'ZONES' },
      { value: '120+', label: 'CAMERAS' },
      { value: '24/7', label: 'COUVERTURE' },
    ],
    route: '/cosmos-angre/vol2',
  },
  {
    id: 'vol3',
    number: 3,
    badge: 'VOL. 3',
    title: 'Parcours Client',
    subtitle: 'Experience \u00b7 Signaletique \u00b7 Flux \u00b7 Fidelisation',
    description:
      'Conception du parcours visiteur optimal. Signaletique normee ISO 7010, moments cles, ' +
      'wayfinding multi-niveaux, programme Cosmos Club et optimisation des flux pietons.',
    icon: Route,
    accent: '#34d399',
    gradientFrom: '#0a2318',
    gradientTo: '#061a10',
    borderColor: '#0f3d1e',
    borderHover: 'rgba(52, 211, 153, 0.376)',
    badgeBg: 'rgba(52, 211, 153, 0.125)',
    badgeBorder: 'rgba(52, 211, 153, 0.25)',
    stats: [
      { value: '7', label: 'MOMENTS CLES' },
      { value: '3', label: 'NIVEAUX' },
      { value: '\u221e', label: 'EXPERIENCES' },
    ],
    route: '/cosmos-angre/vol3',
  },
]

function VolumeCard({ vol }: { vol: VolumeConfig }) {
  const navigate = useNavigate()
  const Icon = vol.icon

  const handleCopyLink = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const url = `${window.location.origin}${vol.route}`
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Lien copie !', {
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
          },
          iconTheme: { primary: vol.accent, secondary: '#1e293b' },
        })
      })
    },
    [vol.route, vol.accent],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(vol.route)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(vol.route)
      }}
      className="group relative cursor-pointer rounded-2xl p-7 transition-all duration-200"
      style={{
        background: `linear-gradient(135deg, ${vol.gradientFrom}, ${vol.gradientTo})`,
        border: `1px solid ${vol.borderColor}`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-3px)'
        el.style.borderColor = vol.borderHover
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.borderColor = vol.borderColor
      }}
    >
      {/* Badge + Icon row */}
      <div className="flex items-start justify-between mb-5">
        <span
          className="inline-block rounded-[20px] px-3 py-1 text-xs font-semibold tracking-wider"
          style={{
            background: vol.badgeBg,
            color: vol.accent,
            border: `1px solid ${vol.badgeBorder}`,
          }}
        >
          {vol.badge}
        </span>
        <Icon size={28} style={{ color: vol.accent }} />
      </div>

      {/* Title */}
      <h3 className="text-[32px] font-light text-white leading-tight mb-1">
        {vol.title}
      </h3>

      {/* Subtitle */}
      <p className="text-xs tracking-wide" style={{ color: vol.accent }}>
        {vol.subtitle}
      </p>

      {/* Separator */}
      <div className="my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

      {/* Description */}
      <p className="text-[13px] leading-[1.7] text-slate-400 mb-6">
        {vol.description}
      </p>

      {/* Stats */}
      <div className="flex items-end gap-6 mb-6">
        {vol.stats.map((stat) => (
          <div key={stat.label} className="flex flex-col">
            <span
              className="text-2xl font-semibold leading-none"
              style={{ color: vol.accent }}
            >
              {stat.value}
            </span>
            <span className="text-[9px] font-medium tracking-wider mt-1" style={{ color: '#4a5568' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(vol.route)
          }}
          className="flex items-center gap-1.5 bg-transparent px-0 py-1 text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: vol.accent }}
        >
          Ouvrir ce volume <ArrowRight size={14} />
        </button>

        <button
          onClick={handleCopyLink}
          className="ml-auto flex items-center gap-1.5 rounded-[20px] px-3 py-1.5 text-xs transition-colors hover:opacity-80"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8',
          }}
        >
          <Link2 size={12} />
          Copier le lien
        </button>
      </div>
    </div>
  )
}

export default function VolumesNav() {
  return (
    <div className="min-h-screen text-white" style={{ background: '#080c14' }}>
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-sm" style={{ background: 'rgba(8,12,20,0.85)' }}>
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Atlas Mall Suite</h1>
              <p className="text-xs text-gray-500">Praedium Tech / Atlas Studio</p>
            </div>
          </div>
          <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs font-mono text-gray-500">
            Proph3t Engine
          </span>
        </div>
      </header>

      {/* Project info */}
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-4">
        <h2 className="text-2xl font-bold mb-1">Cosmos Angre Shopping Center</h2>
        <p className="text-gray-500 text-sm">Abidjan, Cote d&apos;Ivoire &mdash; Ouverture Octobre 2026</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <span>DG: Cheick Sanankoua</span>
          <span className="h-1 w-1 rounded-full bg-gray-700" />
          <span>3 etages (B1, RDC, R+1)</span>
          <span className="h-1 w-1 rounded-full bg-gray-700" />
          <span>~30 000 m&sup2;</span>
        </div>
      </div>

      {/* Volume cards */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {volumes.map((vol) => (
            <VolumeCard key={vol.id} vol={vol} />
          ))}
        </div>
      </div>

      {/* Proph3t section */}
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-4">
        <div
          className="rounded-xl p-6"
          style={{
            background: 'rgba(126,34,206,0.06)',
            border: '1px solid rgba(168,85,247,0.15)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600/20">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <h3 className="font-semibold text-purple-300">
              Proph3t &mdash; Expert Vivant
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-gray-400">
            Proph3t est un expert qui vit dans le projet. Il connait chaque decision depuis le premier
            import DXF, se souvient de chaque modification, anticipe les problemes avant qu&apos;ils
            surviennent, et produit des rapports certifies aux normes internationales (APSAD R82,
            NF S 61-938, ISO 7010, NF X 08-003).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['APSAD R82', 'NF S 61-938', 'ISO 7010', 'NF X 08-003', 'EN 62676', 'ISO 22341'].map(
              (norm) => (
                <span
                  key={norm}
                  className="rounded px-2 py-1 text-xs text-purple-300"
                  style={{
                    background: 'rgba(126,34,206,0.12)',
                    border: '1px solid rgba(126,34,206,0.2)',
                  }}
                >
                  {norm}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
