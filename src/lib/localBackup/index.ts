// ═══ LOCAL BACKUP — Public API ═══

export {
  saveSnapshot, loadSnapshot, listSnapshots, listHistory,
  deleteSnapshot, exportAllToFile, exportProjectToFile,
  importFromFile, downloadBlob, type BackupFile,
} from './backupService'

export {
  startBackupOrchestrator, stopBackupOrchestrator,
  setActiveProjectForBackup, forceFlush,
  hydrateFromLocalSnapshot, registerStore,
} from './backupOrchestrator'

export { registerAllStoresForBackup, applySnapshotToAllStores } from './registerAllStores'
export { backupDB, type ProjectSnapshot } from './db'
