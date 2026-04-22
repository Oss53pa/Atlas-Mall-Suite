import { useMemo, useState } from 'react'
import { X, Search, Camera } from 'lucide-react'
import type { CameraModel } from '../../shared/proph3t/types'

interface CameraSpec {
  model: CameraModel
  name: string
  brand: string
  fov: number
  rangeM: number
  priceFcfa: number
  useCase: string
  resolution: string
  ip: string
}

const CAMERA_CATALOG: CameraSpec[] = [
  { model: 'XNV-8080R', name: 'Dome 5MP', brand: 'Wisenet', fov: 109, rangeM: 12, priceFcfa: 850_000, useCase: 'Interieur standard', resolution: '5MP', ip: 'IP66' },
  { model: 'QNV-8080R', name: 'Dome Vandal-proof', brand: 'Wisenet', fov: 109, rangeM: 10, priceFcfa: 920_000, useCase: 'Zones sensibles', resolution: '5MP', ip: 'IK10' },
  { model: 'PTZ-P3', name: 'PTZ Panoramique', brand: 'Wisenet', fov: 120, rangeM: 18, priceFcfa: 1_450_000, useCase: 'Parking & grands espaces', resolution: '4MP', ip: 'IP67' },
  { model: 'PNM-9000VQ', name: 'Multidirectionnel', brand: 'Wisenet', fov: 180, rangeM: 8, priceFcfa: 1_280_000, useCase: 'Carrefours', resolution: '8MP', ip: 'IP66' },
  { model: 'QNO-8080R', name: 'Bullet Exterieur', brand: 'Wisenet', fov: 90, rangeM: 14, priceFcfa: 780_000, useCase: 'Exterieur', resolution: '5MP', ip: 'IP66' },
  { model: 'XNF-9300RV', name: 'Fisheye 12MP', brand: 'Wisenet', fov: 360, rangeM: 6, priceFcfa: 1_100_000, useCase: 'Vue 360 plafond', resolution: '12MP', ip: 'IK10' },
  { model: 'DS-2CD2T47G2', name: 'Bullet Fixe', brand: 'Hikvision', fov: 90, rangeM: 12, priceFcfa: 650_000, useCase: 'Surveillance fixe', resolution: '4MP', ip: 'IP67' },
  { model: 'IPC-HDW3849H', name: 'Dome LED', brand: 'Dahua', fov: 100, rangeM: 10, priceFcfa: 580_000, useCase: 'Interieur eclaire', resolution: '8MP', ip: 'IP67' },
]

interface CameraLibraryProps {
  onSelect: (model: CameraModel) => void
  onClose: () => void
}

export default function CameraLibrary({ onSelect, onClose }: CameraLibraryProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return CAMERA_CATALOG
    const q = search.toLowerCase()
    return CAMERA_CATALOG.filter(
      (c) => c.model.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.useCase.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
          <Camera className="w-4 h-4" /> Bibliotheque Cameras
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-gray-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((cam) => (
          <button
            key={cam.model}
            onClick={() => onSelect(cam.model)}
            className="w-full text-left bg-gray-900/50 border border-gray-800 rounded-lg p-3 hover:border-blue-500/40 hover:bg-blue-950/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">{cam.model}</span>
              <span className="text-[10px] text-gray-500">{cam.brand}</span>
            </div>
            <div className="text-[11px] text-gray-400 mb-2">{cam.name}</div>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span>FOV {cam.fov}</span>
              <span>{cam.rangeM}m</span>
              <span>{cam.resolution}</span>
              <span>{cam.ip}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-blue-400">{cam.useCase}</span>
              <span className="text-xs font-semibold text-green-400">{cam.priceFcfa.toLocaleString()} FCFA</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
