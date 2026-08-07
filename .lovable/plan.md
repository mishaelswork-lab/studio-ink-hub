# Store Compliance Fixes (App Store + Play Store)

Close the in-app gaps that most commonly cause rejection, before any native packaging work. All of this is web-app work that also carries into the Capacitor build later.

## 1. In-app account deletion (mandatory, both stores)

Currently there is no way to delete an account from inside the app — this is an automatic rejection on iOS (5.1.1(v)) and a Play Data Safety violation.

- New "Delete my account" section in Profile → Privacy: explains what is removed, requires typing DELETE to confirm.
- New `delete-account` edge function (service-role): removes profile, favorites, consent records, push subscriptions, consultations/messages, design views/reports, then deletes the auth user.
- Bookings and payments are anonymised rather than hard-deleted (customer_id nulled, name replaced with "Deleted user") because tax/dispute records must be retained — the retention reason is already stated in the Privacy Policy.
- Artists with active bookings get a clear "settle or cancel upcoming bookings first" message.

## 2. UGC safety: report + block (Apple 1.2)

Reporting exists only for discovery designs. Apple requires the full set anywhere users see user-generated content or message each other.

- Extend reporting to reels, artist profiles, and individual chat messages by generalising `design_reports` into a `content_reports` table (`content_type`, `content_id`).
- New `user_blocks` table: block an artist or customer. Blocked users' reels/profiles are hidden and messaging between them is refused (RLS + client filter).
- Report and Block actions in the reel overflow menu, artist profile menu, and chat message long-press.
- Admin moderation queue extended to handle every report type with a stated 24-hour response commitment, surfaced in Terms.
- Terms of Service gains an explicit "zero tolerance for objectionable content" clause — Apple looks for this exact wording.

## 3. Sign in with Apple (iOS requirement)

Google sign-in is offered, so Apple requires Sign in with Apple alongside it on iOS. Add the Apple provider to the login, artist login, and signup screens using the managed Cloud auth path.

## 4. Payments — avoid the IAP rejection

Booking fees and cover charges via Razorpay are fine (real-world service, allowed by both stores). The risk is the ₹199/3-month membership and the artist featured boost — Apple treats these as digital goods and will demand In-App Purchase.

Recommended approach for v1: detect the native iOS build and hide the membership purchase and boost checkout there (content stays viewable, purchase happens on the web). This ships without a 30% cut and without IAP plumbing. Play Store has no equivalent restriction, so Android keeps Razorpay.

## 5. Permissions and privacy disclosures

- Add plain-language purpose strings for camera and photo library (used for AI tattoo match and portfolio uploads) plus location (studio radius search), and request each only at the point of use.
- Produce a data-map document listing exactly what is collected and why, matching Play Data Safety and Apple Privacy Nutrition Label answers to the Privacy Policy already published.

## 6. AI content disclosure

Label generated stencils clearly as AI-generated in the results UI and add a short AI-use section to the Privacy Policy and Terms (what is sent to the model, that uploads are not used for training).

## 7. Age gate

Tattoo/piercing is 18+. Add a one-time date-of-birth / 18+ confirmation at signup stored on the profile, and answer both store age questionnaires consistently (17+ / Mature).

## 8. Remove review-blocking dead ends

- Ensure `/staging-check` and any test-only routes are excluded from production builds.
- Verify no broken links, no placeholder screens, and that the admin surface stays invisible to reviewers who log in with the demo customer account.

## Technical summary

New backend: `content_reports` and `user_blocks` tables (RLS + grants), `delete-account` edge function.
Changed: Profile privacy section, reel/profile/chat action menus, AdminPanel moderation queue, login screens (Apple), signup (age gate), membership + boost gating by platform, Terms and Privacy copy.
No changes to booking, discovery or chat core logic.

## Suggested order

1 (deletion) and 2 (report/block) first — those are the hard blockers. Then 3, 7, 4, then copy/disclosure items 5 and 6.
