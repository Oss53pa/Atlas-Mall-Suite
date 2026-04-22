// ═══ PARAMÈTRES GLOBAUX ═══

import React from 'react'
import { useSettingsStore } from './settingsStore'
import type { ThemeMode, Language, Units } from './settingsStore'
import {
  User,
  Building2,
  Monitor,
  Palette,
  KeyRound
} from 'lucide-react'
import ApiKeySection from './components/ApiKeySection'

function SettingsGroup({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<any>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#262a31' }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.04]">
        <Icon size={15} className="text-atlas-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="bg-[#141e2e] text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-atlas-500/50 min-w-[140px]">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-atlas-500' : 'bg-gray-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export default function SettingsPage() {
  const settings = useSettingsStore()
  const { setSetting } = settings

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#1a1d23', color: '#e2e8f0' }}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Paramètres</h1>
          <p className="text-sm text-gray-500 mt-1">Configurez Atlas Mall Suite selon vos préférences</p>
        </div>

        <div className="space-y-5">
          {/* Profil */}
          <SettingsGroup title="Profil" icon={User}>
            <SettingsRow label="Nom d'utilisateur" description="Affiché dans les rapports et annotations">
              <input value={settings.userName} onChange={(e) => setSetting('userName', e.target.value)}
                placeholder="Votre nom"
                className="bg-[#141e2e] text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-atlas-500/50 w-[200px]" />
            </SettingsRow>
            <SettingsRow label="Rôle" description="Ex: Directeur technique, Chef de projet sécurité">
              <input value={settings.userRole} onChange={(e) => setSetting('userRole', e.target.value)}
                placeholder="Votre rôle"
                className="bg-[#141e2e] text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-atlas-500/50 w-[200px]" />
            </SettingsRow>
            <SettingsRow label="Entreprise">
              <input value={settings.companyName} onChange={(e) => setSetting('companyName', e.target.value)}
                className="bg-[#141e2e] text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 outline-none focus:border-atlas-500/50 w-[200px]" />
            </SettingsRow>
          </SettingsGroup>

          {/* Apparence */}
          <SettingsGroup title="Apparence" icon={Palette}>
            <SettingsRow label="Thème" description="Mode sombre recommandé pour la 3D">
              <SelectInput value={settings.theme} onChange={(v) => setSetting('theme', v as ThemeMode)}
                options={[
                  { value: 'dark', label: 'Sombre' },
                  { value: 'light', label: 'Clair' },
                  { value: 'auto', label: 'Système' },
                ]} />
            </SettingsRow>
            <SettingsRow label="Langue">
              <SelectInput value={settings.language} onChange={(v) => setSetting('language', v as Language)}
                options={[
                  { value: 'fr', label: 'Français' },
                  { value: 'en', label: 'English' },
                ]} />
            </SettingsRow>
          </SettingsGroup>

          {/* Préférences */}
          <SettingsGroup title="Préférences" icon={Monitor}>
            <SettingsRow label="Unités" description="Mètres ou pieds">
              <SelectInput value={settings.units} onChange={(v) => setSetting('units', v as Units)}
                options={[
                  { value: 'metric', label: 'Métrique (m)' },
                  { value: 'imperial', label: 'Impérial (ft)' },
                ]} />
            </SettingsRow>
            <SettingsRow label="Vue par défaut" description="Vue initiale à l'ouverture d'un plan">
              <SelectInput value={settings.defaultView} onChange={(v) => setSetting('defaultView', v as '2d' | '3d')}
                options={[
                  { value: '2d', label: '2D' },
                  { value: '3d', label: '3D' },
                ]} />
            </SettingsRow>
            <SettingsRow label="Sauvegarde automatique" description="Sauvegarder les modifications en continu">
              <Toggle checked={settings.autoSave} onChange={(v) => setSetting('autoSave', v)} />
            </SettingsRow>
            <SettingsRow label="Écran de bienvenue" description="Afficher la page d'accueil au lancement">
              <Toggle checked={settings.showWelcome} onChange={(v) => setSetting('showWelcome', v)} />
            </SettingsRow>
          </SettingsGroup>

          {/* Intégrations IA */}
          <SettingsGroup title="Intégrations IA" icon={KeyRound}>
            <ApiKeySection />
          </SettingsGroup>

          {/* À propos */}
          <SettingsGroup title="À propos" icon={Building2}>
            <div className="text-sm text-gray-400 space-y-2">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-white font-mono text-xs">1.0.0-beta</span>
              </div>
              <div className="flex justify-between">
                <span>Moteur IA</span>
                <span className="text-atlas-400 text-xs font-medium">Proph3t Engine v2</span>
              </div>
              <div className="flex justify-between">
                <span>Normes supportées</span>
                <span className="text-xs text-gray-500">APSAD R82 · ISO 7010 · EN 62676</span>
              </div>
              <div className="flex justify-between">
                <span>Éditeur</span>
                <span className="text-xs text-gray-500">Praedium Tech — Atlas Studio</span>
              </div>
            </div>
          </SettingsGroup>
        </div>
      </div>
    </div>
  )
}
