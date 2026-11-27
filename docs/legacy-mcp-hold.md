# Legacy MCP integration status

The legacy Lovable MCP generator is intentionally disabled in `vite.config.ts`, and its generated `supabase/functions/mcp/index.ts` Edge Function source has been removed from this branch.

This is a safety hold, not a production outage: the function was not deployed to Tartspace. The previous generated function referenced a different Supabase project, stale booking pricing and legacy table/column names. Its booking write path bypassed ArtSpace's canonical booking-hold and payment lifecycle, and its cancellation path directly changed booking status.

The dormant source registry under `src/lib/mcp` has been reduced to read-only catalog and owner-scoped read tools, with its artist queries aligned to the current schema. It is not built, deployed, or part of the customer-facing product.

Do not re-enable MCP generation or deploy an MCP Edge Function until:
1. The integration is redesigned against the canonical ArtSpace schema and RLS.
2. Booking creation is routed only through the approved booking-hold and Razorpay flow.
3. Cancellation and messaging use the canonical server-enforced workflows.
4. Artist public reads explicitly return approved/active profiles and only public columns.
5. Automated authenticated/anonymous and cross-user authorization tests pass.
6. The owner approves enabling the integration.

No production Edge Functions were deployed as part of this work.
