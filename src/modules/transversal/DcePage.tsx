// ═══ DCE / APPELS D'OFFRES ═══

import { useState } from 'react'
import { FileText, Download, Send, CheckCircle2, Package, Users, Calendar } from 'lucide-react'

interface Lot {
  id: string; ref: string; title: string; budgetFcfa: number; deadline: string
  responses: number; status: 'ouvert' | 'ferme' | 'attribue'
  specs: string[]; vendors: { name: string; amount: number; status: string }[]
}

const LOTS: Lot[] = [
  {
    id: '1', ref: 'LOT-01', title: 'Vidéosurveillance', budgetFcfa: 85000000, deadline: '15/05/2026',
    responses: 4, status: 'ouvert',
    specs: ['120 caméras IP Axis P3245-V', 'NVR 64 voies Milestone XProtect', 'Stockage 90 jours minimum', 'Conformité EN 62676'],
    vendors: [
      { name: 'SecurTech CI', amount: 82000000, status: 'Reçue' },
      { name: 'Axis Solutions Afrique', amount: 89000000, status: 'Reçue' },
      { name: 'Dahua Security West', amount: 71000000, status: 'Reçue' },
      { name: 'Hikvision CI', amount: 76000000, status: 'Reçue' },
    ],
  },
  {
    id: '2', ref: 'LOT-02', title: 'Contrôle d\'accès', budgetFcfa: 32000000, deadline: '15/05/2026',
    responses: 3, status: 'ouvert',
    specs: ['Lecteurs badge + biométrie zones techniques', 'SAS anti-retour entrées', 'Intégration VMS Milestone'],
    vendors: [
      { name: 'HID Global CI', amount: 30000000, status: 'Reçue' },
      { name: 'Suprema Africa', amount: 34000000, status: 'Reçue' },
      { name: 'ZKTeco West', amount: 26000000, status: 'Reçue' },
    ],
  },
  {
    id: '3', ref: 'LOT-03', title: 'Détection incendie', budgetFcfa: 18000000, deadline: '20/05/2026',
    responses: 2, status: 'ouvert',
    specs: ['SSI catégorie A', 'Détecteurs multi-critères', 'Conformité NF S 61-938', 'Désenfumage parking B1'],
    vendors: [
      { name: 'Siemens Fire CI', amount: 17500000, status: 'Reçue' },
      { name: 'Honeywell Afrique', amount: 19200000, status: 'Reçue' },
    ],
  },
  {
    id: '4', ref: 'LOT-04', title: 'Signalétique', budgetFcfa: 45000000, deadline: '01/06/2026',
    responses: 0, status: 'ouvert',
    specs: ['131 éléments signalétiques ISO 7010', 'Totems directionnels lumineux', 'Plaques braille PMR', 'Plans d\'évacuation rétroéclairés'],
    vendors: [],
  },
  {
    id: '5', ref: 'LOT-05', title: 'Mobilier & aménagement', budgetFcfa: 65000000, deadline: '10/06/2026',
    responses: 1, status: 'ouvert',
    specs: ['Bancs et assises food court', 'Bacs à plantes', 'Comptoirs d\'accueil', 'Mobilier zone enfants'],
    vendors: [{ name: 'Mobilia CI', amount: 62000000, status: 'Reçue' }],
  },
]

const STATUS_CFG = {
  ouvert: { label: 'Ouvert', color: '#22c55e' },
  ferme: { label: 'Fermé', color: '#f59e0b' },
  attribue: { label: 'Attribué', color: '#38bdf8' },
}

const fmtFcfa = (n: number) => `${(n / 1000000).toFixed(0)} M FCFA`

export default function DcePage() {
  const [selectedId, setSelectedId] = useState('1')
  const lot = LOTS.find(l => l.id === selectedId)!
  const st = STATUS_CFG[lot.status]

  return (
    <div className="flex h-full" style={{ background: '#060a13', color: '#e2e8f0' }}>
      {/* Left: Lots list */}
      <div className="w-80 flex-shrink-0 border-r border-white/[0.05] overflow-y-auto" style={{ background: '#0a0f1a' }}>
        <div className="p-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-amber-400" /><h2 className="text-sm font-semibold text-white">DCE / Appels d'offres</h2></div>
          <p className="text-[11px] text-gray-500">{LOTS.length} lots — Budget total {fmtFcfa(LOTS.reduce((a, l) => a + l.budgetFcfa, 0))}</p>
        </div>
        {LOTS.map(l => (
          <button key={l.id} onClick={() => setSelectedId(l.id)}
            className={`w-full text-left p-4 border-b border-white/[0.03] transition-colors ${selectedId === l.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 font-mono">{l.ref}</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${st.color}15`, color: STATUS_CFG[l.status].color }}>{STATUS_CFG[l.status].label}</span>
            </div>
            <p className="text-[12px] font-medium text-white mb-1">{l.title}</p>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span>{fmtFcfa(l.budgetFcfa)}</span>
              <span>{l.responses} réponse(s)</span>
            </div>
          </button>
        ))}
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1"><span className="text-[11px] text-gray-500 font-mono">{lot.ref}</span></div>
              <h2 className="text-lg font-bold text-white">{lot.title}</h2>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
                <Download size={13} /> Générer DCE (PDF)
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:text-white text-sm transition-colors">
                <Send size={13} /> Envoyer aux fournisseurs
              </button>
            </div>
          </div>

          {/* Key info */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { icon: Package, label: 'Budget estimé', value: fmtFcfa(lot.budgetFcfa), color: '#f59e0b' },
              { icon: Calendar, label: 'Date limite', value: lot.deadline, color: '#38bdf8' },
              { icon: Users, label: 'Réponses', value: `${lot.responses} fournisseur(s)`, color: '#34d399' },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-4 border border-white/[0.06]" style={{ background: '#0e1629' }}>
                <k.icon size={14} style={{ color: k.color }} className="mb-2" />
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{k.label}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Specs */}
          <div className="rounded-xl border border-white/[0.06] p-5 mb-6" style={{ background: '#0e1629' }}>
            <h3 className="text-sm font-semibold text-white mb-3">Cahier des charges</h3>
            <ul className="space-y-2">
              {lot.specs.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-gray-300">
                  <CheckCircle2 size={13} className="text-indigo-400 mt-0.5 flex-shrink-0" /> {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Vendor responses */}
          <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#0e1629' }}>
            <div className="px-5 py-3 border-b border-white/[0.04]">
              <h3 className="text-sm font-semibold text-white">Réponses fournisseurs</h3>
            </div>
            {lot.vendors.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-gray-600">Aucune réponse reçue pour le moment</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/[0.04]" style={{ background: '#141e2e' }}>
                  <th className="text-left px-5 py-2 text-[10px] text-gray-500 uppercase font-medium">Fournisseur</th>
                  <th className="text-right px-5 py-2 text-[10px] text-gray-500 uppercase font-medium">Montant</th>
                  <th className="text-center px-5 py-2 text-[10px] text-gray-500 uppercase font-medium">Écart</th>
                  <th className="text-center px-5 py-2 text-[10px] text-gray-500 uppercase font-medium">Statut</th>
                </tr></thead>
                <tbody>{lot.vendors.map((v, i) => {
                  const ecart = ((v.amount - lot.budgetFcfa) / lot.budgetFcfa * 100)
                  return (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-white font-medium">{v.name}</td>
                      <td className="px-5 py-3 text-right text-white">{fmtFcfa(v.amount)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-[11px] font-medium ${ecart <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {ecart > 0 ? '+' : ''}{ecart.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-[11px] text-gray-400">{v.status}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
