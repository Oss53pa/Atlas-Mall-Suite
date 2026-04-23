// ═══ BENCHMARK DATA — African Malls Reference ═══

export interface BenchmarkMall {
  name: string
  city: string
  country: string
  surface_m2: number
  nb_cameras: number
  coverage_pct: number
  nps: number
  dwell_time_min: number
  ca_m2_fcfa: number
  has_loyalty_program: boolean
  digital_touchpoints: number
  signage_density: number
  security_score: number
  year: number
}

export const BENCHMARK_MALLS: BenchmarkMall[] = [
  { name: 'Playce Mall Marcory', city: 'Abidjan', country: "Côte d'Ivoire", surface_m2: 28000, nb_cameras: 85, coverage_pct: 78, nps: 32, dwell_time_min: 68, ca_m2_fcfa: 145000, has_loyalty_program: false, digital_touchpoints: 3, signage_density: 2.1, security_score: 62, year: 2024 },
  { name: 'Cap Sud', city: 'Abidjan', country: "Côte d'Ivoire", surface_m2: 18000, nb_cameras: 52, coverage_pct: 71, nps: 28, dwell_time_min: 55, ca_m2_fcfa: 132000, has_loyalty_program: false, digital_touchpoints: 1, signage_density: 1.8, security_score: 55, year: 2023 },
  { name: 'The Mall (Cible)', city: 'Abidjan', country: "Côte d'Ivoire", surface_m2: 35000, nb_cameras: 120, coverage_pct: 96, nps: 55, dwell_time_min: 95, ca_m2_fcfa: 200000, has_loyalty_program: true, digital_touchpoints: 15, signage_density: 3.7, security_score: 92, year: 2026 },
  { name: 'Two Rivers Mall', city: 'Nairobi', country: 'Kenya', surface_m2: 65000, nb_cameras: 240, coverage_pct: 94, nps: 51, dwell_time_min: 95, ca_m2_fcfa: 280000, has_loyalty_program: true, digital_touchpoints: 12, signage_density: 3.2, security_score: 88, year: 2024 },
  { name: 'Westgate Mall', city: 'Nairobi', country: 'Kenya', surface_m2: 25000, nb_cameras: 120, coverage_pct: 89, nps: 44, dwell_time_min: 82, ca_m2_fcfa: 210000, has_loyalty_program: true, digital_touchpoints: 8, signage_density: 2.8, security_score: 85, year: 2024 },
  { name: 'Palms Shopping Mall', city: 'Lagos', country: 'Nigeria', surface_m2: 22000, nb_cameras: 90, coverage_pct: 82, nps: 38, dwell_time_min: 75, ca_m2_fcfa: 195000, has_loyalty_program: true, digital_touchpoints: 6, signage_density: 2.5, security_score: 72, year: 2024 },
  { name: 'Ikeja City Mall', city: 'Lagos', country: 'Nigeria', surface_m2: 30000, nb_cameras: 110, coverage_pct: 85, nps: 40, dwell_time_min: 78, ca_m2_fcfa: 175000, has_loyalty_program: false, digital_touchpoints: 5, signage_density: 2.3, security_score: 70, year: 2023 },
  { name: 'Mall of Africa', city: 'Johannesburg', country: 'Afrique du Sud', surface_m2: 130000, nb_cameras: 450, coverage_pct: 97, nps: 58, dwell_time_min: 110, ca_m2_fcfa: 320000, has_loyalty_program: true, digital_touchpoints: 25, signage_density: 4.2, security_score: 95, year: 2024 },
  { name: 'Sandton City', city: 'Johannesburg', country: 'Afrique du Sud', surface_m2: 85000, nb_cameras: 320, coverage_pct: 95, nps: 52, dwell_time_min: 100, ca_m2_fcfa: 350000, has_loyalty_program: true, digital_touchpoints: 20, signage_density: 3.8, security_score: 93, year: 2024 },
  { name: 'Morocco Mall', city: 'Casablanca', country: 'Maroc', surface_m2: 200000, nb_cameras: 600, coverage_pct: 96, nps: 56, dwell_time_min: 120, ca_m2_fcfa: 290000, has_loyalty_program: true, digital_touchpoints: 30, signage_density: 4.5, security_score: 94, year: 2024 },
]

export const INDUSTRY_STANDARDS = {
  apsad_r82_coverage_min: 95,
  nf_s61938_evacuation_max_sec: 180,
  nps_excellent: 50,
  nps_good: 35,
  dwell_time_excellent_min: 90,
  dwell_time_good_min: 60,
  ca_m2_excellent_fcfa: 180000,
  security_score_excellent: 90,
  digital_touchpoints_excellent: 10,
}
