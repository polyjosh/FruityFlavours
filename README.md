# FruityFlavours

**Mautamu Healthy.** An online shop for healthy drinks, cakes and other products, based in Ongata Rongai, Kenya.

Customers browse the shop, add products to a cart, and check out for delivery or pickup. They can pay by M-Pesa, or pay on delivery or at pickup. Customers can create an account, see their order history and order again. The admin manages the catalogue, orders, sales reports and shop settings.

## Features

**Shop**
- Drinks and other products, each with one or more options (single bottles, packs, sizes) and its own price
- Labels for products that are out of stock or coming soon
- Cart and checkout page: choose delivery (flat fee, address or optional GPS location) or pickup (choose a pickup point, no fee)
- Customer accounts: sign up with a phone number and an SMS code, log in, reset a forgotten password, save an address, see order history, use **Order again**, and read messages
- Light and dark mode, designed for phones first

**Admin** (`/admin`)
- Orders board with customer and delivery details and status changes
- Catalogue and product editor with options, ingredients and photos
- Sales reports with date and category filters, and CSV export
- Notifications log with resend
- Settings: delivery fee, pickup points, social media links

**Not built yet:** M-Pesa STK Push payments and the payment screens.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router, React 19, TypeScript) with Tailwind CSS 3
- [Supabase](https://supabase.com/) Postgres and Storage, through [Prisma 6](https://www.prisma.io/)
- [PGlite](https://pglite.dev/) as a local Postgres for development
- Zod validation, shared between browser and server
- Africa's Talking for SMS; Safaricom Daraja for M-Pesa (to come)
- Vitest for unit tests

## Getting started

You need Node.js 20 or later and npm.

```bash
npm install
cp .env.example .env
```

Before you start the app, open `.env` and set `JWT_SECRET` to a random string of at least 32 characters. Then set an admin password:

```bash
npm run admin:password -- "your admin password"
```

This saves the hash as `ADMIN_PASSWORD_HASH` in `.env`. If you run it without a password, it makes one up and writes it to `.data/admin-password.txt`.

Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 for the shop and http://localhost:3000/admin for the admin.

### Local development without Supabase

If `DATABASE_URL` is empty, the app uses **PGlite**, a real Postgres database stored in `.data/pglite`. It is created from `prisma/local-schema.sql` and filled with sample products from `prisma/seed-data.ts`.

- Uploaded photos are saved in `.data/uploads` until the Supabase Storage keys are set.
- Until the Africa's Talking keys are set, SMS messages are not sent. This includes sign-up codes. Instead they are printed in the dev server console and appear as "Not sent" in the notifications log.
- After you change `prisma/schema.prisma`, run `npm run db:local-schema`. The local data is reset the next time you start the app.

### Using Supabase

1. Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET`.
2. Set `DATABASE_URL` to the transaction pooler (port 6543, with `?pgbouncer=true`) and `DIRECT_URL` to the session pooler or a direct connection (port 5432).
3. Run the migrations and the seed:

```bash
npm run db:migrate
npm run db:seed
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Run the production build |
| `npm test` | Run the unit tests |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check with TypeScript |
| `npm run db:migrate` | Create and apply migrations (development) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Load the sample data |
| `npm run db:local-schema` | Regenerate `prisma/local-schema.sql` for PGlite |
| `npm run admin:password -- "…"` | Set the admin password |

## Environment variables

`.env.example` lists every variable with a short note on each. Never commit `.env`.

| Group | Variables |
|---|---|
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` |
| Database | `DATABASE_URL`, `DIRECT_URL` (leave empty for PGlite) |
| Sessions and admin | `JWT_SECRET` (required), `ADMIN_PASSWORD_HASH`, `ADMIN_ALERT_PHONE` |
| M-Pesa (Daraja) | `DARAJA_ENV`, `DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_SHORTCODE`, `DARAJA_PASSKEY`, `DARAJA_CALLBACK_URL` |
| SMS (Africa's Talking) | `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` |

Use the Daraja **sandbox** until go-live has been confirmed.

## Project layout

```
src/app/(shop)/       shop and account pages
src/app/(checkout)/   cart and checkout, order confirmation, account verification
src/app/admin/        admin sign-in and panel
src/app/api/          route handlers
src/components/       UI components
src/lib/shared/       money, option labels, pricing, phone numbers, Zod schemas (browser and server)
src/lib/server/       database, catalogue, orders, auth, settings, SMS, uploads (server only)
prisma/               schema, local schema, seed data
design/               design export: stylesheet, screen mock-ups, logo
scripts/              admin password helper
```

`src/app/globals.css` is a port of `design/ff.css` and uses the same class names.
