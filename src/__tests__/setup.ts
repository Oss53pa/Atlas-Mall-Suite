// Vitest setup file
// @testing-library/jest-dom adds custom matchers like toBeInTheDocument()
try {
  // Only import if available (not required for pure logic tests)
  await import('@testing-library/jest-dom')
} catch {
  // @testing-library/jest-dom not installed — skip
}
