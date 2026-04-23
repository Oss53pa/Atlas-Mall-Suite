// ═══ Story — TemplatesTab ═══

import type { Meta, StoryObj } from '@storybook/react'
import { TemplatesTab } from '../components/tabs/TemplatesTab'
import { useDesignerStore, buildDefaultConfig } from '../store/designerStore'
import { useEffect } from 'react'

const meta: Meta<typeof TemplatesTab> = {
  title: 'Wayfinder Designer/Tabs/Templates',
  component: TemplatesTab,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Galerie des 7 templates (4 digital + 3 print).' } },
  },
  decorators: [
    (Story) => {
      useEffect(() => useDesignerStore.getState().setConfig(buildDefaultConfig()), [])
      return <div style={{ minHeight: '90vh', background: '#0f172a' }}><Story /></div>
    },
  ],
}
export default meta

type Story = StoryObj<typeof TemplatesTab>

export const Default: Story = {}
