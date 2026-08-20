# RecapReels Ops

Clients, invoices and MOUs for RecapReels — fill a form, download a finished PDF,
keep every document and payment in one place.

## Run

```bash
npm install
cp .env.local.example .env.local   # then fill in the two values
npm run dev                        # http://localhost:3000
```

`.env.local` needs:

| Key | Where it comes from |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction pooler** (port 6543). Replace `[YOUR-PASSWORD]`. |
| `SESSION_SECRET` | Any long random string — `openssl rand -hex 32`. |

Tables are created automatically on first query (see `lib/db.ts`), so a fresh
Supabase project needs no migration step.

Until `DATABASE_URL` is filled in, every route redirects to **`/setup`**, which
walks through getting the connection string. If the database is set but
unreachable, `app/error.tsx` explains why instead of showing a stack trace.
Restart the dev server after any `.env.local` edit — env vars are read once at
startup.

The whole app sits behind a PIN. The first launch asks you to **set** it; after
that it asks for it. Change it in Settings. Sessions last 90 days per device.

## Demo mode (no Supabase yet)

A local Postgres lives in `.devdb/` so the app can be used before the Supabase
project exists. `.env.local` already points at it.

```bash
npm run db:start   # start the local database (after a reboot, run this first)
npm run db:seed    # load the sample wedding invoice + retainer MOU
npm run dev
npm run db:stop    # when you're done
```

The seed is safe to re-run — it replaces the two demo clients. To switch to
Supabase, put its connection string in `.env.local`, restart, and never point
`db:seed` at it.

## Screens

| Route | Screen |
|---|---|
| `/` | Billed and collected this month, total outstanding, recent documents |
| `/clients`, `/clients/[id]` | Client list; profile with invoices, MOUs, ledger and payment entry |
| `/invoices`, `/invoices/new`, `/invoices/[id]` | Invoice list, form with live totals, preview + **Download PDF** |
| `/mou`, `/mou/new`, `/mou/[id]` | Same for MOUs |
| `/settings` | Company details, payment details, document prefixes, change PIN |

## Documents

Both PDFs are generated on the server with `@react-pdf/renderer` and rebuilt from
the database on every download — fix a name or an amount and the next download is
correct; nothing stale is stored.

- `lib/pdf/InvoiceDoc.tsx` — mirrors the wedding invoice: event schedule table,
  reel count summary, pricing, included/extra totals with optional GST,
  commitments, complimentary deliverables.
- `lib/pdf/MouDoc.tsx` — mirrors the client MOU: numbered clauses, service plan
  and pricing tables, responsibilities, signature blocks.

Each has an on-screen twin (`components/views/InvoicePreview.tsx`,
`MouPreview.tsx`) so what you approve is what downloads.

To iterate on a template without touching the database:

```bash
npx tsx scripts/render-sample.tsx /tmp
```

That writes `sample-invoice.pdf` and `sample-mou.pdf` from fixture data.

## Two kinds of document

Both invoices and MOUs come in an **Event** and a **Business** shape, picked at
the top of the form:

| | Event | Business |
|---|---|---|
| Invoice | Optional day-by-day schedule table, reel count summary, included vs extra reel totals | Plain line items — retainer, package, ad spend |
| MOU | "Events Covered" table of dates and deliverables | "Service Plan" table — plan, duration, reels, posting schedule |

The client box is a single field: type a name. If it matches someone on file the
document attaches to them; if not, that client is created when you save, so a
new client never needs a separate trip to `/clients/new`.

Everything with a sensible default — commitments, complimentary items, MOU
clauses, footer wording — sits in a folded "Wording and extras" section. A
usable invoice is a name, a line item and Save.

## Money rules

- Line items are tagged **included** or **extra**; when both exist the invoice
  shows each block's subtotal, GST and total before the combined total.
- Discount (₹ or %) applies to the combined subtotal, before GST.
- GST is off by default and set per invoice — turn it on and set the rate.
- "Round the final amount up to the whole rupee" rounds **up**, and the footer
  then states the exact figure it was rounded from.

## Stack

Next.js App Router · Tailwind v4 · Supabase Postgres through the `postgres`
driver · server actions · PIN gate in `proxy.ts` · `@react-pdf/renderer`.

Inter is bundled under `public/fonts` (SIL OFL, see `OFL.txt`) because the PDF
renderer's built-in fonts have no ₹ glyph.

No deployment is configured. `npm run build && npm start` runs it in production
mode locally; ask before setting up hosting.
