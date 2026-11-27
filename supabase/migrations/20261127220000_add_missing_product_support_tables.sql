-- Product support tables referenced by the current application.
-- All tables are RLS-protected and grants are least-privilege.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant insert, update on public.reviews to authenticated;
create policy reviews_public_approved_read on public.reviews for select to anon, authenticated
  using (status = 'approved' and exists (select 1 from public.artists a where a.id = reviews.artist_id and a.status = 'active'));
create policy reviews_customer_read_own on public.reviews for select to authenticated
  using (customer_id = (select auth.uid()));
create policy reviews_admin_read on public.reviews for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy reviews_customer_insert_completed_booking on public.reviews for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id and b.customer_id = (select auth.uid())
        and b.artist_id = reviews.artist_id and b.status = 'completed'
    )
  );
create policy reviews_customer_update_pending on public.reviews for update to authenticated
  using (customer_id = (select auth.uid()) and status = 'pending')
  with check (customer_id = (select auth.uid()) and status = 'pending');
create policy reviews_admin_update on public.reviews for update to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  content_type text not null check (content_type in ('reel','artist','message','design','portfolio','other')),
  content_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','dismissed')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.content_reports enable row level security;
revoke all on public.content_reports from anon, authenticated;
grant select, insert, update on public.content_reports to authenticated;
create policy content_reports_insert_own on public.content_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'pending' and reviewed_by is null);
create policy content_reports_read_own on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy content_reports_admin_read on public.content_reports for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy content_reports_admin_update on public.content_reports for update to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_not_self check (blocker_id <> blocked_id),
  constraint user_blocks_unique unique (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
create policy user_blocks_select_own on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy user_blocks_insert_own on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy user_blocks_delete_own on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anon_id text,
  purpose text not null,
  granted boolean not null,
  policy_version text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.consent_records enable row level security;
revoke all on public.consent_records from anon, authenticated;
grant insert on public.consent_records to anon, authenticated;
grant select on public.consent_records to authenticated;
create policy consent_anon_insert on public.consent_records for insert to anon
  with check (user_id is null and anon_id is not null);
create policy consent_user_insert on public.consent_records for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy consent_user_read_own on public.consent_records for select to authenticated
  using (user_id = (select auth.uid()));
create policy consent_admin_read on public.consent_records for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
create policy push_subscriptions_owner_all on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.artist_certifications (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  certification_name text not null,
  issuing_body text,
  certificate_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.artist_certifications enable row level security;
revoke all on public.artist_certifications from anon, authenticated;
grant select on public.artist_certifications to anon, authenticated;
grant insert, delete on public.artist_certifications to authenticated;
grant update on public.artist_certifications to authenticated;
create policy artist_certifications_public_verified_read on public.artist_certifications for select to anon, authenticated
  using (verified is true and exists (select 1 from public.artists a where a.id = artist_certifications.artist_id and a.status = 'active'));
create policy artist_certifications_owner_read on public.artist_certifications for select to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_certifications.artist_id and a.user_id = (select auth.uid())));
create policy artist_certifications_admin_read on public.artist_certifications for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));
create policy artist_certifications_owner_insert on public.artist_certifications for insert to authenticated
  with check (verified is false and exists (select 1 from public.artists a where a.id = artist_certifications.artist_id and a.user_id = (select auth.uid())));
create policy artist_certifications_owner_delete on public.artist_certifications for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_certifications.artist_id and a.user_id = (select auth.uid())));
create policy artist_certifications_admin_update on public.artist_certifications for update to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

create table if not exists public.perf_metrics (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  value numeric,
  url text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.perf_metrics enable row level security;
revoke all on public.perf_metrics from anon, authenticated;
grant insert on public.perf_metrics to anon, authenticated;
grant select on public.perf_metrics to authenticated;
create policy perf_metrics_anon_insert on public.perf_metrics for insert to anon
  with check (length(event) between 1 and 40 and (value is null or value between 0 and 600000));
create policy perf_metrics_authenticated_insert on public.perf_metrics for insert to authenticated
  with check (length(event) between 1 and 40 and (value is null or value between 0 and 600000));
create policy perf_metrics_admin_read on public.perf_metrics for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role = 'admin'));

create index if not exists reviews_artist_status_created_idx on public.reviews(artist_id,status,created_at desc);
create index if not exists content_reports_status_created_idx on public.content_reports(status,created_at desc);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists artist_certifications_artist_idx on public.artist_certifications(artist_id,created_at desc);
create index if not exists perf_metrics_created_idx on public.perf_metrics(created_at desc);
