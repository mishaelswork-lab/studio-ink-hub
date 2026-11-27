-- Restore the role-check helper used by admin moderation and audit RPCs.
-- The helper only evaluates the caller's own role, preventing arbitrary user-role enumeration.
create or replace function public.has_role(
  p_user_id uuid,
  p_role public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select p_user_id = auth.uid()
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = p_user_id
        and ur.role = p_role
    );
$function$;

revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
