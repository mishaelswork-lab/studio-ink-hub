
REVOKE EXECUTE ON FUNCTION public.enforce_reel_moderation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_certification_verified() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_table_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_booking_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_blocked_messages() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_write_media(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.in_consultation_path(text) FROM PUBLIC, anon;
