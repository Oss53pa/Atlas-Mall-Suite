import { useEffect, useRef } from 'react'

/**
 * Keyboard shortcut hook supporting modifier combos.
 *
 * Key format: modifiers joined by '+' then the key, all lowercase.
 * Examples: 'ctrl+z', 'ctrl+shift+s', 'escape', 'delete', 'ctrl+alt+p', 'meta+z'
 *
 * The 'meta' modifier maps to Cmd on macOS and Win key on Windows.
 * Use 'mod' as a cross-platform alias: 'mod+z' maps to Ctrl+Z on Win/Linux, Cmd+Z on macOS.
 */
export function useKeyboard(
  shortcuts: Record<string, () => void>,
  enabled: boolean = true
) {
  // Store shortcuts in a ref to avoid re-registering on every render
  // when the caller passes an inline object
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    if (!enabled) return

    const isMac = navigator.platform.toUpperCase().includes('MAC')

    const handler = (e: KeyboardEvent) => {
      // Ignore events from input elements unless shortcut explicitly uses them
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        // Allow Escape to always work
        if (e.key !== 'Escape') return
      }

      const parts: string[] = []
      if (e.ctrlKey) parts.push('ctrl')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey) parts.push('alt')
      if (e.metaKey) parts.push('meta')

      const key = e.key.toLowerCase()
      // Avoid duplicating modifier as key
      if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
        parts.push(key)
      }

      const combo = parts.join('+')

      // Check direct match
      if (shortcutsRef.current[combo]) {
        e.preventDefault()
        shortcutsRef.current[combo]()
        return
      }

      // Check 'mod' alias: on Mac, mod = meta; elsewhere mod = ctrl
      const modCombo = isMac
        ? combo.replace('meta', 'mod')
        : combo.replace('ctrl', 'mod')

      if (modCombo !== combo && shortcutsRef.current[modCombo]) {
        e.preventDefault()
        shortcutsRef.current[modCombo]()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}
