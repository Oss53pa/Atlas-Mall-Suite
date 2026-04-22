// ═══ ATLAS MALL SUITE — Landing Page ═══

import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Building2,
  ShieldCheck,
  Route,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Zap,
  Users,
  Lock,
  Star,
  Play
} from 'lucide-react'

const FEATURES = [
  {
    icon: Building2, color: '#f59e0b', title: 'Plan Commercial',
    desc: 'Pilotez le mix enseigne, suivez l\'occupancy en temps réel, optimisez les loyers avec l\'IA.',
  },
  {
    icon: ShieldCheck, color: '#38bdf8', title: 'Plan Sécuritaire',
    desc: 'Vidéosurveillance intelligente, contrôle d\'accès, conformité APSAD R82, simulation Monte Carlo.',
  },
  {
    icon: Route, color: '#34d399', title: 'Parcours Client',
    desc: 'Expérience visiteur, signalétique ISO 7010, wayfinding multi-niveaux, programme fidélité.',
  },
]

const STATS = [
  { value: '30 000', label: 'm² gérés', suffix: '+' },
  { value: '120', label: 'caméras pilotées', suffix: '+' },
  { value: '18%', label: 'TVA intégrée', suffix: '' },
  { value: '3', label: 'volumes métier', suffix: '' },
]

const CLIENTS_LOGOS = [
  'New Heaven SA', 'Cosmos Group', 'CFAO Retail', 'Prosuma', 'Playce',
]

const PRICING = [
  {
    name: 'Étude', price: '2 500 000', period: '/ projet',
    features: ['1 centre commercial', 'Conception & audit réglementaire', 'Vol.1 Commercial + Vol.2 Sécurité', 'Export PDF & DWG', 'Livraison sous 4 semaines'],
    cta: 'Démarrer un projet', popular: false,
  },
  {
    name: 'Complet', price: '6 500 000', period: '/ projet',
    features: ['1 centre commercial', 'Les 4 volumes complets', 'Proph3t IA illimité', 'Wayfinder (mobile + bornes)', 'Visites guidées & rapports partageables', '6 mois de support après livraison', 'Formation équipe'],
    cta: 'Demander un devis', popular: true,
  },
  {
    name: 'Portefeuille', price: 'Sur devis', period: '',
    features: ['Plusieurs centres commerciaux', 'Licence pluriannuelle', 'API dédiée', 'SSO / SAML', 'SLA 99.9% avec pénalités', 'Déploiement on-premise possible', 'Équipe consultants sur site'],
    cta: 'Contacter l\'équipe', popular: false,
  },
]

const TESTIMONIALS = [
  {
    quote: 'Atlas Mall Suite a transformé notre façon de piloter Cosmos Angré. L\'IA Proph3t nous fait gagner des semaines sur chaque rapport.',
    author: 'Cheick Sanankoua', role: 'Directeur Général', company: 'New Heaven SA',
  },
  {
    quote: 'La vue 3D isométrique et le plan sécuritaire sont exactement ce dont nous avions besoin pour nos audits APSAD.',
    author: 'Aminata Koné', role: 'Directrice Technique', company: 'New Heaven SA',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen text-white" style={{ background: '#1a1d23' }}>

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] backdrop-blur-xl" style={{ background: 'rgba(6,10,19,0.85)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-[22px] text-white tracking-wide" style={{ fontFamily: "'Grand Hotel', cursive" }}>Atlas Mall Suite</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Témoignages</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Connexion
            </button>
            <button onClick={() => navigate('/register')}
              className="text-sm font-medium bg-atlas-500 hover:bg-atlas-400 text-white px-4 py-2 rounded-xl transition-colors">
              Essai gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-[700px] h-[700px] rounded-full opacity-[0.06] blur-[150px]" style={{ background: '#7e5e3c' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.04] blur-[120px]" style={{ background: '#38bdf8' }} />
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-[100px]" style={{ background: '#34d399' }} />
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-[12px] font-medium"
            style={{ background: 'rgba(179,138,90,0.08)', border: '1px solid rgba(179,138,90,0.2)', color: '#d4b280' }}>
            <Zap size={12} />
            Propulsé par Proph3t — IA conversationnelle à mémoire longue
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Pilotez vos centres{' '}
            <span className="bg-gradient-to-r from-atlas-300 via-atlas-400 to-atlas-600 bg-clip-text text-transparent">
              commerciaux
            </span>
            <br />
            comme jamais
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            La plateforme SaaS de référence pour la planification, la sécurité et l'expérience client
            des centres commerciaux en Afrique francophone.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <button onClick={() => navigate('/register')}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-atlas-500 hover:bg-atlas-400 text-white font-medium text-[15px] transition-all hover:-translate-y-0.5 shadow-lg shadow-bronze/20">
              Démarrer gratuitement <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/[0.1] text-gray-300 hover:text-white hover:border-white/20 font-medium text-[15px] transition-all">
              <Play size={16} /> Mode démo (sans compte)
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white">{s.value}<span className="text-atlas-400">{s.suffix}</span></div>
                <div className="text-[12px] text-gray-500 mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LOGOS ═══ */}
      <section className="py-12 border-y border-white/[0.04]" style={{ background: 'rgba(10,15,26,0.5)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-[11px] text-gray-600 uppercase tracking-[0.2em] font-semibold mb-6">
            Ils nous font confiance
          </p>
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {CLIENTS_LOGOS.map(name => (
              <span key={name} className="text-[14px] font-semibold text-gray-600/60 tracking-wide">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] text-atlas-400 uppercase tracking-[0.2em] font-semibold mb-3">3 Volumes métier</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Tout ce dont vous avez besoin,<br />dans une seule plateforme
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Chaque volume couvre un domaine d'expertise. Ensemble, ils forment la vision complète de votre centre commercial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="group rounded-2xl p-7 border border-white/[0.06] transition-all hover:-translate-y-1 hover:border-white/[0.1]"
                  style={{ background: '#262a31' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
                    style={{ background: `${f.color}12`, border: `1px solid ${f.color}20` }}>
                    <Icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-[13px] text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>

          {/* Proph3t section */}
          <div className="mt-16 rounded-2xl p-8 border border-atlas-500/15 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(126,94,60,0.06), rgba(179,138,90,0.04))' }}>
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-atlas-500/[0.06] blur-3xl" />
            <div className="relative flex flex-col md:flex-row items-start gap-6">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-atlas-500/10 border border-atlas-500/20">
                <Sparkles className="h-7 w-7 text-atlas-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Proph3t — L'expert qui vit dans votre projet</h3>
                <p className="text-gray-400 text-[14px] leading-relaxed mb-4">
                  Moteur IA conversationnel à mémoire longue. Proph3t connaît chaque décision depuis le premier import DXF,
                  anticipe les problèmes, et produit des rapports certifiés aux normes APSAD R82, ISO 7010, EN 62676.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['APSAD R82', 'NF S 61-938', 'ISO 7010', 'NF X 08-003', 'EN 62676', 'SYSCOHADA'].map(norm => (
                    <span key={norm} className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-atlas-300/80"
                      style={{ background: 'rgba(126,94,60,0.1)', border: '1px solid rgba(126,94,60,0.2)' }}>{norm}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY US ═══ */}
      <section className="py-20 border-y border-white/[0.04]" style={{ background: 'rgba(10,15,26,0.5)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Conçu pour l'Afrique francophone</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Chaque détail est pensé pour le marché UEMOA/CEMAC.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Globe2, title: 'SYSCOHADA natif', desc: 'Référentiel comptable révisé 2017, plan de comptes OHADA intégré' },
              { icon: Zap, title: 'Monnaie FCFA', desc: 'Tous les montants en XOF, TVA 18% DGI Côte d\'Ivoire par défaut' },
              { icon: Lock, title: 'Multi-tenant sécurisé', desc: 'RLS Supabase — aucune donnée d\'une org visible par une autre' },
              { icon: Users, title: '6 rôles métier', desc: 'DG, Admin, Consultant, Enseigne, Investisseur, Lecteur' },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-xl p-5 border border-white/[0.06]" style={{ background: '#262a31' }}>
                  <Icon size={18} className="text-atlas-400 mb-3" />
                  <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                  <p className="text-[12px] text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] text-atlas-400 uppercase tracking-[0.2em] font-semibold mb-3">Tarification</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Un plan pour chaque ambition
            </h2>
            <p className="text-gray-500">Tous les montants en FCFA (XOF). Sans engagement.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PRICING.map(plan => (
              <div key={plan.name}
                className={`rounded-2xl p-7 border transition-all hover:-translate-y-1 ${
                  plan.popular ? 'border-atlas-500/40 bg-atlas-400/[0.04] ring-1 ring-indigo-500/20' : 'border-white/[0.06]'
                }`}
                style={!plan.popular ? { background: '#262a31' } : undefined}>
                {plan.popular && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-atlas-400 uppercase tracking-wider mb-3">
                    <Star size={10} /> Le plus populaire
                  </span>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-gray-500 ml-1">FCFA{plan.period}</span>}
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-[13px] text-gray-400">
                      <CheckCircle2 size={14} className={plan.popular ? 'text-atlas-400' : 'text-gray-600'} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    plan.popular
                      ? 'bg-atlas-500 hover:bg-atlas-400 text-white'
                      : 'bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.1]'
                  }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" className="py-20 border-t border-white/[0.04]" style={{ background: 'rgba(10,15,26,0.5)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Ce que disent nos utilisateurs</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-2xl p-6 border border-white/[0.06]" style={{ background: '#262a31' }}>
                <p className="text-[14px] text-gray-300 leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-white">{t.author}</p>
                  <p className="text-[12px] text-gray-500">{t.role} — {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-atlas-500 to-purple-600 mx-auto mb-6 shadow-lg shadow-bronze/20">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Prêt à transformer votre centre commercial ?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Rejoignez les opérateurs qui utilisent Atlas Mall Suite pour piloter leurs actifs immobiliers commerciaux.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => navigate('/register')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-atlas-500 hover:bg-atlas-400 text-white font-medium text-[15px] transition-all hover:-translate-y-0.5">
              Créer mon compte <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/login')}
              className="px-6 py-3.5 rounded-xl border border-white/[0.1] text-gray-300 hover:text-white hover:border-white/20 font-medium text-[15px] transition-all">
              Se connecter
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.04] py-12" style={{ background: 'rgba(6,10,19,0.9)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-[18px] text-white" style={{ fontFamily: "'Grand Hotel', cursive" }}>Atlas Mall Suite</span>
              <p className="text-[10px] text-gray-600">Praedium Tech — Atlas Studio</p>
            </div>
            <div className="flex items-center gap-6 text-[12px] text-gray-500">
              <span>UEMOA / CEMAC</span>
              <span>SYSCOHADA Révisé 2017</span>
              <span>Abidjan, Côte d'Ivoire</span>
            </div>
            <p className="text-[11px] text-gray-700">&copy; 2025 Praedium Tech. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
