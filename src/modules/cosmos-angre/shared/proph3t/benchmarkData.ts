import type { MallBenchmark } from './types'

// ═══ BENCHMARKS CENTRES COMMERCIAUX AFRICAINS ═══
// Donnees de reference pour la comparaison du Cosmos Angre

export const MALL_BENCHMARKS: MallBenchmark[] = [
  { name: 'Cosmos Angre',            city: 'Abidjan',      country: 'CI', surfaceM2: 20000, cameraDensityPer100m2: 0.0,  signageDensityPer100m2: 0.0, evacuationTimeSec: 0, securityScore: 0, parcoursScore: 0, classe: 'B' },
  { name: 'PlaYce Marcory',          city: 'Abidjan',      country: 'CI', surfaceM2: 25000, cameraDensityPer100m2: 0.8,  signageDensityPer100m2: 0.3, evacuationTimeSec: 165, securityScore: 72, parcoursScore: 65, classe: 'A' },
  { name: 'Cap Sud',                  city: 'Abidjan',      country: 'CI', surfaceM2: 18000, cameraDensityPer100m2: 0.6,  signageDensityPer100m2: 0.2, evacuationTimeSec: 140, securityScore: 68, parcoursScore: 60, classe: 'B' },
  { name: 'Abidjan Mall',            city: 'Abidjan',      country: 'CI', surfaceM2: 30000, cameraDensityPer100m2: 1.0,  signageDensityPer100m2: 0.4, evacuationTimeSec: 180, securityScore: 78, parcoursScore: 72, classe: 'A' },
  { name: 'PlaYce Palmeraie',        city: 'Abidjan',      country: 'CI', surfaceM2: 22000, cameraDensityPer100m2: 0.7,  signageDensityPer100m2: 0.3, evacuationTimeSec: 155, securityScore: 70, parcoursScore: 63, classe: 'A' },
  { name: 'Sea Plaza',               city: 'Dakar',        country: 'SN', surfaceM2: 20000, cameraDensityPer100m2: 0.9,  signageDensityPer100m2: 0.35, evacuationTimeSec: 150, securityScore: 75, parcoursScore: 68, classe: 'A' },
  { name: 'CCBM Mall',               city: 'Dakar',        country: 'SN', surfaceM2: 15000, cameraDensityPer100m2: 0.5,  signageDensityPer100m2: 0.2, evacuationTimeSec: 130, securityScore: 62, parcoursScore: 55, classe: 'B' },
  { name: 'Ikeja City Mall',         city: 'Lagos',        country: 'NG', surfaceM2: 35000, cameraDensityPer100m2: 1.2,  signageDensityPer100m2: 0.5, evacuationTimeSec: 200, securityScore: 82, parcoursScore: 75, classe: 'A' },
  { name: 'The Palms',               city: 'Lagos',        country: 'NG', surfaceM2: 28000, cameraDensityPer100m2: 1.1,  signageDensityPer100m2: 0.4, evacuationTimeSec: 185, securityScore: 80, parcoursScore: 73, classe: 'A' },
  { name: 'Jabi Lake Mall',          city: 'Abuja',        country: 'NG', surfaceM2: 32000, cameraDensityPer100m2: 1.0,  signageDensityPer100m2: 0.45, evacuationTimeSec: 190, securityScore: 77, parcoursScore: 70, classe: 'A' },
  { name: 'Garden City Mall',        city: 'Nairobi',      country: 'KE', surfaceM2: 33000, cameraDensityPer100m2: 1.3,  signageDensityPer100m2: 0.5, evacuationTimeSec: 170, securityScore: 85, parcoursScore: 78, classe: 'A' },
  { name: 'Two Rivers Mall',         city: 'Nairobi',      country: 'KE', surfaceM2: 62000, cameraDensityPer100m2: 1.4,  signageDensityPer100m2: 0.6, evacuationTimeSec: 240, securityScore: 88, parcoursScore: 82, classe: 'A' },
  { name: 'Westgate Mall',           city: 'Nairobi',      country: 'KE', surfaceM2: 28000, cameraDensityPer100m2: 1.5,  signageDensityPer100m2: 0.5, evacuationTimeSec: 160, securityScore: 90, parcoursScore: 80, classe: 'A' },
  { name: 'Morocco Mall',            city: 'Casablanca',   country: 'MA', surfaceM2: 70000, cameraDensityPer100m2: 1.6,  signageDensityPer100m2: 0.7, evacuationTimeSec: 280, securityScore: 92, parcoursScore: 88, classe: 'A' },
  { name: 'Anfa Place',              city: 'Casablanca',   country: 'MA', surfaceM2: 40000, cameraDensityPer100m2: 1.2,  signageDensityPer100m2: 0.5, evacuationTimeSec: 200, securityScore: 84, parcoursScore: 76, classe: 'A' },
  { name: 'Mall of Africa',          city: 'Johannesburg', country: 'ZA', surfaceM2: 131000, cameraDensityPer100m2: 1.8, signageDensityPer100m2: 0.8, evacuationTimeSec: 350, securityScore: 94, parcoursScore: 90, classe: 'A' },
  { name: 'Sandton City',            city: 'Johannesburg', country: 'ZA', surfaceM2: 144000, cameraDensityPer100m2: 1.7, signageDensityPer100m2: 0.75, evacuationTimeSec: 360, securityScore: 93, parcoursScore: 89, classe: 'A' },
  { name: 'V&A Waterfront',          city: 'Cape Town',    country: 'ZA', surfaceM2: 55000, cameraDensityPer100m2: 1.5,  signageDensityPer100m2: 0.6, evacuationTimeSec: 220, securityScore: 91, parcoursScore: 86, classe: 'A' },
  { name: 'Accra Mall',              city: 'Accra',        country: 'GH', surfaceM2: 18000, cameraDensityPer100m2: 0.7,  signageDensityPer100m2: 0.3, evacuationTimeSec: 140, securityScore: 66, parcoursScore: 58, classe: 'B' },
  { name: 'West Hills Mall',         city: 'Accra',        country: 'GH', surfaceM2: 27000, cameraDensityPer100m2: 0.9,  signageDensityPer100m2: 0.35, evacuationTimeSec: 170, securityScore: 74, parcoursScore: 67, classe: 'A' },
  { name: 'Achimota Retail Centre',  city: 'Accra',        country: 'GH', surfaceM2: 14000, cameraDensityPer100m2: 0.5,  signageDensityPer100m2: 0.2, evacuationTimeSec: 120, securityScore: 60, parcoursScore: 52, classe: 'C' },
]
