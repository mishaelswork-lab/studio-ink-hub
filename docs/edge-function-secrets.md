# Edge Function secret checklist

Set these values only in **Tartspace** Supabase Edge Function Secrets. Do not put them in GitHub files, `.env.example`, frontend `VITE_*` variables, screenshots, or chat messages.

## Razorpay (sandbox first)

Required by the payment functions:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Use Razorpay **Test Mode** credentials while validating. Do not replace them with live credentials until the owner explicitly approves the production payment cutover. Never perform a real charge or refund during QA.

## Instagram Login

Required for the connected professional-account import flow:

- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI` = `https://ufvabnxcpxhusbdgunmb.supabase.co/functions/v1/instagram-connect-callback`
- `INSTAGRAM_TOKEN_ENCRYPTION_KEY` = base64 encoding of 32 cryptographically random bytes
- `ARTSPACE_APP_URL` = the verified ArtSpace app origin used for OAuth redirects
- `INSTAGRAM_GRAPH_API_VERSION` = optional; defaults in code if omitted

Generate a token-encryption key locally, for example with `openssl rand -base64 32`. Store it directly in Supabase Edge Function Secrets. Keep it stable: changing it without a planned token re-encryption process will make previously stored Instagram tokens unreadable.

Instagram Login requires a Meta app configured for professional Instagram accounts and the required permissions/app review for general artist access.

## Supabase-provided runtime values

Supabase Edge Functions receive their standard project URL and service-role runtime secrets from the platform. Never copy the service-role key into the browser, a `VITE_*` variable, or the repository.

## Before deployment

1. Confirm the active project is Tartspace (`ufvabnxcpxhusbdgunmb`).
2. Confirm all required secrets exist without printing their values.
3. Deploy only the specifically reviewed functions.
4. Test Instagram with an owner-controlled test professional account and Razorpay in Test Mode.
5. Keep portfolio and Reel buckets private; do not make them public to work around missing media functions.
