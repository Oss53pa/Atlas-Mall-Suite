// ═══ Tests de non-régression Vol.4 (CDC §11) ═══
//
// "Vérification finale avant livraison : Lancer tous les tests existants de
// Vol.4 — zéro régression tolérée. Vérifier que astarEngine, positioningEngine,
// searchEngine et wayfinderBridge fonctionnent identiquement à avant."
//
// Ce fichier vérifie que les imports Vol.4 restent fonctionnels et que le
// module Designer peut être désactivé via feature flag.

import { describe, it, expect, beforeEach } from 'vitest'
import { isDesignerEnabled, WAYFINDER_DESIGNER_FEATURE_FLAG } from '../types'

describe('Vol.4 imports inchangés', () => {
  it('astarEngine est importable', async () => {
    const m = await import('../../vol4-wayfinder/engines/astarEngine')
    expect(m).toBeDefined()
  })

  it('positioningEngine est importable', async () => {
    const m = await import('../../vol4-wayfinder/engines/positioningEngine')
    expect(m).toBeDefined()
  })

  it('searchEngine est importable', async () => {
    const m = await import('../../vol4-wayfinder/engines/searchEngine')
    expect(m).toBeDefined()
  })

  it('wayfinderBridge est importable', async () => {
    const m = await import('../../vol4-wayfinder/engines/wayfinderBridge')
    expect(m).toBeDefined()
    expect(m.buildWayfinderGraph).toBeDefined()
  })
})

describe('Feature flag Designer (CDC §11)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(WAYFINDER_DESIGNER_FEATURE_FLAG)
    }
  })

  it('Designer activé par défaut', () => {
    expect(isDesignerEnabled()).toBe(true)
  })

  it('Désactivable via localStorage = "false"', () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(WAYFINDER_DESIGNER_FEATURE_FLAG, 'false')
    expect(isDesignerEnabled()).toBe(false)
  })

  it('Réactivation possible', () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(WAYFINDER_DESIGNER_FEATURE_FLAG, 'false')
    expect(isDesignerEnabled()).toBe(false)
    localStorage.setItem(WAYFINDER_DESIGNER_FEATURE_FLAG, 'true')
    expect(isDesignerEnabled()).toBe(true)
  })
})

describe('KioskAdapter ne modifie pas les moteurs Vol.4', () => {
  it('KioskAdapter n\'exporte qu\'un hook (pas de monkey-patch)', async () => {
    const m = await import('../runtime/KioskAdapter')
    expect(m.useKioskAdapter).toBeDefined()
    expect(typeof m.useKioskAdapter).toBe('function')
    // Vérifie qu'il n'exporte rien d'autre qui pourrait modifier Vol.4
    const exports = Object.keys(m).filter(k => k !== 'default')
    expect(exports).toEqual(['useKioskAdapter'])
  })
})
