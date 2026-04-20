// ═══ SPACE DETAIL MODAL ═══
//
// Modal complet d'identification/paramétrage d'un espace.
// Les onglets s'adaptent au type sélectionné (boutique, parking, sanitaires,
// espace vert, technique, etc.) pour ne montrer que les champs pertinents.
//
// Tous les attributs détaillés sont stockés dans `spaceStates[id].notes` sous
// forme d'un bloc ```atlas { ... }``` pour rétrocompatibilité totale
// (les outils existants continuent à lire `notes` comme du texte).
//
// Ces attributs alimentent :
//   - Vol.1 Commercial : loyer, CA, enseigne, anchor, secteur, vitrine
//   - Vol.2 Sécurité : ERP cat., capacité, issues, risque, désenfumage
//   - Vol.3 Parcours : affluence, durée visite, profil, services
//   - Vol.4 Wayfinder : label court, icône, mots-clés, horaires, contact

import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, MapPin, Ruler, Tag, ShieldAlert, FileText,
  CheckCircle2, AlertCircle, Building2, Save, Accessibility,
  Compass, Clock, Phone, Navigation, Store, Car, Droplets,
  Wrench, Truck, Flower2, Users,
} from 'lucide-react'
import type { DetectedSpace, SpaceState, SpaceStatus } from '../planReader/planEngineTypes'
import { usePlanEngineStore } from '../stores/planEngineStore'
import {
  SPACE_TYPE_META, FLOOR_LEVEL_META,
  type SpaceTypeKey, type FloorLevelKey,
} from '../proph3t/libraries/spaceTypeLibrary'

// ═══ Attributs détaillés — alimentent les 4 volumes ═══
interface SpaceDetailAttrs {
  // ── Identité & géométrie ──
  numero?: string
  typeKey?: SpaceTypeKey
  floorLevel?: FloorLevelKey
  hauteurSousPlafondM?: number
  usagePrincipal?: 'retail' | 'fnb' | 'service' | 'office' | 'leisure'
    | 'storage' | 'technical' | 'sanitary' | 'circulation'
    | 'exterior' | 'parking' | 'green' | 'other'
  validated?: boolean

  // ── Commercial (Vol.1) ──
  secteurCommercial?: 'mode' | 'alimentaire' | 'tech-multimedia' | 'beaute-sante'
    | 'restauration' | 'loisirs' | 'services' | 'culture' | 'jeunesse-enfants'
    | 'mobilier-deco' | 'sport' | 'autre'
  anchor?: boolean
  premium?: boolean
  loyerFixeFcfaM2Mois?: number    // loyer minimum garanti
  loyerVariablePctCA?: number      // % sur chiffre d'affaires
  caPrevM2An?: number              // CA prévisionnel FCFA/m²/an
  enseigneCible?: string
  marqueGroupe?: string
  surfaceUtileM2?: number          // différent de bounding box
  lineaireVitrineM?: number
  dateOuverture?: string           // YYYY-MM-DD
  finBail?: string                 // YYYY-MM-DD

  // ── Parking (Vol.2 + Vol.3) ──
  parkingPlacesTotal?: number
  parkingPlacesPmr?: number
  parkingPlacesMoto?: number
  parkingPlacesVelo?: number
  parkingPlacesVe?: number         // bornes VE
  parkingTarifHoraireFcfa?: number
  parkingHauteurMaxM?: number

  // ── Sanitaires ──
  sanitairesCabinesH?: number
  sanitairesCabinesF?: number
  sanitairesCabinesPmr?: number
  sanitairesUrinoirsH?: number
  sanitairesDouches?: number
  sanitairesVestiaires?: boolean

  // ── Livraison / quai ──
  livraisonQuais?: number
  livraisonAccesPL?: boolean       // poids lourds
  livraisonHoraires?: string

  // ── Technique ──
  techniqueType?: 'cta' | 'tgbt' | 'plomberie' | 'datacenter'
    | 'chaufferie' | 'groupe-electrogene' | 'poubelles' | 'autre'
  techniqueAccesControle?: boolean

  // ── Extérieur / espace vert ──
  espaceVertType?: 'pelouse' | 'massifs' | 'arbres' | 'jardinieres'
    | 'terrasse' | 'patio' | 'pergola' | 'mixte'
  espaceVertSurfaceM2?: number
  espaceVertArrosage?: boolean
  espaceVertTerrasse?: boolean     // terrasse bars/restos
  espaceVertCouvert?: boolean      // abrité pluie

  // ── Restauration (sous-type commercial) ──
  restaurationCapaciteCouverts?: number
  restaurationTicketMoyenFcfa?: number
  restaurationTypeCuisine?: string // italienne, africaine, fast-food…
  restaurationTerrasse?: boolean

  // ── Sécurité ERP (Vol.2) ──
  erpCategory?: 1 | 2 | 3 | 4 | 5
  erpType?: string                 // M (magasins), N (restauration), L (audition)…
  capaciteMax?: number
  issuesCount?: number             // nombre d'issues secours
  issuesLargeurCumuleeM?: number
  classeRisque?: 'A' | 'B' | 'C'
  installationElec?: string        // IT/TN…
  extincteurs?: number
  sprinklers?: boolean
  ria?: boolean                    // robinets incendie armés
  detectionFumee?: boolean
  detectionChaleur?: boolean
  desenfumage?: 'naturel' | 'mecanique' | 'mixte' | 'non-requis'
  camerasRequises?: number
  controleAcces?: boolean

  // ── Accessibilité PMR ──
  pmrAccessible?: boolean
  pmrCheminement?: boolean         // chemin accessible depuis entrée
  pmrSanitaireProche?: boolean
  pmrLargeurPorteCm?: number
  pmrSignaletiqueBraille?: boolean
  pmrBoucleMagnetique?: boolean

  // ── Parcours client (Vol.3) ──
  affluenceJourCible?: number      // personnes/jour
  dureeVisiteMinutesMoy?: number
  profilDominant?: 'famille' | 'jeune-actif' | 'business' | 'touriste'
    | 'senior' | 'etudiant' | 'mixte'
  heuresPointe?: string            // "12-14h, 18-20h"
  servicesDisponibles?: string[]   // wifi, prises, poussettes, consigne, wc...

  // ── Wayfinder (Vol.4) ──
  wayfinderLabel?: string          // affichage court borne
  wayfinderCategory?: 'shopping' | 'food' | 'services' | 'exit'
    | 'info' | 'restroom' | 'transport' | 'entertainment'
  wayfinderIcon?: string
  wayfinderKeywords?: string       // "zara, mode, vêtements" (CSV)
  wayfinderPriorite?: 'anchor' | 'standard' | 'hidden'

  // ── Horaires & contact ──
  horairesOuverture?: string       // "10h-21h" ou JSON complexe
  telephone?: string
  email?: string
  siteUrl?: string
}

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4',
  '#ec4899', '#f97316', '#14b8a6', '#84cc16', '#64748b', '#a855f7',
]

// Détermine quelles sections/onglets afficher selon le type
function relevantTabsFor(typeKey?: SpaceTypeKey): Set<TabId> {
  const base = new Set<TabId>(['identite', 'geometrie', 'securite', 'accessibilite', 'wayfinder', 'notes'])
  if (!typeKey) { base.add('commercial'); return base }

  if (/^local_commerce|restauration|loisirs|services|grande_surface|kiosque/.test(typeKey)) {
    base.add('commercial')
    base.add('horaires')
    base.add('parcours')
  }
  if (/^parking/.test(typeKey)) base.add('parking')
  if (typeKey === 'sanitaires') base.add('sanitaires')
  if (typeKey === 'zone_livraison') base.add('livraison')
  if (typeKey === 'zone_technique' || typeKey === 'local_poubelles') base.add('technique')
  if (/^exterieur|^promenade/.test(typeKey)) {
    base.add('exterieur')
    base.add('parcours')
  }
  if (typeKey === 'point_information' || typeKey === 'borne_wayfinder'
      || typeKey === 'hall_distribution') {
    base.add('parcours')
  }
  return base
}

type TabId =
  | 'identite' | 'geometrie' | 'commercial' | 'parking' | 'sanitaires'
  | 'livraison' | 'technique' | 'exterieur' | 'securite' | 'accessibilite'
  | 'parcours' | 'wayfinder' | 'horaires' | 'notes'

const TAB_META: Record<TabId, { label: string; icon: React.ComponentType<any> }> = {
  identite:      { label: 'Identité',       icon: Tag },
  geometrie:     { label: 'Géométrie',      icon: Ruler },
  commercial:    { label: 'Commercial',     icon: Store },
  parking:       { label: 'Parking',        icon: Car },
  sanitaires:    { label: 'Sanitaires',     icon: Droplets },
  livraison:     { label: 'Livraison',      icon: Truck },
  technique:     { label: 'Technique',      icon: Wrench },
  exterieur:     { label: 'Extérieur',      icon: Flower2 },
  securite:      { label: 'Sécurité ERP',   icon: ShieldAlert },
  accessibilite: { label: 'PMR',            icon: Accessibility },
  parcours:      { label: 'Parcours',       icon: Users },
  wayfinder:     { label: 'Wayfinder',      icon: Compass },
  horaires:      { label: 'Horaires',       icon: Clock },
  notes:         { label: 'Notes',          icon: FileText },
}

function extractAttrs(notes: string): { attrs: SpaceDetailAttrs; freeNote: string } {
  const match = notes.match(/\n?```atlas\n([\s\S]*?)\n```$/)
  if (!match) return { attrs: {}, freeNote: notes }
  try {
    return { attrs: JSON.parse(match[1]), freeNote: notes.slice(0, match.index ?? 0).trim() }
  } catch {
    return { attrs: {}, freeNote: notes }
  }
}

function serializeNotes(freeNote: string, attrs: SpaceDetailAttrs): string {
  const attrsBlock = Object.keys(attrs).length > 0
    ? `\n\`\`\`atlas\n${JSON.stringify(attrs, null, 2)}\n\`\`\``
    : ''
  return (freeNote.trim() + attrsBlock).trim()
}

interface Props {
  space: DetectedSpace
  onClose: () => void
  onValidated?: (spaceId: string) => void
}

export function SpaceDetailModal({ space, onClose, onValidated }: Props) {
  const spaceStates = usePlanEngineStore(s => s.spaceStates)
  const setSpaceState = usePlanEngineStore(s => s.setSpaceState)

  const state: SpaceState = spaceStates[space.id] ?? {
    color: null,
    label: space.label,
    notes: '',
    status: 'vacant' as SpaceStatus,
    objects: [],
  }

  const { attrs: initialAttrs, freeNote: initialNote } = useMemo(
    () => extractAttrs(state.notes ?? ''),
    [state.notes],
  )

  const [label, setLabel] = useState(state.label || space.label)
  const [color, setColor] = useState(state.color)
  const [status, setStatus] = useState<SpaceStatus>(state.status)
  const [attrs, setAttrs] = useState<SpaceDetailAttrs>(initialAttrs)
  const [freeNote, setFreeNote] = useState(initialNote)
  const [activeTab, setActiveTab] = useState<TabId>('identite')

  const relevantTabs = useMemo(() => relevantTabsFor(attrs.typeKey), [attrs.typeKey])
  const visibleTabs = (Object.keys(TAB_META) as TabId[]).filter(t => relevantTabs.has(t))

  // Si l'onglet actif devient non-pertinent, retomber sur identité
  React.useEffect(() => {
    if (!relevantTabs.has(activeTab)) setActiveTab('identite')
  }, [relevantTabs, activeTab])

  const perimeterM = useMemo(() => {
    if (!space.polygon || space.polygon.length < 2) return 0
    let p = 0
    for (let i = 0; i < space.polygon.length; i++) {
      const a = space.polygon[i]
      const b = space.polygon[(i + 1) % space.polygon.length]
      p += Math.hypot(a[0] - b[0], a[1] - b[1])
    }
    return p
  }, [space.polygon])

  const typeMeta = attrs.typeKey ? SPACE_TYPE_META[attrs.typeKey] : null

  const handleSave = (andValidate = false) => {
    const nextAttrs = andValidate ? { ...attrs, validated: true } : attrs
    setSpaceState(space.id, {
      label,
      color,
      status,
      notes: serializeNotes(freeNote, nextAttrs),
    })
    if (andValidate) {
      setAttrs(nextAttrs)
      onValidated?.(space.id)
    }
  }

  const handleSaveAndClose = () => { handleSave(false); onClose() }
  const handleValidate = () => { handleSave(true); onClose() }

  const updateAttr = <K extends keyof SpaceDetailAttrs>(key: K, value: SpaceDetailAttrs[K]) => {
    setAttrs(a => ({ ...a, [key]: value }))
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[960px] max-w-[95vw] h-[90vh] bg-slate-900 rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-950/40 to-purple-950/40 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${color ?? '#6366f1'}25`, color: color ?? '#a5b4fc' }}
            >
              {typeMeta?.icon ?? '📐'}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-white truncate m-0">
                {label || 'Espace sans nom'}
                {attrs.numero && <span className="text-indigo-300 ml-2">· {attrs.numero}</span>}
              </h2>
              <p className="text-[10px] text-slate-400 m-0 truncate">
                {space.id.slice(0, 8)} · {typeMeta?.label ?? space.type} · {space.areaSqm.toFixed(1)} m²
                {attrs.validated && <span className="ml-2 text-emerald-400">✓ Validé</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Sidebar onglets */}
          <aside className="w-48 flex-shrink-0 border-r border-white/10 bg-slate-950/60 overflow-y-auto py-2">
            {visibleTabs.map(t => {
              const meta = TAB_META[t]
              const Icon = meta.icon
              const active = activeTab === t
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] transition ${
                    active
                      ? 'bg-indigo-600/20 text-indigo-200 border-l-2 border-indigo-500'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  <Icon size={12} />
                  {meta.label}
                </button>
              )
            })}
          </aside>

          {/* Contenu onglet */}
          <div className="flex-1 overflow-y-auto p-5 text-slate-300">
            {activeTab === 'identite' && (
              <TabIdentite
                label={label} setLabel={setLabel}
                color={color} setColor={setColor}
                status={status} setStatus={setStatus}
                attrs={attrs} updateAttr={updateAttr}
                space={space}
              />
            )}
            {activeTab === 'geometrie' && (
              <TabGeometrie attrs={attrs} updateAttr={updateAttr} space={space} perimeterM={perimeterM} />
            )}
            {activeTab === 'commercial' && (
              <TabCommercial attrs={attrs} updateAttr={updateAttr} space={space} />
            )}
            {activeTab === 'parking' && (
              <TabParking attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'sanitaires' && (
              <TabSanitaires attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'livraison' && (
              <TabLivraison attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'technique' && (
              <TabTechnique attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'exterieur' && (
              <TabExterieur attrs={attrs} updateAttr={updateAttr} space={space} />
            )}
            {activeTab === 'securite' && (
              <TabSecurite attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'accessibilite' && (
              <TabAccessibilite attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'parcours' && (
              <TabParcours attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'wayfinder' && (
              <TabWayfinder attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'horaires' && (
              <TabHoraires attrs={attrs} updateAttr={updateAttr} />
            )}
            {activeTab === 'notes' && (
              <TabNotes freeNote={freeNote} setFreeNote={setFreeNote} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-slate-900/60 flex-shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            {attrs.validated ? (
              <><CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-emerald-300">Espace validé</span></>
            ) : (
              <><AlertCircle size={14} className="text-amber-400" />
                <span className="text-amber-300">Non validé — cliquez « Enregistrer & valider » pour intégrer à la base</span></>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-3 py-1.5 rounded-md text-[11px] text-slate-400 hover:text-white hover:bg-white/5">
              Annuler
            </button>
            <button onClick={handleSaveAndClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-slate-700 hover:bg-slate-600 text-white">
              <Save size={12} /> Enregistrer
            </button>
            {onValidated && (
              <button onClick={handleValidate}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90">
                <CheckCircle2 size={13} /> Enregistrer & valider
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ══════════════════════════════════════════════════════
// ═══ Tabs ═══
// ══════════════════════════════════════════════════════

type UpdateFn = <K extends keyof SpaceDetailAttrs>(k: K, v: SpaceDetailAttrs[K]) => void

function TabIdentite({ label, setLabel, color, setColor, status, setStatus, attrs, updateAttr, space }: {
  label: string; setLabel: (v: string) => void
  color: string | null; setColor: (v: string | null) => void
  status: SpaceStatus; setStatus: (v: SpaceStatus) => void
  attrs: SpaceDetailAttrs; updateAttr: UpdateFn
  space: DetectedSpace
}) {
  const typeMeta = attrs.typeKey ? SPACE_TYPE_META[attrs.typeKey] : null
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Nom / intitulé *" span={2}>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Boutique Orange, Zara, Parking VIP…"
            className={inputCls} />
        </Field>
        <Field label="Numéro / code">
          <input value={attrs.numero ?? ''} onChange={(e) => updateAttr('numero', e.target.value)}
            placeholder="Ex: 101, A-42, PK-B1-003" className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type d'espace *">
          <select value={attrs.typeKey ?? 'a_definir'}
            onChange={(e) => updateAttr('typeKey', e.target.value as SpaceTypeKey)}
            className={inputCls}>
            {(Object.keys(SPACE_TYPE_META) as SpaceTypeKey[]).map(k => (
              <option key={k} value={k}>
                {SPACE_TYPE_META[k].icon} {SPACE_TYPE_META[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Niveau / étage">
          <select value={attrs.floorLevel ?? 'rdc'}
            onChange={(e) => updateAttr('floorLevel', e.target.value as FloorLevelKey)}
            className={inputCls}>
            {(Object.keys(FLOOR_LEVEL_META) as FloorLevelKey[]).map(k => (
              <option key={k} value={k}>{FLOOR_LEVEL_META[k].label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Usage principal">
        <select value={attrs.usagePrincipal ?? ''}
          onChange={(e) => updateAttr('usagePrincipal', (e.target.value || undefined) as SpaceDetailAttrs['usagePrincipal'])}
          className={inputCls}>
          <option value="">— détecté depuis le type —</option>
          <option value="retail">Commerce (retail)</option>
          <option value="fnb">Restauration (food &amp; beverage)</option>
          <option value="service">Service (banque, laverie, coiffeur…)</option>
          <option value="office">Bureau / administratif</option>
          <option value="leisure">Loisirs / divertissement</option>
          <option value="storage">Stockage / réserve</option>
          <option value="technical">Local technique</option>
          <option value="sanitary">Sanitaire</option>
          <option value="circulation">Circulation</option>
          <option value="exterior">Extérieur</option>
          <option value="parking">Parking</option>
          <option value="green">Espace vert</option>
          <option value="other">Autre</option>
        </select>
      </Field>

      {typeMeta && (
        <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-[11px] text-slate-400">
          <strong className="text-slate-300">{typeMeta.label}</strong> — {typeMeta.description}
          {typeMeta.expectedSqm && (
            <div className="text-[10px] mt-1">
              Surface typique : {typeMeta.expectedSqm.min}–{typeMeta.expectedSqm.max} m²
              {(space.areaSqm < typeMeta.expectedSqm.min || space.areaSqm > typeMeta.expectedSqm.max) && (
                <span className="ml-2 text-amber-400">⚠ atypique</span>
              )}
            </div>
          )}
        </div>
      )}

      <Field label="Couleur d'affichage">
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition hover:scale-110"
              style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }} />
          ))}
          <input type="color" value={color ?? '#3b82f6'}
            onChange={(e) => setColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer bg-transparent" />
          {color && (
            <button onClick={() => setColor(null)} className="text-[10px] text-slate-500 hover:text-slate-300">
              Réinitialiser
            </button>
          )}
        </div>
      </Field>

      <Field label="Statut opérationnel">
        <select value={status} onChange={(e) => setStatus(e.target.value as SpaceStatus)}
          className={inputCls}>
          <option value="vacant">Vacant / disponible</option>
          <option value="occupied">Occupé</option>
          <option value="reserved">Réservé / option</option>
          <option value="works">En travaux</option>
        </select>
      </Field>
    </div>
  )
}

function TabGeometrie({ attrs, updateAttr, space, perimeterM }: {
  attrs: SpaceDetailAttrs; updateAttr: UpdateFn; space: DetectedSpace; perimeterM: number
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Ruler} label="Surface calculée" value={`${space.areaSqm.toFixed(2)} m²`} />
        <Stat icon={Ruler} label="Périmètre estimé" value={`${perimeterM.toFixed(2)} m`} />
        <Stat icon={Building2} label="Bounding box"
              value={`${space.bounds.width.toFixed(1)} × ${space.bounds.height.toFixed(1)} m`} />
        <Stat icon={MapPin} label="Centre"
              value={`(${(space.bounds.minX + space.bounds.width / 2).toFixed(1)}, ${(space.bounds.minY + space.bounds.height / 2).toFixed(1)}) m`} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Surface utile corrigée (m²)">
          <NumberInput value={attrs.surfaceUtileM2} onChange={(v) => updateAttr('surfaceUtileM2', v)}
            placeholder={space.areaSqm.toFixed(0)} step={0.1} />
          <Hint>Différence possible entre surface polygone et surface louable/utilisable</Hint>
        </Field>
        <Field label="Hauteur sous plafond (m)">
          <NumberInput value={attrs.hauteurSousPlafondM} onChange={(v) => updateAttr('hauteurSousPlafondM', v)}
            placeholder="Ex: 3.5" step={0.1} />
        </Field>
      </div>

      <div className="rounded-lg border border-white/10 bg-slate-800/30 p-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Polygone source</div>
        <div className="text-[11px] text-slate-400">
          {space.polygon?.length ?? 0} sommets · calque « <code className="text-blue-300">{space.layer ?? '–'}</code> »
        </div>
        {space.polygon && space.polygon.length > 0 && (
          <details className="mt-2">
            <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">
              Voir coordonnées ({space.polygon.length} points)
            </summary>
            <pre className="text-[9px] text-slate-400 bg-slate-950 rounded p-2 mt-1 max-h-32 overflow-auto m-0">
{space.polygon.map(([x, y]) => `(${x.toFixed(2)}, ${y.toFixed(2)})`).join('\n')}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

function TabCommercial({ attrs, updateAttr, space }: {
  attrs: SpaceDetailAttrs; updateAttr: UpdateFn; space: DetectedSpace
}) {
  const loyerMensuel = attrs.loyerFixeFcfaM2Mois
    ? attrs.loyerFixeFcfaM2Mois * (attrs.surfaceUtileM2 ?? space.areaSqm)
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Enseigne pressentie / actuelle">
          <input value={attrs.enseigneCible ?? ''}
            onChange={(e) => updateAttr('enseigneCible', e.target.value)}
            placeholder="Ex: Zara, Orange, KFC…"
            className={inputCls} />
        </Field>
        <Field label="Marque / groupe propriétaire">
          <input value={attrs.marqueGroupe ?? ''}
            onChange={(e) => updateAttr('marqueGroupe', e.target.value)}
            placeholder="Ex: Inditex, Orange CI…"
            className={inputCls} />
        </Field>
      </div>

      <Field label="Secteur commercial">
        <select value={attrs.secteurCommercial ?? ''}
          onChange={(e) => updateAttr('secteurCommercial', (e.target.value || undefined) as SpaceDetailAttrs['secteurCommercial'])}
          className={inputCls}>
          <option value="">— non renseigné —</option>
          <option value="mode">👗 Mode / habillement</option>
          <option value="alimentaire">🥖 Alimentaire</option>
          <option value="tech-multimedia">💻 Tech / multimédia</option>
          <option value="beaute-sante">💄 Beauté / santé</option>
          <option value="restauration">🍽 Restauration</option>
          <option value="loisirs">🎮 Loisirs</option>
          <option value="services">🛠 Services</option>
          <option value="culture">📚 Culture</option>
          <option value="jeunesse-enfants">🧸 Jeunesse / enfants</option>
          <option value="mobilier-deco">🛋 Mobilier / déco</option>
          <option value="sport">⚽ Sport</option>
          <option value="autre">Autre</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <CheckboxField label="Anchor (locomotive commerciale)"
          checked={attrs.anchor ?? false} onChange={(v) => updateAttr('anchor', v)} />
        <CheckboxField label="Segment premium"
          checked={attrs.premium ?? false} onChange={(v) => updateAttr('premium', v)} />
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Loyer & CA</div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Loyer fixe (FCFA/m²/mois)">
            <NumberInput value={attrs.loyerFixeFcfaM2Mois}
              onChange={(v) => updateAttr('loyerFixeFcfaM2Mois', v)}
              placeholder="Ex: 25000" step={500} />
          </Field>
          <Field label="Loyer variable (% CA)">
            <NumberInput value={attrs.loyerVariablePctCA}
              onChange={(v) => updateAttr('loyerVariablePctCA', v)}
              placeholder="Ex: 8" step={0.5} />
          </Field>
          <Field label="CA prévisionnel (FCFA/m²/an)">
            <NumberInput value={attrs.caPrevM2An}
              onChange={(v) => updateAttr('caPrevM2An', v)}
              placeholder="Ex: 2500000" step={100000} />
          </Field>
        </div>
        {loyerMensuel && (
          <div className="mt-2 text-[11px] text-slate-400">
            Loyer mensuel fixe estimé : <strong className="text-emerald-400">
              {loyerMensuel.toLocaleString('fr-FR')} FCFA
            </strong>
            {attrs.caPrevM2An && attrs.loyerVariablePctCA && (
              <span className="ml-3">
                + variable : ~<strong className="text-emerald-400">
                  {((attrs.caPrevM2An * (attrs.surfaceUtileM2 ?? space.areaSqm) * attrs.loyerVariablePctCA / 100) / 12).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA/mois
                </strong>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Façade & vitrine</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Linéaire vitrine (m)">
            <NumberInput value={attrs.lineaireVitrineM}
              onChange={(v) => updateAttr('lineaireVitrineM', v)}
              placeholder="Ex: 12" step={0.5} />
          </Field>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Dates</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date d'ouverture prévue">
            <input type="date" value={attrs.dateOuverture ?? ''}
              onChange={(e) => updateAttr('dateOuverture', e.target.value || undefined)}
              className={inputCls} />
          </Field>
          <Field label="Fin de bail">
            <input type="date" value={attrs.finBail ?? ''}
              onChange={(e) => updateAttr('finBail', e.target.value || undefined)}
              className={inputCls} />
          </Field>
        </div>
      </div>

      {attrs.secteurCommercial === 'restauration' && (
        <div className="border-t border-white/10 pt-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1">
            🍽 Spécifique restauration
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacité (couverts)">
              <NumberInput value={attrs.restaurationCapaciteCouverts}
                onChange={(v) => updateAttr('restaurationCapaciteCouverts', v)}
                placeholder="Ex: 60" step={1} />
            </Field>
            <Field label="Ticket moyen (FCFA)">
              <NumberInput value={attrs.restaurationTicketMoyenFcfa}
                onChange={(v) => updateAttr('restaurationTicketMoyenFcfa', v)}
                placeholder="Ex: 8500" step={500} />
            </Field>
            <Field label="Type de cuisine" span={2}>
              <input value={attrs.restaurationTypeCuisine ?? ''}
                onChange={(e) => updateAttr('restaurationTypeCuisine', e.target.value)}
                placeholder="Ex: italienne, burger, africaine, libanais…"
                className={inputCls} />
            </Field>
            <CheckboxField label="Terrasse extérieure"
              checked={attrs.restaurationTerrasse ?? false}
              onChange={(v) => updateAttr('restaurationTerrasse', v)} />
          </div>
        </div>
      )}
    </div>
  )
}

function TabParking({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  const total = (attrs.parkingPlacesTotal ?? 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Places totales">
          <NumberInput value={attrs.parkingPlacesTotal}
            onChange={(v) => updateAttr('parkingPlacesTotal', v)}
            placeholder="Ex: 120" step={1} />
        </Field>
        <Field label="Places PMR (handicapés)">
          <NumberInput value={attrs.parkingPlacesPmr}
            onChange={(v) => updateAttr('parkingPlacesPmr', v)}
            placeholder="Min 2% du total" step={1} />
          {total > 0 && (
            <Hint>
              Loi 2005-102 : min 2% → {Math.ceil(total * 0.02)} places
              {(attrs.parkingPlacesPmr ?? 0) < Math.ceil(total * 0.02) &&
                <span className="text-red-400 ml-1">⚠ insuffisant</span>}
            </Hint>
          )}
        </Field>
        <Field label="Places moto / 2-roues">
          <NumberInput value={attrs.parkingPlacesMoto}
            onChange={(v) => updateAttr('parkingPlacesMoto', v)}
            placeholder="Ex: 20" step={1} />
        </Field>
        <Field label="Places vélo">
          <NumberInput value={attrs.parkingPlacesVelo}
            onChange={(v) => updateAttr('parkingPlacesVelo', v)}
            placeholder="Ex: 30" step={1} />
        </Field>
        <Field label="Bornes recharge VE">
          <NumberInput value={attrs.parkingPlacesVe}
            onChange={(v) => updateAttr('parkingPlacesVe', v)}
            placeholder="Ex: 4" step={1} />
        </Field>
        <Field label="Hauteur max véhicules (m)">
          <NumberInput value={attrs.parkingHauteurMaxM}
            onChange={(v) => updateAttr('parkingHauteurMaxM', v)}
            placeholder="Ex: 2.1" step={0.1} />
        </Field>
        <Field label="Tarif horaire (FCFA/h)">
          <NumberInput value={attrs.parkingTarifHoraireFcfa}
            onChange={(v) => updateAttr('parkingTarifHoraireFcfa', v)}
            placeholder="Ex: 500 (0 = gratuit)" step={50} />
        </Field>
      </div>
    </div>
  )
}

function TabSanitaires({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Cabines Hommes">
          <NumberInput value={attrs.sanitairesCabinesH}
            onChange={(v) => updateAttr('sanitairesCabinesH', v)} step={1} />
        </Field>
        <Field label="Cabines Femmes">
          <NumberInput value={attrs.sanitairesCabinesF}
            onChange={(v) => updateAttr('sanitairesCabinesF', v)} step={1} />
        </Field>
        <Field label="Cabines PMR (mixtes)">
          <NumberInput value={attrs.sanitairesCabinesPmr}
            onChange={(v) => updateAttr('sanitairesCabinesPmr', v)} step={1} />
          <Hint>Obligatoire dès qu'il y a sanitaires</Hint>
        </Field>
        <Field label="Urinoirs H">
          <NumberInput value={attrs.sanitairesUrinoirsH}
            onChange={(v) => updateAttr('sanitairesUrinoirsH', v)} step={1} />
        </Field>
        <Field label="Douches">
          <NumberInput value={attrs.sanitairesDouches}
            onChange={(v) => updateAttr('sanitairesDouches', v)} step={1} />
        </Field>
        <CheckboxField label="Vestiaires associés"
          checked={attrs.sanitairesVestiaires ?? false}
          onChange={(v) => updateAttr('sanitairesVestiaires', v)} />
      </div>
    </div>
  )
}

function TabLivraison({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre de quais">
          <NumberInput value={attrs.livraisonQuais}
            onChange={(v) => updateAttr('livraisonQuais', v)} step={1} />
        </Field>
        <CheckboxField label="Accès poids-lourds (>7.5T)"
          checked={attrs.livraisonAccesPL ?? false}
          onChange={(v) => updateAttr('livraisonAccesPL', v)} />
        <Field label="Horaires livraison autorisés" span={2}>
          <input value={attrs.livraisonHoraires ?? ''}
            onChange={(e) => updateAttr('livraisonHoraires', e.target.value)}
            placeholder="Ex: 6h-10h et 20h-22h (hors heures d'affluence)"
            className={inputCls} />
        </Field>
      </div>
    </div>
  )
}

function TabTechnique({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  return (
    <div className="space-y-4">
      <Field label="Type de local technique">
        <select value={attrs.techniqueType ?? ''}
          onChange={(e) => updateAttr('techniqueType', (e.target.value || undefined) as SpaceDetailAttrs['techniqueType'])}
          className={inputCls}>
          <option value="">— à définir —</option>
          <option value="cta">CTA / centrale ventilation</option>
          <option value="tgbt">TGBT / tableau général</option>
          <option value="plomberie">Plomberie / chaufferie eau</option>
          <option value="chaufferie">Chaufferie gaz/fioul</option>
          <option value="datacenter">Datacenter / baie serveurs</option>
          <option value="groupe-electrogene">Groupe électrogène</option>
          <option value="poubelles">Local poubelles / OM</option>
          <option value="autre">Autre</option>
        </select>
      </Field>
      <CheckboxField label="Accès contrôlé (badge / code)"
        checked={attrs.techniqueAccesControle ?? false}
        onChange={(v) => updateAttr('techniqueAccesControle', v)} />
    </div>
  )
}

function TabExterieur({ attrs, updateAttr, space }: {
  attrs: SpaceDetailAttrs; updateAttr: UpdateFn; space: DetectedSpace
}) {
  return (
    <div className="space-y-4">
      <Field label="Type d'espace extérieur">
        <select value={attrs.espaceVertType ?? ''}
          onChange={(e) => updateAttr('espaceVertType', (e.target.value || undefined) as SpaceDetailAttrs['espaceVertType'])}
          className={inputCls}>
          <option value="">— à définir —</option>
          <option value="pelouse">Pelouse / gazon</option>
          <option value="massifs">Massifs floraux</option>
          <option value="arbres">Arbres / végétation haute</option>
          <option value="jardinieres">Jardinières / pots</option>
          <option value="terrasse">Terrasse minérale</option>
          <option value="patio">Patio / cour intérieure</option>
          <option value="pergola">Pergola / treillis</option>
          <option value="mixte">Mixte</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Surface végétalisée (m²)">
          <NumberInput value={attrs.espaceVertSurfaceM2}
            onChange={(v) => updateAttr('espaceVertSurfaceM2', v)}
            placeholder={`Max ${space.areaSqm.toFixed(0)}`} step={1} />
        </Field>
        <CheckboxField label="Arrosage automatique"
          checked={attrs.espaceVertArrosage ?? false}
          onChange={(v) => updateAttr('espaceVertArrosage', v)} />
        <CheckboxField label="Terrasse (bars/restos)"
          checked={attrs.espaceVertTerrasse ?? false}
          onChange={(v) => updateAttr('espaceVertTerrasse', v)} />
        <CheckboxField label="Abrité de la pluie"
          checked={attrs.espaceVertCouvert ?? false}
          onChange={(v) => updateAttr('espaceVertCouvert', v)} />
      </div>
    </div>
  )
}

function TabSecurite({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie ERP">
          <select value={attrs.erpCategory ?? ''}
            onChange={(e) => updateAttr('erpCategory', e.target.value ? +e.target.value as 1|2|3|4|5 : undefined)}
            className={inputCls}>
            <option value="">— à définir —</option>
            <option value="1">Catégorie 1 (&gt; 1500 pers.)</option>
            <option value="2">Catégorie 2 (701 – 1500 pers.)</option>
            <option value="3">Catégorie 3 (301 – 700 pers.)</option>
            <option value="4">Catégorie 4 (≤ 300 pers.)</option>
            <option value="5">Catégorie 5 (&lt; seuil d'assujettissement)</option>
          </select>
        </Field>
        <Field label="Type ERP (lettre)">
          <input value={attrs.erpType ?? ''}
            onChange={(e) => updateAttr('erpType', e.target.value.toUpperCase())}
            placeholder="M (magasins), N (restauration), L…"
            className={inputCls} />
        </Field>
        <Field label="Capacité max (personnes)">
          <NumberInput value={attrs.capaciteMax}
            onChange={(v) => updateAttr('capaciteMax', v)} step={10} />
        </Field>
        <Field label="Classe de risque">
          <select value={attrs.classeRisque ?? ''}
            onChange={(e) => updateAttr('classeRisque', (e.target.value || undefined) as 'A'|'B'|'C')}
            className={inputCls}>
            <option value="">— à définir —</option>
            <option value="A">A — Faible</option>
            <option value="B">B — Moyen</option>
            <option value="C">C — Élevé</option>
          </select>
        </Field>
      </div>

      <div className="border-t border-white/10 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Évacuation</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre d'issues de secours">
            <NumberInput value={attrs.issuesCount}
              onChange={(v) => updateAttr('issuesCount', v)} step={1} />
          </Field>
          <Field label="Largeur cumulée issues (m)">
            <NumberInput value={attrs.issuesLargeurCumuleeM}
              onChange={(v) => updateAttr('issuesLargeurCumuleeM', v)} step={0.1} />
            <Hint>Règle UP : 1 UP = 0,90 m pour &lt; 500 pers.</Hint>
          </Field>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Défense incendie</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Extincteurs">
            <NumberInput value={attrs.extincteurs}
              onChange={(v) => updateAttr('extincteurs', v)} step={1} />
          </Field>
          <Field label="Désenfumage">
            <select value={attrs.desenfumage ?? ''}
              onChange={(e) => updateAttr('desenfumage', (e.target.value || undefined) as SpaceDetailAttrs['desenfumage'])}
              className={inputCls}>
              <option value="">— à définir —</option>
              <option value="naturel">Naturel (exutoires)</option>
              <option value="mecanique">Mécanique (extraction)</option>
              <option value="mixte">Mixte</option>
              <option value="non-requis">Non requis</option>
            </select>
          </Field>
          <CheckboxField label="Sprinklers (extinction auto)"
            checked={attrs.sprinklers ?? false}
            onChange={(v) => updateAttr('sprinklers', v)} />
          <CheckboxField label="RIA (robinets incendie armés)"
            checked={attrs.ria ?? false}
            onChange={(v) => updateAttr('ria', v)} />
          <CheckboxField label="Détection fumée"
            checked={attrs.detectionFumee ?? false}
            onChange={(v) => updateAttr('detectionFumee', v)} />
          <CheckboxField label="Détection chaleur"
            checked={attrs.detectionChaleur ?? false}
            onChange={(v) => updateAttr('detectionChaleur', v)} />
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Surveillance</div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Caméras requises (nb)">
            <NumberInput value={attrs.camerasRequises}
              onChange={(v) => updateAttr('camerasRequises', v)} step={1} />
          </Field>
          <CheckboxField label="Contrôle d'accès (badge/biométrie)"
            checked={attrs.controleAcces ?? false}
            onChange={(v) => updateAttr('controleAcces', v)} />
        </div>
      </div>
    </div>
  )
}

function TabAccessibilite({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  return (
    <div className="space-y-4">
      <CheckboxField label="Espace accessible PMR"
        checked={attrs.pmrAccessible ?? false}
        onChange={(v) => updateAttr('pmrAccessible', v)} />
      <CheckboxField label="Cheminement PMR depuis entrée principale"
        checked={attrs.pmrCheminement ?? false}
        onChange={(v) => updateAttr('pmrCheminement', v)} />
      <CheckboxField label="Sanitaires PMR à proximité (&lt; 50 m)"
        checked={attrs.pmrSanitaireProche ?? false}
        onChange={(v) => updateAttr('pmrSanitaireProche', v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Largeur porte d'entrée (cm)">
          <NumberInput value={attrs.pmrLargeurPorteCm}
            onChange={(v) => updateAttr('pmrLargeurPorteCm', v)}
            placeholder="Min 90 cm" step={1} />
          {(attrs.pmrLargeurPorteCm ?? 0) > 0 && (attrs.pmrLargeurPorteCm ?? 0) < 90 && (
            <Hint className="text-red-400">⚠ Non conforme PMR (minimum 90 cm)</Hint>
          )}
        </Field>
      </div>
      <CheckboxField label="Signalétique braille / relief"
        checked={attrs.pmrSignaletiqueBraille ?? false}
        onChange={(v) => updateAttr('pmrSignaletiqueBraille', v)} />
      <CheckboxField label="Boucle magnétique (malentendants)"
        checked={attrs.pmrBoucleMagnetique ?? false}
        onChange={(v) => updateAttr('pmrBoucleMagnetique', v)} />
    </div>
  )
}

function TabParcours({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  const SERVICES = ['WiFi', 'Prises USB', 'Poussettes', 'Consigne', 'WC proche',
    'Eau potable', 'Banc / assise', 'Climatisation', 'Écran info']
  const enabledSvc = new Set(attrs.servicesDisponibles ?? [])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Affluence cible (personnes/jour)">
          <NumberInput value={attrs.affluenceJourCible}
            onChange={(v) => updateAttr('affluenceJourCible', v)}
            placeholder="Ex: 500" step={50} />
        </Field>
        <Field label="Durée visite moyenne (minutes)">
          <NumberInput value={attrs.dureeVisiteMinutesMoy}
            onChange={(v) => updateAttr('dureeVisiteMinutesMoy', v)}
            placeholder="Ex: 15" step={1} />
        </Field>
      </div>

      <Field label="Profil visiteur dominant">
        <select value={attrs.profilDominant ?? ''}
          onChange={(e) => updateAttr('profilDominant', (e.target.value || undefined) as SpaceDetailAttrs['profilDominant'])}
          className={inputCls}>
          <option value="">— non renseigné —</option>
          <option value="famille">Famille avec enfants</option>
          <option value="jeune-actif">Jeune actif</option>
          <option value="business">Business / CSP+</option>
          <option value="touriste">Touriste</option>
          <option value="senior">Senior</option>
          <option value="etudiant">Étudiant</option>
          <option value="mixte">Mixte</option>
        </select>
      </Field>

      <Field label="Heures de pointe">
        <input value={attrs.heuresPointe ?? ''}
          onChange={(e) => updateAttr('heuresPointe', e.target.value)}
          placeholder="Ex: 12h-14h, 18h-20h, samedi après-midi"
          className={inputCls} />
      </Field>

      <Field label="Services disponibles">
        <div className="grid grid-cols-3 gap-1.5">
          {SERVICES.map(s => {
            const on = enabledSvc.has(s)
            return (
              <button key={s}
                onClick={() => {
                  const next = new Set(enabledSvc)
                  if (on) next.delete(s)
                  else next.add(s)
                  updateAttr('servicesDisponibles', Array.from(next))
                }}
                className={`px-2 py-1.5 rounded text-[10px] font-medium border transition ${
                  on
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                }`}>
                {s}
              </button>
            )
          })}
        </div>
      </Field>
    </div>
  )
}

function TabWayfinder({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  return (
    <div className="space-y-4">
      <Field label="Label court (affiché sur borne)">
        <input value={attrs.wayfinderLabel ?? ''}
          onChange={(e) => updateAttr('wayfinderLabel', e.target.value)}
          placeholder="Ex: Zara, WC, Parking B1… (max ~20 car.)"
          maxLength={30} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Catégorie wayfinder">
          <select value={attrs.wayfinderCategory ?? ''}
            onChange={(e) => updateAttr('wayfinderCategory', (e.target.value || undefined) as SpaceDetailAttrs['wayfinderCategory'])}
            className={inputCls}>
            <option value="">— auto depuis type —</option>
            <option value="shopping">🛍 Shopping</option>
            <option value="food">🍽 Restauration</option>
            <option value="services">🛠 Services</option>
            <option value="exit">🚪 Sortie</option>
            <option value="info">ℹ️ Info</option>
            <option value="restroom">🚻 Toilettes</option>
            <option value="transport">🚌 Transport / parking</option>
            <option value="entertainment">🎮 Divertissement</option>
          </select>
        </Field>
        <Field label="Priorité d'affichage">
          <select value={attrs.wayfinderPriorite ?? 'standard'}
            onChange={(e) => updateAttr('wayfinderPriorite', e.target.value as SpaceDetailAttrs['wayfinderPriorite'])}
            className={inputCls}>
            <option value="anchor">⭐ Anchor (mise en avant)</option>
            <option value="standard">Standard</option>
            <option value="hidden">Masqué (pas dans la recherche)</option>
          </select>
        </Field>
      </div>
      <Field label="Icône / pictogramme (emoji ou code)">
        <input value={attrs.wayfinderIcon ?? ''}
          onChange={(e) => updateAttr('wayfinderIcon', e.target.value)}
          placeholder="Ex: 👗, 🍔, 🚻 ou un code ISO 7010"
          className={inputCls} />
      </Field>
      <Field label="Mots-clés de recherche (virgules)">
        <input value={attrs.wayfinderKeywords ?? ''}
          onChange={(e) => updateAttr('wayfinderKeywords', e.target.value)}
          placeholder="Ex: mode, vêtement, zara, haute-couture, femme"
          className={inputCls} />
        <Hint>Ces mots-clés apparaîtront dans la recherche Vol.4</Hint>
      </Field>
    </div>
  )
}

function TabHoraires({ attrs, updateAttr }: { attrs: SpaceDetailAttrs; updateAttr: UpdateFn }) {
  return (
    <div className="space-y-4">
      <Field label="Horaires d'ouverture">
        <input value={attrs.horairesOuverture ?? ''}
          onChange={(e) => updateAttr('horairesOuverture', e.target.value)}
          placeholder="Ex: Lun-Sam 10h-21h, Dim 10h-18h"
          className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Téléphone">
          <div className="relative">
            <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={attrs.telephone ?? ''}
              onChange={(e) => updateAttr('telephone', e.target.value)}
              placeholder="+225 07 00 00 00 00"
              className={`${inputCls} pl-7`} />
          </div>
        </Field>
        <Field label="Email">
          <input type="email" value={attrs.email ?? ''}
            onChange={(e) => updateAttr('email', e.target.value)}
            placeholder="contact@enseigne.ci"
            className={inputCls} />
        </Field>
        <Field label="Site web" span={2}>
          <div className="relative">
            <Navigation size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="url" value={attrs.siteUrl ?? ''}
              onChange={(e) => updateAttr('siteUrl', e.target.value)}
              placeholder="https://enseigne.ci"
              className={`${inputCls} pl-7`} />
          </div>
        </Field>
      </div>
    </div>
  )
}

function TabNotes({ freeNote, setFreeNote }: { freeNote: string; setFreeNote: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block">
        Notes libres
      </label>
      <textarea value={freeNote} onChange={(e) => setFreeNote(e.target.value)} rows={16}
        placeholder="Remarques, contraintes particulières, historique, références, photos…"
        className={`${inputCls} resize-none`} />
      <p className="text-[10px] text-slate-500 mt-2">
        Les champs structurés (type, surface, loyer…) sont stockés séparément.
        Utilisez cette zone pour tout le reste (contexte, décisions, annotations).
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ═══ Primitives UI ═══
// ══════════════════════════════════════════════════════

const inputCls = 'w-full bg-slate-800 text-white rounded px-3 py-2 text-[12px] border border-white/10 focus:border-indigo-500 outline-none'

function Field({ label, span = 1, children }: {
  label: string; span?: 1 | 2 | 3; children: React.ReactNode
}) {
  return (
    <div className={span === 2 ? 'col-span-2' : span === 3 ? 'col-span-3' : ''}>
      <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function Stat({ icon: Icon, label, value }: {
  icon: React.ComponentType<any>; label: string; value: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-800/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 mb-1">
        <Icon size={10} />{label}
      </div>
      <div className="text-[13px] text-white font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function Hint({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] text-slate-500 mt-1 ${className}`}>{children}</p>
  )
}

function CheckboxField({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white transition py-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

function NumberInput({ value, onChange, placeholder, step = 1 }: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  step?: number
}) {
  return (
    <input type="number" step={step} min="0"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
      placeholder={placeholder}
      className={inputCls} />
  )
}
