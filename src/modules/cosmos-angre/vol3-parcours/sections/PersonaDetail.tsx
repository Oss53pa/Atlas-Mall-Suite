import { ArrowLeft } from 'lucide-react'

interface PersonaData {
  id: string
  initials: string
  name: string
  age: string
  subtitle: string
  color: string
  tags: string[]
  description: string
  infos: { label: string; value: string }[]
  motivations: string[]
  frustrations: string[]
  contacts: string[]
  parcoursType: string
}

const allPersonas: PersonaData[] = [
  {
    id: 'awa_moussa',
    initials: 'A+M',
    name: 'Awa & Moussa',
    age: '38 & 42 ans',
    subtitle: 'Famille CSP+ · 2 enfants',
    color: '#34d399',
    tags: ['Angré 7ème tranche', '2,5 M FCFA/mois', '2×/semaine', 'Cosmos Club Gold'],
    description: 'Couple cadres vivant à Cocody Angré 7ème tranche. Awa est DRH dans une banque panafricaine, Moussa ingénieur BTP chez SNDI. Deux enfants (Yasmine 6 ans, Ibrahim 10 ans). Shopping en famille le samedi, dîner au food court le vendredi soir. Utilisent Orange Money pour tout.',
    infos: [
      { label: 'Quartier', value: 'Angré 7ème tranche (5 min en voiture)' },
      { label: 'Revenu', value: '2,5 M FCFA/mois (ménage)' },
      { label: 'Fréquence', value: '2×/semaine (samedi famille + vendredi dîner)' },
      { label: 'Cosmos Club', value: 'Gold — parking prioritaire zone A + espace enfants gratuit + points ×1.5' },
    ],
    motivations: [
      'Espace enfants sécurisé et climatisé',
      'Food court avec options enfants',
      'Shopping mode enfant + adulte même lieu',
      'Parking sous-sol sécurisé et rapide',
      'Terrasse rooftop pour le dîner',
    ],
    frustrations: [
      'Malls existants sans espace enfants digne',
      'Parking Playce Marcory = chaos',
      'Restauration mall = fast-food bas de gamme',
      'Attente caisses > 15 min avec enfants agités',
    ],
    contacts: ['Instagram (Awa)', 'Facebook (Moussa)', 'WhatsApp groupe mamans Angré', 'Google Maps', 'Bouche-à-oreille école ISCAE'],
    parcoursType: 'Samedi type : parking sous-sol zone A (Gold), 1h shopping enfants RDC, 1h Awa boutiques R+1 pendant Moussa au café lounge, food court terrasse 1h → repartent à 18h.',
  },
  {
    id: 'serge',
    initials: 'S',
    name: 'Serge',
    age: '28 ans',
    subtitle: 'Jeune pro digital · Riviera',
    color: '#38bdf8',
    tags: ['Riviera 3', '1,2 M FCFA/mois', '3×/semaine', 'Cosmos Club Silver'],
    description: 'Jeune professionnel célibataire vivant à la Riviera 3. Développeur senior dans une fintech à Marcory. Early adopter, accro aux nouvelles technologies et aux réseaux sociaux. Fréquente le mall pour le coworking au café, le food court le midi et le shopping tech le weekend.',
    infos: [
      { label: 'Quartier', value: 'Riviera 3 (10 min en voiture)' },
      { label: 'Revenu', value: '1,2 M FCFA/mois' },
      { label: 'Fréquence', value: '3×/semaine (lunch + cowork + weekend)' },
      { label: 'Cosmos Club', value: 'Silver — WiFi premium, -10% food court, points standards' },
    ],
    motivations: [
      'WiFi ultra-rapide pour travailler',
      'Food court varié pour les pauses déjeuner',
      'Boutiques tech et gadgets',
      'Ambiance moderne et design',
      'Événements networking afterwork',
    ],
    frustrations: [
      'WiFi lent dans les malls existants',
      'Pas d\'espace coworking digne',
      'Offre tech limitée à Abidjan',
      'Pas d\'événements tech/startup',
    ],
    contacts: ['Twitter/X', 'LinkedIn', 'Instagram', 'Telegram groupes tech', 'YouTube tech'],
    parcoursType: 'Mardi type : arrive 11h30, café lounge RDC (laptop 1h), food court midi (poke bowl), retour bureau. Samedi : boutiques tech R+1, Apple Store, fnac.',
  },
  {
    id: 'pamela',
    initials: 'P',
    name: 'Pamela',
    age: '45 ans',
    subtitle: 'PA · High Net Worth',
    color: '#a77d4c',
    tags: ['Cocody Ambassades', '5+ M FCFA/mois', '1×/semaine', 'Cosmos Club Platinum'],
    description: 'Personal Assistant d\'un dirigeant d\'entreprise. Résidence à Cocody quartier des Ambassades. High Net Worth, habituée aux standards internationaux (Paris, Dubai, Johannesburg). Exigeante sur la qualité de service, fidèle si le service est premium.',
    infos: [
      { label: 'Quartier', value: 'Cocody Ambassades (8 min en voiture)' },
      { label: 'Revenu', value: '5+ M FCFA/mois (ménage)' },
      { label: 'Fréquence', value: '1×/semaine (samedi matin, shopping ciblé)' },
      { label: 'Cosmos Club', value: 'Platinum — voiturier, lounge VIP, conciergerie, personal shopper' },
    ],
    motivations: [
      'Service premium et personnalisé',
      'Marques internationales de luxe',
      'Restaurant gastronomique Le Cosmos',
      'Lounge VIP calme et exclusif',
      'Conciergerie pour tout gérer',
    ],
    frustrations: [
      'Service client médiocre dans les malls ivoiriens',
      'Absence de marques premium',
      'Parking mal géré, véhicule exposé au soleil',
      'Mélange avec la foule du weekend',
    ],
    contacts: ['WhatsApp (communication principale)', 'Instagram (mode/lifestyle)', 'Bouche-à-oreille réseau Ambassades', 'Email professionnel'],
    parcoursType: 'Samedi type : voiturier 9h30, lounge VIP café + presse, personal shopper accompagnée R+1 (2h), déjeuner Le Cosmos terrasse, conciergerie récupère achats au véhicule.',
  },
  {
    id: 'aminata',
    initials: 'A',
    name: 'Aminata',
    age: '22 ans',
    subtitle: 'Étudiante · Gen Z · Micro-influenceuse',
    color: '#ec4899',
    tags: ['Angré Star 12', '250k FCFA/mois', '2×/semaine', 'Cosmos Club Silver'],
    description: 'Étudiante en communication à l\'ISTC Polytechnique. Micro-influenceuse TikTok/Instagram (8 500 followers). Sensible au prix mais adore les expériences instagrammables. Vient avec ses amies le weekend pour le food court et les photos.',
    infos: [
      { label: 'Quartier', value: 'Angré Star 12 (15 min en gbaka)' },
      { label: 'Budget', value: '250k FCFA/mois (bourse + parents)' },
      { label: 'Fréquence', value: '2×/semaine (mercredi après-midi + samedi)' },
      { label: 'Cosmos Club', value: 'Silver — -15% food court étudiant, WiFi gratuit, points standards' },
    ],
    motivations: [
      'Spots instagrammables (atrium, terrasse, escalators)',
      'Menu étudiant -15% food court',
      'WiFi gratuit pour les stories',
      'Événements et animations',
      'Shopping beauté et mode accessible',
    ],
    frustrations: [
      'Prix élevés des boutiques premium',
      'Pas de réduction étudiants dans les malls',
      'Transport en commun mal desservi',
      'Sentiment d\'exclusion dans les espaces VIP',
    ],
    contacts: ['TikTok (création contenu)', 'Instagram (stories quotidiennes)', 'WhatsApp groupes ISTC', 'Snapchat'],
    parcoursType: 'Samedi type : arrive 14h en gbaka avec 3 amies, selfies atrium + escalators vitrés, window shopping R+1, food court menu étudiant, terrasse rooftop sunset stories → repart 18h.',
  },
]

interface Props {
  personaId: string
  onBack?: () => void
}

export default function PersonaDetail({ personaId, onBack }: Props) {
  const persona = allPersonas.find((p) => p.id === personaId)
  if (!persona) return <div className="p-8 text-white">Persona non trouvé.</div>

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors hover:opacity-80" style={{ color: '#4a5568' }}>
          <ArrowLeft size={16} /> Retour aux personas
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
          style={{ background: `${persona.color}20`, color: persona.color, border: `2px solid ${persona.color}40` }}
        >
          {persona.initials}
        </div>
        <div>
          <h1 className="text-[24px] font-light text-white">{persona.name} · {persona.age}</h1>
          <p className="text-[13px]" style={{ color: '#4a5568' }}>{persona.subtitle}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {persona.tags.map((tag) => (
              <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${persona.color}12`, color: persona.color, border: `1px solid ${persona.color}25` }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-[10px] p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <p className="text-[13px] leading-[1.8]" style={{ color: '#94a3b8' }}>{persona.description}</p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-4 gap-3">
        {persona.infos.map((info) => (
          <div key={info.label} className="rounded-[10px] p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <p className="text-[10px] font-semibold tracking-wider mb-1" style={{ color: '#4a5568' }}>{info.label.toUpperCase()}</p>
            <p className="text-[12px]" style={{ color: '#94a3b8' }}>{info.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Motivations */}
        <div className="rounded-[10px] p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <h3 className="text-sm font-semibold text-white mb-3">Motivations</h3>
          <ul className="space-y-2">
            {persona.motivations.map((m) => (
              <li key={m} className="text-[12px] flex items-start gap-2">
                <span style={{ color: '#22c55e' }}>✓</span>
                <span style={{ color: '#94a3b8' }}>{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Frustrations */}
        <div className="rounded-[10px] p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <h3 className="text-sm font-semibold text-white mb-3">Frustrations</h3>
          <ul className="space-y-2">
            {persona.frustrations.map((f) => (
              <li key={f} className="text-[12px] flex items-start gap-2">
                <span style={{ color: '#ef4444' }}>✗</span>
                <span style={{ color: '#94a3b8' }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Points de contact */}
      <div className="rounded-[10px] p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h3 className="text-sm font-semibold text-white mb-3">Points de contact privilégiés</h3>
        <div className="flex flex-wrap gap-2">
          {persona.contacts.map((c) => (
            <span key={c} className="text-[11px] px-3 py-1 rounded-full" style={{ background: '#0f1623', border: '1px solid #1e2a3a', color: '#94a3b8' }}>
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Parcours type */}
      <div className="rounded-[10px] p-5" style={{ background: `${persona.color}06`, border: `1px solid ${persona.color}20` }}>
        <h3 className="text-sm font-semibold text-white mb-2">Parcours type</h3>
        <p className="text-[13px] leading-[1.7] italic" style={{ color: '#94a3b8' }}>"{persona.parcoursType}"</p>
      </div>
    </div>
  )
}
