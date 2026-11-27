# Tartspace database security review

Read-only review performed 27 November 2026 against the confirmed ArtSpace project `ufvabnxcpxhusbdgunmb`. No database changes were made during this review.

## Supabase Security Advisor findings

### RLS enabled, no policies — 5 tables

These tables currently deny direct access through the exposed PostgREST roles because RLS is enabled and no policies exist:

- `artist_leads`
- `availability_exceptions`
- `instagram_connections`
- `instagram_oauth_states`
- `platform_settings`

This is consistent with the current server-mediated design: Instagram tokens and OAuth state are service-role-only; availability exceptions are managed through the owner RPC / booking hold path; platform settings are read or updated through reviewed server functions. Do not add broad client policies just to silence the advisor. Revisit each table if the application begins querying it directly.

### SECURITY DEFINER functions executable by authenticated users — 10 functions

The following functions are intentionally callable by signed-in users, and each reviewed definition sets a fixed `search_path = pg_catalog, public`:

- `admin_review_artist` — checks `auth.uid()` against the admin role, validates the decision, enforces the two-portfolio-item approval minimum, and writes an audit record.
- `admin_review_reel` — checks the admin role, validates moderation state and decision, and writes an audit record.
- `admin_write_audit` — checks the admin role and validates audit fields.
- `artist_confirm_booking` — checks that the caller owns the active artist profile and that the booking is paid and pending.
- `artist_replace_weekly_availability` — resolves the artist from `auth.uid()` and validates the schedule.
- `artist_resubmit_application` — resolves the artist from `auth.uid()` and enforces suspended status plus the two-item minimum.
- `artist_set_availability` — resolves the artist from `auth.uid()` and only enables availability for active artists with two approved items.
- `artist_update_own_profile` — resolves the artist from `auth.uid()` and validates profile fields and private avatar paths.
- `create_booking_hold` — requires an authenticated customer, locks the profile and artist, validates booking details, availability, overlaps and idempotency.
- `get_my_artist_profile` — returns only the artist row whose `user_id` matches `auth.uid()`.

A separate privilege check confirmed all ten are executable by `authenticated` and not executable by `anon`. These functions should not be blindly revoked: the reviewed code contains the relevant caller/owner checks. Continue reviewing any future SECURITY DEFINER function before granting execute.

## Remaining security work

- Test these functions with real test accounts, including non-admin, wrong-artist, cross-customer, expired-hold and replay scenarios.
- Add automated negative RLS/RPC tests; production currently has no users, so those journeys cannot yet be exercised.
- Re-run Security Advisor after future schema changes.
- Keep server-only tables closed unless a reviewed use case requires narrowly scoped access.

No secrets, user records, or payment data were read or changed.
