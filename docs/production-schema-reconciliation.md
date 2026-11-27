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


## Verification and private-media audit — 27 November 2026

### Build / TypeScript / lint / browser verification

The repository defines these scripts: `build` (Vite), `lint` (ESLint), and `test` (Vitest). TypeScript project references are configured in `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.node.json`; the project does not currently define a dedicated typecheck script. The checked-in Playwright dependency alone does not constitute a browser test suite.

**Execution status:**
- Local checkout and dependency installation: blocked because this execution environment could not resolve `github.com` (DNS/network failure). No local build, TypeScript, lint, or Vitest result is claimed.
- GitHub Actions: no workflow runs were associated with the inspected branch head at the time of audit. Added `.github/workflows/ci.yml` to run `npm ci`, `npx tsc -b`, Vite build, ESLint, and Vitest on pushes to this branch and PRs targeting main. The new workflow has not yet run; its result must be checked after GitHub Actions starts it.
- Browser tests: not run. No runnable Playwright spec/config was confirmed in the inspected source, and no deployed preview URL was supplied.
- Authenticated end-to-end journeys: not run. Production currently has zero artist records and zero admin role assignments; no dedicated customer/artist/admin test identities were provided. Do not create test users or assign admin privileges in production as a substitute.

### Additional security findings

- The live security advisor reports eight authenticated-executable SECURITY DEFINER functions. Source inspection confirms each inspected function uses a fixed `pg_catalog, public` search path and includes explicit identity/ownership or admin-role checks. The generic advisor warning remains open for code review and least-privilege testing; it is not evidence by itself that these functions are exploitable. Do not revoke authenticated execution blindly because the app's workflows call these RPCs.
- `portfolio_items` currently contains `media_url` and `source_url`. Its public SELECT grant covers all columns, while the public row policy filters to approved items for active artists. The all-column grant is broader than necessary and may expose a source/original URL. Restrict public column grants to display metadata and the approved delivery field after confirming the app contract; keep source/original paths private.
- Storage audit: production has zero buckets and zero policies on `storage.objects`. No bucket was created during this review.
- `src/lib/mediaUpload.ts` currently uploads via the S3 presign function and returns a public CloudFront URL; its fallback uses a nonexistent `reels-videos` bucket and `getPublicUrl`. This violates the private-by-default requirement.
- `supabase/functions/s3-presign/index.ts` returns a public CDN URL, accepts caller-supplied MIME type without a strict allowlist/size policy, and has no corresponding signed-read authorization flow. It must not be deployed as-is.
- The artist dashboard reads all portfolio `media_url` values without checking `approved`; the public artist profile does filter approved portfolio rows. Dashboard must distinguish pending moderation items from public approved items.

### Private-media implementation contract

Implement only after app and DB contracts are reconciled:
1. Private bucket, never public; restrict image MIME types and object size; random immutable object keys.
2. Object paths bound to the authenticated artist identity and artist record. Upload/delete/list policies must check ownership from database state, not client-supplied owner IDs.
3. Portfolio row stores a private object path, not a public CDN URL. New uploads are pending by default; artists cannot set approval state.
4. Admin moderation uses a server-authorized decision path with immutable audit entries. Approval should not expose originals/source URLs.
5. Approved public portfolio delivery uses a short-lived signed read URL issued only after verifying both `portfolio_items.approved = true` and owning artist `status = 'active'`. Pending/rejected media remains inaccessible to other users.
6. Enforce upload size, MIME, image decoding/content validation, and safe deletion/orphan cleanup. Avoid accepting arbitrary remote URLs as trusted media.
7. Replace all `getPublicUrl` and public CloudFront assumptions; test owner upload/read/delete, cross-owner denial, pending-media denial, admin approve/reject, and approved public delivery.

No storage bucket, object, policy, public URL, or production media record was changed in this audit.


### Client column privilege correction — 27 November 2026

A production review found the artist compatibility migration had granted SELECT on `artists.user_id` to anon/authenticated and public portfolio SELECT included `source_url`. This exceeded the intended public profile contract.

**Corrective additive migration applied to production:** `tighten_artist_portfolio_client_column_access`.
- Revoked client SELECT on `artists.user_id` and `artists.rejection_reason`.
- Revoked broad portfolio SELECT and re-granted only `id, artist_id, media_url, media_type, caption, approved, created_at`.
- Revoked authenticated INSERT of `source_url`.
- Kept existing RLS policies and enabled RLS on both tables.
- Post-migration catalog check returned no client column privileges for `user_id`, `rejection_reason`, or `source_url`; public approved/active and owner/admin policies remain.

This is a security correction; it may reveal frontend assumptions that query owner IDs or source URLs. Reconcile those consumers to use owner-scoped RPCs and private object paths, never re-grant these columns for convenience.

### Storage implementation sequencing

Do not create a private bucket until upload and signed-read flows are implemented together. A private bucket without an approved-media signed-read path would break public portfolio display; a public bucket or public CDN URL is not an acceptable interim workaround.


### CI run result and lockfile remediation — 27 November 2026

GitHub Actions run `45971002274` (ArtSpace CI, run 7) successfully checked out the branch and set up Node 20, then **failed at `npm ci`** before TypeScript/build/lint/tests. The lockfile omits optional platform package entries for esbuild (including Linux x64 and other platform variants), so npm's clean-install consistency check rejects it. This is a real CI failure, not a build failure.

Updated the workflow to run `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` before `npm ci`, to reconcile the incomplete lock metadata in the ephemeral runner and continue deterministic installation. This is a temporary CI unblocker; the committed `package-lock.json` should be regenerated and committed from a controlled Node/npm environment so local and CI installs behave identically. A later CI run passed dependency installation, TypeScript, production build and unit tests; the Deno check was also passing for the functions then included. Full-project ESLint failed on legacy lint debt (163 violations, mostly explicit `any`). The subsequent account-deletion Deno check exposed a `npm:` import resolution issue; the import was switched to the pinned `esm.sh` form used elsewhere, but a fresh CI run for the latest head has not yet been observed.

### Public artist profile compatibility

After removing public SELECT access to `artists.user_id`, the public artist profile query was changed from `select(*)` to an explicit public-column projection. The public page no longer subscribes to full-row realtime updates, which could otherwise expose non-public columns in row payloads. The block control currently depends on the private owner ID and therefore remains unavailable on that public page until a safe artist-ID-based block RPC is implemented.


### Private portfolio storage — first implementation slice — 27 November 2026

**Production bucket created:** `portfolio-private`, private (not public), 5 MiB maximum object size, allowed MIME types JPEG/PNG/WebP. No public read policy exists.

**Owner-scoped object policies:** authenticated insert, read and delete are limited to paths `<auth.uid>/<artist.id>/<random-file>` and require the artist row to belong to the authenticated user. A policy qualification ambiguity was caught during verification and corrected immediately; the final catalog check shows the artist relation compares against `storage.objects.name`. The bucket is private throughout.

**Branch implementation:**
- Replaced the old S3/public CloudFront and public Supabase fallback uploader with a private Supabase Storage uploader that enforces MIME type and 5 MiB size client-side; server bucket limits remain authoritative.
- The fastest/primary portfolio intake is now the artist's connected professional Instagram account: Meta Instagram Login imports single photos, carousels and Reels into private storage, with moderation before publication. Raw public-URL import is intentionally disabled because it bypasses ownership and storage validation. Manual upload remains the fallback.
- Added `get-portfolio-media` Edge Function. It verifies JWTs when present, permits anonymous access only to approved media for active artists, permits owners to access their own pending media, permits admins via database role, validates the object path, and issues a 120-second signed URL.
- Added `src/lib/portfolioMedia.ts` signed URL helper.
- Updated artist dashboard to create pending portfolio rows, resolve signed media for moderation, and clean up object/row when moderation or media delivery fails.
- Updated public artist profile to resolve only approved portfolio media through the signed-media function.
- Direct, unauthenticated Instagram URL scraping/import is disabled. The supported Instagram path is OAuth-connected import from the artist's own professional account; manual upload is the fallback.

**Not yet complete / important blocker:** the signed-media Edge Function has not been deployed. Until it is deployed and verified, portfolio uploads intentionally fail closed and public portfolio images will not resolve. Do not re-enable public CDN URLs as a fallback. Edge Function deployment requires separate approval and secret/runtime verification. No actual user media has been uploaded or modified.

**Verification:** production bucket configuration and policy catalog reviewed; internal artist owner ID and portfolio source URL grants remain zero for anon/authenticated. No authenticated storage upload/read/delete test has been run yet.


### Safe account deletion — 27 November 2026

**Production migrations applied additively** on the confirmed ArtSpace project:
- Booking, conversation, design-request, message-sender, artist-owner, payment-customer and admin-audit actor references now allow `ON DELETE SET NULL` where historical records must survive Auth deletion.
- The artist record is retained only as a suspended, anonymised historical FK target when it has booking/payment history. Its user link, public profile data, portfolio items, Reels, designs and availability are removed. Featured placement is deactivated.
- Customer booking/payment history and admin audit rows are retained with identity references detached. Membership entitlements, favorites, saved designs, chats, customer-owned design requests and artist media are removed.
- Last-admin deletion and deletion while active bookings exist (customer or artist side) are blocked.
- The account-deletion preparation RPC is SECURITY INVOKER and executable only by `service_role`; anon/authenticated execution was verified false.
- Booking creation and deletion take a shared profile-row lock, preventing a new booking from racing with deletion. New payment-order creation is blocked while deletion is pending.
- The Edge Function recursively removes user-scoped objects from the two private portfolio buckets before calling Auth admin deletion. It is idempotent enough to retry if storage or Auth deletion fails after database preparation.
- The profile is marked deletion-pending and stripped of profile PII during preparation. App sign-out follows successful deletion.

**Verification:** production FK actions/nullability, function grants, and profile-row locks verified. A call with a non-existent UUID correctly failed the profile guard without modifying data. At verification time production had zero Auth users, artists, bookings, payments, admin role assignments and zero objects in the two private portfolio buckets; no customer data was touched.

**Not tested:** authenticated customer/artist/admin deletion journeys, active-booking rejection against a populated staging dataset, recursive Storage deletion with real objects, or actual Auth user deletion. No Edge Function was deployed. A staging test identity is required before treating account deletion as fully end-to-end verified.


### Product support tables — 27 November 2026

Added the missing product support tables referenced by existing frontend flows: `reviews`, `content_reports`, `user_blocks`, `consent_records`, `push_subscriptions`, `artist_certifications`, and `perf_metrics`. RLS is enabled on all seven, with owner/admin/public visibility separated by policy. Review insert/update requires a completed booking owned by the reviewer and matching artist; customer updates cannot change a review out of pending moderation. User block rows are private to the blocker. Consent records are immutable to client roles. Push subscriptions are owner-only. Certifications are public only after admin verification. Reports are reporter/admin scoped. Performance metrics allow bounded public insertion and admin-only reads.

The account-deletion RPC was extended to remove reviews authored by the deleted customer, user-block rows, push subscriptions, and artist certifications while retaining financial booking/payment history and audit records.

**Important remaining source/schema mismatch:** regenerating types from production exposed legacy frontend references to `consultations`, `consultation_messages`, `daily_designs`, `featured_requests`, `change_audit_log`, and `design_reports`, plus legacy column assumptions. After adding the product support tables, the latest completed TypeScript run still reports 83 errors across 11 files. These need a focused reconciliation to canonical `conversations`, `messages`, `designs`, `featured_artists`, and `admin_audit_log`; do not suppress them by weakening generated types or adding duplicate legacy tables.
