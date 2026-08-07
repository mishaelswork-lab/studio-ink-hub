# Shipping Tart to Google Play, the App Store, and as an APK

Tart is currently a web app. To get a real APK and store-ready iOS/Android builds, we wrap the existing app in Capacitor (a native shell around the same React code) and then close the store-compliance gaps.

## Phase 1 — Native shell (gets you the APK)

1. Add Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`) and a `capacitor.config.ts` with:
   - appId `app.lovable.14974305742c46c1884aecc456ee5259` (or a custom `com.tart.app` if you prefer — must be final before first store upload)
   - appName `Tart`
   - a dev-only `server.url` pointing at the preview for hot reload, removed for release builds
2. Add app icons and splash screens generated from the Tart medallion logo (all Android densities + iOS sizes).
3. Add native status bar / safe-area handling so the dark gold theme extends correctly on notched phones.
4. Document the local build steps: export to GitHub, `npm i`, `npx cap add android`, `npm run build`, `npx cap sync`, then `npx cap run android` or build a signed APK/AAB in Android Studio.

Note: Lovable cannot compile the APK itself — Android Studio (free, Windows/Mac/Linux) produces the APK; Xcode on a Mac is mandatory for iOS.

## Phase 2 — Store account requirements (you, not code)

| Item | Google Play | Apple |
|---|---|---|
| Developer account | $25 one-time | $99/year |
| Identity/DUNS | Individual/org verification | Org needs D-U-N-S |
| Upload format | AAB (APK only for sideloading) | IPA via Xcode/Transporter |
| Extra for new personal Play accounts | 12 testers × 14 days closed test before production | none |
| India-specific | Payments profile + PAN/GST for paid features | same |

## Phase 3 — Compliance gaps to fix in the app

These are the common rejection reasons for an app like Tart:

1. **Account deletion in-app** (mandatory both stores) — a "Delete my account" flow in Profile that removes the auth user and personal data via an edge function.
2. **User-generated content rules (Apple 1.2)** — reels, chats and designs need: report content, block user, and a stated 24-hour moderation SLA. Reporting exists for designs; needs extending to reels, artists and chat messages, plus a block list.
3. **Payments** — Razorpay is fine for booking a real-world tattoo service (physical service, allowed). But the ₹199/3-month membership and the artist "featured boost" are digital goods; Apple will demand In-App Purchase (30%/15% cut) unless we reposition them. Decision needed — see question below.
4. **Privacy** — Play Data Safety form and Apple Privacy Nutrition Labels must match what we actually collect (auth, photos uploaded for AI match, location radius, chats, analytics). Privacy policy URL already exists and can be reused.
5. **Permissions** — camera/photo library usage descriptions in `Info.plist` and Android manifest, with plain-language reasons; request location only at point of use.
6. **AI content disclosure** — label AI-generated stencils clearly and add a content-safety note (both stores review generative features).
7. **Age rating** — tattoo content typically 12+/17+ depending on imagery; questionnaire answers must be honest or the app gets pulled.
8. **Sign in with Apple** — required on iOS because Google sign-in is offered.
9. **No dead ends** — no broken links, no "coming soon" screens, no visible admin/test surfaces; demo credentials must be supplied to Apple reviewers in App Review notes.

## Phase 4 — Submission

Store listing assets (icon 512, feature graphic 1024×500, 4–8 screenshots per device class, short/long description), release signing key (keep the keystore safe — losing it means losing the app), internal testing track, then production rollout. Expect 1–3 days Apple review, hours-to-days for Play.

## Technical notes

- Capacitor keeps a single React codebase; no rewrite.
- Push notifications currently use web push — that will need `@capacitor/push-notifications` + FCM/APNs for native builds.
- Razorpay has a Capacitor-compatible checkout; the current web checkout works inside the native webview but should be tested.
- Deep links (`/booking/:id` from notifications) need `assetlinks.json` / Apple App Site Association for universal links.

## Suggested first step

Phase 1 only: add Capacitor, icons, splash, safe-area handling, and a build README so you can produce a working APK today. Then tackle compliance in a second pass.
