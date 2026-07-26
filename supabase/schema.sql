-- ============================================================================
-- schema.sql — Base de données Callisthenic (Supabase / PostgreSQL)
--
-- À exécuter une fois dans l'éditeur SQL de Supabase :
--   Dashboard → SQL Editor → New query → coller → Run
--
-- Sécurité : Row Level Security activée partout. Chaque utilisateur ne voit
-- que ses propres fiches. Les fiches anonymes (utilisateur_id NULL) restent
-- lisibles par tous : ne les utiliser qu'en développement.
-- ============================================================================

-- ---------------------------------------------------------------- Fiches ----
create table if not exists public.fiches (
  id              uuid primary key default gen_random_uuid(),
  utilisateur_id  uuid references auth.users(id) on delete cascade,
  nom             text not null default 'Client',
  profil          jsonb not null,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);

create index if not exists fiches_utilisateur_idx on public.fiches (utilisateur_id);
create index if not exists fiches_maj_idx on public.fiches (maj_le desc);

-- ------------------------------------------------------ Séances réalisées ---
create table if not exists public.seances_realisees (
  id          uuid primary key default gen_random_uuid(),
  fiche_id    uuid not null references public.fiches(id) on delete cascade,
  date        date not null,
  nom_seance  text not null,
  ressenti    smallint not null check (ressenti between 1 and 5),
  commentaire text,
  cree_le     timestamptz not null default now()
);

create index if not exists seances_fiche_idx on public.seances_realisees (fiche_id, date desc);

-- ---------------------------------------------------------- Mesures poids ---
create table if not exists public.mesures_poids (
  id       uuid primary key default gen_random_uuid(),
  fiche_id uuid not null references public.fiches(id) on delete cascade,
  date     date not null,
  poids    numeric(5,2) not null check (poids > 20 and poids < 400),
  -- Une seule pesée par jour et par fiche : la nouvelle remplace l'ancienne.
  unique (fiche_id, date)
);

create index if not exists poids_fiche_idx on public.mesures_poids (fiche_id, date);

-- ------------------------------------------------- Mise à jour de maj_le ----
create or replace function public.touch_maj_le()
returns trigger
language plpgsql
as $$
begin
  new.maj_le = now();
  return new;
end;
$$;

drop trigger if exists fiches_touch on public.fiches;
create trigger fiches_touch
  before update on public.fiches
  for each row execute function public.touch_maj_le();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.fiches            enable row level security;
alter table public.seances_realisees enable row level security;
alter table public.mesures_poids     enable row level security;

-- --- Fiches : chacun ne voit que les siennes ---
drop policy if exists "lecture de ses fiches" on public.fiches;
create policy "lecture de ses fiches" on public.fiches
  for select using (auth.uid() = utilisateur_id or utilisateur_id is null);

drop policy if exists "creation de ses fiches" on public.fiches;
create policy "creation de ses fiches" on public.fiches
  for insert with check (auth.uid() = utilisateur_id or utilisateur_id is null);

drop policy if exists "modification de ses fiches" on public.fiches;
create policy "modification de ses fiches" on public.fiches
  for update using (auth.uid() = utilisateur_id or utilisateur_id is null);

drop policy if exists "suppression de ses fiches" on public.fiches;
create policy "suppression de ses fiches" on public.fiches
  for delete using (auth.uid() = utilisateur_id or utilisateur_id is null);

-- --- Séances : accès conditionné à la propriété de la fiche parente ---
drop policy if exists "acces aux seances de ses fiches" on public.seances_realisees;
create policy "acces aux seances de ses fiches" on public.seances_realisees
  for all using (
    exists (
      select 1 from public.fiches f
      where f.id = fiche_id
        and (f.utilisateur_id = auth.uid() or f.utilisateur_id is null)
    )
  );

-- --- Mesures de poids : même règle ---
drop policy if exists "acces aux mesures de ses fiches" on public.mesures_poids;
create policy "acces aux mesures de ses fiches" on public.mesures_poids
  for all using (
    exists (
      select 1 from public.fiches f
      where f.id = fiche_id
        and (f.utilisateur_id = auth.uid() or f.utilisateur_id is null)
    )
  );

-- ============================================================================
-- Rattachement automatique des fiches à l'utilisateur connecté
--
-- Sans cela, une fiche créée depuis le client avec utilisateur_id à NULL
-- resterait visible par tous. Ce déclencheur force la propriété.
-- ============================================================================

create or replace function public.assigner_proprietaire()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.utilisateur_id is null then
    new.utilisateur_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists fiches_proprietaire on public.fiches;
create trigger fiches_proprietaire
  before insert on public.fiches
  for each row execute function public.assigner_proprietaire();

-- ============================================================================
-- Journal quotidien (repas, hydratation, séance réalisée)
--
-- Optionnel : l'application fonctionne sans, en stockage local. Créez ces
-- tables si vous voulez synchroniser le suivi entre plusieurs appareils.
-- ============================================================================

create table if not exists public.journal (
  id             uuid primary key default gen_random_uuid(),
  fiche_id       uuid not null references public.fiches(id) on delete cascade,
  date           date not null,
  repas          jsonb not null default '[]'::jsonb,
  hydratation_ml integer not null default 0,
  seance_faite   boolean not null default false,
  seance_nom     text,
  accomplissement smallint,
  ressenti       text,
  energie        smallint check (energie between 1 and 5),
  unique (fiche_id, date)
);

create index if not exists journal_fiche_idx on public.journal (fiche_id, date desc);

create table if not exists public.progres_skills (
  id         uuid primary key default gen_random_uuid(),
  fiche_id   uuid not null references public.fiches(id) on delete cascade,
  skill_id   text not null,
  etape      smallint not null default 0,
  actif      boolean not null default false,
  validee_le date,
  unique (fiche_id, skill_id)
);

alter table public.journal        enable row level security;
alter table public.progres_skills enable row level security;

drop policy if exists "acces au journal de ses fiches" on public.journal;
create policy "acces au journal de ses fiches" on public.journal
  for all using (
    exists (
      select 1 from public.fiches f
      where f.id = fiche_id and f.utilisateur_id = auth.uid()
    )
  );

drop policy if exists "acces aux skills de ses fiches" on public.progres_skills;
create policy "acces aux skills de ses fiches" on public.progres_skills
  for all using (
    exists (
      select 1 from public.fiches f
      where f.id = fiche_id and f.utilisateur_id = auth.uid()
    )
  );
