// ═══ PROJECT DATA — Cosmos Angré ═══

import type { PlanAction, SignaletiqueItem, TouchpointItem } from './types'

export const COSMOS_PLAN_ACTIONS: PlanAction[] = [
  { id: 'a01', code: 'A01', title: 'Validation plan sécuritaire', description: 'Finalisation et validation du plan de sécurité APSAD R82 complet', responsible: 'Pame', startDate: '2026-07-01', endDate: '2026-07-31', dependencies: [], status: 'not_started', progress: 0, deliverables: ['Plan APSAD R82 validé', 'DCE sécurité', 'Budget CAPEX approuvé'], budget_fcfa: 5_000_000 },
  { id: 'a02', code: 'A02', title: "Appel d'offres sécurité", description: "Lancement et dépouillement de l'appel d'offres prestataires", responsible: 'Lynda', startDate: '2026-07-15', endDate: '2026-08-15', dependencies: ['A01'], status: 'not_started', progress: 0, deliverables: ['DCE envoyé', 'Réponses analysées', 'Prestataire sélectionné'], budget_fcfa: 2_000_000 },
  { id: 'a03', code: 'A03', title: 'Développement app mobile Cosmos Club', description: 'App fidélité, wayfinding indoor, notifications géolocalisées', responsible: 'Tech Lead', startDate: '2026-07-01', endDate: '2026-09-15', dependencies: [], status: 'not_started', progress: 0, deliverables: ['App iOS/Android', 'Backend API', 'Tests utilisateurs'], budget_fcfa: 45_000_000 },
  { id: 'a04', code: 'A04', title: 'Commande équipements vidéosurveillance', description: 'Commande caméras, NVR, câblage et accessoires', responsible: 'Pame', startDate: '2026-08-01', endDate: '2026-08-31', dependencies: ['A02'], status: 'not_started', progress: 0, deliverables: ['Bon de commande signé', 'Planning livraisons'], budget_fcfa: 120_000_000 },
  { id: 'a05', code: 'A05', title: "Installation contrôle d'accès", description: 'Pose lecteurs badges, serrures électriques, contrôleurs', responsible: 'Prestataire sécurité', startDate: '2026-08-15', endDate: '2026-09-30', dependencies: ['A04'], status: 'not_started', progress: 0, deliverables: ['Lecteurs installés', 'Tests unitaires OK', 'Formation agents'], budget_fcfa: 35_000_000 },
  { id: 'a06', code: 'A06', title: 'Installation vidéosurveillance', description: 'Pose caméras, câblage réseau, configuration NVR', responsible: 'Prestataire sécurité', startDate: '2026-08-15', endDate: '2026-09-30', dependencies: ['A04'], status: 'not_started', progress: 0, deliverables: ['Caméras opérationnelles', 'Couverture > 95%', 'Enregistrement 30j'], budget_fcfa: 25_000_000 },
  { id: 'a07', code: 'A07', title: 'Fabrication signalétique', description: 'Production des 131 éléments de signalétique', responsible: 'Fernand', startDate: '2026-07-15', endDate: '2026-09-15', dependencies: [], status: 'not_started', progress: 0, deliverables: ['131 éléments fabriqués', 'Contrôle qualité', 'Stockage'], budget_fcfa: 85_000_000 },
  { id: 'a08', code: 'A08', title: 'Installation signalétique', description: 'Pose et mise en service de la signalétique', responsible: 'Fernand', startDate: '2026-09-15', endDate: '2026-10-10', dependencies: ['A07'], status: 'not_started', progress: 0, deliverables: ['Signalétique posée', 'Photos validation', 'Recette client'], budget_fcfa: 15_000_000 },
  { id: 'a09', code: 'A09', title: 'Recrutement et formation agents', description: 'Recrutement, formation SSIAP, formation équipements', responsible: 'Lynda', startDate: '2026-08-01', endDate: '2026-10-05', dependencies: [], status: 'not_started', progress: 0, deliverables: ['Agents recrutés', 'SSIAP validés', 'Formation terrain'], budget_fcfa: 20_000_000 },
  { id: 'a10', code: 'A10', title: 'Tests intégration système', description: 'Tests bout en bout : vidéo + accès + incendie + évacuation', responsible: 'Pame', startDate: '2026-10-01', endDate: '2026-10-10', dependencies: ['A05', 'A06', 'A09'], status: 'not_started', progress: 0, deliverables: ['PV de tests', 'Scénarios validés', 'Corrections appliquées'], budget_fcfa: 3_000_000 },
  { id: 'a11', code: 'A11', title: 'Exercice évacuation grandeur nature', description: 'Exercice évacuation complète avec chronométrage', responsible: 'Pame', startDate: '2026-10-10', endDate: '2026-10-12', dependencies: ['A10'], status: 'not_started', progress: 0, deliverables: ['Rapport évacuation', 'Temps < 3min', 'Conformité NF S 61-938'], budget_fcfa: 2_000_000 },
  { id: 'a12', code: 'A12', title: 'Recette générale et levée de réserves', description: 'Inspection finale, correction des anomalies', responsible: 'Pame', startDate: '2026-10-12', endDate: '2026-10-14', dependencies: ['A08', 'A11'], status: 'not_started', progress: 0, deliverables: ['PV recette', 'Réserves levées', 'Certificat conformité'], budget_fcfa: 1_000_000 },
  { id: 'a13', code: 'A13', title: 'Ouverture Cosmos Angré', description: "Jour d'ouverture officielle du centre commercial", responsible: 'Direction', startDate: '2026-10-16', endDate: '2026-10-16', dependencies: ['A12'], status: 'not_started', progress: 0, deliverables: ['Centre ouvert', 'Systèmes opérationnels', 'Équipes en place'] },
]

export function generateSignaletiqueItems(): SignaletiqueItem[] {
  const items: SignaletiqueItem[] = []
  const types = [
    { type: 'Totem directionnel 3m', count: 8, floors: ['RDC', 'R+1'] },
    { type: 'Totem directionnel 5m', count: 4, floors: ['RDC'] },
    { type: 'Panneau directionnel suspendu', count: 24, floors: ['B1', 'RDC', 'R+1'] },
    { type: 'Panneau directionnel mural', count: 18, floors: ['B1', 'RDC', 'R+1'] },
    { type: 'Bannière suspendue', count: 12, floors: ['RDC', 'R+1'] },
    { type: 'Marquage sol', count: 15, floors: ['B1', 'RDC', 'R+1'] },
    { type: 'Borne interactive', count: 6, floors: ['RDC', 'R+1'] },
    { type: 'Plaque porte', count: 20, floors: ['B1', 'RDC', 'R+1'] },
    { type: 'Numéro cellule', count: 8, floors: ['RDC', 'R+1'] },
    { type: 'Pictogramme PMR', count: 6, floors: ['B1', 'RDC', 'R+1'] },
    { type: 'Panneau toilettes', count: 4, floors: ['RDC', 'R+1'] },
    { type: 'Sortie secours LED', count: 3, floors: ['B1', 'RDC', 'R+1'] },
    { type: 'Bloc autonome BAES', count: 3, floors: ['B1', 'RDC', 'R+1'] },
  ]
  let idx = 1
  for (const t of types) {
    for (let i = 0; i < t.count; i++) {
      const floor = t.floors[i % t.floors.length]
      items.push({ id: `sig-${String(idx).padStart(3, '0')}`, code: `SIG-${String(idx).padStart(3, '0')}`, type: t.type, zone: `Zone ${floor}`, floor, status: 'to_order' })
      idx++
    }
  }
  return items
}

export const COSMOS_TOUCHPOINTS: TouchpointItem[] = [
  { id: 'tp-01', code: 'TP01', name: 'Totems directionnels entrées', type: 'physical', status: 'design', dependencies: ['A07'], responsible: 'Fernand', dueDate: '2026-09-30' },
  { id: 'tp-02', code: 'TP02', name: 'App mobile Cosmos Club', type: 'digital', status: 'design', dependencies: ['A03'], responsible: 'Tech Lead', dueDate: '2026-09-15' },
  { id: 'tp-03', code: 'TP03', name: 'Bornes interactives wayfinding', type: 'digital', status: 'design', dependencies: ['A03', 'A07'], responsible: 'Tech Lead', dueDate: '2026-10-01' },
  { id: 'tp-04', code: 'TP04', name: 'Accueil et conciergerie', type: 'human', status: 'design', dependencies: ['A09'], responsible: 'Lynda', dueDate: '2026-10-10' },
  { id: 'tp-05', code: 'TP05', name: 'Signalétique parking B1', type: 'physical', status: 'design', dependencies: ['A07'], responsible: 'Fernand', dueDate: '2026-09-30' },
  { id: 'tp-06', code: 'TP06', name: 'QR codes enseignes', type: 'digital', status: 'design', dependencies: ['A03'], responsible: 'Tech Lead', dueDate: '2026-09-15' },
  { id: 'tp-07', code: 'TP07', name: 'Écrans digitaux galerie', type: 'digital', status: 'design', dependencies: ['A07'], responsible: 'Fernand', dueDate: '2026-10-01' },
  { id: 'tp-08', code: 'TP08', name: 'Wi-Fi zones détente', type: 'digital', status: 'design', dependencies: [], responsible: 'Tech Lead', dueDate: '2026-09-30' },
  { id: 'tp-09', code: 'TP09', name: 'Marquage sol parcours', type: 'physical', status: 'design', dependencies: ['A07'], responsible: 'Fernand', dueDate: '2026-09-30' },
  { id: 'tp-10', code: 'TP10', name: 'Lounge VIP Cosmos Club', type: 'physical', status: 'design', dependencies: [], responsible: 'Lynda', dueDate: '2026-10-05' },
  { id: 'tp-11', code: 'TP11', name: 'Food court commande digitale', type: 'digital', status: 'design', dependencies: ['A03'], responsible: 'Tech Lead', dueDate: '2026-09-30' },
  { id: 'tp-12', code: 'TP12', name: 'Parking guidance system', type: 'digital', status: 'design', dependencies: [], responsible: 'Tech Lead', dueDate: '2026-09-30' },
  { id: 'tp-13', code: 'TP13', name: 'Notifications géolocalisées', type: 'digital', status: 'design', dependencies: ['A03'], responsible: 'Tech Lead', dueDate: '2026-09-30' },
  { id: 'tp-14', code: 'TP14', name: 'Instagram spots & TikTok corners', type: 'physical', status: 'design', dependencies: [], responsible: 'Fernand', dueDate: '2026-10-05' },
  { id: 'tp-15', code: 'TP15', name: 'Service client multicanal', type: 'human', status: 'design', dependencies: ['A09'], responsible: 'Lynda', dueDate: '2026-10-10' },
]
