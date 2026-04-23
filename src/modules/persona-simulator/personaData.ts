// ═══ PERSONA DATA — 4 The Mall Personas ═══

import type { Persona } from './types'

export const COSMOS_PERSONAS: Persona[] = [
  {
    id: 'persona-awa-moussa', name: 'Awa & Moussa', age: 35,
    description: 'Couple avec 2 enfants (6 et 9 ans). Visite familiale le week-end. Recherche divertissement, restauration familiale et shopping mode.',
    avatar: '👨‍👩‍👧‍👦', occupation: 'Cadres moyens', visitFrequency: '2x par mois', budget: 'medium',
    interests: ['Espace enfants', 'Mode famille', 'Food court', 'Cinéma'],
    preferredPOIs: ['parking', 'enseigne', 'restauration', 'enseigne'],
    walkingSpeedMPerS: 0.8, dwellTimeMultiplier: 1.3, pmrRequired: false,
    typicalRoute: ['Parking A B1', 'Espace enfants RDC', 'Galerie mode R+1', 'Café lounge R+1', 'Food court terrasse', 'Sortie'],
    painPoints: ['Manque de signalétique enfants', 'Files aux ascenseurs', 'Toilettes difficiles à trouver'],
    color: '#3B82F6',
  },
  {
    id: 'persona-serge', name: 'Serge', age: 28,
    description: 'Jeune professionnel tech. Visite rapide en semaine pendant la pause déjeuner. Efficace, connecté, veut du rapide.',
    avatar: '👨‍💻', occupation: 'Développeur', visitFrequency: '3x par semaine', budget: 'medium',
    interests: ['Tech', 'Fast food', 'Café', 'Gadgets'],
    preferredPOIs: ['enseigne', 'restauration', 'sortie'],
    walkingSpeedMPerS: 1.4, dwellTimeMultiplier: 0.6, pmrRequired: false,
    typicalRoute: ['Entrée principale RDC', 'Galerie tech RDC', 'Food court rapide RDC', 'Sortie'],
    painPoints: ['Trop de monde aux heures de pointe', 'Pas de commande digitale', 'Wi-Fi lent'],
    color: '#10B981',
  },
  {
    id: 'persona-pamela', name: 'Pamela', age: 45,
    description: "Directrice d'entreprise. Visite premium, exige un service haut de gamme. Membre VIP Cosmos Club.",
    avatar: '👩‍💼', occupation: 'CEO', visitFrequency: '1x par semaine', budget: 'premium',
    interests: ['Luxe', 'Conciergerie', 'Spa', 'Galerie premium'],
    preferredPOIs: ['parking', 'cosmos_club', 'enseigne', 'service_client'],
    walkingSpeedMPerS: 1.0, dwellTimeMultiplier: 1.5, pmrRequired: false,
    typicalRoute: ['Parking prioritaire B1', 'Lounge VIP R+1', 'Galerie premium R+1', 'Conciergerie RDC', 'Sortie VIP'],
    painPoints: ["Pas de file dédiée", "Manque d'intimité", 'Accès VIP pas assez visible'],
    color: '#F59E0B',
  },
  {
    id: 'persona-aminata', name: 'Aminata', age: 22,
    description: 'Étudiante influenceuse. Visite sociale, contenu Instagram/TikTok. Cherche les spots instagrammables.',
    avatar: '📱', occupation: 'Étudiante / Influenceuse', visitFrequency: '2x par semaine', budget: 'low',
    interests: ['Instagram spots', 'Mode tendance', 'Bubble tea', 'Photo zones'],
    preferredPOIs: ['enseigne', 'restauration', 'cosmos_club'],
    walkingSpeedMPerS: 1.1, dwellTimeMultiplier: 1.0, pmrRequired: false,
    typicalRoute: ['Entrée principale RDC', 'Instagram spots RDC', 'Galerie mode RDC', 'TikTok food court R+1', 'Photo terrasse', 'Sortie'],
    painPoints: ['Pas assez de spots photo', 'Éclairage pas flattering', 'Pas de Wi-Fi gratuit'],
    color: '#EC4899',
  },
]
