// Vitest setup file
// @testing-library/jest-dom adds custom matchers like toBeInTheDocument().
// Le package est une dépendance optionnelle : on essaie de le charger mais on
// ignore silencieusement si absent (tests de logique pure n'en ont pas besoin).
//
// NOTE : on utilise un import dynamique avec catch pour éviter une erreur TS
// au build quand le package n'est pas installé.
async function tryLoadJestDom() {
  try {
    await import(/* @vite-ignore */ '@testing-library/jest-dom/vitest' as string)
  } catch {
    try {
      await import(/* @vite-ignore */ '@testing-library/jest-dom' as string)
    } catch {
      // not installed — skip silently
    }
  }
}
await tryLoadJestDom()
