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
  Play,
  Store,
  Hotel,
  Briefcase,
  Stethoscope,
  GraduationCap,
  Factory,
  Landmark,
  Network,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Building2, color: '#f59e0b', title: 'Opérations & Business',
    desc: 'Pilotage métier adapté à chaque verticale : mix enseigne, RevPAR hôtel, occupation bureaux, activité hospitalière.',
  },
  {
    icon: ShieldCheck, color: '#38bdf8', title: 'Sécurité & Conformité',
    desc: 'Vidéosurveillance, contrôle d\'accès, conformité ERP (APSAD R82, NF S 61-938, EN 62676), simulation Monte Carlo évacuation.',
  },
  {
    icon: Route, color: '#34d399', title: 'Expérience Utilisateur',
    desc: 'Parcours visiteur/client/occupant, signalétique ISO 7010, flux ABM Helbing, simulations de foule.',
  },
  {
    icon: Sparkles, color: '#0ea5e9', title: 'Wayfinder',
    desc: 'GPS intérieur : app mobile, bornes, AR. A* bidirectionnel, positioning WiFi+BLE+PDR, précision ±1,3 m.',
  },
]

const VERTICALS = [
  { icon: Store,         title: 'Centres commerciaux',    desc: 'Mix enseignes · loyers · CA/m² · ICSC benchmarks · tenant scoring' },
  { icon: Hotel,         title: 'Hôtels & hospitality',   desc: 'RevPAR · ADR · housekeeping · F&B · parcours client' },
  { icon: Briefcase,     title: 'Immeubles de bureaux',   desc: 'Occupation · desk booking · QAI · coworking · badges' },
  { icon: Stethoscope,   title: 'Hôpitaux & santé',       desc: 'Flux patients · bloc opératoire · compliance HAS · wayfinding' },
  { icon: GraduationCap, title: 'Campus & éducation',     desc: 'Salles · flux étudiants · bibliothèque · événements' },
  { icon: Factory,       title: 'Logistique & industrie', desc: 'SKU · zones ATEX · compliance OSHA · flux entrepôt' },
  { icon: Landmark,      title: 'ERP public & culture',   desc: 'Musées · mairies · billetterie · accessibilité PMR' },
  { icon: Network,       title: 'Multi-sites / portfolio', desc: 'Consolidation REIT · benchmarking inter-sites · API' },
]

const STATS = [
  { value: '8', label: 'verticales couvertes', suffix: '' },
  { value: '4', label: 'volumes métier', suffix: '' },
  { value: '40+', label: 'capacités Proph3t', suffix: '' },
  { value: '15+', label: 'normes intégrées', suffix: '' },
]

const CLIENTS_LOGOS = [
  'New Heaven SA', 'Cosmos Group', 'CFAO Retail', 'Prosuma', 'Playce',
]

const PRICING = [
  {
    name: 'Étude', price: '2 500 000', period: '/ projet',
    features: ['1 bâtiment (toute verticale)', 'Conception & audit réglementaire', 'Vol.1 Opérations + Vol.2 Sécurité', 'Export PDF & DWG', 'Livraison sous 4 semaines'],
    cta: 'Démarrer un projet', popular: false,
  },
  {
    name: 'Complet', price: '6 500 000', period: '/ projet',
    features: ['1 bâtiment', 'Les 4 volumes complets', 'Proph3t IA illimité', 'Wayfinder (mobile + bornes + AR)', 'Visites 3D/VR & rapports partageables', '6 mois de support après livraison', 'Formation équipe'],
    cta: 'Demander un devis', popular: true,
  },
  {
    name: 'Portefeuille', price: 'Sur devis', period: '',
    features: ['Portfolio multi-sites', 'Licence pluriannuelle', 'API dédiée', 'SSO / SAML', 'SLA 99.9% avec pénalités', 'Déploiement on-premise possible', 'Équipe consultants sur site'],
    cta: 'Contacter l\'équipe', popular: false,
  },
]

const TESTIMONIALS = [
  {
    quote: 'Atlas BIM a transformé notre façon de piloter The Mall. L\'IA Proph3t nous fait gagner des semaines sur chaque rapport.',
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <span className="text-[22px] sm:text-[26px] text-white tracking-wide" style={{ fontFamily: "'Grand Hotel', cursive" }}>Atlas Bim</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Témoignages</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => navigate('/login')} className="hidden sm:inline text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Connexion
            </button>
            <button onClick={() => navigate('/register')}
              className="text-xs sm:text-sm font-medium bg-atlas-500 hover:bg-atlas-400 text-white px-3 sm:px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
              Créer un compte
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden">
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

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-[12px] font-medium"
            style={{ background: 'rgba(179,138,90,0.08)', border: '1px solid rgba(179,138,90,0.2)', color: '#d4b280' }}>
            <Zap size={12} />
            Propulsé par Proph3t — IA conversationnelle à mémoire longue
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] mb-6">
            Le jumeau numérique{' '}
            <span className="bg-gradient-to-r from-atlas-300 via-atlas-400 to-atlas-600 bg-clip-text text-transparent">
              de vos bâtiments
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Atlas BIM par Atlas Studio — plateforme SaaS de planification, sécurité, expérience et wayfinding
            pour centres commerciaux, hôtels, bureaux, hôpitaux, campus et ERP publics.
          </p>

          <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
            <button onClick={() => navigate('/register')}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-atlas-500 hover:bg-atlas-400 text-white font-medium text-[15px] transition-all hover:-translate-y-0.5 shadow-lg shadow-bronze/20">
              Créer un compte <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/[0.1] text-gray-300 hover:text-white hover:border-white/20 font-medium text-[15px] transition-all">
              <Play size={16} /> Mode démo app
            </button>
          </div>
          <p className="text-[12px] text-gray-500 mb-10 flex items-center justify-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-atlas-400 animate-pulse" />
            Inscriptions publiques <span className="text-atlas-300 font-medium">bientôt disponibles</span> — rejoignez la liste d'attente.
          </p>

          {/* Sélecteur de démos verticales */}
          <div className="mb-16">
            <p className="text-[11px] text-atlas-400 uppercase tracking-[0.18em] font-semibold mb-3 flex items-center justify-center gap-2">
              <Sparkles size={12} /> Voir un rapport Proph3t par verticale
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { Icon: Store,         label: 'Centre commercial', path: '/demo/mall' },
                { Icon: Hotel,         label: 'Hôtel',              path: '/demo/hotel' },
                { Icon: Briefcase,     label: 'Bureaux',            path: '/demo/office' },
                { Icon: Stethoscope,   label: 'Hôpital',            path: '/demo/hospital' },
                { Icon: GraduationCap, label: 'Campus',             path: '/demo/campus' },
              ].map(d => (
                <button
                  key={d.path}
                  onClick={() => navigate(d.path)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-gray-300 hover:text-white hover:border-atlas-400/40 hover:bg-atlas-500/[0.08] font-medium text-[13px] transition-all"
                >
                  <d.Icon size={16} strokeWidth={1.4} className="text-gray-400" /> {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-light text-white">{s.value}<span className="text-atlas-400">{s.suffix}</span></div>
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

      {/* ═══ VERTICALES ═══ */}
      <section id="verticals" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] text-atlas-400 uppercase tracking-[0.2em] font-semibold mb-3">8 Verticales</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
              Une seule plateforme,<br />tous les types de bâtiments
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Atlas BIM s'adapte à votre secteur : benchmarks, vocabulaire, KPIs, compliance — tout est configuré pour votre verticale.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VERTICALS.map(v => {
              const Icon = v.icon
              return (
                <div key={v.title} className="rounded-xl p-5 border border-white/[0.06] transition-all hover:border-atlas-500/30 hover:-translate-y-0.5"
                  style={{ background: '#262a31' }}>
                  <Icon size={22} strokeWidth={1.4} className="text-gray-400 mb-3" />
                  <h3 className="text-[14px] font-medium text-white mb-1.5">{v.title}</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-light">{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-16 sm:py-24" style={{ background: 'rgba(10,15,26,0.5)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] text-atlas-400 uppercase tracking-[0.2em] font-semibold mb-3">4 Volumes métier</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
              Tout ce dont vous avez besoin,<br />dans une seule plateforme
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Chaque volume couvre un domaine d'expertise. Ensemble, ils forment la vision complète de votre bâtiment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="group rounded-2xl p-7 border border-white/[0.06] transition-all hover:-translate-y-1 hover:border-white/[0.1]"
                  style={{ background: '#262a31' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-white/[0.08] bg-white/[0.03] transition-colors group-hover:border-white/20">
                    <Icon size={22} strokeWidth={1.4} className="text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">{f.title}</h3>
                  <p className="text-[13px] text-gray-400 leading-relaxed font-light">{f.desc}</p>
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
                <h3 className="text-xl font-medium text-white mb-2">Proph3t — L'expert qui vit dans votre projet</h3>
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
      <section className="py-14 sm:py-20 border-y border-white/[0.04]" style={{ background: 'rgba(10,15,26,0.5)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light tracking-tight mb-4">Pensé pour l'Afrique francophone &amp; au-delà</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Native UEMOA/CEMAC, compatible internationale. Toute verticale, tout pays.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Globe2, title: 'SYSCOHADA + IFRS', desc: 'SYSCOHADA Révisé 2017 natif, norme IFRS pour les projets internationaux' },
              { icon: Zap, title: 'Multi-devises', desc: 'XOF / XAF natif, EUR / USD / CHF / MAD sur demande, conversion temps réel' },
              { icon: Lock, title: 'Multi-tenant sécurisé', desc: 'RLS Supabase — aucune donnée d\'une org visible par une autre' },
              { icon: Users, title: '6 rôles métier', desc: 'DG, Admin, Consultant, Partenaire, Investisseur, Lecteur' },
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
      <section id="pricing" className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-[11px] text-atlas-400 uppercase tracking-[0.2em] font-semibold mb-3">Tarification</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
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
                <h3 className="text-xl font-medium text-white">{plan.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-light text-white">{plan.price}</span>
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
      <section id="testimonials" className="py-14 sm:py-20 border-t border-white/[0.04]" style={{ background: 'rgba(10,15,26,0.5)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light tracking-tight mb-4">Ce que disent nos utilisateurs</h2>
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
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-atlas-500 to-purple-600 mx-auto mb-6 shadow-lg shadow-bronze/20">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
            Prêt à transformer votre bâtiment ?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Rejoignez les opérateurs qui utilisent Atlas BIM pour piloter mall, hôtels, bureaux, hôpitaux, campus ou portfolios multi-sites.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button onClick={() => navigate('/register')}
              className="flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-xl bg-atlas-500 hover:bg-atlas-400 text-white font-medium text-[15px] transition-all hover:-translate-y-0.5">
              Créer un compte <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/login')}
              className="px-6 py-3.5 rounded-xl border border-white/[0.1] text-gray-300 hover:text-white hover:border-white/20 font-medium text-[15px] transition-all">
              Se connecter
            </button>
          </div>
          <p className="text-[12px] text-gray-500 mt-6 flex items-center justify-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-atlas-400 animate-pulse" />
            Inscriptions publiques <span className="text-atlas-300 font-medium">bientôt disponibles</span>
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.04] py-12" style={{ background: 'rgba(6,10,19,0.9)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <span className="text-[18px] text-white" style={{ fontFamily: "'Grand Hotel', cursive" }}>Atlas BIM</span>
              <p className="text-[10px] text-gray-600">Atlas Studio</p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 text-[12px] text-gray-500">
              <span>UEMOA / CEMAC</span>
              <span>SYSCOHADA Révisé 2017</span>
              <span>Abidjan, Côte d'Ivoire</span>
            </div>
            <p className="text-[11px] text-gray-700">&copy; 2026 Atlas Studio. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
