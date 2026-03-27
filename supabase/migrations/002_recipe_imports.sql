create table if not exists public.recipe_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  raw_text text,
  parsed_payload jsonb,
  status public.import_status not null default 'uploaded',
  warnings jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.recipe_imports enable row level security;

create policy "recipe imports are scoped to owner"
on public.recipe_imports
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
