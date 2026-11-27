# ArtSpace Connect

**Where art of tattoos gets a start.**

ArtSpace Connect helps customers discover tattoo and piercing artists, explore portfolios, request consultations, communicate with artists, and book appointments. Artists can manage their profiles, portfolios, availability, and bookings. Administrators review artists and content and manage platform operations.

## Product and technology

- Web application built with Vite, React, TypeScript, Tailwind CSS, and shadcn/ui.
- Supabase for authentication, PostgreSQL, storage, row-level security, and Edge Functions.
- Razorpay for INR payments.
- Premium visual identity: near-black `#09090c`, gold `#c9a96e`, Cinzel headings, and DM Sans body text.

## Current commercial settings

- Booking cover charge: **₹49**
- Lifetime membership: **₹395**
- Active-member cover-charge discount: **10%** (₹44.10)
- Featured artist boost: **₹500 for 30 days**

The server-side pricing configuration is authoritative. Never trust client-supplied prices or payment status.

## Development

Requirements: Node.js 22 or newer and npm.

```sh
git clone https://github.com/mishaelswork-lab/studio-ink-hub.git
cd studio-ink-hub
npm ci
npm run dev
```

Useful checks:

```sh
npm run lint
npx tsc -b
npm run test -- --passWithNoTests
npm run build
```

## Backend

The ArtSpace production Supabase project is `ufvabnxcpxhusbdgunmb`. Use only this project when working on ArtSpace production. Do not point the app at another Supabase project without an explicit architecture decision.

Supabase migrations are in `supabase/migrations`; Edge Functions are in `supabase/functions`. Review migrations, RLS policies, storage policies, and function configuration before applying backend changes.

Configure secrets through the Supabase dashboard or an approved secure secret-management workflow. Never commit API keys, service-role keys, OAuth secrets, or payment credentials to this repository.

## Payments and integrations

Razorpay order creation and payment verification are server-side. Use Razorpay test mode for validation; never perform real charges during development.

Instagram portfolio import is intended to use Instagram Login for eligible professional accounts. Keep OAuth tokens encrypted and imported media private until approved. Manual upload remains the fallback when Instagram does not expose downloadable media.

## Security and release controls

- All user-facing data access must be protected by least-privilege RLS.
- Artist approval, payment status, pricing, and membership entitlements must be enforced server-side.
- Private portfolio media must not be made public to work around missing Edge Functions.
- Use test accounts and sandbox credentials for QA.
- Do not deploy, publish, switch live payment credentials, change DNS, or run irreversible production operations without explicit approval.

## Project status

This repository is under active pre-launch development. Production currently has no registered users, artists, bookings, or payment records. Features must be tested before being described as launch-ready.
