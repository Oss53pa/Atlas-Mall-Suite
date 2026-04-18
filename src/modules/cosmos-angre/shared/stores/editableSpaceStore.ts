// Persisted store for the Vol.3 SpaceEditorCanvas — keeps user-drawn /
// edited spaces across reloads, independent from auto-detected DetectedSpace.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EditableSpace } from '../components/SpaceEditorCanvas'
import type { FloorLevelKey } from '../proph3t/libraries/spaceTypeLibrary'

interface EditableSpaceState {
  spaces: EditableSpace[]
  activeFloor: FloorLevelKey
  setSpaces: (spaces: EditableSpace[]) => void
  setActiveFloor: (floor: FloorLevelKey) => void
  clear: () => void
}

export const useEditableSpaceStore = create<EditableSpaceState>()(
  persist(
    (set) => ({
      spaces: [],
      activeFloor: 'rdc',
      setSpaces: (spaces) => set({ spaces }),
      setActiveFloor: (activeFloor) => set({ activeFloor }),
      clear: () => set({ spaces: [] }),
    }),
    { name: 'cosmos.editable-spaces.v1' },
  ),
)
