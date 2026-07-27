# Plan: Booking MCP tools, status notifications, Pinterest-only Discovery

## 1. MCP: create_booking & cancel_booking tools

New files under `src/lib/mcp/tools/`:

- **`create-booking.ts`** — inputs: `artist_id` (uuid), `service_type` ("tattoo"|"piercing"), `date`, `time`, `style`, `placement`, `size?`, `description?`, `customer_name`, `customer_phone?`. Handler uses the caller's user-scoped Supabase client (RLS enforces `auth.uid() = customer_id`) to insert into `bookings`. Prepends `[Piercing]` to `style` for piercing (matches existing BookingPage convention). Returns the new `booking_id` plus a `payment_intent` object obtained by invoking the existing `create-razorpay-order` edge function server-side (amount = ₹500 cover charge) — the response contains `order_id`, `amount`, `currency`, `key_id` for the agent to hand back to the user, plus a checkout URL hint (`/booking?resume=<id>`). If Razorpay isn't configured, still return the booking with `payment_intent: null` and a note.

- **`cancel-booking.ts`** — input: `booking_id` (uuid), optional `reason`. Handler updates `bookings.status = 'cancelled'` via the user-scoped client. RLS today lets only artists/admins UPDATE; add a policy allowing customers to update **their own** booking's `status` to `cancelled` (migration below). Returns updated row.

Register both in `src/lib/mcp/index.ts` `tools: [...]`.

## 2. Booking status change notifications over MCP

MCP has no server-push channel today, so "proactive" means: (a) a queryable notifications feed the agent polls, plus (b) real push/email already firing so the user is not solely reliant on the agent.

**DB migration** — new table `public.booking_notifications`:
- `id uuid pk`, `user_id uuid` (recipient — customer or artist), `booking_id uuid fk bookings`, `event text` (`accepted|rejected|updated|cancelled`), `message text`, `read_at timestamptz`, `created_at timestamptz default now()`.
- Follow the required 4-step order: CREATE TABLE → GRANT (`authenticated`: SELECT/UPDATE; `service_role`: ALL) → ENABLE RLS → policies (`user_id = auth.uid()` for select/update).
- Trigger `bookings_status_notify` on `AFTER UPDATE` of `bookings` when `OLD.status IS DISTINCT FROM NEW.status`: insert one row for `customer_id` (event derived from new status) and one for the artist's owner user (looked up via `artists.user_id` if present, otherwise skipped).
- Enable Realtime on the table so the existing `notify-new-message` push path can be mirrored later if wanted (out of scope for this plan unless you want push too).

**New MCP tool** `list_my_booking_notifications.ts` — inputs: `unread_only?: boolean`, `limit?: 1..100`. Reads via user-scoped client.

**New MCP tool** `mark_booking_notification_read.ts` — input: `id: uuid`. Sets `read_at = now()`.

Both registered in `src/lib/mcp/index.ts`. This gives agents a first-class feed to check on each turn ("any new updates on your bookings?") without needing server push.

## 3. Pinterest board as the sole Discovery source

Pinterest does not expose private-board content without OAuth, but every **public** board has an RSS feed:
`https://www.pinterest.com/<username>/<board-slug>.rss` — returns the latest ~25 pins with image URLs, titles, and pin links. No API key.

Plan:
- Ask you for your Pinterest **username** and **board slug** (or the full public board URL) and confirm the board is set to Public. If you want a private board or the full board (>25 pins), we'd need Pinterest OAuth via their API v5 — a bigger, separate setup; call that out as a fallback.
- Store the board URL in a small `app_settings` row (or as an edge-function secret `PINTEREST_BOARD_URL`) so it can be swapped without a redeploy.
- Rewrite `supabase/functions/refresh-designs/index.ts` to fetch the RSS, parse `<item>` entries (regex or a tiny XML parser — Deno-friendly), extract the `<enclosure>` / `<media:content>` image URL, upgrade the thumbnail to the `/originals/` size, and upsert into `daily_designs` with `external_id = pinterest:<pin_id>`. Drop the Unsplash query + human/art keyword filters entirely.
- Keep the existing `daily_designs` schema, download/print buttons, and RLS untouched — only the ingestion source changes.
- Frontend `DiscoverPage.tsx`: remove the `isTattooOrSketch` heuristic since every pin on your curated board is already on-brand; keep the masonry, favorite, download, print, and "send to artist" actions.
- Optionally add a cron trigger (existing `pg_cron` pattern) to re-pull the RSS daily.

## Technical notes

- MCP tools must be import-safe — no env reads at module top level; read `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` inside handlers, matching existing tools.
- `create_booking` calls the Razorpay order function server-side via `fetch(SUPABASE_URL + "/functions/v1/create-razorpay-order", { headers: { Authorization: Bearer <user token> }})` so the agent never handles secrets.
- After edits: run `app_mcp_server--extract_mcp_manifest` to refresh `.lovable/mcp/manifest.json`, then deploy the `mcp` edge function and the updated `refresh-designs` function.
- Migration will add the customer-cancel UPDATE policy scoped to `status = 'cancelled'` only, using a `USING (customer_id = auth.uid())` + `WITH CHECK (customer_id = auth.uid() AND status = 'cancelled')` pattern so customers can't flip status arbitrarily.

## Open question before I build

Please share your Pinterest board (public URL, e.g. `https://www.pinterest.com/yourname/tattoo-stencils/`) and confirm it's set to Public. If you'd prefer a private board, say so and I'll switch to the OAuth (Pinterest API v5) path instead — that requires you to register a Pinterest developer app and paste a client ID/secret.
