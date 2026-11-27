# Production schema reconciliation — 26 November 2026

Target: Supabase project `ufvabnxcpxhusbdgunmb` (Tartspace). This document records a read-only comparison of the current application flows with the live production schema. It is not a deployment instruction.

## Findings

### Booking flow

The current `src/pages/BookingPage.tsx` expects the legacy booking shape:
- `date`, `time`, `style`, `placement`, `size`, `description`, `total_estimate`, and `customer_name`.
- It directly inserts a booking from the browser.
- It treats payment-order creation errors as a successful booking and ignores errors from payment verification before showing success.

Production `public.bookings` instead has:
- `customer_id`, `artist_id`, optional `design_request_id`
- `starts_at`, `ends_at`
- `amount_minor`, `currency`, `status`, `hold_expires_at`, `idempotency_key`
- `cover_charge_paid`

Production status constraints include `pending`, `held`, `awaiting_payment`, `confirmed`, `completed`, `cancelled`, and `expired`. The table currently permits participant-only SELECT; client INSERT/UPDATE remains blocked intentionally.

**Required implementation:** add a server-authoritative booking creation/hold endpoint or RPC. It must authenticate the customer, verify the artist is active, validate start/end time and availability, prevent overlapping active bookings under a transaction/constraint-safe strategy, enforce an idempotency key, calculate any amount server-side, and create a `held`/payment-pending booking. Artist/customer status transitions must be separately authorized and constrained. The client must never write booking status, amount, customer identity, or payment state directly.

Do not add legacy `date`/`time` columns to production merely to satisfy the old page.

### Artist profile and onboarding

Current `ArtistProfileEditor.tsx`, `ArtistProfile.tsx`, `BookingPage.tsx`, and `AuthContext.tsx` expect fields including `application_status`, `available`, `name`, `hourly_rate`, `experience_years`, `avatar_url`, `portfolio_images`, `specialty`, and `user_id`.

Production `public.artists` currently contains:
- `id`, `user_id`, `slug`, `bio`, `styles`, `studio_name`, `city`, `country`, `currency`, `status`, `verified_at`, `created_at`.

Production status is constrained to `pending`, `active`, or `suspended`; `user_id` references `profiles(id)` and is unique. Do not allow artist clients to set `status`, `verified_at`, ownership, or approval/review metadata. Public discovery is currently restricted to active artists.

**Required implementation:** reconcile the UI to the canonical `status` lifecycle (map active to approved/live in presentation only) and use the production portfolio model `portfolio_items` rather than a comma/list field on artists. Any new artist-editable profile fields should be added additively only after a field-by-field contract is agreed. Grant narrowly scoped column privileges and owner-only RLS; keep approval/status transitions server/admin-only. Artist signup must create a pending artist record through a trusted workflow and assign the artist role server-side.

### Portfolio media and storage

The current `src/lib/mediaUpload.ts` attempts an `s3-presign` function, then falls back to the `reels-videos` Supabase bucket and returns a public URL. Production currently has no Supabase Storage buckets and no deployed Edge Functions.

This fallback conflicts with the approved private-by-default storage strategy and will fail when the bucket is absent. Do not create a public bucket as a workaround. Implement a private bucket and owner-scoped upload/read/delete policies only after media paths, moderation, public portfolio delivery, and signed URL lifetimes are agreed. Public artist portfolio display should use a controlled delivery mechanism for approved media, not unrestricted private object access.

## Current security posture observed

- RLS is enabled on the relevant production tables.
- Artist public SELECT is limited to rows with `status = 'active'`.
- Portfolio public SELECT requires `approved = true` and an active owning artist.
- Booking SELECT is limited to the customer or the owning artist.
- Booking client writes remain blocked.
- Security advisor currently reports five RLS-enabled tables with no policies: `artist_leads`, `availability_exceptions`, `featured_artists`, `payments`, and `platform_settings`. These are intentionally closed pending purpose-specific access rules; do not add broad policies to silence the advisor.

## Next implementation sequence

1. Implement and test the server-authoritative booking hold workflow and update the booking UI to the canonical schema.
2. Reconcile artist signup/profile editing with canonical fields and owner-only, column-scoped writes.
3. Move portfolio media to a private storage design with explicit approved-public delivery.
4. Repair artist dashboard booking transitions and related legacy table queries.
5. Only then run Razorpay sandbox scenarios against valid held bookings.

No production schema changes were made during this read-only comparison. Existing production data was not modified.

### Account deletion

A read-only review of `supabase/functions/delete-account/index.ts` found it is not compatible with the production schema and must not be deployed:
- It checks a legacy booking status `accepted`, while production statuses use `held` and `awaiting_payment` (along with pending/confirmed/completed/cancelled/expired).
- It deletes `profiles` before resolving booking/payment references, but production bookings reference `profiles(id)`.
- It attempts to set `bookings.customer_id = NULL`, while production `bookings.customer_id` is NOT NULL.
- It uses legacy `consultations` / `consultation_messages` and artist-content table assumptions that do not match the canonical production `conversations` / `messages` model.
- It runs many destructive cleanup requests in parallel and ignores individual errors, so partial deletion can be reported as success.
- It removes memberships even where a lifetime entitlement/payment record may need to be retained for accounting or dispute handling.

**Required implementation:** design deletion as a server-side, auditable, idempotent workflow with a transaction or staged state machine. Resolve legal/financial retention first; preserve required booking/payment records while de-identifying personal fields without violating NOT NULL/FK constraints; clean up conversation/media according to retention rules; revoke sessions; delete auth identity only after all dependent references are handled. Return success only when all mandatory steps complete, and retain retry-safe progress for partial failures. No deletion code or production data was changed in this audit.

### OG badge allocation

The live `artists` table has `city` and `country`, but no Indian state/UT field or OG-award field. The current schema therefore cannot safely implement the agreed first-150-per-state rule.

**Required implementation:** add a normalized state/UT identifier and an immutable OG-award record (or equivalent constrained fields) through an additive migration. Allocation must occur inside a database transaction with a per-state counter/lock and a unique constraint that makes duplicate awards impossible; the database, not the browser, determines eligibility and award order. The first 150 successful allocations for each state/UT are permanent; retries must be idempotent. State values should be normalized against an authoritative India state/UT list before allocation. No OG schema or award was changed in this audit.

## Booking hold workflow — implementation started

Added `public.create_booking_hold(...)` and `supabase/functions/create-booking-hold/index.ts` on the security-audit branch. The additive RPC is also applied to production project `ufvabnxcpxhusbdgunmb`.

The RPC:
- Derives customer identity from `auth.uid()`; callers cannot provide another customer ID.
- Locks the active artist row while validating/creating a hold, serializing concurrent requests for the same artist.
- Requires a future appointment, a maximum eight-hour duration, bounded booking details, and a valid idempotency key.
- Checks the artist's weekly local-time availability or an explicit available exception, then vetoes overlapping unavailable exceptions.
- Rejects overlaps with pending/confirmed bookings and unexpired held/awaiting-payment bookings.
- Creates a `design_requests` row and linked `held` booking atomically, with a 15-minute hold expiry.
- Grants execution to authenticated users only; anon/public execution is revoked. The function has a fixed `pg_catalog, public` search path.

The Razorpay order function now checks that a booking hold has not expired, extends the hold for a bounded 15-minute payment window, and sets the Razorpay order expiry to the same timestamp.

**Verified in production:** RPC exists as SECURITY DEFINER; search path is `pg_catalog, public`; anon execute is false; authenticated execute is true. Existing booking/design-request client policies remain SELECT-only, so browser clients still cannot insert or update those rows directly.

**Not yet verified:** End-to-end authenticated booking creation, real concurrency/overlap tests, Edge Function compilation, and Razorpay order expiry behavior. The Edge Function has not been deployed. Booking UI integration remains pending because the artist-facing UI currently depends on artist profile fields absent from the production schema; no fake compatibility data has been introduced.

### Paid booking lifecycle and artist confirmation

A second additive production migration now updates the Razorpay finalizer so a successfully paid cover-charge booking transitions from temporary `held` to durable `pending`, clears `hold_expires_at`, and continues blocking the slot until an artist acts. This avoids the paid appointment silently becoming bookable again after the checkout hold timeout.

Added `public.artist_confirm_booking(uuid)`:
- Requires an authenticated caller.
- Verifies the caller owns the active artist attached to the booking.
- Allows confirmation only for a `pending` booking whose cover charge is paid.
- Locks the booking row and updates only the valid pending state.
- Grants execution to authenticated users; anon/public execution is revoked.

Production privilege/search-path verification confirms both booking RPCs are SECURITY DEFINER with `pg_catalog, public` search path, anon denied, authenticated allowed; the payment finalizer remains service-role-only.

**Not yet implemented:** artist decline/cancellation and customer cancellation/refund workflows. Those must be designed with the payment/refund policy rather than silently deleting or cancelling paid bookings.

The artist dashboard's booking action now calls `artist_confirm_booking` instead of directly updating `bookings.status`. The reject action is temporarily disabled with an explanatory message until a refund-aware decline workflow exists. Supabase client function typings were updated for both booking RPCs.

### Booking security checks run

- Production catalog check: both booking RPCs are SECURITY DEFINER with the fixed `pg_catalog, public` search path.
- Privilege check: anon cannot execute either booking RPC; authenticated can. Payment finalization remains service-role-only.
- Negative SQL checks: unauthenticated invocation of both booking creation and artist confirmation was rejected as expected.
- Policy check: `bookings` and `design_requests` still expose only participant SELECT policies; no client INSERT/UPDATE policies were introduced.
- Local build/test execution was attempted but the execution environment could not resolve GitHub, so app/Edge Function compilation and automated tests remain unverified.

## Artist schema reconciliation — 27 November 2026

Production schema was confirmed to use `artists.status` (`pending`, `active`, `suspended`), `portfolio_items`, and `artist_availability`. The previous frontend expected legacy `application_status`, `portfolio_images`, and `availability_hours`; these legacy fields do not exist in production. No production artist rows existed during the audit.

Additive production changes:
- Added artist display/profile fields required by the current UI: `name`, `specialty`, `hourly_rate`, `experience_years`, `avatar_url`, and `available`, with rate/experience constraints.
- Added owner-scoped `artist_update_own_profile`, `artist_set_availability`, and `artist_replace_weekly_availability` SECURITY DEFINER RPCs. These use `auth.uid()`, fixed search paths, and authenticated-only execution.
- Added owner-scoped read/insert/delete policies for portfolio items. New portfolio items use the database default `approved=false`; artists cannot approve their own media.
- Added owner read policy for weekly availability.
- Added `get_my_artist_profile()` so the app can fetch the current artist record without exposing `artists.user_id` to clients.
- Removed SELECT privilege on `artists.user_id` for both anon and authenticated roles. Verified both are false.
- Added admin-only read policies for artist applications and portfolio items.
- Added `admin_review_artist` and `artist_resubmit_application`. Approval requires at least two portfolio items, approves the submitted portfolio set, marks the artist active but not available, and writes an admin audit entry. Rejection requires a reason and marks the artist suspended/hidden. Resubmission is owner-only.
- Added private `admin_audit_log` because this production table did not exist; admin reads are role-scoped and clients cannot write audit rows.
- Updated artist profile, dashboard, auth context, admin review UI, and admin-add-artist function to use the canonical schema. Admin artist creation now creates the required `profiles` row explicitly because production has no auth.users profile-creation trigger.

Production checks:
- Artist owner/profile/availability/review RPCs are SECURITY DEFINER with `pg_catalog, public` search path; anon execution is denied and authenticated execution is granted only where intended.
- Artist owner ID column is not selectable by anon or authenticated clients.
- Artist and portfolio RLS policies are in place; artist approval is no longer a direct client table update.
- The security advisor still reports five intentionally closed tables and warns about authenticated-executable SECURITY DEFINER RPCs. These RPCs are intentional narrowly scoped workflows with explicit owner/admin checks and fixed search paths; the advisor is a generic warning, not a passing security certification.
- Production currently has zero admin-role assignments and zero artist rows. Admin approval flow cannot be exercised until an authorized admin role is provisioned and a test artist account exists.

Not tested: web build, TypeScript, lint, browser/device journeys, authenticated owner RPC end-to-end, admin review end-to-end, media upload/storage privacy. Edge Functions remain undeployed.

### Media/storage status

Production storage currently has zero buckets and zero object policies. The app's Supabase fallback still targets a nonexistent public `reels-videos` bucket. The S3 presign source returns a CloudFront public URL and does not implement private read authorization; its Edge Function is also not deployed. Therefore portfolio upload and private-media access are not launch-ready. No bucket or storage policy was created, and no public-media exception was introduced. Before enabling uploads, implement private object storage with owner-scoped upload, admin moderation, and short-lived signed read URLs (or a verified private CDN signing design); remove public URL assumptions from gallery and media delivery.

Negative SQL checks also confirmed unauthenticated calls to `admin_review_artist` and `artist_update_own_profile` are rejected. The current production role table has zero admin assignments; admin workflows are correctly inaccessible until an owner-authorized admin role is provisioned.
