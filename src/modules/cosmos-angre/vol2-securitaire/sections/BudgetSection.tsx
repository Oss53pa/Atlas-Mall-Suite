import React, { useMemo } from 'react'
import { Banknote, Camera, DoorOpen, Signpost, TrendingUp } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

export default function BudgetSection() {
  const cameras = useVol2Store((s) => s.cameras)
  const doors = useVol2Store((s) => s.doors)

  const camTotal = useMemo(() => cameras.reduce((s, c) => s + c.capexFcfa, 0), [cameras])
  const doorTotal = useMemo(() => doors.reduce((s, d) => s + d.capexFcfa, 0), [doors])
  const grandTotal = camTotal + doorTotal
  const tva = Math.round(grandTotal * 0.18)
  const ttc = grandTotal + tva

  const camItems = useMemo(() => {
    const byModel: Record<string, { count: number; unitPrice: number; model: string }> = {}
    for (const c of cameras) {
      if (!byModel[c.model]) byModel[c.model] = { count: 0, unitPrice: c.capexFcfa, model: c.model }
      byModel[c.model].count++
    }
    return Object.values(byModel)
  }, [cameras])

  const doorItems = useMemo(() => {
    const byRef: Record<string, { count: number; unitPrice: number; ref: string; label: string }> = {}
    for (const d of doors) {
      const key = d.ref || 'Sans réf.'
      if (!byRef[key]) byRef[key] = { count: 0, unitPrice: d.capexFcfa, ref: d.ref, label: d.label }
      byRef[key].count++
    }
    return Object.values(byRef)
  }, [doors])

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Banknote className="w-5 h-5 text-emerald-400" />
        Budget CAPEX
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-white">{formatFcfa(grandTotal)}</div>
          <div className="text-[10px] text-gray-500 mt-1">Total HT</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-amber-400">{formatFcfa(tva)}</div>
          <div className="text-[10px] text-gray-500 mt-1">TVA 18% (CI)</div>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-emerald-400">{formatFcfa(ttc)}</div>
          <div className="text-[10px] text-gray-500 mt-1">Total TTC</div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-cyan-400">{cameras.length + doors.length}</div>
          <div className="text-[10px] text-gray-500 mt-1">Équipements</div>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Répartition</h3>
        {[
          { label: 'Vidéosurveillance', value: camTotal, color: '#3b82f6', icon: Camera },
          { label: 'Contrôle d\'accès', value: doorTotal, color: '#8b5cf6', icon: DoorOpen },
        ].map((cat) => (
          <div key={cat.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1.5">
                <cat.icon className="w-3 h-3" style={{ color: cat.color }} />
                {cat.label}
              </span>
              <span className="text-white font-mono">{formatFcfa(cat.value)}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: grandTotal > 0 ? `${(cat.value / grandTotal) * 100}%` : '0%',
                  backgroundColor: cat.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Camera items table */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-blue-400" />
          Caméras
        </h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-2">Modèle</th>
              <th className="text-center py-2">Qté</th>
              <th className="text-right py-2">P.U. FCFA</th>
              <th className="text-right py-2">Total FCFA</th>
            </tr>
          </thead>
          <tbody>
            {camItems.map((item) => (
              <tr key={item.model} className="border-b border-gray-800/50">
                <td className="py-2 text-white">{item.model}</td>
                <td className="py-2 text-center text-gray-400">{item.count}</td>
                <td className="py-2 text-right text-gray-400 font-mono">{item.unitPrice.toLocaleString('fr-FR')}</td>
                <td className="py-2 text-right text-cyan-400 font-mono">{(item.count * item.unitPrice).toLocaleString('fr-FR')}</td>
              </tr>
            ))}
            {camItems.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-gray-600">Aucune caméra placée</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-700">
              <td colSpan={3} className="py-2 text-right text-gray-400 font-medium">Sous-total caméras</td>
              <td className="py-2 text-right text-blue-400 font-bold font-mono">{camTotal.toLocaleString('fr-FR')}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Door items table */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
          <DoorOpen className="w-4 h-4 text-purple-400" />
          Contrôle d'accès
        </h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-2">Référence</th>
              <th className="text-center py-2">Qté</th>
              <th className="text-right py-2">P.U. FCFA</th>
              <th className="text-right py-2">Total FCFA</th>
            </tr>
          </thead>
          <tbody>
            {doorItems.map((item) => (
              <tr key={item.ref} className="border-b border-gray-800/50">
                <td className="py-2 text-white">{item.ref}</td>
                <td className="py-2 text-center text-gray-400">{item.count}</td>
                <td className="py-2 text-right text-gray-400 font-mono">{item.unitPrice.toLocaleString('fr-FR')}</td>
                <td className="py-2 text-right text-cyan-400 font-mono">{(item.count * item.unitPrice).toLocaleString('fr-FR')}</td>
              </tr>
            ))}
            {doorItems.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-gray-600">Aucune porte configurée</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-700">
              <td colSpan={3} className="py-2 text-right text-gray-400 font-medium">Sous-total accès</td>
              <td className="py-2 text-right text-purple-400 font-bold font-mono">{doorTotal.toLocaleString('fr-FR')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
