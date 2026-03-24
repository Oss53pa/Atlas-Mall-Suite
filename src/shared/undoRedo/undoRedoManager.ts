// ═══ UNDO/REDO — Command Pattern Manager ═══

export interface Command {
  execute(): void
  undo(): void
  description: string
  timestamp: number
}

export class UndoRedoManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private maxHistory = 50
  private listeners: Set<() => void> = new Set()
  private version = 0

  execute(command: Command): void {
    command.execute()
    this.undoStack.push(command)
    this.redoStack = []
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift()
    this.notify()
  }

  undo(): boolean {
    const cmd = this.undoStack.pop()
    if (cmd) { cmd.undo(); this.redoStack.push(cmd); this.notify(); return true }
    return false
  }

  redo(): boolean {
    const cmd = this.redoStack.pop()
    if (cmd) { cmd.execute(); this.undoStack.push(cmd); this.notify(); return true }
    return false
  }

  canUndo(): boolean { return this.undoStack.length > 0 }
  canRedo(): boolean { return this.redoStack.length > 0 }
  getUndoStack(): readonly Command[] { return this.undoStack }
  getRedoStack(): readonly Command[] { return this.redoStack }
  getRecentHistory(count = 10): Command[] { return this.undoStack.slice(-count) }
  getVersion(): number { return this.version }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.version++
    this.listeners.forEach(fn => fn())
  }
}

export const vol2UndoRedo = new UndoRedoManager()
export const vol3UndoRedo = new UndoRedoManager()
