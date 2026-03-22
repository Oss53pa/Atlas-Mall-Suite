import React from 'react'
import { Crown, Star, Gift, QrCode } from 'lucide-react'
import type { POI } from '../../shared/proph3t/types'

interface CosmosClubWidgetProps {
  pois: POI[]
}

const TIERS = [
  { name: 'Decouverte', color: '#94a3b8', minPoints: 0, benefits: 'Acces Wi-Fi, plan interactif' },
  { name: 'Silver', color: '#A8A9AD', minPoints: 500, benefits: '-5% restauration, parking -1h gratuit' },
  { name: 'Gold', color: '#FFD700', minPoints: 2000, benefits: '-10% enseignes, lounge VIP, valet' },
  { name: 'Platinum', color: '#E5E4E2', minPoints: 5000, benefits: '-15% tout, personal shopper, evenements exclusifs' },
]

export default function CosmosClubWidget({ pois }: CosmosClubWidgetProps) {
  const cosmosClubPois = pois.filter((p) => p.cosmosClubOffre)
  const cosmosClubDesk = pois.find((p) => p.type === 'cosmos_club')

  return (
    <div className="bg-gray-900/50 border border-purple-800/30 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold text-purple-300">Programme Cosmos Club</span>
      </div>

      {/* Tiers */}
      <div className="space-y-1.5 mb-3">
        {TIERS.map((tier) => (
          <div key={tier.name} className="flex items-center gap-2 text-[11px]">
            <Star className="w-3 h-3 shrink-0" style={{ color: tier.color }} />
            <span className="text-gray-300 font-medium w-16">{tier.name}</span>
            <span className="text-gray-500 flex-1">{tier.benefits}</span>
          </div>
        ))}
      </div>

      {/* Active Offers */}
      {cosmosClubPois.length > 0 && (
        <div className="border-t border-gray-800 pt-2">
          <div className="text-[10px] text-gray-500 font-mono mb-1.5 flex items-center gap-1">
            <Gift className="w-3 h-3" /> OFFRES ACTIVES
          </div>
          <div className="space-y-1">
            {cosmosClubPois.map((poi) => (
              <div key={poi.id} className="text-[11px] bg-purple-950/20 rounded px-2 py-1">
                <span className="text-purple-400">{poi.label}</span>
                <span className="text-gray-500 ml-1">— {poi.cosmosClubOffre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Enrollment */}
      {cosmosClubDesk && (
        <div className="mt-3 flex items-center gap-2 bg-purple-900/20 rounded-lg px-3 py-2">
          <QrCode className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-[11px] text-purple-300 font-medium">Inscrivez-vous</div>
            <div className="text-[10px] text-gray-500">{cosmosClubDesk.label}</div>
          </div>
        </div>
      )}
    </div>
  )
}
