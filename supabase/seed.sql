insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@meal.app',
  crypt('changeme', gen_salt('bf')),
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}',
  '{}',
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (id) do nothing;

insert into public.profiles (id, email)
values ('11111111-1111-1111-1111-111111111111', 'demo@meal.app')
on conflict (id) do nothing;

insert into public.recipes (id, user_id, name, normalized_name, meal_type, source, description)
values
  ('20000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Chicken Burrito Bowl', 'chicken burrito bowl', 'lunch', 'plan', 'Rice, chicken, beans, and avocado'),
  ('20000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Turkey Pesto Sandwich', 'turkey pesto sandwich', 'lunch', 'plan', 'Quick sandwich with greens'),
  ('20000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Salmon Rice Plate', 'salmon rice plate', 'dinner', 'plan', 'Salmon with rice and vegetables'),
  ('20000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Beef Stir Fry', 'beef stir fry', 'dinner', 'plan', 'Beef strips, peppers, and noodles'),
  ('20000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Lentil Soup', 'lentil soup', 'both', 'custom', 'A simple batch-cook soup'),
  ('20000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Chicken Caesar Wrap', 'chicken caesar wrap', 'lunch', 'custom', 'Wrap with lettuce and parmesan'),
  ('20000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Shrimp Tacos', 'shrimp tacos', 'dinner', 'custom', 'Spicy shrimp with slaw'),
  ('20000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Pasta Primavera', 'pasta primavera', 'dinner', 'imported', 'Vegetable-forward pasta');

insert into public.meal_plans (id, user_id, title, start_date, end_date, is_active)
values (
  '30000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Weekly Reset Plan',
  current_date,
  current_date + interval '6 days',
  true
)
on conflict (id) do update set is_active = excluded.is_active;

insert into public.meal_plan_entries (meal_plan_id, date, meal_type, recipe_id, notes)
values
  ('30000000-0000-0000-0000-000000000001', current_date, 'lunch', '20000000-0000-0000-0000-000000000001', null),
  ('30000000-0000-0000-0000-000000000001', current_date, 'dinner', '20000000-0000-0000-0000-000000000003', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '1 day', 'lunch', '20000000-0000-0000-0000-000000000002', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '1 day', 'dinner', '20000000-0000-0000-0000-000000000004', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '2 day', 'lunch', '20000000-0000-0000-0000-000000000006', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '2 day', 'dinner', '20000000-0000-0000-0000-000000000007', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '3 day', 'lunch', '20000000-0000-0000-0000-000000000005', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '3 day', 'dinner', '20000000-0000-0000-0000-000000000008', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '4 day', 'lunch', '20000000-0000-0000-0000-000000000001', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '4 day', 'dinner', '20000000-0000-0000-0000-000000000004', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '5 day', 'lunch', '20000000-0000-0000-0000-000000000002', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '5 day', 'dinner', '20000000-0000-0000-0000-000000000003', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '6 day', 'lunch', '20000000-0000-0000-0000-000000000005', null),
  ('30000000-0000-0000-0000-000000000001', current_date + interval '6 day', 'dinner', '20000000-0000-0000-0000-000000000007', null)
on conflict do nothing;

insert into public.food_logs (user_id, date, meal_type, planned_recipe_id, eaten_recipe_id, followed_plan, notes)
values
  ('11111111-1111-1111-1111-111111111111', current_date - interval '2 day', 'lunch', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', true, 'Stayed on plan'),
  ('11111111-1111-1111-1111-111111111111', current_date - interval '2 day', 'dinner', '20000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000008', false, 'Had pasta instead'),
  ('11111111-1111-1111-1111-111111111111', current_date - interval '1 day', 'lunch', '20000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', true, null)
on conflict do nothing;

insert into public.favorite_recipes (user_id, recipe_id)
values
  ('11111111-1111-1111-1111-111111111111', '20000000-0000-0000-0000-000000000001'),
  ('11111111-1111-1111-1111-111111111111', '20000000-0000-0000-0000-000000000005')
on conflict do nothing;
