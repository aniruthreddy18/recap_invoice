import postgres from "postgres";

// Supabase Postgres via the transaction pooler (the only mode that survives
// serverless). prepare:false is required there — the pooler doesn't pin a
// session to one backend, so a prepared statement from one query can't be
// reused by the next.
//
// Nothing here runs at import time. A build machine has no DATABASE_URL and no
// route to the database, so connecting (or throwing) while this module is
// merely being loaded fails the build instead of the request.
type Db = ReturnType<typeof postgres>;

let client: Db | null = null;
let schemaReady: Promise<unknown> | null = null;

function connect(): Db {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Postgres pooled connection string to " +
        ".env.local (locally) or the Vercel project's environment variables, " +
        "then restart. See the README."
    );
  }
  // Hosted Postgres requires SSL; a local one (used for smoke tests) doesn't.
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url);
  client = postgres(url, {
    ssl: isLocal ? false : "require",
    prepare: false,
    // The schema block below re-runs on every cold start; without this the
    // driver prints a "relation already exists, skipping" notice per table.
    onnotice: (n) => {
      if (n.code !== "42P07" && n.code !== "42701") console.warn(n.message);
    },
  });
  return client;
}

/**
 * Human-readable description of where the data lives, for the Settings screen.
 * Host and database name only — never the credentials in the URL.
 */
export function storageLabel(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return "Not configured";
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "Hosted Postgres";
  }
}

/**
 * Every query goes through here: it opens the connection on first use and
 * creates the schema once per process. Schema lives in code rather than in a
 * migration tool because this is a two-person app whose whole shape fits in
 * one file — same as the borewell app it's modelled on.
 */
async function db(): Promise<Db> {
  const sql = connect();
  schemaReady ??= sql.unsafe(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      org TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      gstin TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_no TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT DEFAULT '',
      issue_date TEXT NOT NULL,
      due_date TEXT DEFAULT '',
      event_window TEXT DEFAULT '',
      schedule_note TEXT DEFAULT '',
      schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
      show_summary BOOLEAN NOT NULL DEFAULT true,
      commitments JSONB NOT NULL DEFAULT '[]'::jsonb,
      complimentary JSONB NOT NULL DEFAULT '[]'::jsonb,
      footer_note TEXT DEFAULT '',
      discount_type TEXT DEFAULT 'flat' CHECK (discount_type IN ('flat','percent')),
      discount_value DOUBLE PRECISION NOT NULL DEFAULT 0,
      discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      gst_enabled BOOLEAN NOT NULL DEFAULT false,
      gst_rate DOUBLE PRECISION NOT NULL DEFAULT 18,
      subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
      gst_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      total DOUBLE PRECISION NOT NULL DEFAULT 0,
      round_total BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'included' CHECK (category IN ('included','extra')),
      description TEXT NOT NULL,
      note TEXT DEFAULT '',
      qty DOUBLE PRECISION NOT NULL DEFAULT 1,
      rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL,
      date TEXT NOT NULL,
      method TEXT DEFAULT 'upi',
      note TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS mous (
      id SERIAL PRIMARY KEY,
      mou_no TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      client_label TEXT DEFAULT '',
      issue_date TEXT NOT NULL,
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      period_note TEXT DEFAULT '',
      purpose TEXT DEFAULT '',
      plan_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
      pricing_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
      pricing_total_label TEXT DEFAULT 'Total Budget',
      pricing_total_value TEXT DEFAULT '',
      pricing_note TEXT DEFAULT '',
      our_responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
      client_responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
      payment_terms TEXT DEFAULT '',
      confidentiality TEXT DEFAULT '',
      termination TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed','terminated')),
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Documents come in two shapes: an event job (wedding, function — priced
    -- per reel against a schedule) and a business engagement (monthly content
    -- retainer). Added after the first release, hence ADD COLUMN IF NOT EXISTS.
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'event';
    ALTER TABLE mous ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'business';
    ALTER TABLE mous ADD COLUMN IF NOT EXISTS schedule JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE mous ADD COLUMN IF NOT EXISTS scope_note TEXT DEFAULT '';

    -- Priced packages, editable in Settings. An event package's price covers a
    -- whole job; an MOU package's price is per month.
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('event','mou')),
      name TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL DEFAULT 0,
      included_reels INTEGER NOT NULL DEFAULT 0,
      included_conceptual INTEGER NOT NULL DEFAULT 0,
      included_posters INTEGER NOT NULL DEFAULT 0,
      details JSONB NOT NULL DEFAULT '[]'::jsonb,
      note TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Money going out. Money coming in is already tracked as payments against
    -- invoices, so the month's profit is those two tables against each other.
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      amount DOUBLE PRECISION NOT NULL,
      paid_to TEXT DEFAULT '',
      method TEXT DEFAULT 'upi',
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

    -- An event invoice is rebuilt from its package + event list on every edit,
    -- so both are stored rather than only the priced lines they produced.
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS package_id INTEGER;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS events JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS extra_lines JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE mous ADD COLUMN IF NOT EXISTS package_id INTEGER;
    ALTER TABLE mous ADD COLUMN IF NOT EXISTS months INTEGER NOT NULL DEFAULT 1;
  `);
  await schemaReady;
  return sql;
}

export type Client = {
  id: number; name: string; org: string; phone: string; email: string;
  address: string; city: string; gstin: string; notes: string; created_at: string;
};

export type ScheduleRow = {
  date: string; event: string; place: string; included: string; extra: string;
};

export type InvoiceItem = {
  id: number; invoice_id: number; category: "included" | "extra";
  description: string; note: string; qty: number; rate: number; amount: number; sort_order: number;
};

export type DocKind = "event" | "business";

export type EventRowStored = {
  date: string; event: string; place: string; reels: number; conceptual: number; notes: string;
};

export type ExtraLine = {
  category: "included" | "extra"; description: string; note: string; qty: number; rate: number;
};

export type Invoice = {
  id: number; invoice_no: string; client_id: number; kind: DocKind; title: string;
  package_id: number | null; events: EventRowStored[]; extra_lines: ExtraLine[];
  issue_date: string; due_date: string; event_window: string; schedule_note: string;
  schedule: ScheduleRow[]; show_summary: boolean;
  commitments: string[]; complimentary: string[]; footer_note: string;
  discount_type: "flat" | "percent"; discount_value: number; discount_amount: number;
  gst_enabled: boolean; gst_rate: number;
  subtotal: number; gst_amount: number; total: number; round_total: boolean;
  created_at: string;
};

export type PackageKind = "event" | "mou";

export type Package = {
  id: number; kind: PackageKind; name: string; price: number;
  included_reels: number; included_conceptual: number; included_posters: number;
  details: { label: string; value: string }[]; note: string; sort_order: number;
};

export const EXPENSE_CATEGORIES = [
  "equipment", "travel", "editing", "ads", "salary", "software", "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: number; date: string; category: string; amount: number;
  paid_to: string; method: string; note: string;
};

export type PlanRow = { label: string; value: string };
export type PricingRow = { label: string; value: string };

export type Mou = {
  id: number; mou_no: string; client_id: number; kind: DocKind; client_label: string;
  package_id: number | null; months: number;
  schedule: ScheduleRow[]; scope_note: string;
  issue_date: string; start_date: string; end_date: string; period_note: string;
  purpose: string; plan_rows: PlanRow[]; pricing_rows: PricingRow[];
  pricing_total_label: string; pricing_total_value: string; pricing_note: string;
  our_responsibilities: string[]; client_responsibilities: string[];
  payment_terms: string; confidentiality: string; termination: string;
  status: "draft" | "active" | "completed" | "terminated"; created_at: string;
};

export type Payment = {
  id: number; client_id: number; invoice_id: number | null;
  amount: number; date: string; method: string; note: string;
};

/* ---------------------------------------------------------------- settings */

export async function getSetting(key: string): Promise<string | null> {
  const sql = await db();
  const rows = await sql<{ value: string }[]>`SELECT value FROM app_settings WHERE key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const sql = await db();
  await sql`
    INSERT INTO app_settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

export async function getSettings(): Promise<Record<string, string>> {
  const sql = await db();
  const rows = await sql<{ key: string; value: string }[]>`SELECT key, value FROM app_settings`;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/* ----------------------------------------------------------------- clients */

export async function listClients(): Promise<Client[]> {
  const sql = await db();
  return sql<Client[]>`SELECT * FROM clients ORDER BY name`;
}

export async function getClient(id: number): Promise<Client | null> {
  const sql = await db();
  const rows = await sql<Client[]>`SELECT * FROM clients WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function insertClient(c: Partial<Client> & { name: string }): Promise<number> {
  const sql = await db();
  const rows = await sql<{ id: number }[]>`
    INSERT INTO clients (name, org, phone, email, address, city, gstin, notes)
    VALUES (${c.name}, ${c.org ?? ""}, ${c.phone ?? ""}, ${c.email ?? ""},
            ${c.address ?? ""}, ${c.city ?? ""}, ${c.gstin ?? ""}, ${c.notes ?? ""})
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateClient(id: number, c: Partial<Client>): Promise<void> {
  const sql = await db();
  await sql`
    UPDATE clients SET
      name = ${c.name ?? ""}, org = ${c.org ?? ""}, phone = ${c.phone ?? ""},
      email = ${c.email ?? ""}, address = ${c.address ?? ""}, city = ${c.city ?? ""},
      gstin = ${c.gstin ?? ""}, notes = ${c.notes ?? ""}
    WHERE id = ${id}
  `;
}

export async function deleteClient(id: number): Promise<void> {
  const sql = await db();
  await sql`DELETE FROM clients WHERE id = ${id}`;
}

/* ---------------------------------------------------------------- numbering */

// Doc numbers look like RR-INV-2026-0007 / RR-MOU-2026-0003. The counter lives
// in app_settings and is bumped inside a transaction so two people saving at
// the same time can't land on the same number.
export async function nextDocNumber(kind: "invoice" | "mou"): Promise<string> {
  const sql = await db();
  const year = new Date().getFullYear();
  const prefixKey = kind === "invoice" ? "invoice_prefix" : "mou_prefix";
  const counterKey = `${kind}_counter_${year}`;
  return sql.begin(async (tx) => {
    const pref = await tx<{ value: string }[]>`SELECT value FROM app_settings WHERE key = ${prefixKey}`;
    const prefix = pref[0]?.value || (kind === "invoice" ? "RR-INV" : "RR-MOU");
    const rows = await tx<{ value: string }[]>`
      INSERT INTO app_settings (key, value) VALUES (${counterKey}, '1')
      ON CONFLICT (key) DO UPDATE SET value = (app_settings.value::int + 1)::text
      RETURNING value
    `;
    const n = String(rows[0].value).padStart(4, "0");
    return `${prefix}-${year}-${n}`;
  });
}

/* ---------------------------------------------------------------- invoices */

export type InvoiceRow = Invoice & { client_name: string; client_org: string; paid: number };

export async function listInvoices(clientId?: number): Promise<InvoiceRow[]> {
  const sql = await db();
  return sql<InvoiceRow[]>`
    SELECT i.*, c.name AS client_name, c.org AS client_org,
           COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid
    FROM invoices i JOIN clients c ON c.id = i.client_id
    ${clientId ? sql`WHERE i.client_id = ${clientId}` : sql``}
    ORDER BY i.issue_date DESC, i.id DESC
  `;
}

export async function getInvoice(id: number): Promise<
  { invoice: Invoice; items: InvoiceItem[]; client: Client; paid: number } | null
> {
  const sql = await db();
  const rows = await sql<Invoice[]>`SELECT * FROM invoices WHERE id = ${id}`;
  const invoice = rows[0];
  if (!invoice) return null;
  const [items, client, paidRows] = await Promise.all([
    sql<InvoiceItem[]>`SELECT * FROM invoice_items WHERE invoice_id = ${id} ORDER BY sort_order, id`,
    getClient(invoice.client_id),
    sql<{ paid: number }[]>`SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id = ${id}`,
  ]);
  if (!client) return null;
  return { invoice, items, client, paid: Number(paidRows[0].paid) };
}

export type NewInvoice = Omit<Invoice, "id" | "invoice_no" | "created_at"> & {
  items: Omit<InvoiceItem, "id" | "invoice_id">[];
};

export async function insertInvoice(inv: NewInvoice): Promise<{ id: number; invoice_no: string }> {
  const sql = await db();
  const invoice_no = await nextDocNumber("invoice");
  return sql.begin(async (tx) => {
    const rows = await tx<{ id: number }[]>`
      INSERT INTO invoices (
        invoice_no, client_id, kind, package_id, events, extra_lines, title, issue_date, due_date, event_window, schedule_note,
        schedule, show_summary, commitments, complimentary, footer_note,
        discount_type, discount_value, discount_amount, gst_enabled, gst_rate,
        subtotal, gst_amount, total, round_total
      ) VALUES (
        ${invoice_no}, ${inv.client_id}, ${inv.kind}, ${inv.package_id}, ${sql.json(inv.events)},
        ${sql.json(inv.extra_lines)}, ${inv.title}, ${inv.issue_date}, ${inv.due_date},
        ${inv.event_window}, ${inv.schedule_note},
        ${sql.json(inv.schedule)}, ${inv.show_summary}, ${sql.json(inv.commitments)},
        ${sql.json(inv.complimentary)}, ${inv.footer_note},
        ${inv.discount_type}, ${inv.discount_value}, ${inv.discount_amount},
        ${inv.gst_enabled}, ${inv.gst_rate},
        ${inv.subtotal}, ${inv.gst_amount}, ${inv.total}, ${inv.round_total}
      ) RETURNING id
    `;
    const id = rows[0].id;
    for (const [i, it] of inv.items.entries()) {
      await tx`
        INSERT INTO invoice_items (invoice_id, category, description, note, qty, rate, amount, sort_order)
        VALUES (${id}, ${it.category}, ${it.description}, ${it.note}, ${it.qty}, ${it.rate}, ${it.amount}, ${i})
      `;
    }
    return { id, invoice_no };
  });
}

export async function updateInvoice(id: number, inv: NewInvoice): Promise<void> {
  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`
      UPDATE invoices SET
        client_id = ${inv.client_id}, kind = ${inv.kind}, package_id = ${inv.package_id},
        events = ${sql.json(inv.events)}, extra_lines = ${sql.json(inv.extra_lines)},
        title = ${inv.title}, issue_date = ${inv.issue_date},
        due_date = ${inv.due_date}, event_window = ${inv.event_window},
        schedule_note = ${inv.schedule_note}, schedule = ${sql.json(inv.schedule)},
        show_summary = ${inv.show_summary}, commitments = ${sql.json(inv.commitments)},
        complimentary = ${sql.json(inv.complimentary)}, footer_note = ${inv.footer_note},
        discount_type = ${inv.discount_type}, discount_value = ${inv.discount_value},
        discount_amount = ${inv.discount_amount}, gst_enabled = ${inv.gst_enabled},
        gst_rate = ${inv.gst_rate}, subtotal = ${inv.subtotal}, gst_amount = ${inv.gst_amount},
        total = ${inv.total}, round_total = ${inv.round_total}
      WHERE id = ${id}
    `;
    await tx`DELETE FROM invoice_items WHERE invoice_id = ${id}`;
    for (const [i, it] of inv.items.entries()) {
      await tx`
        INSERT INTO invoice_items (invoice_id, category, description, note, qty, rate, amount, sort_order)
        VALUES (${id}, ${it.category}, ${it.description}, ${it.note}, ${it.qty}, ${it.rate}, ${it.amount}, ${i})
      `;
    }
  });
}

export async function deleteInvoice(id: number): Promise<void> {
  const sql = await db();
  await sql`DELETE FROM invoices WHERE id = ${id}`;
}

/* ---------------------------------------------------------------- payments */

export async function insertPayment(p: Omit<Payment, "id">): Promise<void> {
  const sql = await db();
  await sql`
    INSERT INTO payments (client_id, invoice_id, amount, date, method, note)
    VALUES (${p.client_id}, ${p.invoice_id}, ${p.amount}, ${p.date}, ${p.method}, ${p.note})
  `;
}

export async function listPayments(clientId?: number, invoiceId?: number): Promise<Payment[]> {
  const sql = await db();
  return sql<Payment[]>`
    SELECT * FROM payments
    ${clientId ? sql`WHERE client_id = ${clientId}` : invoiceId ? sql`WHERE invoice_id = ${invoiceId}` : sql``}
    ORDER BY date DESC, id DESC
  `;
}

export async function deletePayment(id: number): Promise<void> {
  const sql = await db();
  await sql`DELETE FROM payments WHERE id = ${id}`;
}

/* -------------------------------------------------------------------- MOUs */

export type MouRow = Mou & { client_name: string };

export async function listMous(clientId?: number): Promise<MouRow[]> {
  const sql = await db();
  return sql<MouRow[]>`
    SELECT m.*, c.name AS client_name
    FROM mous m JOIN clients c ON c.id = m.client_id
    ${clientId ? sql`WHERE m.client_id = ${clientId}` : sql``}
    ORDER BY m.issue_date DESC, m.id DESC
  `;
}

export async function getMou(id: number): Promise<{ mou: Mou; client: Client } | null> {
  const sql = await db();
  const rows = await sql<Mou[]>`SELECT * FROM mous WHERE id = ${id}`;
  const mou = rows[0];
  if (!mou) return null;
  const client = await getClient(mou.client_id);
  return client ? { mou, client } : null;
}

export type NewMou = Omit<Mou, "id" | "mou_no" | "created_at">;

export async function insertMou(m: NewMou): Promise<{ id: number; mou_no: string }> {
  const sql = await db();
  const mou_no = await nextDocNumber("mou");
  const rows = await sql<{ id: number }[]>`
    INSERT INTO mous (
      mou_no, client_id, kind, client_label, issue_date, start_date, end_date, period_note, purpose,
      schedule, scope_note, plan_rows, pricing_rows, pricing_total_label, pricing_total_value, pricing_note,
      our_responsibilities, client_responsibilities, payment_terms, confidentiality, termination, status
    ) VALUES (
      ${mou_no}, ${m.client_id}, ${m.kind}, ${m.client_label}, ${m.issue_date}, ${m.start_date}, ${m.end_date},
      ${m.period_note}, ${m.purpose}, ${sql.json(m.schedule)}, ${m.scope_note},
      ${sql.json(m.plan_rows)}, ${sql.json(m.pricing_rows)},
      ${m.pricing_total_label}, ${m.pricing_total_value}, ${m.pricing_note},
      ${sql.json(m.our_responsibilities)}, ${sql.json(m.client_responsibilities)},
      ${m.payment_terms}, ${m.confidentiality}, ${m.termination}, ${m.status}
    ) RETURNING id
  `;
  return { id: rows[0].id, mou_no };
}

export async function updateMou(id: number, m: NewMou): Promise<void> {
  const sql = await db();
  await sql`
    UPDATE mous SET
      client_id = ${m.client_id}, kind = ${m.kind}, package_id = ${m.package_id}, months = ${m.months},
      client_label = ${m.client_label},
      schedule = ${sql.json(m.schedule)}, scope_note = ${m.scope_note}, issue_date = ${m.issue_date},
      start_date = ${m.start_date}, end_date = ${m.end_date}, period_note = ${m.period_note},
      purpose = ${m.purpose}, plan_rows = ${sql.json(m.plan_rows)},
      pricing_rows = ${sql.json(m.pricing_rows)}, pricing_total_label = ${m.pricing_total_label},
      pricing_total_value = ${m.pricing_total_value}, pricing_note = ${m.pricing_note},
      our_responsibilities = ${sql.json(m.our_responsibilities)},
      client_responsibilities = ${sql.json(m.client_responsibilities)},
      payment_terms = ${m.payment_terms}, confidentiality = ${m.confidentiality},
      termination = ${m.termination}, status = ${m.status}
    WHERE id = ${id}
  `;
}

export async function deleteMou(id: number): Promise<void> {
  const sql = await db();
  await sql`DELETE FROM mous WHERE id = ${id}`;
}

/* --------------------------------------------------------------- dashboard */

export async function dashboardStats() {
  const sql = await db();
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [billed, collected, outstanding, counts] = await Promise.all([
    sql<{ v: number }[]>`SELECT COALESCE(SUM(total),0) AS v FROM invoices WHERE issue_date LIKE ${month + "%"}`,
    sql<{ v: number }[]>`SELECT COALESCE(SUM(amount),0) AS v FROM payments WHERE date LIKE ${month + "%"}`,
    sql<{ v: number }[]>`
      SELECT COALESCE(SUM(i.total),0) - COALESCE((SELECT SUM(amount) FROM payments),0) AS v FROM invoices i
    `,
    sql<{ clients: number; invoices: number; mous: number }[]>`
      SELECT (SELECT COUNT(*) FROM clients)::int AS clients,
             (SELECT COUNT(*) FROM invoices)::int AS invoices,
             (SELECT COUNT(*) FROM mous WHERE status = 'active')::int AS mous
    `,
  ]);
  return {
    billedThisMonth: Number(billed[0].v),
    collectedThisMonth: Number(collected[0].v),
    outstanding: Math.max(0, Number(outstanding[0].v)),
    clients: counts[0].clients,
    invoices: counts[0].invoices,
    activeMous: counts[0].mous,
  };
}

/* ------------------------------------------------------------------ PIN gate */

// Lives here rather than in lib/auth.ts on purpose: middleware imports auth,
// and middleware runs on the edge runtime where the postgres driver can't.
export async function getPinHash(): Promise<string | null> {
  return getSetting("pin_hash");
}

export async function savePinHash(hash: string): Promise<void> {
  await setSetting("pin_hash", hash);
}

/* ---------------------------------------------------------------- packages */

// Seeded once, then owned by the user in Settings. Prices start at zero on
// purpose: an invented number that looks real is worse than an obvious blank.
const SEED_PACKAGES: Omit<Package, "id">[] = [
  { kind: "event", name: "Gold", price: 0, included_reels: 10, included_conceptual: 0, included_posters: 0, details: [], note: "", sort_order: 0 },
  { kind: "event", name: "Elite", price: 0, included_reels: 20, included_conceptual: 2, included_posters: 0, details: [], note: "", sort_order: 1 },
  { kind: "event", name: "Premium", price: 0, included_reels: 31, included_conceptual: 5, included_posters: 0, details: [], note: "", sort_order: 2 },
  { kind: "mou", name: "Gold", price: 0, included_reels: 12, included_conceptual: 0, included_posters: 4, details: [{ label: "Posting Schedule", value: "3 reels per week" }], note: "", sort_order: 0 },
  { kind: "mou", name: "Elite", price: 0, included_reels: 24, included_conceptual: 0, included_posters: 8, details: [{ label: "Posting Schedule", value: "6 reels per week and 2 posters per week" }], note: "", sort_order: 1 },
  { kind: "mou", name: "Premium", price: 0, included_reels: 40, included_conceptual: 4, included_posters: 12, details: [{ label: "Posting Schedule", value: "Daily reels and 3 posters per week" }], note: "", sort_order: 2 },
];

export async function listPackages(kind?: PackageKind): Promise<Package[]> {
  const sql = await db();
  const rows = await sql<Package[]>`
    SELECT * FROM packages ${kind ? sql`WHERE kind = ${kind}` : sql``}
    ORDER BY kind, sort_order, id
  `;
  if (rows.length === 0) {
    for (const p of SEED_PACKAGES) await insertPackage(p);
    return sql<Package[]>`
      SELECT * FROM packages ${kind ? sql`WHERE kind = ${kind}` : sql``}
      ORDER BY kind, sort_order, id
    `;
  }
  return rows;
}

export async function insertPackage(p: Omit<Package, "id">): Promise<number> {
  const sql = await db();
  const rows = await sql<{ id: number }[]>`
    INSERT INTO packages (kind, name, price, included_reels, included_conceptual,
                          included_posters, details, note, sort_order)
    VALUES (${p.kind}, ${p.name}, ${p.price}, ${p.included_reels}, ${p.included_conceptual},
            ${p.included_posters}, ${sql.json(p.details)}, ${p.note}, ${p.sort_order})
    RETURNING id
  `;
  return rows[0].id;
}

export async function updatePackage(id: number, p: Omit<Package, "id">): Promise<void> {
  const sql = await db();
  await sql`
    UPDATE packages SET
      name = ${p.name}, price = ${p.price}, included_reels = ${p.included_reels},
      included_conceptual = ${p.included_conceptual}, included_posters = ${p.included_posters},
      details = ${sql.json(p.details)}, note = ${p.note}, sort_order = ${p.sort_order}
    WHERE id = ${id}
  `;
}

export async function deletePackage(id: number): Promise<void> {
  const sql = await db();
  await sql`DELETE FROM packages WHERE id = ${id}`;
}

/* ---------------------------------------------------------------- expenses */

export async function listExpenses(month?: string): Promise<Expense[]> {
  const sql = await db();
  return sql<Expense[]>`
    SELECT * FROM expenses
    ${month ? sql`WHERE date LIKE ${month + "%"}` : sql``}
    ORDER BY date DESC, id DESC
  `;
}

export async function insertExpense(e: Omit<Expense, "id">): Promise<void> {
  const sql = await db();
  await sql`
    INSERT INTO expenses (date, category, amount, paid_to, method, note)
    VALUES (${e.date}, ${e.category}, ${e.amount}, ${e.paid_to}, ${e.method}, ${e.note})
  `;
}

export async function deleteExpense(id: number): Promise<void> {
  const sql = await db();
  await sql`DELETE FROM expenses WHERE id = ${id}`;
}

/* ------------------------------------------------------------------- money */

export type MonthSummary = {
  month: string;
  received: number;
  spent: number;
  profit: number;
  invoiced: number;
  outstanding: number;
  byCategory: { category: string; amount: number }[];
};

/**
 * Cash view of one month: what actually arrived, what actually went out.
 * "invoiced" is shown alongside for context but never feeds profit — an
 * unpaid invoice isn't money.
 */
export async function monthSummary(month: string): Promise<MonthSummary> {
  const sql = await db();
  const like = `${month}%`;
  const [received, spent, invoiced, outstanding, byCategory] = await Promise.all([
    sql<{ v: number }[]>`SELECT COALESCE(SUM(amount),0) AS v FROM payments WHERE date LIKE ${like}`,
    sql<{ v: number }[]>`SELECT COALESCE(SUM(amount),0) AS v FROM expenses WHERE date LIKE ${like}`,
    sql<{ v: number }[]>`SELECT COALESCE(SUM(total),0) AS v FROM invoices WHERE issue_date LIKE ${like}`,
    sql<{ v: number }[]>`
      SELECT COALESCE((SELECT SUM(total) FROM invoices),0) - COALESCE((SELECT SUM(amount) FROM payments),0) AS v
    `,
    sql<{ category: string; amount: number }[]>`
      SELECT category, SUM(amount) AS amount FROM expenses
      WHERE date LIKE ${like} GROUP BY category ORDER BY amount DESC
    `,
  ]);
  const r = Number(received[0].v);
  const s = Number(spent[0].v);
  return {
    month,
    received: r,
    spent: s,
    profit: r - s,
    invoiced: Number(invoiced[0].v),
    outstanding: Math.max(0, Number(outstanding[0].v)),
    byCategory: byCategory.map((c) => ({ category: c.category, amount: Number(c.amount) })),
  };
}

/** Payments received in a month, with the client and invoice they belong to. */
export async function listIncome(month: string) {
  const sql = await db();
  return sql<{ id: number; date: string; amount: number; method: string; note: string; client_name: string; invoice_no: string | null }[]>`
    SELECT p.id, p.date, p.amount, p.method, p.note, c.name AS client_name, i.invoice_no
    FROM payments p
    JOIN clients c ON c.id = p.client_id
    LEFT JOIN invoices i ON i.id = p.invoice_id
    WHERE p.date LIKE ${month + "%"}
    ORDER BY p.date DESC, p.id DESC
  `;
}

/** Last 6 months of received/spent, for the trend strip on the money screen. */
export async function recentMonths(count = 6): Promise<{ month: string; received: number; spent: number }[]> {
  const sql = await db();
  const out: { month: string; received: number; spent: number }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const like = `${month}%`;
    const [r, s] = await Promise.all([
      sql<{ v: number }[]>`SELECT COALESCE(SUM(amount),0) AS v FROM payments WHERE date LIKE ${like}`,
      sql<{ v: number }[]>`SELECT COALESCE(SUM(amount),0) AS v FROM expenses WHERE date LIKE ${like}`,
    ]);
    out.push({ month, received: Number(r[0].v), spent: Number(s[0].v) });
  }
  return out;
}
