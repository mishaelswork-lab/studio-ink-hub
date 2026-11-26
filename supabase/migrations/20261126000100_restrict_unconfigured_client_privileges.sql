-- Restrict direct client privileges until reviewed, least-privilege RLS policies are installed.
-- RLS remains enabled on all existing public tables. This does not grant access or change data.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- This is an event-trigger helper, not an API endpoint. Trigger execution does not
-- require callers to hold EXECUTE on the trigger function.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
