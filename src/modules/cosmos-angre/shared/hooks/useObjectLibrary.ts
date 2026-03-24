import { useState, useCallback, useMemo } from 'react'
import type { LibraryItem } from '../proph3t/types'

const CATALOG: LibraryItem[] = [
  { id:'lib-c1', category:'camera', ref:'XNV-8080R',        name:'Dôme 5MP IR',        brand:'Wisenet',   svgIcon:'cam-dome',    priceFcfa:850000,   normRef:'EN 62676', specs:{ resolution:'5MP', fov:109, rangeM:14 }, usageRecommendation:'Entrées, circulations' },
  { id:'lib-c2', category:'camera', ref:'QNV-8080R',        name:'Dôme Vandal 5MP',    brand:'Wisenet',   svgIcon:'cam-vandal',  priceFcfa:920000,   normRef:'EN 62676', specs:{ resolution:'5MP', fov:109, rangeM:12 }, usageRecommendation:'Parkings, zones sensibles' },
  { id:'lib-c3', category:'camera', ref:'PTZ QNP-9300RWB',  name:'PTZ 4K 30x',              brand:'Wisenet',   svgIcon:'cam-ptz',     priceFcfa:2800000,  normRef:'EN 62676', specs:{ resolution:'4K', fov:120, rangeM:30 },  usageRecommendation:'Parkings, périmètre' },
  { id:'lib-c4', category:'camera', ref:'PNM-9000VQ',       name:'Multi-capteur 270°', brand:'Wisenet',   svgIcon:'cam-multi',   priceFcfa:1280000,  normRef:'EN 62676', specs:{ resolution:'4x5MP', fov:270, rangeM:15 },usageRecommendation:'Carrefours' },
  { id:'lib-c5', category:'camera', ref:'QNO-8080R',        name:'Bullet ext. 5MP',         brand:'Wisenet',   svgIcon:'cam-bullet',  priceFcfa:780000,   normRef:'EN 62676', specs:{ resolution:'5MP', fov:98, rangeM:25 },  usageRecommendation:'Façades' },
  { id:'lib-c6', category:'camera', ref:'XNF-9300RV',       name:'Fisheye 360° 12MP',  brand:'Wisenet',   svgIcon:'cam-fisheye', priceFcfa:1150000,  normRef:'EN 62676', specs:{ resolution:'12MP', fov:360, rangeM:8 }, usageRecommendation:'Halls' },
  { id:'lib-c7', category:'camera', ref:'DS-2CD2T47G2',     name:'Bullet 4MP ColorVu',      brand:'Hikvision', svgIcon:'cam-bullet',  priceFcfa:620000,   normRef:'EN 62676', specs:{ resolution:'4MP', fov:104, rangeM:20 }, usageRecommendation:'Couloirs' },
  { id:'lib-c8', category:'camera', ref:'IPC-HDW3849H',     name:'Dôme 8MP WizSense',  brand:'Dahua',     svgIcon:'cam-dome',    priceFcfa:580000,   normRef:'EN 62676', specs:{ resolution:'8MP', fov:108, rangeM:12 }, usageRecommendation:'Commerce' },
  { id:'lib-d1', category:'door', ref:'CAME BX-800',        name:'Barrière auto',      brand:'CAME',         svgIcon:'door-barrier',priceFcfa:650000,  normRef:'NF EN 13241', specs:{ motorized:true },  usageRecommendation:'Parking' },
  { id:'lib-d2', category:'door', ref:'DORMA ES200',        name:'Coulissante auto',        brand:'DORMA',        svgIcon:'door-slide',  priceFcfa:1200000, normRef:'NF EN 16005', specs:{ width:'1.2m' },    usageRecommendation:'Entrées commerce' },
  { id:'lib-d3', category:'door', ref:'GEZE TS4000',        name:'Battante double',         brand:'GEZE',         svgIcon:'door-swing',  priceFcfa:480000,  normRef:'NF EN 1154',  specs:{ vantaux:2 },       usageRecommendation:'Restauration' },
  { id:'lib-d4', category:'door', ref:'ABLOY CL100',        name:'Blindée + badge',    brand:'ABLOY',        svgIcon:'door-secure', priceFcfa:1450000, normRef:'EN 1303',     specs:{ badge:true },      usageRecommendation:'Technique N4' },
  { id:'lib-d5', category:'door', ref:'SUPREMA BioEntry W2',name:'SAS biométrie',      brand:'SUPREMA',      svgIcon:'door-sas',    priceFcfa:2100000, normRef:'ISO 19794',   specs:{ biometric:true },  usageRecommendation:'Back-office N4' },
  { id:'lib-d6', category:'door', ref:'ASSA ABLOY PB1000',  name:'Anti-panique',            brand:'ASSA ABLOY',   svgIcon:'door-panic',  priceFcfa:380000,  normRef:'NF EN 1125',  specs:{ panic:true },      usageRecommendation:'Sorties secours' },
  { id:'lib-s1', category:'signage', ref:'TOTEM-3M',        name:'Totem 3m',                brand:'Sign. CI', svgIcon:'sign-totem', priceFcfa:1800000,  normRef:'NF X 08-003', specs:{ height:'3m' },  usageRecommendation:'Entrées' },
  { id:'lib-s2', category:'signage', ref:'TOTEM-5M',        name:'Totem 5m ext.',           brand:'Sign. CI', svgIcon:'sign-totem', priceFcfa:3200000,  normRef:'NF X 08-003', specs:{ height:'5m' },  usageRecommendation:'Parvis' },
  { id:'lib-s3', category:'signage', ref:'PANNEAU-DIR-A',   name:'Panneau dir. susp.',      brand:'Sign. CI', svgIcon:'sign-panel', priceFcfa:180000,   normRef:'ISO 7010',    specs:{ suspended:true },usageRecommendation:'Galeries' },
  { id:'lib-s4', category:'signage', ref:'BORNE-INTER',     name:'Borne interactive',       brand:'Sign. CI', svgIcon:'sign-kiosk', priceFcfa:4500000,  normRef:'EN 301 549',  specs:{ touch:true },    usageRecommendation:'Halls' },
  { id:'lib-m1', category:'mobilier_pmr', ref:'RAMPE-PMR',     name:'Rampe PMR alu',        brand:'Access. CI', svgIcon:'pmr-ramp', priceFcfa:450000,  normRef:'NF P 98-350', specs:{ slope:'5%' },  usageRecommendation:'Changements niveau' },
  { id:'lib-m2', category:'mobilier_pmr', ref:'MAIN-COURANTE', name:'Main courante inox',   brand:'Access. CI', svgIcon:'pmr-rail', priceFcfa:85000,   normRef:'NF P 98-350', specs:{ material:'inox' },usageRecommendation:'Escaliers, rampes' },
  { id:'lib-m3', category:'mobilier_pmr', ref:'BANC-INT-01',   name:'Banc intérieur',  brand:'Access. CI', svgIcon:'pmr-bench',priceFcfa:280000,  normRef:'NF P 98-350', specs:{ seats:3 },     usageRecommendation:'Zones repos' },
]

interface UseObjectLibraryResult {
  items: LibraryItem[]
  filteredItems: LibraryItem[]
  category: LibraryItem['category']
  setCategory: (cat: LibraryItem['category']) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  favorites: string[]
  toggleFavorite: (id: string) => void
  selectedItem: LibraryItem | null
  selectItem: (item: LibraryItem | null) => void
}

export function useObjectLibrary(): UseObjectLibraryResult {
  const [category, setCategory] = useState<LibraryItem['category']>('camera')
  const [searchQuery, setSearchQuery] = useState('')
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null)

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return CATALOG.filter(
      (it) =>
        it.category === category &&
        (!q ||
          it.name.toLowerCase().includes(q) ||
          it.ref.toLowerCase().includes(q) ||
          it.brand.toLowerCase().includes(q)),
    )
  }, [category, searchQuery])

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteSet((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  return {
    items: CATALOG,
    filteredItems,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    favorites: [...favoriteSet],
    toggleFavorite,
    selectedItem,
    selectItem: setSelectedItem,
  }
}
