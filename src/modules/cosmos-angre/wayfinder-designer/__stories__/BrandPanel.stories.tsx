// ═══ Story — BrandTab ═══
// CDC §11 livrable : Storybook des composants Designer.

import type { Meta, StoryObj } from '@storybook/react'
import { BrandTab } from '../components/tabs/BrandTab'
import { useDesignerStore, buildDefaultConfig } from '../store/designerStore'
import { useEffect } from 'react'

const meta: Meta<typeof BrandTab> = {
  title: 'Wayfinder Designer/Tabs/Brand',
  component: BrandTab,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `Onglet Charte du Designer. Permet de configurer palette, typographie,
          mode sombre/clair, simulation daltonisme. Audit WCAG AA temps réel + auto-correction.`,
      },
    },
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        useDesignerStore.getState().setConfig(buildDefaultConfig())
      }, [])
      return <div style={{ minHeight: '90vh' }}><Story /></div>
    },
  ],
}
export default meta

type Story = StoryObj<typeof BrandTab>

export const Default: Story = {}

export const WithCustomPalette: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const c = buildDefaultConfig()
        c.brand.palette.primary = '#8b5cf6'
        c.brand.palette.accent = '#fbbf24'
        useDesignerStore.getState().setConfig(c)
      }, [])
      return <Story />
    },
  ],
}

export const WithFailedContrast: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const c = buildDefaultConfig()
        c.brand.palette.foreground = '#aaaaaa'  // contraste insuffisant
        c.brand.palette.background = '#ffffff'
        useDesignerStore.getState().setConfig(c)
      }, [])
      return <Story />
    },
  ],
  parameters: {
    docs: { description: { story: 'Démontre la détection auto-fix WCAG AA.' } },
  },
}

export const ColorBlindnessSimulation: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        useDesignerStore.getState().patchConfig({ colorBlindnessSim: 'protanopia' })
      }, [])
      return <Story />
    },
  ],
}
