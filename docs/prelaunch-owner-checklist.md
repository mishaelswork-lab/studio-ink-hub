# Pre-launch owner checklist

This checklist separates code readiness from external setup. Nothing here authorizes deployment or publication.

## Current verified production state

- Supabase target: Tartspace `ufvabnxcpxhusbdgunmb`.
- Auth users, artist records, bookings, payments, and admin role assignments: **zero** at the last read-only check.
- Deployed Edge Functions: **zero**.
- Portfolio and Reel storage buckets are private.
- The legacy MCP integration is disabled and its unsafe generated Edge Function source has been removed from this branch.

## Owner actions before a real user test

1. Confirm the production web origin and set Supabase Auth Site URL and allowed redirect URLs to that exact origin.
2. Configure email delivery and verify email confirmation/reset links work from the production origin.
3. Add the required secrets through Supabase Edge Function Secrets; use Razorpay Test Mode only.
4. Review the deployment list and deploy only the reviewed functions. In particular, `auth-guard` must be deployed with `verify_jwt = false` because it is the public, rate-limited sign-in/OTP entrypoint. Do not deploy legacy or unreviewed functions.
5. Create the owner's account through customer email sign-up, verify the email, confirm consent records exist, then follow [First administrator bootstrap](./first-admin-bootstrap.md).
6. Test customer sign-up, email verification, sign-in, password reset, phone sign-in for existing accounts, sign-out, and account deletion using test accounts.
7. Use a separate test artist account to validate portfolio upload, two-item minimum, pending review, admin approval, public listing, booking receipt, and artist acceptance.
8. Complete Razorpay sandbox tests for ₹49 cover charge, ₹44.10 member cover charge, ₹395 lifetime membership, and ₹500 / 30-day featured boost. Include failed, duplicate, mismatched amount/order, and replay cases.
9. Verify cross-user RLS denials for profiles, bookings, payments, chats, favorites, portfolio objects, reports, and signed media URLs.
10. Run responsive browser checks and native Android/iOS auth, privacy, account deletion, payment-policy and permission checks before store submission.

## Known launch blockers / owner decisions

- **Artist self-service registration is not implemented in the routed app.** The admin panel currently provisions artist accounts. A first-login artist consent gate now records the artist's own 18+ attestation, Privacy Policy acceptance, and Terms acceptance; a self-service artist application/invitation journey is still required before public artist registration. Never record consent on an artist's behalf.
- **Edge Functions are not deployed.** Authentication and payment flows that depend on them cannot be considered end-to-end tested.
- Razorpay sandbox credentials and real Meta professional-account access have not been supplied/tested.
- No production test users exist, so customer/artist/admin E2E and cross-user authorization journeys remain unverified.
- The latest production-only npm audit reports 15 advisories (12 high, 2 moderate, 1 low; zero critical). A one-time branch-only remediation workflow now applies non-breaking npm audit fixes, verifies the audit/build/tests, and commits only the lockfile if successful.
- ESLint remains a CI blocker with 119 errors and 16 warnings, primarily existing explicit `any` usage; do not suppress the rule globally.
- Web domain, SSL, production monitoring, Android signing/store listing, and iOS signing/App Store configuration remain owner setup tasks.

## Release boundary

Do not merge the draft PR, deploy functions, enable live payments, change DNS, or publish web/mobile builds without the owner's explicit approval.
