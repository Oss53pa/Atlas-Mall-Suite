// ═══ SETTINGS / ORGANISATION — 9 Sections ═══

import { useState } from 'react'
import {
  Building2,
  Banknote,
  Palette,
  Users,
  Shield,
  FolderOpen,
  CreditCard,
  Plug,
  ScrollText,
  Upload,
  Plus,
  Check,
  _X,
  Search,
  Download,
  ExternalLink
} from 'lucide-react'

const SECTIONS = [
  { id: 'general', label: 'Informations légales', icon: Building2 },
  { id: 'financial', label: 'Paramètres financiers', icon: Banknote },
  { id: 'branding', label: 'Marque & apparence', icon: Palette },
  { id: 'members', label: 'Membres & rôles', icon: Users },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'projects', label: 'Projets gérés', icon: FolderOpen },
  { id: 'subscription', label: 'Abonnement', icon: CreditCard },
  { id: 'integrations', label: 'Intégrations', icon: Plug },
  { id: 'audit', label: "Journal d'audit", icon: ScrollText },
] as const

type SectionId = typeof SECTIONS[number]['id']

function Input({ value, placeholder, disabled }: { value: string; placeholder?: string; disabled?: boolean }) {
  const [v, setV] = useState(value)
  return <input value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} disabled={disabled}
    className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none focus:border-atlas-500/50 placeholder:text-gray-600 disabled:opacity-50" />
}

// ═══ 1. General ═══
function GeneralSection() {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-white">Informations légales</h3>
      <p className="text-sm text-gray-500">Identité juridique. Apparaît sur les rapports et documents officiels.</p>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-[11px] text-gray-500 mb-1 block">Raison sociale</label><Input value="New Heaven SA" /></div>
        <div><label className="text-[11px] text-gray-500 mb-1 block">Forme juridique</label>
          <select defaultValue="SA" className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none">
            <option>SA</option><option>SARL</option><option>SAS</option><option>EURL</option></select></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="text-[11px] text-gray-500 mb-1 block">N° RCCM</label><Input value="CI-ABJ-2020-B-12345" /></div>
        <div><label className="text-[11px] text-gray-500 mb-1 block">N° DGI</label><Input value="DGI-2020-00456" /></div>
        <div><label className="text-[11px] text-gray-500 mb-1 block">N° CNPS</label><Input value="" placeholder="Optionnel" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-[11px] text-gray-500 mb-1 block">Pays</label>
          <select defaultValue="CI" className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none">
            <option value="CI">Côte d'Ivoire</option><option value="SN">Sénégal</option><option value="CM">Cameroun</option><option value="BF">Burkina Faso</option></select></div>
        <div><label className="text-[11px] text-gray-500 mb-1 block">Ville</label><Input value="Abidjan" /></div>
      </div>
      <div><label className="text-[11px] text-gray-500 mb-1 block">Adresse complète</label><Input value="Angré, Cocody, Abidjan" /></div>
      <div><label className="text-[11px] text-gray-500 mb-1 block">Représentant légal</label><Input value="Cheick Sanankoua — Directeur Général" /></div>
      <div className="flex justify-end pt-4"><button className="px-5 py-2 rounded-lg bg-atlas-500 hover:bg-atlas-500 text-white text-sm font-medium transition-colors">Enregistrer</button></div>
    </div>
  )
}

// ═══ 2. Financial ═══
function FinancialSection() {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-white">Paramètres financiers</h3>
      <p className="text-sm text-gray-500">Configuration monétaire et fiscale — SYSCOHADA Révisé 2017.</p>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-[11px] text-gray-500 mb-1 block">Monnaie principale</label>
          <select className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none">
            <option>XOF — Franc CFA (BCEAO)</option><option>XAF — Franc CFA (BEAC)</option></select></div>
        <div><label className="text-[11px] text-gray-500 mb-1 block">Monnaie secondaire</label>
          <select className="w-full bg-[#141e2e] text-white text-sm rounded-lg px-3 py-2 border border-white/[0.08] outline-none">
            <option>EUR — Euro</option><option>USD — Dollar US</option></select></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="text-[11px] text-gray-500 mb-1 block">Taux de TVA (%)</label><Input value="18" /></div>
        <div><label className="text-[11px] text-gray-500 mb-1 block">Début exercice fiscal</label><Input value="01-01" /></div>
        <div><label className="text-[11px] text-gray-500 mb-1 block">Norme comptable</label><Input value="SYSCOHADA" disabled /></div>
      </div>
      <div className="rounded-xl p-4 border border-white/[0.06]" style={{ background: '#141e2e' }}>
        <p className="text-sm font-medium text-white mb-2">Règles de validation CAPEX</p>
        <div className="space-y-2 text-[12px] text-gray-400">
          <div className="flex justify-between"><span>{"< 5 000 000 FCFA"}</span><span className="text-emerald-400">Chef de projet</span></div>
          <div className="flex justify-between"><span>5 000 000 — 25 000 000 FCFA</span><span className="text-amber-400">DGA</span></div>
          <div className="flex justify-between"><span>{"> 25 000 000 FCFA"}</span><span className="text-red-400">DG + Conseil</span></div>
        </div>
      </div>
      <div className="flex justify-end pt-4"><button className="px-5 py-2 rounded-lg bg-atlas-500 hover:bg-atlas-500 text-white text-sm font-medium transition-colors">Enregistrer</button></div>
    </div>
  )
}

// ═══ 3. Branding ═══
function BrandingSection() {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-white">Marque & apparence</h3>
      <p className="text-sm text-gray-500">Personnalisez votre espace de travail.</p>
      <div><label className="text-[11px] text-gray-500 mb-1 block">Logo de l'organisation</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-[#141e2e] border border-dashed border-white/[0.12] flex items-center justify-center"><Upload size={20} className="text-gray-600" /></div>
          <div><button className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-gray-300 hover:text-white transition-colors">Charger un logo</button>
            <p className="text-[10px] text-gray-600 mt-1">PNG ou SVG, max 2 Mo</p></div>
        </div>
      </div>
      <div><label className="text-[11px] text-gray-500 mb-1 block">Couleur d'accent</label>
        <div className="flex items-center gap-3">
          <input type="color" defaultValue="#7e5e3c" className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
          <Input value="#7e5e3c" />
          <div className="flex gap-1.5">{['#7e5e3c','#f59e0b','#38bdf8','#34d399','#ef4444','#b38a5a'].map(c =>
            <button key={c} className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/30 transition-colors" style={{ background: c }} />)}</div>
        </div>
      </div>
      <div><label className="text-[11px] text-gray-500 mb-1 block">Nom affiché</label><Input value="New Heaven SA" /></div>
      <div className="flex justify-end pt-4"><button className="px-5 py-2 rounded-lg bg-atlas-500 hover:bg-atlas-500 text-white text-sm font-medium transition-colors">Enregistrer</button></div>
    </div>
  )
}

// ═══ 4. Members ═══
function MembersSection() {
  const members = [
    { name: 'Cheick Sanankoua', email: 'cheick@newheavensa.ci', role: 'super_admin', status: 'active' },
    { name: 'Aminata Koné', email: 'aminata@newheavensa.ci', role: 'admin', status: 'active' },
    { name: 'Jean-Marc Dupont', email: 'jm.dupont@securiconsult.fr', role: 'consultant', status: 'active' },
    { name: 'Fatou Diallo', email: 'fatou@zara.com', role: 'enseigne', status: 'invited' },
  ]
  const badges: Record<string, { label: string; color: string }> = {
    super_admin: { label: 'DG', color: '#ef4444' }, admin: { label: 'Admin', color: '#f59e0b' },
    consultant: { label: 'Consultant', color: '#38bdf8' }, enseigne: { label: 'Enseigne', color: '#34d399' },
    investisseur: { label: 'Investisseur', color: '#b38a5a' }, viewer: { label: 'Lecteur', color: '#6b7280' },
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-white">Membres & rôles</h3><p className="text-sm text-gray-500">{members.length} membres</p></div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-atlas-500 hover:bg-atlas-500 text-white text-sm font-medium"><Plus size={14} /> Inviter</button>
      </div>
      <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input placeholder="Rechercher..." className="w-full bg-[#141e2e] text-white text-sm rounded-lg pl-9 pr-3 py-2 border border-white/[0.08] outline-none placeholder:text-gray-600" /></div>
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/[0.04]" style={{ background: '#141e2e' }}>
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Membre</th>
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Rôle</th>
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Statut</th>
            <th className="px-4 py-2"></th></tr></thead>
          <tbody>{members.map((m, i) => {
            const b = badges[m.role] ?? badges.viewer
            return (<tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="px-4 py-3"><p className="text-white font-medium">{m.name}</p><p className="text-gray-500 text-[11px]">{m.email}</p></td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${b.color}15`, color: b.color }}>{b.label}</span></td>
              <td className="px-4 py-3"><span className={`text-[11px] ${m.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>{m.status === 'active' ? 'Actif' : 'Invitation envoyée'}</span></td>
              <td className="px-4 py-3 text-right"><button className="text-gray-600 hover:text-white text-[11px]">Modifier</button></td>
            </tr>)})}</tbody>
        </table>
      </div>
    </div>
  )
}

// ═══ 5. Permissions ═══
function PermissionsSection() {
  const roles = ['super_admin','admin','consultant','enseigne','investisseur','viewer']
  const roleLabels: Record<string,string> = { super_admin:'DG', admin:'Admin', consultant:'Consultant', enseigne:'Enseigne', investisseur:'Investisseur', viewer:'Lecteur' }
  const perms = [
    { id:'vol1.read', label:'Vol.1 Lecture' },{ id:'vol1.write', label:'Vol.1 Écriture' },
    { id:'vol2.read', label:'Vol.2 Lecture' },{ id:'vol2.write', label:'Vol.2 Écriture' },
    { id:'vol3.read', label:'Vol.3 Lecture' },{ id:'vol3.write', label:'Vol.3 Écriture' },
    { id:'finance.read', label:'Finance' },{ id:'dce.read', label:'DCE Lecture' },{ id:'dce.write', label:'DCE Écriture' },
    { id:'ai.use', label:'Proph3t IA' },{ id:'reports.export', label:'Export rapports' },{ id:'members.manage', label:'Gestion membres' },
  ]
  const matrix: Record<string,string[]> = {
    super_admin: perms.map(p=>p.id), admin: perms.map(p=>p.id),
    consultant: ['vol1.read','vol2.read','vol3.read','ai.use','reports.export'],
    enseigne: ['vol1.read'], investisseur: ['finance.read','reports.export'],
    viewer: ['vol1.read','vol2.read','vol3.read'],
  }
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-white">Matrice des permissions</h3>
      <p className="text-sm text-gray-500">Droits d'accès par rôle pour toute l'organisation.</p>
      <div className="rounded-xl border border-white/[0.06] overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="border-b border-white/[0.04]" style={{ background: '#141e2e' }}>
            <th className="text-left px-3 py-2 text-gray-500 font-medium">Permission</th>
            {roles.map(r=><th key={r} className="px-3 py-2 text-center text-gray-500 font-medium">{roleLabels[r]}</th>)}</tr></thead>
          <tbody>{perms.map(p=>(
            <tr key={p.id} className="border-b border-white/[0.03]">
              <td className="px-3 py-2 text-gray-300">{p.label}</td>
              {roles.map(r=>(<td key={r} className="px-3 py-2 text-center">
                <div className={`w-4 h-4 rounded mx-auto border ${matrix[r]?.includes(p.id)?'bg-atlas-500 border-indigo-400':'border-gray-700'} flex items-center justify-center`}>
                  {matrix[r]?.includes(p.id)&&<Check size={10} className="text-white"/>}</div></td>))}
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}

// ═══ 6. Projects ═══
function ProjectsSection() {
  const projects = [
    { name: 'Cosmos Angré', phase: 'Pré-ouverture', volumes: ['Vol.1','Vol.2','Vol.3'], area: '30 000' },
    { name: 'Cosmos Yopougon', phase: 'Conception', volumes: ['Vol.1','Vol.2'], area: '18 000' },
  ]
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-white">Projets de l'organisation</h3><p className="text-sm text-gray-500">{projects.length} projet(s)</p></div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-atlas-500 hover:bg-atlas-500 text-white text-sm font-medium"><Plus size={14}/> Nouveau projet</button>
      </div>
      <div className="space-y-3">{projects.map((p,i)=>(
        <div key={i} className="rounded-xl p-4 border border-white/[0.06] flex items-center gap-4" style={{ background: '#141e2e' }}>
          <div className="flex-1"><p className="text-white font-medium text-sm">{p.name}</p><p className="text-gray-500 text-[11px]">{p.phase} — {p.area} m²</p></div>
          <div className="flex gap-1.5">{p.volumes.map(v=><span key={v} className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/[0.06] text-gray-400">{v}</span>)}</div>
          <span className="text-emerald-400 text-[11px]">Actif</span>
          <button className="text-gray-600 hover:text-white transition-colors"><ExternalLink size={14}/></button>
        </div>))}</div>
    </div>
  )
}

// ═══ 7. Subscription ═══
function SubscriptionSection() {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-white">Abonnement</h3>
      <div className="grid grid-cols-3 gap-4">
        {[
          { name:'Starter', price:'150 000', features:['1 projet','3 utilisateurs','Vol.1 uniquement'], current:false },
          { name:'Pro', price:'450 000', features:['5 projets','15 utilisateurs','Tous volumes','Proph3t IA','Export illimité'], current:true },
          { name:'Enterprise', price:'Sur devis', features:['Projets illimités','Utilisateurs illimités','API dédiée','Support prioritaire','SLA 99.9%'], current:false },
        ].map(plan=>(
          <div key={plan.name} className={`rounded-xl p-5 border ${plan.current?'border-atlas-500/40 bg-atlas-500/5':'border-white/[0.06]'}`} style={!plan.current?{background:'#141e2e'}:undefined}>
            {plan.current&&<span className="text-[9px] font-bold text-atlas-400 uppercase tracking-wider mb-2 block">Plan actuel</span>}
            <h4 className="text-white font-semibold text-lg">{plan.name}</h4>
            <p className="text-xl font-bold text-white mt-1">{plan.price} <span className="text-sm text-gray-500 font-normal">FCFA/mois</span></p>
            <ul className="mt-4 space-y-1.5">{plan.features.map(f=>
              <li key={f} className="flex items-center gap-2 text-[12px] text-gray-400"><Check size={12} className={plan.current?'text-atlas-400':'text-gray-600'}/>{f}</li>)}</ul>
            {!plan.current&&<button className="mt-4 w-full py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-gray-300 hover:text-white">{plan.name==='Enterprise'?'Contacter':'Passer au plan'}</button>}
          </div>))}
      </div>
      <p className="text-[11px] text-gray-600">Prochain renouvellement : 01/04/2026 — Paiement par virement ou Mobile Money (Orange/MTN/Wave)</p>
    </div>
  )
}

// ═══ 8. Integrations ═══
function IntegrationsSection() {
  const items = [
    { name:'PROPH3T Ollama', desc:'Moteur IA local — LLaMA 3.1 fine-tuné', on:true, color:'#b38a5a' },
    { name:'Claude API (Fallback)', desc:'Anthropic claude-sonnet-4-20250514 — fallback premium', on:false, color:'#38bdf8' },
    { name:'Atlas Finance / LiassPilot', desc:'Comptabilité SYSCOHADA, liasses fiscales', on:false, color:'#f59e0b' },
    { name:'WiseHR', desc:'Gestion RH, paie, CNPS', on:false, color:'#34d399' },
    { name:'CashPilot', desc:'Trésorerie, prévisions cash-flow', on:false, color:'#ef4444' },
    { name:'SMTP Email', desc:"Envoi d'invitations et notifications", on:true, color:'#6b7280' },
  ]
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-white">Intégrations</h3>
      <p className="text-sm text-gray-500">Connectez Atlas Mall Suite à vos outils.</p>
      <div className="space-y-3">{items.map(it=>(
        <div key={it.name} className="rounded-xl p-4 border border-white/[0.06] flex items-center gap-4" style={{ background: '#141e2e' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${it.color}15` }}><Plug size={16} style={{ color: it.color }}/></div>
          <div className="flex-1"><p className="text-white font-medium text-sm">{it.name}</p><p className="text-gray-500 text-[11px]">{it.desc}</p></div>
          <button className={`relative w-10 h-5 rounded-full transition-colors ${it.on?'bg-atlas-500':'bg-gray-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${it.on?'translate-x-5':''}`}/></button>
        </div>))}</div>
    </div>
  )
}

// ═══ 9. Audit ═══
function AuditSection() {
  const logs = [
    { action:'Projet créé', user:'Cheick Sanankoua', detail:'Cosmos Angré', date:'15/01/2025 09:30' },
    { action:'Membre invité', user:'Cheick Sanankoua', detail:'aminata@newheavensa.ci (Admin)', date:'16/01/2025 14:15' },
    { action:'Plan DXF importé', user:'Aminata Koné', detail:'RDC — 200×140m', date:'20/01/2025 10:00' },
    { action:'Budget CAPEX approuvé', user:'Cheick Sanankoua', detail:'147 000 000 FCFA — Sécurité', date:'25/01/2025 16:45' },
    { action:'Caméra ajoutée', user:'Jean-Marc Dupont', detail:'CAM-042 Hall principal', date:'02/02/2025 11:30' },
    { action:'Rapport généré', user:'Aminata Koné', detail:'Rapport APSAD R82 v2.1', date:'10/02/2025 09:00' },
  ]
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-white">Journal d'audit</h3><p className="text-sm text-gray-500">Historique des actions</p></div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-gray-300 hover:text-white"><Download size={13}/> Export CSV</button>
      </div>
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/[0.04]" style={{ background: '#141e2e' }}>
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Date</th>
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Action</th>
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Utilisateur</th>
            <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Détail</th></tr></thead>
          <tbody>{logs.map((l,i)=>(
            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="px-4 py-2.5 text-gray-500 text-[11px] font-mono">{l.date}</td>
              <td className="px-4 py-2.5 text-white">{l.action}</td>
              <td className="px-4 py-2.5 text-gray-400">{l.user}</td>
              <td className="px-4 py-2.5 text-gray-500">{l.detail}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  )
}

// ═══ MAIN ═══
export default function OrgSettingsPage() {
  const [active, setActive] = useState<SectionId>('general')

  const content = () => {
    switch (active) {
      case 'general': return <GeneralSection />
      case 'financial': return <FinancialSection />
      case 'branding': return <BrandingSection />
      case 'members': return <MembersSection />
      case 'permissions': return <PermissionsSection />
      case 'projects': return <ProjectsSection />
      case 'subscription': return <SubscriptionSection />
      case 'integrations': return <IntegrationsSection />
      case 'audit': return <AuditSection />
    }
  }

  return (
    <div className="flex h-full" style={{ background: '#1a1d23', color: '#e2e8f0' }}>
      <aside className="w-56 flex-shrink-0 border-r overflow-y-auto p-3 space-y-0.5" style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="px-2 py-2 mb-2">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Paramètres</p>
          <p className="text-[12px] text-white font-medium mt-0.5">Organisation</p>
        </div>
        {SECTIONS.map(s => {
          const Icon = s.icon
          return (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                active === s.id ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`}>
              <Icon size={14} className={active === s.id ? 'text-atlas-400' : ''} />
              {s.label}
            </button>
          )
        })}
      </aside>
      <main className="flex-1 overflow-y-auto p-8"><div className="max-w-3xl">{content()}</div></main>
    </div>
  )
}
