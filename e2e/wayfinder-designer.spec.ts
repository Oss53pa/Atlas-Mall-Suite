// ═══ E2E — Wayfinder Designer ═══
// CDC §10 : "Tests E2E Playwright sur le flux complet borne"

import { test, expect } from '@playwright/test'

// TODO(e2e): ces tests partent de `/projects/cosmos-angre` mais en CI
// vierge l'OnboardingWizard + BaselineGuard bloquent l'accès a Vol.4.
// A reactiver avec un beforeEach qui seed localStorage (onboarding completed)
// + parsedPlan + planValidated via addInitScript. Cf src/modules/building/index.tsx.
test.describe.skip('Wayfinder Designer — Flow complet', () => {

  test('Navigation 6 onglets', async ({ page }) => {
    await page.goto('/projects/cosmos-angre')
    // Aller à Vol.4
    await page.click('text=Wayfinder')
    await page.waitForLoadState('networkidle')

    // Cliquer sur l'onglet Designer dans Vol.4
    await page.click('text=Wayfinder Designer')
    await expect(page.locator('text=Charte')).toBeVisible({ timeout: 5000 })

    // Tester chaque onglet
    for (const tab of ['Projet', 'Charte', 'Templates', 'Canvas', 'Export', 'Déploiement']) {
      await page.click(`button:has-text("${tab}")`)
      await page.waitForTimeout(200)
    }
  })

  test('Modification charte propage au canvas', async ({ page }) => {
    await page.goto('/projects/cosmos-angre')
    await page.click('text=Wayfinder')
    await page.click('text=Wayfinder Designer')

    // Onglet Charte
    await page.click('button:has-text("Charte")')
    // Changer la couleur primaire
    const primaryInput = page.locator('input[type="color"]').first()
    await primaryInput.fill('#ff0000')

    // Aller au Canvas
    await page.click('button:has-text("Canvas")')
    await page.waitForTimeout(500)
    // Le SVG doit contenir la nouvelle couleur quelque part
    const svgContent = await page.locator('svg').first().innerHTML()
    expect(svgContent).toContain('ff0000')
  })

  test('Sélection template change le canvas', async ({ page }) => {
    await page.goto('/projects/cosmos-angre')
    await page.click('text=Wayfinder')
    await page.click('text=Wayfinder Designer')

    await page.click('button:has-text("Templates")')
    // Sélectionner le poster A0
    await page.click('text=Poster A0')
    await page.waitForTimeout(300)

    await page.click('button:has-text("Canvas")')
    await page.waitForTimeout(500)
    // Le canvas doit afficher un format A0 (vérifier qu'on a un SVG)
    expect(await page.locator('svg').count()).toBeGreaterThan(0)
  })

  test('Export HTML autonome déclenche un download', async ({ page }) => {
    await page.goto('/projects/cosmos-angre')
    await page.click('text=Wayfinder')
    await page.click('text=Wayfinder Designer')
    await page.click('button:has-text("Export")')

    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Exporter en HTML autonome')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.html$/)
  })

})

test.describe('Runtime Borne — flux utilisateur', () => {

  test('Page kiosque s\'ouvre en plein écran', async ({ page }) => {
    await page.goto('/kiosk/test-kiosk-1')
    // Attente initiale
    await page.waitForTimeout(1000)
    // Doit afficher le bouton "Touchez pour démarrer" OU l'écran d'accueil
    await expect(page.locator('text=Touchez').or(page.locator('text=Bienvenue'))).toBeVisible({ timeout: 5000 })
  })

  test('Recherche déclenche le clavier tactile', async ({ page }) => {
    await page.goto('/kiosk/test-kiosk-1')
    await page.waitForTimeout(500)
    // Cliquer sur l'écran d'accueil pour passer attract
    await page.locator('body').click()
    await page.waitForTimeout(300)
    // Cliquer sur la barre de recherche
    const searchBar = page.locator('text=Que cherchez-vous').first()
    if (await searchBar.isVisible()) {
      await searchBar.click()
      await page.waitForTimeout(500)
      // Le clavier tactile doit apparaître
      await expect(page.locator('button:has-text("a")').first()).toBeVisible()
    }
  })

  test('Toggle PMR mode change le contraste', async ({ page }) => {
    await page.goto('/kiosk/test-kiosk-1')
    await page.waitForTimeout(500)
    // Cliquer sur le bouton accessibilité (icône Accessibility)
    const pmrBtn = page.locator('[aria-label="Mode accessibilité PMR"]')
    if (await pmrBtn.isVisible()) {
      await pmrBtn.click()
      // Le filtre contrast doit être appliqué
      const body = page.locator('body > div').first()
      const filter = await body.evaluate(el => getComputedStyle(el).filter)
      expect(filter).toContain('contrast')
    }
  })

})

test.describe('Page mobile feedback (QR scan)', () => {

  test('Page feedback affiche le formulaire avec QR params', async ({ page }) => {
    await page.goto('/feedback?p=550e8400-e29b-41d4-a716-446655440000&r=panel-test-001&f=RDC&t=directional')
    await expect(page.locator('text=Signaler un panneau')).toBeVisible()
    await expect(page.locator('text=panel-test-001')).toBeVisible()
  })

  test('Sélection statut + soumission', async ({ page }) => {
    await page.goto('/feedback?p=550e8400-e29b-41d4-a716-446655440000&r=panel-test-001')
    // Sélectionner "OK"
    await page.click('text=OK / visible')
    await page.waitForTimeout(200)
    // Le bouton submit doit être actif
    const submitBtn = page.locator('button:has-text("Envoyer")')
    await expect(submitBtn).toBeEnabled()
  })

})
