# RecapReels Ops

Clients, invoices and MOUs for RecapReels — fill a short form, download a
finished PDF, and keep every document and payment in one place.

Everything is stored **on your own machine**, in a single file. No account, no
connection string, no internet needed.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

That's the whole setup. On first launch the app asks you to **set a PIN**; after
that it asks for it. Sessions last 90 days per device, and "Lock" in the header
signs this device out. Change the PIN in Settings.

## Where your data lives

```
data/recapreels.db
```

Created automatically on first use. It holds clients, invoices, line items,
payments, MOUs and your settings — including the PIN.

- **Back up** by copying that file (and any `-wal` / `-shm` files beside it)
  while the app is closed. That copy is a complete backup.
- **Move to another machine** by copying it into `data/` there.
- It is **git-ignored on purpose** — your business data never goes to GitHub.

Settings → *Your data* shows the exact path.

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
into the real database — useful on a fresh install, skip it once you have live
work.

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

Next.js App Router · Tailwind v4 · SQLite via `better-sqlite3` · server actions ·
PIN gate in `app/(app)/layout.tsx` · `@react-pdf/renderer`.

Inter is bundled under `public/fonts` (SIL OFL) because the PDF renderer's
built-in fonts have no ₹ glyph.

## A note on hosting

This version deliberately keeps the data on the machine that runs it, so it is
built to run locally (`npm run dev`, or `npm run build && npm start`).

It will **not** work as-is on Vercel or similar: serverless filesystems are
read-only and thrown away between requests, so the database file cannot live
there. Hosting it for several people means moving `lib/db.ts` back to a hosted
Postgres — the query functions are all in that one file, and every screen calls
them through the same async API, so nothing else has to change.
