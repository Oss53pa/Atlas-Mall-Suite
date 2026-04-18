-- ═══ MIGRATION 010 — Feedback terrain signalétique + mémoire inter-projets ═══
--
-- Ajoute le support pour :
--   1. Feedback terrain via QR code (agent sur site scanne → signale un problème)
--   2. Mémoire des patterns validés (corrections labelisation, emplacements
--      panneaux approuvés) pour réutilisation sur des projets similaires

-- ─── 1. FEEDBACK TERRAIN VIA QR ───────────────────────────
--
-- Chaque panneau déployé porte un QR code qui ouvre un formulaire mobile.
-- Un agent scanne → signale l'état du panneau (illisible / absent / mal orienté / OK).

create table if not exists signage_feedback (
  id uuid primary key default uuid_generate_v4(),

  -- Identification
  projet_id uuid references projets(id) on delete cascade,
  panel_ref text not null,                      -- id du panneau dans le placement
  floor_id text,                                -- niveau (RDC, R+1…)

  -- Localisation physique
  x numeric,                                    -- position monde en mètres (x, y)
  y numeric,
  panel_type text,                              -- welcome, directional, you-are-here, etc.

  -- Feedback agent
  status text not null check (status in (
    'ok', 'illisible', 'absent', 'mal-oriente', 'degrade', 'obsolete', 'autre'
  )),
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  note text,                                    -- commentaire libre
  photo_url text,                               -- URL d'une photo uploadée (optionnel)

  -- Métadonnées collecte
  agent_name text,                              -- nom de l'agent (ou anonyme)
  agent_id uuid references auth.users(id),     -- si authentifié
  device_info jsonb,                            -- UA, geoloc GPS (opt), timestamp
  user_agent text,

  -- Traitement
  resolved boolean default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolution_note text,

  created_at timestamptz default now()
);

create index if not exists idx_signage_feedback_projet on signage_feedback(projet_id);
create index if not exists idx_signage_feedback_panel on signage_feedback(panel_ref);
create index if not exists idx_signage_feedback_unresolved on signage_feedback(resolved) where resolved = false;
create index if not exists idx_signage_feedback_created on signage_feedback(created_at desc);

-- RLS : un agent authentifié peut insérer (membre du projet), tout le monde peut
-- consulter ses propres signalements, le manager projet voit tout.
alter table signage_feedback enable row level security;

create policy "signage_feedback_insert_public"
  on signage_feedback for insert
  with check (true);  -- Tout le monde peut signaler (QR code scanné sur le terrain)

create policy "signage_feedback_select_project_members"
  on signage_feedback for select
  using (
    projet_id in (
      select projet_id from project_members where user_id = auth.uid()
    )
    or agent_id = auth.uid()
  );

create policy "signage_feedback_update_project_managers"
  on signage_feedback for update
  using (
    projet_id in (
      select projet_id from project_members
      where user_id = auth.uid()
      and role in ('security_manager','commercial_manager','editor')
    )
  );

-- ─── 2. MÉMOIRE PATTERNS VALIDÉS (INTER-PROJETS) ──────────
--
-- Quand l'utilisateur valide une correction (ex: renommer un layer, corriger
-- une catégorie de space, approuver un emplacement panneau), on enregistre
-- le pattern. Sur un futur projet, PROPH3T peut suggérer automatiquement
-- les mêmes corrections si le pattern match.

create table if not exists signage_patterns (
  id uuid primary key default uuid_generate_v4(),

  -- Type de pattern
  pattern_type text not null check (pattern_type in (
    'label-correction',         -- Corriger un label DXF → label humain
    'category-correction',      -- Corriger la catégorie auto d'un space
    'panel-placement',          -- Emplacement approuvé pour un type de panneau
    'layer-classification',     -- Classification de calque personnalisée
    'exclusion'                 -- Space à exclure (ex: faux commerce)
  )),

  -- Clé de recherche (normalisée pour match approximatif)
  trigger_key text not null,    -- ex: "ESCALATOR_MECA" (label DXF normalisé)
  trigger_context jsonb,        -- contexte ({ surface, forme, voisinage, etc.})

  -- Valeur appliquée
  applied_value jsonb not null, -- ex: { category: "escaliers" } ou { label: "Escalator Nord" }

  -- Métadonnées de confiance
  projet_id_origine uuid references projets(id),
  validated_by uuid references auth.users(id),
  validation_count integer default 1,  -- nombre de fois où ce pattern a été validé
  rejection_count integer default 0,
  confidence_score numeric default 0.5 check (confidence_score between 0 and 1),

  -- Projets où ce pattern a déjà été appliqué
  applied_on_projects uuid[] default '{}',

  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_signage_patterns_trigger on signage_patterns(trigger_key);
create index if not exists idx_signage_patterns_type on signage_patterns(pattern_type);
create index if not exists idx_signage_patterns_confidence on signage_patterns(confidence_score desc);

alter table signage_patterns enable row level security;

-- Tout utilisateur authentifié peut consulter la base de patterns (savoir partagé)
create policy "signage_patterns_select_authenticated"
  on signage_patterns for select
  using (auth.uid() is not null);

-- Insertion : n'importe quel membre authentifié
create policy "signage_patterns_insert_authenticated"
  on signage_patterns for insert
  with check (auth.uid() is not null);

-- Mise à jour : uniquement le validateur initial
create policy "signage_patterns_update_owner"
  on signage_patterns for update
  using (validated_by = auth.uid());

-- ─── 3. Trigger : mise à jour confidence_score automatique ──

create or replace function update_pattern_confidence()
returns trigger as $$
begin
  new.updated_at = now();
  -- Confiance = validations / (validations + rejets), borné entre 0.1 et 0.99
  if (new.validation_count + new.rejection_count) > 0 then
    new.confidence_score = greatest(0.1, least(0.99,
      new.validation_count::numeric / (new.validation_count + new.rejection_count)
    ));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_pattern_confidence on signage_patterns;
create trigger trg_update_pattern_confidence
  before update on signage_patterns
  for each row
  execute function update_pattern_confidence();

-- ─── 4. Bucket storage pour photos de feedback ─────────

-- Note : la création du bucket doit être faite via l'UI Supabase ou API
-- car les migrations SQL ne gèrent pas storage.buckets nativement.
-- À faire manuellement : créer le bucket 'signage-feedback-photos'
-- avec accès public pour lecture + RLS pour écriture.

-- Commentaire pour rappel :
comment on table signage_feedback is 'Feedback terrain via QR code. Bucket associé : signage-feedback-photos (à créer manuellement dans Supabase Storage).';
