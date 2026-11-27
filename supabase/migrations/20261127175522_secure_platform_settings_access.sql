-- Allow safe public settings reads and admin-only updates.
-- Keep settings writes behind RLS; never grant clients unrestricted table access.
alter table public.platform_settings
  add column if not exists updated_by uuid
  references auth.users(id) on delete set null;

grant select on public.platform_settings to anon, authenticated;
grant insert, update on public.platform_settings to authenticated;

create policy platform_settings_public_safe_read
  on public.platform_settings
  for select
  to anon, authenticated
  using (key in ('pricing', 'limits', 'contact', 'features', 'content'));

create policy platform_settings_admin_insert
  on public.platform_settings
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'::public.app_role
    )
  );

create policy platform_settings_admin_update
  on public.platform_settings
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'::public.app_role
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'::public.app_role
    )
  );
