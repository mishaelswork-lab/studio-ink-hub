create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  event text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant insert on public.usage_events to anon, authenticated;
grant select on public.usage_events to authenticated;
grant all on public.usage_events to service_role;

create index if not exists usage_events_created_at_idx on public.usage_events (created_at desc);
create index if not exists usage_events_category_idx on public.usage_events (category, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "usage_events_insert" on public.usage_events;
create policy "usage_events_insert"
  on public.usage_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "usage_events_admin_select" on public.usage_events;
create policy "usage_events_admin_select"
  on public.usage_events for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));