// ═══ URL Safety — gardes pour URLs d'images / blobs ═══
//
// Évite les `ERR_FILE_NOT_FOUND` qui apparaissent quand un composant fait
// `<img src={url}>` avec une URL corrompue (UUID brut sans préfixe `blob:`,
// chaîne vide, chaîne avec espace, etc.).
//
// Préfixes valides :
//   • blob:         — blob URL d'une session (peut mourir au refresh)
//   • data:         — data URL (base64 inline, persistant)
//   • http(s)://    — URL absolue (CDN, origin)
//   • /             — chemin absolu sur l'origin
//   • ./ ou ../     — chemin relatif (rare)

/** Retourne true si la chaîne est une URL d'image valide (format reconnu). */
export function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0) return false
  // Filtre les UUIDs bruts (erreur fréquente de strip de préfixe `blob:`)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url)) return false
  return (
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/') ||
    url.startsWith('./') ||
    url.startsWith('../')
  )
}

/** Retourne `url` si valide, sinon `undefined`. */
export function safeImageUrl(url: unknown): string | undefined {
  return isValidImageUrl(url) ? url : undefined
}
