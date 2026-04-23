// ═══ Story — CanvasTab ═══

import type { Meta, StoryObj } from '@storybook/react'
import { CanvasTab } from '../components/tabs/CanvasTab'
import { useDesignerStore, buildDefaultConfig } from '../store/designerStore'
import { useEffect } from 'react'

const meta: Meta<typeof CanvasTab> = {
  title: 'Wayfinder Designer/Tabs/Canvas',
  component: CanvasTab,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Preview live du template avec plan injecté.' } },
  },
  decorators: [
    (Story) => {
      useEffect(() => useDesignerStore.getState().setConfig(buildDefaultConfig()), [])
      return <div style={{ minHeight: '90vh' }}><Story /></div>
    },
  ],
}
export default meta

type Story = StoryObj<typeof CanvasTab>

export const Default: Story = {}

export const DarkPreview: Story = {
  decorators: [
    (Story) => {
      useEffect(() => useDesignerStore.getState().patchConfig({ previewMode: 'dark' }), [])
      return <Story />
    },
  ],
}
