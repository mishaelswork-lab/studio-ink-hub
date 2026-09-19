# Artist approval queue and logo startup

## What will change
- Make every newly created artist profile start as **pending** and unavailable, including accounts created by an admin.
- Let the artist sign in, set their rate and profile details, and upload their required two portfolio photos while pending.
- Add an admin-only Artist Applications queue with portfolio previews, approve and reject actions, mandatory rejection reasons, reviewer timestamps, and audit-log entries.
- Enforce approval and the two-photo minimum in the database so changing browser data cannot publish an unapproved profile.
- Keep rejected profiles editable and allow resubmission after the artist addresses the admin’s reason.

## Admin Add Artist flow
- Change Add Artist to create the account and pending profile without requiring the admin to upload the artist’s work.
- Run the full flow: create a temporary artist account, confirm artist login, set a rate, upload two photos, confirm publication remains blocked, approve in the admin queue, then confirm the profile can go live.
- Remove the temporary test account and uploaded test data after verification.

## Logo and startup
- Remove the visible halo from the logo asset and remove blend/mask effects that recreate it in the navigation and home page.
- Add a short first-load opening screen where the logo star spins, then the app reveals smoothly.
- Preload the home page’s critical logo and visible images during that opening without delaying longer than a strict timeout.
- Respect reduced-motion preferences and avoid replaying the opening on every page navigation.

## Technical safeguards
- Add approval status, reviewer, review time, rejection reason, and submission time fields to artist profiles.
- Update the existing profile-validation trigger to prevent non-admin approval-field changes and force `available = false` unless approved with at least two photos.
- Restrict public artist reads to approved profiles while preserving self/admin access to pending profiles.
- Record approve, reject, and resubmit actions in the existing audit system.
- Update generated client typings used by the frontend after the database migration.

## Verification
- Check the database security rules and run the existing RLS test suite.
- Confirm desktop and mobile startup visuals, reduced-motion behavior, and absence of the logo halo.
- Confirm the real admin → artist → admin approval journey end to end in the browser.
