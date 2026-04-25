// ═══ PROPH3T A+B+D — Advisory layer ═══
//
// PROPH3T n'opère JAMAIS sur les coordonnées directement. Il :
//   • A — propose des corrections géométriques calculées par le moteur TS
//   • B — classifie les entités ambiguës (cf migration/MigrationHeuristics)
//   • D — audite le plan et liste les anomalies
//
// Le mode B vit dans le module migration (réutilisé pour l'éditeur).

export * from './proph3tAdvise'
export * from './proph3tAudit'
