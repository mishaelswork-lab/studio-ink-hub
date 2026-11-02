# Launch Readiness Checklist (going public)

## A. Publish & URLs
- [ ] A1. Verify legal routes render publicly: /privacy, /terms, /grievance, account deletion
- [ ] A2. Publish the app (needs Mishael's go-ahead at the end)
- [ ] A3. Connect real Tart domain (blocked: needs Mishael's domain / DNS)

## B. Payments
- [ ] B1. Verify Razorpay config state & payment code paths; document exactly what Mishael must configure for live payments (blocked: live keys are his)
- [ ] B2. Re-verify iOS gating: membership banner + boost card hidden on iOS
- [ ] B3. RBI-compliant placeholders still intact (no real payment claims)

## C. End-to-end flows
- [ ] C1. Artist approval flow regression: pending → 2 photos → admin approve/reject with reason
- [ ] C2. Non-artists cannot enter artist tools / admin tools (RBAC)
- [ ] C3. Chat delivery + read receipts still work
- [ ] C4. Report/block flow works (design reports + content reports queue)

## D. Security & reliability
- [ ] D1. Run fresh security/RLS scan and fix any findings
- [ ] D2. Run existing RLS test suite (106 assertions)
- [ ] D3. Error monitoring: capture runtime errors into perf telemetry for admin metrics
- [ ] D4. Backup/export guidance documented (rollback plan)

## E. Operations
- [ ] E1. Document daily admin routine (applications, reports within 24h)
- [ ] E2. Document support inbox process for artspacehelp@gmail.com (disputes, deletions, failed bookings)
- [ ] E3. Backup admin account recommendation documented (blocked: needs Mishael to create it)

## F. Launch content
- [ ] F1. Check seeded content counts: approved artists, studios, non-repeating designs
- [ ] F2. Customer onboarding message + artist onboarding guide up to date for "Tart"

## G. Store readiness (native, optional for web launch)
- [ ] G1. Capacitor packaging, permissions, screenshots, age ratings (deferred until web launch done)
