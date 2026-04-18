// ═══ Storybook preview ═══

import type { Preview } from '@storybook/react'
import '../src/index.css'   // Tailwind global

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0f172a' },
        { name: 'light', value: '#ffffff' },
        { name: 'mall-cosmos', value: '#0ea5e9' },
      ],
    },
    a11y: {
      // Conformité WCAG 2.1 AA (CDC §10)
      element: '#storybook-root',
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'aria-label', enabled: true },
        ],
      },
      options: {},
      manual: false,
    },
  },
  globalTypes: {
    locale: {
      description: 'Langue active',
      defaultValue: 'fr-FR',
      toolbar: {
        title: 'Langue',
        icon: 'globe',
        items: ['fr-FR', 'fr-CI', 'en-US', 'ar-MA', 'dyu-CI'],
      },
    },
    theme: {
      description: 'Mode sombre/clair',
      defaultValue: 'light',
      toolbar: {
        title: 'Thème',
        icon: 'paintbrush',
        items: ['light', 'dark'],
      },
    },
  },
}

export default preview
