// ═══ PDF Font Registration — Inter + Plus Jakarta Sans ═══
// Charge les polices TTF et les enregistre dans jsPDF une seule fois

import type { jsPDF } from 'jspdf'

let fontsRegistered = false
let interBase64: string | null = null
let jakartaBase64: string | null = null

async function loadFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function registerPDFFonts(doc: jsPDF): Promise<void> {
  if (!fontsRegistered) {
    const [inter, jakarta] = await Promise.all([
      interBase64 ?? loadFontAsBase64('/fonts/Inter-Regular.ttf'),
      jakartaBase64 ?? loadFontAsBase64('/fonts/PlusJakartaSans.ttf'),
    ])
    interBase64 = inter
    jakartaBase64 = jakarta
    fontsRegistered = true
  }

  doc.addFileToVFS('Inter.ttf', interBase64!)
  doc.addFont('Inter.ttf', 'Inter', 'normal')

  doc.addFileToVFS('PlusJakartaSans.ttf', jakartaBase64!)
  doc.addFont('PlusJakartaSans.ttf', 'PlusJakartaSans', 'normal')
}

/** Applique Inter pour le corps de texte */
export function setBodyFont(doc: jsPDF, size: number = 8): void {
  doc.setFont('Inter', 'normal')
  doc.setFontSize(size)
}

/** Applique Plus Jakarta Sans pour les titres */
export function setHeadingFont(doc: jsPDF, size: number = 12): void {
  doc.setFont('PlusJakartaSans', 'normal')
  doc.setFontSize(size)
}
