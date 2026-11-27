# Roadmap
## Current request
- [ ] Assign permanent OG badges to the first 150 new artist profiles per Indian state
- [ ] Replace the hero tagline with “Where art of tattoos gets a start” in defaults and saved settings
- [ ] Remove exposed demo admin credentials and grant admin access after the support account exists

## Launch readiness (going public)
- [x] A1. Verify legal routes render publicly: /privacy, /terms, /grievance (all render, no page errors)
- [ ] A2. Publish the app (needs Mishael's go-ahead)
- [ ] A3. Connect real Tart domain (blocked: needs Mishael's domain / DNS)

## Payments
- [ ] B1. Payment reconciliation in progress: branch-only Edge Function changes now use canonical `payments` columns and `finalize_razorpay_payment`; live pricing verified as ₹49 booking cover, ₹395 lifetime membership, 10% member cover discount, ₹500/30-day featured boost. Not deployed or sandbox-tested. Owner action: regenerate lockfile, confirm Razorpay test credentials/secrets, then run sandbox scenarios. Never run a real transaction without explicit approval.
- [x] B2. iOS gating re-verified: membership banner + boost card hidden via canSellDigitalGoods()
- [x] B3. Server-side pricing now authoritative (RBI-friendly: no client-chosen amounts)

## End-to-end flows
- [x] C1. Artist approval rules regression-tested (103-assertion suite green)
- [ ] C2. Browser regression: non-artist cannot enter artist/admin tools
- [ ] C3. Browser regression: chat delivery + read receipts
- [ ] C4. Browser regression: report/block dialog on discover + consultation chat
- [ ] C5. End-to-end booking, membership, and featured boost payment sandbox tests

## Security & reliability
- [x] D1. Deep security scan run — 13 findings; 6 errors + 4 warns FIXED (payments, chat links, push, AI prompt, rate-limit DoS); findings marked in Security view
- [x] D2. RLS suite: 103/103 passed (+4 new signed-in tamper tests, run when TEST_USER creds set)
- [x] D3. Error monitoring: runtime errors captured into perf telemetry; review via admin metrics
- [x] D4. Backup/export + rollback guidance documented (Tart_Daily_Operations_Guide.md §5)
- [x] D5. Restore restricted admin role helper required by reel moderation/admin audit RPCs; anon execution denied
- [x] D6. Restore safe public reads and admin-only writes for platform settings; verify anon cannot insert and non-admin update is blocked
- [ ] D7. Account deletion Edge Function source reconciled with database preparation RPC and private storage cleanup; Deno compile and disposable-account test still required
- [ ] D8. Review CORS wildcard allow-list and payment duplicate-order/idempotency handling before deployment

## Operations
- [x] E1. Daily admin routine documented (Tart_Daily_Operations_Guide.md §1)
- [x] E2. Support inbox process documented (§2)
- [ ] E3. Backup admin account created (blocked: needs Mishael to create it — §4)

## Launch content
- [x] F1. Content counts checked: 1 approved artist, 89 curated designs, 0 approved reels — artist/reel seeding needed before launch
- [ ] F1b. Seed more approved artists + first approved reels (needs real artists from Mishael)
- [x] F2. Onboarding guide exists (Tart_Artist_Onboarding_Guide.md); ops guide covers customer side

## G. Store readiness (native, optional for web launch)
- [ ] G1. Capacitor packaging, permissions, screenshots, age ratings (deferred until web launch done)

## Immediate owner action
- [ ] Regenerate `package-lock.json` locally with `npm install`, then commit and push to `audit/launch-readiness-2026-11-27`. CI is currently blocked at `npm ci`; lint, tests and build have not run on the branch.
