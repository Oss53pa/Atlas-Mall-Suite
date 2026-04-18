// ═══ Storybook config — Atlas Mall Suite ═══
//
// Installation :
//   npx storybook@latest init --type react --builder vite
//   npm i -D @storybook/react-vite @storybook/addon-essentials @storybook/addon-a11y
//
// Lancement :
//   npm run storybook

import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: [
    '../src/modules/**/__stories__/**/*.stories.@(ts|tsx)',
    '../src/modules/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',     // tests accessibilité WCAG (CDC §10)
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: { autodocs: 'tag' },
  staticDirs: ['../public'],
}

export default config
