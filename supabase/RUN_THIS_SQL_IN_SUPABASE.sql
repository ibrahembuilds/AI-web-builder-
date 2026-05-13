-- kanyoai AI Builder setup
-- Paste this whole file into Supabase SQL Editor and run it once.
-- Do not paste your OpenAI API key here.
-- Store the API key as an Edge Function secret instead:
-- npx supabase secrets set OPENAI_API_KEY="YOUR_KEY" --project-ref kuyjkbbbmsbtvsrjkrbi

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled portfolio',
  template_slug text not null,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_updated_at_idx on public.projects(updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects"
on public.projects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own projects" on public.projects;
create policy "Users can insert their own projects"
on public.projects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
on public.projects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
on public.projects
for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create table if not exists public.ai_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled AI website',
  kind text not null default 'portfolio',
  brief jsonb not null default '{}'::jsonb,
  files jsonb not null default '{"html":"","css":"","js":""}'::jsonb,
  model text,
  style jsonb not null default '{}'::jsonb,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_projects_kind_check check (
    kind in ('portfolio', 'landing', 'business', 'saas', 'commerce')
  )
);

create index if not exists ai_projects_user_id_idx on public.ai_projects(user_id);
create index if not exists ai_projects_updated_at_idx on public.ai_projects(updated_at desc);
create index if not exists ai_projects_kind_idx on public.ai_projects(kind);

alter table public.ai_projects enable row level security;

drop policy if exists "Users can view their own AI projects" on public.ai_projects;
create policy "Users can view their own AI projects"
on public.ai_projects
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own AI projects" on public.ai_projects;
create policy "Users can insert their own AI projects"
on public.ai_projects
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own AI projects" on public.ai_projects;
create policy "Users can update their own AI projects"
on public.ai_projects
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own AI projects" on public.ai_projects;
create policy "Users can delete their own AI projects"
on public.ai_projects
for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists ai_projects_set_updated_at on public.ai_projects;
create trigger ai_projects_set_updated_at
before update on public.ai_projects
for each row execute function public.set_updated_at();

create table if not exists public.app_api_settings (
  id boolean primary key default true,
  provider text not null default 'openai',
  base_url text not null default 'https://api.openai.com/v1',
  default_model text not null default 'gpt-5-mini',
  premium_model text not null default 'gpt-5.2',
  budget_model text not null default 'gpt-5-mini',
  cheapest_model text not null default 'gpt-5-nano',
  secret_name text not null default 'OPENAI_API_KEY',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_api_settings_singleton check (id = true)
);

alter table public.app_api_settings enable row level security;

drop policy if exists "Authenticated users can read API metadata" on public.app_api_settings;
create policy "Authenticated users can read API metadata"
on public.app_api_settings
for select
to authenticated
using (is_active = true);

insert into public.app_api_settings (id)
values (true)
on conflict (id) do nothing;

drop trigger if exists app_api_settings_set_updated_at on public.app_api_settings;
create trigger app_api_settings_set_updated_at
before update on public.app_api_settings
for each row execute function public.set_updated_at();
