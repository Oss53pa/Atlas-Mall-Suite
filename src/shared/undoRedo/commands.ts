// ═══ GENERIC COMMAND FACTORIES ═══

import type { Command } from './undoRedoManager'

export function createUpdateCommand<T>(
  getter: () => T, setter: (value: T) => void, newValue: T, description: string
): Command {
  const prev = structuredClone(getter())
  return { description, timestamp: Date.now(), execute: () => setter(newValue), undo: () => setter(prev) }
}

export function createAddCommand<T extends { id: string }>(
  addFn: (item: T) => void, removeFn: (id: string) => void, item: T, description: string
): Command {
  return { description, timestamp: Date.now(), execute: () => addFn(item), undo: () => removeFn(item.id) }
}

export function createRemoveCommand<T extends { id: string }>(
  addFn: (item: T) => void, removeFn: (id: string) => void, item: T, description: string
): Command {
  const snap = structuredClone(item)
  return { description, timestamp: Date.now(), execute: () => removeFn(item.id), undo: () => addFn(snap) }
}

export function createMoveCommand(
  getId: () => { x: number; y: number }, setPos: (x: number, y: number) => void,
  newX: number, newY: number, description: string
): Command {
  const prev = { ...getId() }
  return { description, timestamp: Date.now(), execute: () => setPos(newX, newY), undo: () => setPos(prev.x, prev.y) }
}
