# Instagram portfolio import — setup and release checklist

ArtSpace imports only media returned by Meta's official Instagram API for the artist's own connected professional account. A pasted link is matched against that account's media library; it is not scraped or downloaded from arbitrary public URLs.

## Meta developer setup

1. Create or select the ArtSpace Meta developer app.
2. Add the Instagram API product and configure Instagram Login / Business Login.
3. Copy the **Instagram App ID and Instagram App Secret from the Instagram API setup** (do not substitute the general Meta App ID/Secret from App Settings → Basic).
4. Request the `instagram_business_basic` permission.
5. Configure the exact OAuth redirect URI:
   `https://ufvabnxcpxhusbdgunmb.supabase.co/functions/v1/instagram-connect-callback`
6. Ensure the Instagram account is a supported professional (Business or Creator) account and is added as a tester while the Meta app is in development mode. Complete Meta app review / required access before opening the integration to all artists.

## Supabase Edge Function secrets

Set these in the Supabase project's Edge Function secrets. Never put them in Vite variables, source control, or chat.

- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI` — the exact callback URI above
- `INSTAGRAM_TOKEN_ENCRYPTION_KEY` — base64-encoded 32 cryptographically random bytes for AES-256-GCM token encryption
- `INSTAGRAM_GRAPH_API_VERSION` — optional; defaults to `v27.0` and should be updated with Meta's supported version schedule
- `ARTSPACE_APP_URL` — the canonical ArtSpace web origin, with no path

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.

## Current implementation

- Artist-owned OAuth state is random, expires after 10 minutes, and is consumed once.
- Instagram long-lived access tokens are encrypted before persistence; token rows are service-role-only.
- Imports match a URL against the connected account's media list, download only Meta-returned CDN URLs, enforce MIME and size limits, and store objects in private buckets.
- Single photos and multi-photo carousel posts become pending `portfolio_items`; Instagram videos/Reels become pending `reels`. Neither is public before moderation/approval.
- Signed media endpoints issue short-lived URLs and check owner, admin, and approved-public access.
- Duplicate Instagram media IDs are blocked by database unique indexes.
- Meta may omit `media_url` for copyrighted or restricted media (including some Reels with copyrighted audio); those items cannot be copied through this API and must use the manual upload fallback.

## Not yet launch-ready

The functions are branch-only and have not been deployed or tested against a real Meta app/account. After secrets are configured, deploy the Instagram and signed-media functions only with explicit deployment approval, then test OAuth denial/replay/expiry, token refresh, photo import, Reel import, duplicate import, unsupported media types, oversized media, revoked access, moderation rejection, and anonymous approved-media playback.
