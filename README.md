# RecapReels Ops

Clients, invoices and MOUs for RecapReels — fill a short form, download a
finished PDF, and keep every document and payment in one place.

Data lives in a hosted Postgres database, so the same clients, invoices and
payments are visible from any device that signs in.

## Run locally

```bash
npm install
cp .env.example .env.local     # then paste your connection string
npm run dev                    # http://localhost:3000
```

`.env.local` needs one line:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

Use the provider's **pooled** connection string (Neon: "Pooled connection";
Supabase: "Transaction pooler", port 6543). Tables are created automatically on
the first request, so a fresh database needs no migration step.

On first launch the app asks you to **set a PIN**; after that it asks for it.
Five wrong attempts lock the keypad for five minutes. Sessions last 90 days per
device, and "Lock" in the header signs that device out. Change the PIN in
Settings.

## Deploying to Vercel

1. Create a Postgres database — [Neon](https://neon.tech) or Supabase, free tier
   is enough. Copy the **pooled** connection string.
2. In Vercel: import this GitHub repo, then Settings → Environment Variables →
   add `DATABASE_URL` for all environments.
3. Deploy. The first request creates the tables; the first visit sets the PIN.

That is the whole deployment: one environment variable, no build settings, no
migrations to run.

Everything is server-rendered and the PDF routes run on the Node runtime
(`export const runtime = "nodejs"`), because the renderer reads the bundled
fonts and logo from disk. Those files are traced into the deployment
automatically.

### Moving existing data in

`scripts/import-to-postgres.mts` loads a `data/export.json` dump into the
database named by `DATABASE_URL`. It refuses to run if the target already has
clients, so it can't double-import:

```bash
npx tsx scripts/import-to-postgres.mts
```

The company details and document prefixes carry over; the PIN does not, so the
hosted app starts by asking for a new one.

## Screens

| Route | Screen |
|---|---|
| `/` | Billed and collected this month, total outstanding, recent documents |
| `/clients`, `/clients/[id]` | Client list; profile with invoices, MOUs, ledger and payment entry |
| `/invoices`, `/invoices/new`, `/invoices/[id]` | Invoice list, form with live totals, preview + **Download PDF** |
| `/mou`, `/mou/new`, `/mou/[id]` | The same for MOUs |
| `/settings` | Company details, payment details, document prefixes, PIN, data location |

## Two kinds of document

Both invoices and MOUs come in an **Event** and a **Business** shape, picked at
the top of the form:

| | Event | Business |
|---|---|---|
| Invoice | Optional day-by-day schedule table, reel count summary, included vs extra reel totals | Plain line items — retainer, package, ad spend |
| MOU | "Events Covered" table of dates and deliverables | "Service Plan" table — plan, duration, reels, posting schedule |

Boilerplate follows the choice: an event invoice promises things a retainer
invoice can't ("we arrive at the venue before the event begins"), so the
commitments and complimentary lists swap with the kind.

The client box is a single field: type a name. If it matches someone on file the
document attaches to them; if not, that client is created when you save.

Everything with a sensible default sits in a folded "Wording and extras"
section. A usable invoice is a name, a line item and Save.

## Documents

Both PDFs are generated on the server with `@react-pdf/renderer` and rebuilt
from the database on every download — fix a name or an amount and the next
download is correct; nothing stale is stored.

- `lib/pdf/InvoiceDoc.tsx` — event schedule table, reel count summary, pricing,
  included/extra totals with optional GST, commitments, complimentary items.
- `lib/pdf/MouDoc.tsx` — numbered clauses, service plan or coverage table,
  pricing, responsibilities, signature blocks.

Each has an on-screen twin (`components/views/InvoicePreview.tsx`,
`MouPreview.tsx`) so what you approve is what downloads.

To iterate on a template without touching your data:

```bash
npx tsx scripts/render-sample.tsx /tmp
```

That writes `sample-invoice.pdf` and `sample-mou.pdf` from fixture data.

`npm run seed` loads two worked examples (a wedding invoice and a retainer MOU)
into whichever database `DATABASE_URL` points at — useful on a fresh install,
skip it once you have live work.

## Money rules

- Line items are tagged **included** or **extra**; when both exist the invoice
  shows each block's subtotal, GST and total before the combined total.
- Discount (₹ or %) applies to the combined subtotal, before GST.
- GST is off by default and set per invoice — turn it on and set the rate.
- "Round the final amount up to the whole rupee" rounds **up**, and the footer
  then states the exact figure it was rounded from.
- Document numbers (`RR-INV-2026-0007`) are reserved when you save, so an
  abandoned save leaves a gap. Numbers are never reused.

## Stack

Next.js App Router · Tailwind v4 · Postgres via the `postgres` driver · server
actions · PIN gate in `app/(app)/layout.tsx` · `@react-pdf/renderer`.

Inter is bundled under `public/fonts` (SIL OFL) because the PDF renderer's
built-in fonts have no ₹ glyph.

## Security

The whole app sits behind one shared PIN, so treat the URL as semi-private:

- five wrong attempts lock the keypad for five minutes (counted in the database,
  so it holds across serverless instances)
- the PIN is stored only as a SHA-256 hash, and compared in constant time
- the session cookie is `httpOnly` and `secure` in production
- there are no per-user accounts — everyone who knows the PIN sees everything

Use 6–8 digits rather than 4 for anything on a public URL, and change it in
Settings if it is ever shared by accident.

## Local-file version

An earlier version of this app kept everything in a local SQLite file with no
database to configure at all. It is preserved at commit `408ce55` if you ever
want to run it that way on a single machine.
