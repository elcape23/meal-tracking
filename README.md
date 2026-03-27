# meal-tracking

Personal meal tracking MVP focused on lunch and dinner, built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase. The app connects tracking to an active meal plan and includes a PDF import flow with review before persistence.

## Implementation plan

1. Set up the app scaffold, shared UI primitives, route groups, and global styling.
2. Model the data in Supabase with strict relationships, RLS, and seed data.
3. Build the main MVP routes: `today`, `recipes`, `plan`, `history`, and `login`.
4. Add a fast meal logging flow tied to planned meals, with support for alternate or new recipes.
5. Add PDF import at `/plan/import` with extraction, parsing, warnings, preview, editing, and confirmation.
6. Add recipe import from either PDF or pasted recipe text to avoid print-to-PDF friction.

## Proposed schema

- `profiles`: app user record linked to `auth.users`
- `recipes`: all planned, custom, and imported recipes with normalized names for deduping
- `meal_plans`: top-level meal plan record, one active at a time
- `meal_plan_entries`: date + lunch/dinner slots for a plan
- `food_logs`: what was actually eaten, linked back to the planned recipe when present
- `favorite_recipes`: optional favorites for future suggestion ranking
- `meal_plan_imports`: traceable PDF import records with raw text, parsed payload, warnings, and status

Business rules implemented:

- A food log is unique per user, date, and meal type.
- A meal plan entry is unique per plan, date, and meal type.
- Recipes are deduped by `(user_id, normalized_name)`.
- Imports preserve raw text and parsed payload for traceability.

## Route structure

- `/login`: email magic-link sign in
- `/today`: main dashboard for today's lunch and dinner
- `/recipes`: recipe library with create and archive actions
- `/plan`: active meal plan grouped by day
- `/plan/import`: PDF upload, parse, review, and confirm flow
- `/history`: planned vs eaten log history

## Component structure

- `components/layout/AppShell`
- `components/today/MealCard`
- `components/today/LogMealDialog`
- `components/recipes/RecipeForm`
- `components/plan/MealPlanDaySection`
- `components/plan/import/UploadDropzone`
- `components/plan/import/ImportFlow`
- `components/plan/import/ImportPreview`
- `components/history/HistoryLogItem`
- `components/ui/*` for lightweight shadcn-style primitives

## Supabase wiring

1. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Supabase dashboard values:

- `NEXT_PUBLIC_SUPABASE_URL`: Project Settings -> API -> Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project Settings -> API -> Project API keys -> `anon public`
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings -> API -> Project API keys -> `service_role`
- `NEXT_PUBLIC_APP_URL`: your local app URL, usually `http://localhost:3000`

3. Apply the schema and seed files in Supabase:

- Run `supabase/migrations/001_init.sql`
- Run `supabase/seed.sql`

4. In Supabase Auth settings, add this redirect URL:

- `http://localhost:3000/api/auth/callback`

5. Start the app:

```bash
npm run dev
```

## Data model notes

- `recipes.source` distinguishes planned, custom, and imported recipes.
- `food_logs.followed_plan` is computed from planned vs eaten recipe ids.
- PDF import parses lunch and dinner entries only, ignores unsupported sections, warns on low-confidence rows, and reuses recipes by normalized name when possible.
- Recipe import supports either PDF upload or pasted text copied from the nutrition site while logged in.
- SSR auth now includes middleware-based session refresh so server-rendered routes stay in sync with Supabase auth cookies.

## Assumptions

- PDF files are mostly text-based and do not require OCR.
- The first version is single-user in practice but multi-user in schema and RLS.
- The import parser favors resilience and reviewability over perfect automation for every PDF format.
