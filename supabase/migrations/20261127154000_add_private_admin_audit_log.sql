create table if not exists public.admin_audit_log (
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null references auth.users(id),
 action text not null,
 target_type text not null,
 target_id uuid not null,
 reason text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon,authenticated;
grant select on public.admin_audit_log to authenticated;
drop policy if exists admin_audit_log_admin_read on public.admin_audit_log;
create policy admin_audit_log_admin_read on public.admin_audit_log for select to authenticated
using (exists(select 1 from public.user_roles ur where ur.user_id=auth.uid() and ur.role='admin'));