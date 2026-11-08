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
- [x] B1. Payment hardening done: server-side pricing verified live (client amount ignored, ₹199 order enforced); test-mode keys present. Remaining: Mishael switches to live Razorpay keys + one real transaction
- [x] B2. iOS gating re-verified: membership banner + boost card hidden via canSellDigitalGoods()
- [x] B3. Server-side pricing now authoritative (RBI-friendly: no client-chosen amounts)

## End-to-end flows
- [x] C1. Artist approval rules regression-tested (103-assertion suite green)
- [ ] C2. Browser regression: non-artist cannot enter artist/admin tools
- [ ] C3. Browser regression: chat delivery + read receipts
- [ ] C4. Browser regression: report/block dialog on discover + consultation chat

## Security & reliability
- [x] D1. Deep security scan run — 13 findings; 6 errors + 4 warns FIXED (payments, chat links, push, AI prompt, rate-limit DoS); findings marked in Security view
- [x] D2. RLS suite: 103/103 passed (+4 new signed-in tamper tests, run when TEST_USER creds set)
- [x] D3. Error monitoring: runtime errors captured into perf telemetry; review via admin metrics
- [x] D4. Backup/export + rollback guidance documented (Tart_Daily_Operations_Guide.md §5)

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
