create extension if not exists pgcrypto;

create type public.meal_type as enum ('lunch', 'dinner', 'both');
create type public.recipe_source as enum ('plan', 'custom', 'imported');
create type public.import_status as enum ('uploaded', 'parsed', 'confirmed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  description text,
  meal_type public.meal_type not null default 'both',
  source public.recipe_source not null default 'custom',
  ingredients jsonb,
  instructions text,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recipes_user_normalized_name_unique unique (user_id, normalized_name)
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  date date not null,
  meal_type public.meal_type not null,
  recipe_id uuid not null references public.recipes (id) on delete restrict,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint meal_plan_entries_lunch_dinner_only check (meal_type in ('lunch', 'dinner')),
  constraint meal_plan_entries_unique_slot unique (meal_plan_id, date, meal_type)
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  meal_type public.meal_type not null,
  planned_recipe_id uuid references public.recipes (id) on delete set null,
  eaten_recipe_id uuid not null references public.recipes (id) on delete restrict,
  followed_plan boolean not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint food_logs_lunch_dinner_only check (meal_type in ('lunch', 'dinner')),
  constraint food_logs_unique_slot unique (user_id, date, meal_type)
);

create table public.favorite_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint favorite_recipes_unique unique (user_id, recipe_id)
);

create table public.meal_plan_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  storage_path text,
  raw_text text,
  parsed_payload jsonb,
  status public.import_status not null default 'uploaded',
  warnings jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger recipes_set_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.food_logs enable row level security;
alter table public.favorite_recipes enable row level security;
alter table public.meal_plan_imports enable row level security;

create policy "profiles are ownable"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "recipes are scoped to owner"
on public.recipes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meal plans are scoped to owner"
on public.meal_plans
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meal plan entries are scoped through meal plan owner"
on public.meal_plan_entries
for all
using (
  exists (
    select 1
    from public.meal_plans mp
    where mp.id = meal_plan_id and mp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.meal_plans mp
    where mp.id = meal_plan_id and mp.user_id = auth.uid()
  )
);

create policy "food logs are scoped to owner"
on public.food_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "favorite recipes are scoped to owner"
on public.favorite_recipes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meal plan imports are scoped to owner"
on public.meal_plan_imports
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
