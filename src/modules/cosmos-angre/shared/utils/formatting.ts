// ═══ Utilitaires de formatage — partages entre tous les volumes ═══

const FR = 'fr-FR'

/** Formate un nombre en format FCFA lisible (ex: 1 250 000) */
export function formatFcfa(n: number): string {
  return new Intl.NumberFormat(FR).format(Math.round(n))
}

/** Formate un nombre avec un suffixe FCFA (ex: "1 250 000 FCFA") */
export function formatFcfaWithUnit(n: number): string {
  return formatFcfa(n) + ' FCFA'
}

/** Formate un nombre avec decimales optionnelles */
export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat(FR, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

/** Formate une date ISO en format FR (ex: 30/03/2026) */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(FR).format(new Date(iso))
}

/** Formate une date ISO en format FR long (ex: 30 mars 2026) */
export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat(FR, {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(iso))
}

/** Formate un pourcentage (ex: "85%") */
export function formatPercent(n: number): string {
  return `${Math.round(n)}%`
}
