-- Run once in the Supabase SQL editor of the project that stores sign-ups.

-- One row per person who signed up (filled in automatically on sign-up).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  company text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

-- Every source-code download, so you can see who is actually using the code.
create table if not exists public.code_downloads (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kit text not null,
  created_at timestamptz not null default now()
);
create index if not exists code_downloads_user_id_idx on public.code_downloads (user_id);
alter table public.code_downloads enable row level security;
create policy "Users log their own downloads" on public.code_downloads
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users read their own downloads" on public.code_downloads
  for select to authenticated using ((select auth.uid()) = user_id);

-- Copy name and company from the sign-up form into profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, company)
  values (
    new.id,
    new.email,
    left(new.raw_user_meta_data ->> 'name', 120),
    left(new.raw_user_meta_data ->> 'company', 160)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
