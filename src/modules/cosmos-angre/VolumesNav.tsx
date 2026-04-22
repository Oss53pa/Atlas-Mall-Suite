import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Route, Sparkles, Link2, ArrowRight, Building2, Globe, Navigation } from 'lucide-react'
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
  accentRgb: string
  stats: VolumeStat[]
  route: string
}

const volumes: VolumeConfig[] = [
  {
    id: 'vol1',
    number: 1,
    badge: 'VOL. 1',
    title: 'Plan Commercial',
    subtitle: 'Mix enseigne · Occupancy · Preneurs · Leasing',
    description:
      'Pilotage du mix enseigne du centre commercial. Chaque cellule est identifiée, qualifiée, ' +
      'reliée à un preneur, et analysable en un clic.',
    icon: Building2,
    accent: '#f59e0b',
    accentRgb: '245, 158, 11',
    stats: [
      { value: '16', label: 'Cellules' },
      { value: '12', label: 'Preneurs' },
      { value: '92%', label: 'Occupation' },
    ],
    route: '/projects/cosmos-angre/vol1',
  },
  {
    id: 'vol2',
    number: 2,
    badge: 'VOL. 2',
    title: 'Plan Sécuritaire',
    subtitle: 'Sûreté · Accès · Vidéosurveillance · Procédures',
    description:
      'Audit complet de la stratégie sécuritaire. Placement intelligent des caméras, ' +
      'controle d\u2019acces et conformite APSAD R82.',
    icon: ShieldCheck,
    accent: '#38bdf8',
    accentRgb: '56, 189, 248',
    stats: [
      { value: '5', label: 'Zones' },
      { value: '120+', label: 'Caméras' },
      { value: '24/7', label: 'Couverture' },
    ],
    route: '/projects/cosmos-angre/vol2',
  },
  {
    id: 'vol3',
    number: 3,
    badge: 'VOL. 3',
    title: 'Parcours Client',
    subtitle: 'Expérience · Signalétique · Flux · Fidélisation',
    description:
      'Conception du parcours visiteur optimal. Signalétique normée ISO 7010, ' +
      'wayfinding multi-niveaux et programme Cosmos Club.',
    icon: Route,
    accent: '#34d399',
    accentRgb: '52, 211, 153',
    stats: [
      { value: '7', label: 'Moments clés' },
      { value: '3', label: 'Niveaux' },
      { value: '\u221e', label: 'Expériences' },
    ],
    route: '/projects/cosmos-angre/vol3',
  },
  {
    id: 'vol4',
    number: 4,
    badge: 'VOL. 4',
    title: 'Wayfinder',
    subtitle: 'GPS intérieur · Mobile · Web · Bornes',
    description:
      'Navigation indoor temps réel. WiFi fingerprinting + BLE + PDR fusionnés par EKF, ' +
      'A* bidirectionnel pondéré, 5 modes d\u2019itinéraire dont PMR et évacuation.',
    icon: Navigation,
    accent: '#0ea5e9',
    accentRgb: '14, 165, 233',
    stats: [
      { value: '±1.5m', label: 'Précision' },
      { value: '<50ms', label: 'Calcul A*' },
      { value: '3', label: 'Plateformes' },
    ],
    route: '/projects/cosmos-angre/vol4',
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
        toast.success('Lien copié !', {
          style: {
            background: '#131d35',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
          },
          iconTheme: { primary: vol.accent, secondary: '#131d35' },
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
      className="group relative cursor-pointer rounded-2xl p-[1px] transition-all duration-300 hover:-translate-y-1"
      style={{
        background: `linear-gradient(135deg, rgba(${vol.accentRgb}, 0.15), rgba(${vol.accentRgb}, 0.03))`,
      }}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{ background: `radial-gradient(ellipse at center, rgba(${vol.accentRgb}, 0.12), transparent 70%)` }}
      />

      {/* Card inner */}
      <div
        className="relative rounded-2xl p-7 h-full overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0e1629, #0a1021)' }}
      >
        {/* Decorative gradient orb */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: vol.accent }}
        />

        {/* Badge + Icon row */}
        <div className="relative flex items-start justify-between mb-6">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest"
            style={{
              background: `rgba(${vol.accentRgb}, 0.1)`,
              color: vol.accent,
              border: `1px solid rgba(${vol.accentRgb}, 0.2)`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: vol.accent }} />
            {vol.badge}
          </span>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{
              background: `linear-gradient(135deg, rgba(${vol.accentRgb}, 0.15), rgba(${vol.accentRgb}, 0.05))`,
              border: `1px solid rgba(${vol.accentRgb}, 0.15)`,
            }}
          >
            <Icon size={22} style={{ color: vol.accent }} />
          </div>
        </div>

        {/* Title */}
        <h3 className="relative text-[28px] font-light text-white leading-tight mb-1.5 tracking-tight">
          {vol.title}
        </h3>

        {/* Subtitle */}
        <p className="relative text-[11px] font-medium tracking-wide mb-5" style={{ color: vol.accent, opacity: 0.8 }}>
          {vol.subtitle}
        </p>

        {/* Description */}
        <p className="relative text-[13px] leading-[1.75] text-gray-400/80 mb-7">
          {vol.description}
        </p>

        {/* Stats */}
        <div className="relative flex items-end gap-8 mb-7">
          {vol.stats.map((stat, i) => (
            <div key={stat.label} className="flex flex-col">
              <span
                className="text-[26px] font-semibold leading-none tracking-tight"
                style={{ color: vol.accent }}
              >
                {stat.value}
              </span>
              <span className="text-[9px] font-medium tracking-wider mt-1.5 text-gray-500 uppercase">
                {stat.label}
              </span>
              {i < vol.stats.length - 1 && (
                <div className="absolute" />
              )}
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="relative border-t border-white/[0.04] mb-5" />

        {/* Actions */}
        <div className="relative flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(vol.route)
            }}
            className="flex items-center gap-2 text-sm font-medium transition-all duration-200 group-hover:gap-3"
            style={{ color: vol.accent }}
          >
            Ouvrir ce volume
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={handleCopyLink}
            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all duration-200 hover:bg-white/[0.06]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#64748b',
            }}
          >
            <Link2 size={11} />
            Copier
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VolumesNav() {
  return (
    <div className="h-full text-white relative overflow-auto" style={{ background: '#060a13' }}>
      {/* Background gradient mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.03] blur-[120px]"
          style={{ background: 'radial-gradient(circle, #38bdf8, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full opacity-[0.02] blur-[80px]"
          style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />
      </div>

      {/* Header removed — now in AppLayout topbar */}

      {/* Project info */}
      <div className="relative mx-auto max-w-6xl px-6 pt-12 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={14} className="text-gray-600" />
          <span className="text-[11px] font-medium text-gray-600 tracking-wide uppercase">Projet actif</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          <span className="text-white">Cosmos Angré</span>{' '}
          <span className="text-gray-600 font-light">Shopping Center</span>
        </h2>
        <p className="text-gray-500 text-sm font-medium">Abidjan, Côte d&apos;Ivoire &mdash; Ouverture Octobre 2026</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {[
            'DG: Cheick Sanankoua',
            '3 étages (B1, RDC, R+1)',
            '~30 000 m²',
          ].map((item) => (
            <span
              key={item}
              className="text-[11px] text-gray-500 font-medium bg-white/[0.02] border border-white/[0.04] rounded-full px-3 py-1"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Volume cards */}
      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {volumes.map((vol) => (
            <VolumeCard key={vol.id} vol={vol} />
          ))}
        </div>
      </div>

      {/* Proph3t section */}
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-4">
        <div className="relative rounded-2xl p-[1px] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.02))' }}
        >
          <div className="rounded-2xl p-7 relative" style={{ background: 'linear-gradient(145deg, #0e1629, #0a1021)' }}>
            {/* Decorative */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-purple-500/[0.05] blur-3xl" />

            <div className="relative flex items-center gap-3.5 mb-4">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-purple-500/20 blur-md opacity-50" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm tracking-tight">
                  Proph3t &mdash; Expert Vivant
                </h3>
                <p className="text-[11px] text-purple-400/70 font-medium">Moteur IA conversationnel à mémoire longue</p>
              </div>
            </div>

            <p className="relative text-[13px] leading-[1.8] text-gray-400/80 mb-5 max-w-3xl">
              Proph3t est un expert qui vit dans le projet. Il connaît chaque décision depuis le premier
              import DXF, se souvient de chaque modification, anticipe les problèmes avant qu&apos;ils
              surviennent, et produit des rapports certifiés aux normes internationales.
            </p>

            <div className="relative flex flex-wrap gap-2">
              {['APSAD R82', 'NF S 61-938', 'ISO 7010', 'NF X 08-003', 'EN 62676', 'ISO 22341'].map(
                (norm) => (
                  <span
                    key={norm}
                    className="rounded-lg px-2.5 py-1 text-[10px] font-semibold tracking-wide text-purple-300/80 transition-colors duration-200 hover:text-purple-200"
                    style={{
                      background: 'rgba(126,34,206,0.08)',
                      border: '1px solid rgba(126,34,206,0.15)',
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
    </div>
  )
}
