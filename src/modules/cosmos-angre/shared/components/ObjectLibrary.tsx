import { useState, useMemo } from 'react'
import { Search, X, Star, Camera, DoorOpen, Signpost, Accessibility } from 'lucide-react'
import type { LibraryItem } from '../proph3t/types'

const LIBRARY_ITEMS: LibraryItem[] = [
  // Cameras
  { id:'lib-c1', category:'camera', ref:'XNV-8080R',       name:'Dôme 5MP IR',           brand:'Wisenet',  svgIcon:'cam-dome',    priceFcfa:850000,   normRef:'EN 62676',       specs:{ resolution:'5MP', fov:109, rangeM:14, ir:true },    usageRecommendation:'Entrées, circulations intérieures' },
  { id:'lib-c2', category:'camera', ref:'QNV-8080R',       name:'Dôme Vandal 5MP',       brand:'Wisenet',  svgIcon:'cam-vandal',  priceFcfa:920000,   normRef:'EN 62676',       specs:{ resolution:'5MP', fov:109, rangeM:12, ik10:true },  usageRecommendation:'Parkings, zones sensibles' },
  { id:'lib-c3', category:'camera', ref:'PTZ QNP-9300RWB', name:'PTZ 4K 30x',                 brand:'Wisenet',  svgIcon:'cam-ptz',     priceFcfa:2800000,  normRef:'EN 62676',       specs:{ resolution:'4K', fov:120, rangeM:30, ptz:true },    usageRecommendation:'Parkings, périmètre extérieur' },
  { id:'lib-c4', category:'camera', ref:'PNM-9000VQ',      name:'Multi-capteur 4x5MP',        brand:'Wisenet',  svgIcon:'cam-multi',   priceFcfa:1280000,  normRef:'EN 62676',       specs:{ resolution:'4x5MP', fov:270, rangeM:15 },           usageRecommendation:'Carrefours, zones larges' },
  { id:'lib-c5', category:'camera', ref:'QNO-8080R',       name:'Bullet Ext. 5MP',            brand:'Wisenet',  svgIcon:'cam-bullet',  priceFcfa:780000,   normRef:'EN 62676',       specs:{ resolution:'5MP', fov:98, rangeM:25, outdoor:true }, usageRecommendation:'Façades, quais livraison' },
  { id:'lib-c6', category:'camera', ref:'XNF-9300RV',      name:'Fisheye 360° 12MP',     brand:'Wisenet',  svgIcon:'cam-fisheye', priceFcfa:1150000,  normRef:'EN 62676',       specs:{ resolution:'12MP', fov:360, rangeM:8 },             usageRecommendation:'Halls, zones ouvertes' },
  { id:'lib-c7', category:'camera', ref:'DS-2CD2T47G2',    name:'Bullet 4MP ColorVu',         brand:'Hikvision',svgIcon:'cam-bullet',  priceFcfa:620000,   normRef:'EN 62676',       specs:{ resolution:'4MP', fov:104, rangeM:20, colorvu:true },usageRecommendation:'Couloirs, galeries' },
  { id:'lib-c8', category:'camera', ref:'IPC-HDW3849H',    name:'Dôme 8MP WizSense',     brand:'Dahua',    svgIcon:'cam-dome',    priceFcfa:580000,   normRef:'EN 62676',       specs:{ resolution:'8MP', fov:108, rangeM:12, ai:true },    usageRecommendation:'Commerce, flux piétons' },
  // Doors
  { id:'lib-d1', category:'door', ref:'CAME BX-800',       name:'Barrière automatique',  brand:'CAME',         svgIcon:'door-barrier',priceFcfa:650000,  normRef:'NF EN 13241', specs:{ debit:'500 véh/h', motorized:true },  usageRecommendation:'Parking' },
  { id:'lib-d2', category:'door', ref:'DORMA ES200',       name:'Coulissante auto',           brand:'DORMA',        svgIcon:'door-slide',  priceFcfa:1200000, normRef:'NF EN 16005', specs:{ debit:'1800 pers/h', width:'1.2m' },       usageRecommendation:'Entrées commerce' },
  { id:'lib-d3', category:'door', ref:'GEZE TS4000',       name:'Battante double',            brand:'GEZE',         svgIcon:'door-swing',  priceFcfa:480000,  normRef:'NF EN 1154',  specs:{ ei:'EI30', vantaux:2 },                    usageRecommendation:'Restauration, services' },
  { id:'lib-d4', category:'door', ref:'ABLOY CL100',       name:'Blindée + badge',       brand:'ABLOY',        svgIcon:'door-secure', priceFcfa:1450000, normRef:'EN 1303',     specs:{ badge:true, journal:true },                usageRecommendation:'Locaux techniques N4' },
  { id:'lib-d5', category:'door', ref:'SUPREMA BioEntry W2',name:'SAS biométrie',        brand:'SUPREMA',      svgIcon:'door-sas',    priceFcfa:2100000, normRef:'ISO 19794',   specs:{ biometric:true, antiPassback:true, sas:true },usageRecommendation:'Back-office N4' },
  { id:'lib-d6', category:'door', ref:'ASSA ABLOY PB1000', name:'Anti-panique EN1125',        brand:'ASSA ABLOY',   svgIcon:'door-panic',  priceFcfa:380000,  normRef:'NF EN 1125',  specs:{ panic:true, noKey:true },                  usageRecommendation:'Sorties de secours' },
  // Signage
  { id:'lib-s1', category:'signage', ref:'TOTEM-3M',       name:'Totem 3m',                   brand:'Signalétique CI', svgIcon:'sign-totem', priceFcfa:1800000, normRef:'NF X 08-003', specs:{ height:'3m', luminous:false },    usageRecommendation:'Entrées, carrefours' },
  { id:'lib-s2', category:'signage', ref:'TOTEM-5M',       name:'Totem 5m extérieur',    brand:'Signalétique CI', svgIcon:'sign-totem', priceFcfa:3200000, normRef:'NF X 08-003', specs:{ height:'5m', luminous:true },     usageRecommendation:'Parvis extérieur' },
  { id:'lib-s3', category:'signage', ref:'PANNEAU-DIR-A',  name:'Panneau directionnel susp.',  brand:'Signalétique CI', svgIcon:'sign-panel', priceFcfa:180000,  normRef:'ISO 7010',    specs:{ suspended:true, luminous:false }, usageRecommendation:'Galeries, couloirs' },
  { id:'lib-s4', category:'signage', ref:'BORNE-INTER',    name:'Borne interactive',          brand:'Signalétique CI', svgIcon:'sign-kiosk', priceFcfa:4500000, normRef:'EN 301 549',  specs:{ touchscreen:true, pmr:true },    usageRecommendation:'Halls, points info' },
  // Mobilier PMR
  { id:'lib-m1', category:'mobilier_pmr', ref:'RAMPE-PMR',    name:'Rampe PMR aluminium',     brand:'Accessibilité CI', svgIcon:'pmr-ramp',    priceFcfa:450000,  normRef:'NF P 98-350', specs:{ slope:'5%', handrail:true },      usageRecommendation:'Changements de niveau' },
  { id:'lib-m2', category:'mobilier_pmr', ref:'MAIN-COURANTE',name:'Main courante inox',      brand:'Accessibilité CI', svgIcon:'pmr-rail',    priceFcfa:85000,   normRef:'NF P 98-350', specs:{ material:'inox', heightM:0.9 },   usageRecommendation:'Escaliers, rampes' },
]

const CATEGORY_CONFIG = [
  { key: 'camera' as const, label: 'Caméras', icon: Camera },
  { key: 'door' as const, label: 'Portes', icon: DoorOpen },
  { key: 'signage' as const, label: 'Signalétique', icon: Signpost },
  { key: 'mobilier_pmr' as const, label: 'PMR', icon: Accessibility },
] as const

interface ObjectLibraryProps {
  category?: LibraryItem['category']
  onSelect: (item: LibraryItem) => void
  isOpen: boolean
  onClose: () => void
}

export default function ObjectLibrary({ category: initialCat, onSelect, isOpen, onClose }: ObjectLibraryProps) {
  const [category, setCategory] = useState<LibraryItem['category']>(initialCat ?? 'camera')
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return LIBRARY_ITEMS.filter(
      (it) => it.category === category && (
        !q || it.name.toLowerCase().includes(q) || it.ref.toLowerCase().includes(q) || it.brand.toLowerCase().includes(q)
      )
    )
  }, [category, search])

  if (!isOpen) return null

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-white">Bibliothèque</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex border-b border-gray-800">
        {CATEGORY_CONFIG.map((c) => (
          <button
            key={c.key}
            onClick={() => { setCategory(c.key); setSearch('') }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] transition-colors ${
              category === c.key ? 'text-cyan-400 bg-cyan-900/20 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <c.icon className="w-3.5 h-3.5" />
            {c.label}
          </button>
        ))}
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-7 pr-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full text-left p-2.5 bg-gray-800/60 border border-gray-700/50 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{item.name}</div>
                <div className="text-[10px] text-gray-500">{item.brand} — {item.ref}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFavorites((prev) => {
                    const next = new Set(prev)
                    next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                    return next
                  })
                }}
                className="ml-1 flex-none"
              >
                <Star className={`w-3 h-3 ${favorites.has(item.id) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-cyan-400 font-mono">
                {item.priceFcfa.toLocaleString('fr-FR')} FCFA
              </span>
              <span className="text-[9px] text-gray-600">{item.normRef}</span>
            </div>
            <div className="text-[9px] text-gray-500 mt-1 truncate">
              {item.usageRecommendation}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8">Aucun résultat</div>
        )}
      </div>
    </div>
  )
}
