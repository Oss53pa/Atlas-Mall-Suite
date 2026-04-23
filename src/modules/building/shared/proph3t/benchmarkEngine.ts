// ═══ PROPH3T — Benchmark Engine v2 ═══
// 52 malls dans 12 pays africains — comparaison statistique

import type { MallBenchmarkV2, BenchmarkReport, ProjectMetrics } from './types'

// ─── Base de donnees de 52 malls africains ───────────────────

export const BENCHMARK_DB: MallBenchmarkV2[] = [
  // COTE D'IVOIRE (6)
  { id: 'ci-001', name: 'Cosmos Yopougon', city: 'Abidjan', country: 'CI', glaM2: 28000, classType: 'A', cameraDensity: 1.4, securityScore: 72, exitCount: 6, occupancyRate: 92, avgRentFcfaM2: 45000, avgDwellTimeMin: 78, dailyVisitorBase: 8500, signagetDensity: 2.1, anchorTypes: ['supermarche', 'multicinema', 'restauration'], openYear: 2012 },
  { id: 'ci-002', name: 'PlaYce Marcory', city: 'Abidjan', country: 'CI', glaM2: 35000, classType: 'A', cameraDensity: 1.8, securityScore: 81, exitCount: 8, occupancyRate: 88, avgRentFcfaM2: 52000, avgDwellTimeMin: 95, dailyVisitorBase: 11000, signagetDensity: 2.8, anchorTypes: ['hypermarche', 'banques', 'mode', 'restauration'], openYear: 2015 },
  { id: 'ci-003', name: 'Cap Sud', city: 'Abidjan', country: 'CI', glaM2: 18000, classType: 'B', cameraDensity: 0.9, securityScore: 58, exitCount: 4, occupancyRate: 78, avgRentFcfaM2: 32000, avgDwellTimeMin: 62, dailyVisitorBase: 5200, signagetDensity: 1.4, anchorTypes: ['supermarche', 'services'], openYear: 2009 },
  { id: 'ci-004', name: 'Abidjan Mall', city: 'Abidjan', country: 'CI', glaM2: 30000, classType: 'A', cameraDensity: 1.6, securityScore: 78, exitCount: 7, occupancyRate: 86, avgRentFcfaM2: 48000, avgDwellTimeMin: 88, dailyVisitorBase: 9800, signagetDensity: 2.5, anchorTypes: ['hypermarche', 'cinema', 'mode'], openYear: 2017 },
  { id: 'ci-005', name: 'PlaYce Palmeraie', city: 'Abidjan', country: 'CI', glaM2: 22000, classType: 'A', cameraDensity: 1.3, securityScore: 70, exitCount: 5, occupancyRate: 82, avgRentFcfaM2: 40000, avgDwellTimeMin: 72, dailyVisitorBase: 7000, signagetDensity: 2.0, anchorTypes: ['supermarche', 'mode'], openYear: 2014 },
  { id: 'ci-006', name: 'Centre Riviera', city: 'Abidjan', country: 'CI', glaM2: 15000, classType: 'B', cameraDensity: 0.8, securityScore: 55, exitCount: 3, occupancyRate: 74, avgRentFcfaM2: 28000, avgDwellTimeMin: 55, dailyVisitorBase: 4200, signagetDensity: 1.2, anchorTypes: ['supermarche'], openYear: 2008 },

  // SENEGAL (3)
  { id: 'sn-001', name: 'Sea Plaza', city: 'Dakar', country: 'SN', glaM2: 32000, classType: 'A', cameraDensity: 1.6, securityScore: 75, exitCount: 7, occupancyRate: 85, avgRentFcfaM2: 38000, avgDwellTimeMin: 88, dailyVisitorBase: 9200, signagetDensity: 2.4, anchorTypes: ['hypermarche', 'cinema', 'mode'], openYear: 2013 },
  { id: 'sn-002', name: 'CCBM Mall', city: 'Dakar', country: 'SN', glaM2: 15000, classType: 'B', cameraDensity: 0.7, securityScore: 52, exitCount: 3, occupancyRate: 70, avgRentFcfaM2: 25000, avgDwellTimeMin: 50, dailyVisitorBase: 3800, signagetDensity: 1.1, anchorTypes: ['supermarche'], openYear: 2010 },
  { id: 'sn-003', name: 'Dakar City', city: 'Dakar', country: 'SN', glaM2: 20000, classType: 'B', cameraDensity: 1.0, securityScore: 62, exitCount: 4, occupancyRate: 76, avgRentFcfaM2: 30000, avgDwellTimeMin: 65, dailyVisitorBase: 5500, signagetDensity: 1.6, anchorTypes: ['supermarche', 'services'], openYear: 2016 },

  // NIGERIA (5)
  { id: 'ng-001', name: 'Ikeja City Mall', city: 'Lagos', country: 'NG', glaM2: 24000, classType: 'A', cameraDensity: 2.1, securityScore: 85, exitCount: 8, occupancyRate: 94, avgRentFcfaM2: 65000, avgDwellTimeMin: 102, dailyVisitorBase: 15000, signagetDensity: 3.2, anchorTypes: ['supermarche', 'cinema', 'mode', 'restauration'], openYear: 2011 },
  { id: 'ng-002', name: 'The Palms', city: 'Lagos', country: 'NG', glaM2: 28000, classType: 'A', cameraDensity: 1.9, securityScore: 82, exitCount: 7, occupancyRate: 91, avgRentFcfaM2: 60000, avgDwellTimeMin: 95, dailyVisitorBase: 13000, signagetDensity: 2.9, anchorTypes: ['supermarche', 'cinema', 'mode'], openYear: 2005 },
  { id: 'ng-003', name: 'Jabi Lake Mall', city: 'Abuja', country: 'NG', glaM2: 32000, classType: 'A', cameraDensity: 1.7, securityScore: 77, exitCount: 6, occupancyRate: 87, avgRentFcfaM2: 55000, avgDwellTimeMin: 90, dailyVisitorBase: 10000, signagetDensity: 2.6, anchorTypes: ['supermarche', 'mode', 'restauration'], openYear: 2017 },
  { id: 'ng-004', name: 'Ado Bayero Mall', city: 'Kano', country: 'NG', glaM2: 18000, classType: 'B', cameraDensity: 1.1, securityScore: 64, exitCount: 4, occupancyRate: 79, avgRentFcfaM2: 35000, avgDwellTimeMin: 68, dailyVisitorBase: 6000, signagetDensity: 1.8, anchorTypes: ['supermarche', 'services'], openYear: 2014 },
  { id: 'ng-005', name: 'Palms Ilorin', city: 'Ilorin', country: 'NG', glaM2: 12000, classType: 'C', cameraDensity: 0.6, securityScore: 48, exitCount: 3, occupancyRate: 68, avgRentFcfaM2: 22000, avgDwellTimeMin: 45, dailyVisitorBase: 3200, signagetDensity: 1.0, anchorTypes: ['supermarche'], openYear: 2018 },

  // KENYA (5)
  { id: 'ke-001', name: 'Garden City', city: 'Nairobi', country: 'KE', glaM2: 33000, classType: 'A', cameraDensity: 2.2, securityScore: 85, exitCount: 8, occupancyRate: 90, avgRentFcfaM2: 62000, avgDwellTimeMin: 98, dailyVisitorBase: 14000, signagetDensity: 3.0, anchorTypes: ['supermarche', 'cinema', 'mode'], openYear: 2015 },
  { id: 'ke-002', name: 'Two Rivers', city: 'Nairobi', country: 'KE', glaM2: 62000, classType: 'A', cameraDensity: 2.5, securityScore: 88, exitCount: 12, occupancyRate: 85, avgRentFcfaM2: 70000, avgDwellTimeMin: 115, dailyVisitorBase: 18000, signagetDensity: 3.5, anchorTypes: ['supermarche', 'cinema', 'mode', 'loisirs'], openYear: 2017 },
  { id: 'ke-003', name: 'Westgate', city: 'Nairobi', country: 'KE', glaM2: 28000, classType: 'A', cameraDensity: 2.8, securityScore: 91, exitCount: 10, occupancyRate: 89, avgRentFcfaM2: 72000, avgDwellTimeMin: 105, dailyVisitorBase: 16000, signagetDensity: 3.8, anchorTypes: ['supermarche', 'cinema', 'banques'], openYear: 2007 },
  { id: 'ke-004', name: 'Thika Road Mall', city: 'Nairobi', country: 'KE', glaM2: 20000, classType: 'B', cameraDensity: 1.3, securityScore: 68, exitCount: 5, occupancyRate: 80, avgRentFcfaM2: 42000, avgDwellTimeMin: 72, dailyVisitorBase: 7500, signagetDensity: 2.0, anchorTypes: ['supermarche', 'services'], openYear: 2013 },
  { id: 'ke-005', name: 'Village Market', city: 'Nairobi', country: 'KE', glaM2: 25000, classType: 'A', cameraDensity: 1.8, securityScore: 79, exitCount: 6, occupancyRate: 84, avgRentFcfaM2: 55000, avgDwellTimeMin: 90, dailyVisitorBase: 10000, signagetDensity: 2.6, anchorTypes: ['supermarche', 'mode', 'restauration'], openYear: 2004 },

  // MAROC (3)
  { id: 'ma-001', name: 'Morocco Mall', city: 'Casablanca', country: 'MA', glaM2: 180000, classType: 'A', cameraDensity: 3.2, securityScore: 94, exitCount: 18, occupancyRate: 96, avgRentFcfaM2: 95000, avgDwellTimeMin: 142, dailyVisitorBase: 45000, signagetDensity: 4.5, anchorTypes: ['aquarium', 'multicinema', 'mode', 'loisirs'], openYear: 2011 },
  { id: 'ma-002', name: 'Anfa Place', city: 'Casablanca', country: 'MA', glaM2: 40000, classType: 'A', cameraDensity: 2.0, securityScore: 84, exitCount: 8, occupancyRate: 88, avgRentFcfaM2: 72000, avgDwellTimeMin: 95, dailyVisitorBase: 12000, signagetDensity: 3.0, anchorTypes: ['cinema', 'mode', 'restauration'], openYear: 2014 },
  { id: 'ma-003', name: 'Marjane Mega', city: 'Rabat', country: 'MA', glaM2: 25000, classType: 'B', cameraDensity: 1.2, securityScore: 70, exitCount: 5, occupancyRate: 82, avgRentFcfaM2: 45000, avgDwellTimeMin: 75, dailyVisitorBase: 8000, signagetDensity: 2.2, anchorTypes: ['hypermarche', 'services'], openYear: 2010 },

  // AFRIQUE DU SUD (5)
  { id: 'za-001', name: 'Mall of Africa', city: 'Johannesburg', country: 'ZA', glaM2: 131000, classType: 'A', cameraDensity: 3.0, securityScore: 94, exitCount: 16, occupancyRate: 93, avgRentFcfaM2: 90000, avgDwellTimeMin: 130, dailyVisitorBase: 35000, signagetDensity: 4.2, anchorTypes: ['mode', 'cinema', 'restauration', 'loisirs'], openYear: 2016 },
  { id: 'za-002', name: 'Sandton City', city: 'Johannesburg', country: 'ZA', glaM2: 144000, classType: 'A', cameraDensity: 2.8, securityScore: 93, exitCount: 15, occupancyRate: 95, avgRentFcfaM2: 95000, avgDwellTimeMin: 125, dailyVisitorBase: 38000, signagetDensity: 4.0, anchorTypes: ['luxe', 'mode', 'cinema'], openYear: 1973 },
  { id: 'za-003', name: 'V&A Waterfront', city: 'Cape Town', country: 'ZA', glaM2: 55000, classType: 'A', cameraDensity: 2.5, securityScore: 91, exitCount: 10, occupancyRate: 92, avgRentFcfaM2: 85000, avgDwellTimeMin: 118, dailyVisitorBase: 25000, signagetDensity: 3.8, anchorTypes: ['mode', 'restauration', 'tourisme'], openYear: 1988 },
  { id: 'za-004', name: 'Gateway Theatre', city: 'Durban', country: 'ZA', glaM2: 89000, classType: 'A', cameraDensity: 2.3, securityScore: 87, exitCount: 12, occupancyRate: 88, avgRentFcfaM2: 70000, avgDwellTimeMin: 110, dailyVisitorBase: 22000, signagetDensity: 3.5, anchorTypes: ['cinema', 'mode', 'loisirs'], openYear: 2001 },
  { id: 'za-005', name: 'Canal Walk', city: 'Cape Town', country: 'ZA', glaM2: 141000, classType: 'A', cameraDensity: 2.6, securityScore: 90, exitCount: 14, occupancyRate: 90, avgRentFcfaM2: 78000, avgDwellTimeMin: 120, dailyVisitorBase: 30000, signagetDensity: 3.7, anchorTypes: ['mode', 'cinema', 'restauration'], openYear: 2000 },

  // GHANA (4)
  { id: 'gh-001', name: 'Accra Mall', city: 'Accra', country: 'GH', glaM2: 18000, classType: 'B', cameraDensity: 1.0, securityScore: 66, exitCount: 4, occupancyRate: 80, avgRentFcfaM2: 35000, avgDwellTimeMin: 65, dailyVisitorBase: 5500, signagetDensity: 1.5, anchorTypes: ['supermarche', 'mode'], openYear: 2008 },
  { id: 'gh-002', name: 'West Hills', city: 'Accra', country: 'GH', glaM2: 27000, classType: 'A', cameraDensity: 1.4, securityScore: 74, exitCount: 6, occupancyRate: 83, avgRentFcfaM2: 42000, avgDwellTimeMin: 78, dailyVisitorBase: 8000, signagetDensity: 2.2, anchorTypes: ['supermarche', 'cinema', 'mode'], openYear: 2014 },
  { id: 'gh-003', name: 'Achimota Retail', city: 'Accra', country: 'GH', glaM2: 14000, classType: 'C', cameraDensity: 0.5, securityScore: 48, exitCount: 3, occupancyRate: 65, avgRentFcfaM2: 20000, avgDwellTimeMin: 42, dailyVisitorBase: 3000, signagetDensity: 0.8, anchorTypes: ['supermarche'], openYear: 2012 },
  { id: 'gh-004', name: 'Junction Mall', city: 'Accra', country: 'GH', glaM2: 20000, classType: 'B', cameraDensity: 1.1, securityScore: 63, exitCount: 4, occupancyRate: 76, avgRentFcfaM2: 33000, avgDwellTimeMin: 60, dailyVisitorBase: 5800, signagetDensity: 1.7, anchorTypes: ['supermarche', 'services'], openYear: 2015 },

  // CAMEROUN (3)
  { id: 'cm-001', name: 'Douala Grand Mall', city: 'Douala', country: 'CM', glaM2: 40000, classType: 'A', cameraDensity: 1.5, securityScore: 73, exitCount: 7, occupancyRate: 84, avgRentFcfaM2: 42000, avgDwellTimeMin: 82, dailyVisitorBase: 9000, signagetDensity: 2.3, anchorTypes: ['hypermarche', 'cinema', 'mode'], openYear: 2020 },
  { id: 'cm-002', name: 'Yaounde Commercial', city: 'Yaounde', country: 'CM', glaM2: 16000, classType: 'B', cameraDensity: 0.8, securityScore: 56, exitCount: 3, occupancyRate: 72, avgRentFcfaM2: 28000, avgDwellTimeMin: 55, dailyVisitorBase: 4000, signagetDensity: 1.3, anchorTypes: ['supermarche'], openYear: 2016 },
  { id: 'cm-003', name: 'Centre Bonanjo', city: 'Douala', country: 'CM', glaM2: 12000, classType: 'C', cameraDensity: 0.5, securityScore: 42, exitCount: 2, occupancyRate: 60, avgRentFcfaM2: 18000, avgDwellTimeMin: 40, dailyVisitorBase: 2500, signagetDensity: 0.7, anchorTypes: ['services'], openYear: 2011 },

  // TANZANIE (2)
  { id: 'tz-001', name: 'Mlimani City', city: 'Dar es Salaam', country: 'TZ', glaM2: 25000, classType: 'A', cameraDensity: 1.5, securityScore: 72, exitCount: 6, occupancyRate: 82, avgRentFcfaM2: 38000, avgDwellTimeMin: 75, dailyVisitorBase: 8000, signagetDensity: 2.1, anchorTypes: ['supermarche', 'cinema'], openYear: 2006 },
  { id: 'tz-002', name: 'Aura Mall', city: 'Dar es Salaam', country: 'TZ', glaM2: 18000, classType: 'B', cameraDensity: 1.0, securityScore: 60, exitCount: 4, occupancyRate: 75, avgRentFcfaM2: 30000, avgDwellTimeMin: 58, dailyVisitorBase: 5000, signagetDensity: 1.5, anchorTypes: ['supermarche', 'services'], openYear: 2018 },

  // RWANDA (2)
  { id: 'rw-001', name: 'Kigali Heights', city: 'Kigali', country: 'RW', glaM2: 20000, classType: 'A', cameraDensity: 1.8, securityScore: 80, exitCount: 5, occupancyRate: 86, avgRentFcfaM2: 50000, avgDwellTimeMin: 80, dailyVisitorBase: 7000, signagetDensity: 2.5, anchorTypes: ['supermarche', 'mode', 'restauration'], openYear: 2016 },
  { id: 'rw-002', name: 'UTC Mall', city: 'Kigali', country: 'RW', glaM2: 12000, classType: 'B', cameraDensity: 1.0, securityScore: 62, exitCount: 3, occupancyRate: 78, avgRentFcfaM2: 32000, avgDwellTimeMin: 55, dailyVisitorBase: 4000, signagetDensity: 1.4, anchorTypes: ['supermarche'], openYear: 2014 },

  // ALGERIE (2)
  { id: 'dz-001', name: 'Bab Ezzouar', city: 'Alger', country: 'DZ', glaM2: 45000, classType: 'A', cameraDensity: 1.8, securityScore: 80, exitCount: 9, occupancyRate: 90, avgRentFcfaM2: 55000, avgDwellTimeMin: 95, dailyVisitorBase: 15000, signagetDensity: 2.8, anchorTypes: ['hypermarche', 'mode', 'cinema'], openYear: 2010 },
  { id: 'dz-002', name: 'Ardis Mall', city: 'Alger', country: 'DZ', glaM2: 22000, classType: 'B', cameraDensity: 1.1, securityScore: 65, exitCount: 5, occupancyRate: 80, avgRentFcfaM2: 38000, avgDwellTimeMin: 70, dailyVisitorBase: 7000, signagetDensity: 1.8, anchorTypes: ['supermarche', 'services'], openYear: 2015 },

  // TUNISIE (2)
  { id: 'tn-001', name: 'Tunisia Mall', city: 'Tunis', country: 'TN', glaM2: 35000, classType: 'A', cameraDensity: 1.7, securityScore: 78, exitCount: 7, occupancyRate: 87, avgRentFcfaM2: 50000, avgDwellTimeMin: 88, dailyVisitorBase: 11000, signagetDensity: 2.6, anchorTypes: ['hypermarche', 'mode', 'cinema'], openYear: 2015 },
  { id: 'tn-002', name: 'Carrefour La Marsa', city: 'Tunis', country: 'TN', glaM2: 18000, classType: 'B', cameraDensity: 1.0, securityScore: 63, exitCount: 4, occupancyRate: 78, avgRentFcfaM2: 35000, avgDwellTimeMin: 60, dailyVisitorBase: 6000, signagetDensity: 1.6, anchorTypes: ['hypermarche'], openYear: 2012 },

  // BURKINA FASO (2)
  { id: 'bf-001', name: 'GABI Mall', city: 'Ouagadougou', country: 'BF', glaM2: 15000, classType: 'B', cameraDensity: 0.8, securityScore: 55, exitCount: 3, occupancyRate: 72, avgRentFcfaM2: 25000, avgDwellTimeMin: 52, dailyVisitorBase: 3800, signagetDensity: 1.2, anchorTypes: ['supermarche', 'services'], openYear: 2017 },
  { id: 'bf-002', name: 'Ouaga 2000 Mall', city: 'Ouagadougou', country: 'BF', glaM2: 10000, classType: 'C', cameraDensity: 0.4, securityScore: 40, exitCount: 2, occupancyRate: 62, avgRentFcfaM2: 18000, avgDwellTimeMin: 38, dailyVisitorBase: 2200, signagetDensity: 0.6, anchorTypes: ['supermarche'], openYear: 2019 },

  // TOGO (2)
  { id: 'tg-001', name: 'Togo 2000', city: 'Lome', country: 'TG', glaM2: 14000, classType: 'B', cameraDensity: 0.7, securityScore: 52, exitCount: 3, occupancyRate: 70, avgRentFcfaM2: 22000, avgDwellTimeMin: 48, dailyVisitorBase: 3500, signagetDensity: 1.0, anchorTypes: ['supermarche'], openYear: 2015 },
  { id: 'tg-002', name: 'Assivito Mall', city: 'Lome', country: 'TG', glaM2: 10000, classType: 'C', cameraDensity: 0.4, securityScore: 42, exitCount: 2, occupancyRate: 58, avgRentFcfaM2: 16000, avgDwellTimeMin: 35, dailyVisitorBase: 1800, signagetDensity: 0.5, anchorTypes: ['services'], openYear: 2018 },

  // GUINEE (2)
  { id: 'gn-001', name: 'Kaloum Centre', city: 'Conakry', country: 'GN', glaM2: 12000, classType: 'C', cameraDensity: 0.5, securityScore: 45, exitCount: 2, occupancyRate: 64, avgRentFcfaM2: 20000, avgDwellTimeMin: 42, dailyVisitorBase: 2800, signagetDensity: 0.8, anchorTypes: ['supermarche'], openYear: 2016 },
  { id: 'gn-002', name: 'Conakry City', city: 'Conakry', country: 'GN', glaM2: 8000, classType: 'C', cameraDensity: 0.3, securityScore: 38, exitCount: 2, occupancyRate: 55, avgRentFcfaM2: 15000, avgDwellTimeMin: 30, dailyVisitorBase: 1500, signagetDensity: 0.4, anchorTypes: ['services'], openYear: 2019 },
]

// ─── Regions geographiques ───────────────────────────────────

const REGION_MAP: Record<string, string> = {
  CI: 'west_africa_fr', SN: 'west_africa_fr', ML: 'west_africa_fr',
  BF: 'west_africa_fr', TG: 'west_africa_fr', BJ: 'west_africa_fr',
  GN: 'west_africa_fr', NE: 'west_africa_fr',
  GH: 'west_africa_en', NG: 'west_africa_en', LR: 'west_africa_en', SL: 'west_africa_en',
  KE: 'east_africa', TZ: 'east_africa', UG: 'east_africa', RW: 'east_africa', ET: 'east_africa',
  MA: 'north_africa', TN: 'north_africa', DZ: 'north_africa',
  CM: 'central_africa', CD: 'central_africa', CG: 'central_africa', GA: 'central_africa',
  ZA: 'southern_africa', ZW: 'southern_africa', ZM: 'southern_africa',
}

const REGION_LABELS: Record<string, string> = {
  west_africa_fr: 'Afrique de l\'Ouest francophone',
  west_africa_en: 'Afrique de l\'Ouest anglophone',
  east_africa: 'Afrique de l\'Est',
  north_africa: 'Afrique du Nord',
  central_africa: 'Afrique centrale',
  southern_africa: 'Afrique australe',
}

export function getRegion(country: string): string {
  return REGION_MAP[country] ?? 'unknown'
}

// ─── Calculs statistiques ────────────────────────────────────

const METRIC_KEYS: Array<keyof MallBenchmarkV2> = [
  'cameraDensity', 'securityScore', 'occupancyRate',
  'avgDwellTimeMin', 'signagetDensity', 'exitCount',
]

const METRIC_LABELS: Record<string, string> = {
  cameraDensity: 'Densite camera',
  securityScore: 'Score securite',
  occupancyRate: 'Taux d\'occupation',
  avgDwellTimeMin: 'Dwell time moyen',
  signagetDensity: 'Densite signaletique',
  exitCount: 'Nombre de sorties',
}

function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key
}

export function computeStats(
  peers: MallBenchmarkV2[]
): Record<string, { min: number; max: number; avg: number; median: number }> {
  const stats: Record<string, { min: number; max: number; avg: number; median: number }> = {}

  for (const key of METRIC_KEYS) {
    const values = peers.map(p => p[key] as number).filter(v => v != null).sort((a, b) => a - b)
    if (values.length === 0) {
      stats[key as string] = { min: 0, max: 0, avg: 0, median: 0 }
      continue
    }
    const sum = values.reduce((s, v) => s + v, 0)
    const mid = Math.floor(values.length / 2)
    stats[key as string] = {
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      median: values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2,
    }
  }

  return stats
}

// ─── Comparaison de projet ───────────────────────────────────

export function benchmarkProject(
  metrics: ProjectMetrics,
  country: string,
  classType: 'A' | 'B' | 'C'
): BenchmarkReport {
  const region = getRegion(country)
  const peers = BENCHMARK_DB.filter(m =>
    m.classType === classType &&
    (m.country === country || getRegion(m.country) === region)
  )
  const allClass = BENCHMARK_DB.filter(m => m.classType === classType)

  const effectivePeers = peers.length >= 3 ? peers : allClass
  const groupLabel = peers.length >= 3
    ? `Malls ${classType} — ${REGION_LABELS[region] ?? region}`
    : `Malls africains Classe ${classType}`

  return computeBenchmark(metrics, effectivePeers, groupLabel)
}

function computeBenchmark(
  metrics: ProjectMetrics,
  peers: MallBenchmarkV2[],
  groupLabel: string
): BenchmarkReport {
  const stats = computeStats(peers)

  // Calculer les percentiles
  const percentiles: Record<string, number> = {}
  const metricsMap: Record<string, number> = {
    cameraDensity: metrics.cameraDensity,
    securityScore: metrics.securityScore,
    occupancyRate: metrics.occupancyRate,
    avgDwellTimeMin: metrics.avgDwellTimeMin,
    signagetDensity: metrics.signagetDensity,
    exitCount: metrics.exitCount,
  }

  for (const [key, value] of Object.entries(metricsMap)) {
    const peerValues = peers
      .map(p => (p as Record<string, unknown>)[key] as number)
      .filter(v => v != null)
      .sort((a, b) => a - b)
    const rank = peerValues.filter(v => v <= value).length
    percentiles[key] = peerValues.length > 0
      ? Math.round((rank / peerValues.length) * 100)
      : 50
  }

  // Points forts (top 25%) et faiblesses (bottom 40%)
  const strengths = Object.entries(percentiles)
    .filter(([, p]) => p >= 75)
    .map(([k]) => metricLabel(k))

  const weaknesses = Object.entries(percentiles)
    .filter(([, p]) => p < 40)
    .map(([k, p]) => ({ key: k, percentile: p }))

  // Narrative Proph3t
  const parts: string[] = [
    `Compare a ${peers.length} ${groupLabel}, The Mall se positionne :`,
  ]

  if (strengths.length > 0) {
    parts.push(`Points forts (top 25%) : ${strengths.join(', ')}.`)
  }

  if (weaknesses.length > 0) {
    parts.push(
      `Points de vigilance : ${weaknesses.map(w =>
        `${metricLabel(w.key)} (${w.percentile}e percentile)`
      ).join(', ')}.`
    )

    const primary = weaknesses[0]
    const median = stats[primary.key]?.median ?? 0
    const current = metricsMap[primary.key] ?? 0
    const gap = median - current
    if (gap > 0) {
      parts.push(
        `L'amelioration prioritaire est ${metricLabel(primary.key)} — `
        + `un ajustement de +${gap.toFixed(1)} permettrait d'atteindre la mediane du groupe.`
      )
    }
  }

  if (strengths.length === 0 && weaknesses.length === 0) {
    parts.push('Le projet se situe dans la moyenne sur toutes les metriques.')
  }

  const narrative = parts.filter(Boolean).join(' ')

  // Recommandations
  const recommendations: string[] = []
  for (const w of weaknesses) {
    const median = stats[w.key]?.median ?? 0
    const current = metricsMap[w.key] ?? 0
    recommendations.push(
      `${metricLabel(w.key)} : actuellement ${current.toFixed(1)}, `
      + `mediane du groupe ${median.toFixed(1)} — ecart de ${(median - current).toFixed(1)} a combler.`
    )
  }
  if (recommendations.length === 0) {
    recommendations.push('Aucune faiblesse critique detectee. Maintenir le niveau actuel.')
  }

  // Top performer
  const topPerformer = [...peers].sort((a, b) => b.securityScore - a.securityScore)[0]

  return {
    groupLabel,
    peerCount: peers.length,
    percentiles,
    stats,
    narrative,
    topPerformer,
    recommendations,
  }
}
