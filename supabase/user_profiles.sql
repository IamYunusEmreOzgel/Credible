create table if not exists public.user_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    daily_calorie_target integer not null check (daily_calorie_target between 500 and 10000),
    updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

grant select, insert, update
on public.user_profiles
to authenticated;

create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create own profile"
on public.user_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
