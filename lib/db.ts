import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * Everything lives in one SQLite file on this machine: data/recapreels.db.
 * No server, no account, no connection string — open the app and it works.
 *
 * The query functions stay `async` even though better-sqlite3 is synchronous,
 * so callers (server actions, pages, PDF routes) don't change if this ever
 * moves back to a hosted database.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "recapreels.db");

type Db = Database.Database;

let handle: Db | null = null;

function db(): Db {
  if (handle) return handle;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const conn = new Database(DB_FILE);

  // Foreign keys are off by default in SQLite; without this, deleting a client
  // would orphan their invoices instead of removing them.
  conn.pragma("foreign_keys = ON");
  // WAL keeps reads working while a write is in flight — one page load runs
  // several server components at once.
  conn.pragma("journal_mode = WAL");

  conn.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      org TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      gstin TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'event' CHECK (kind IN ('event','business')),
      title TEXT NOT NULL DEFAULT '',
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL DEFAULT '',
      event_window TEXT NOT NULL DEFAULT '',
      schedule_note TEXT NOT NULL DEFAULT '',
      schedule TEXT NOT NULL DEFAULT '[]',
      show_summary INTEGER NOT NULL DEFAULT 1,
      commitments TEXT NOT NULL DEFAULT '[]',
      complimentary TEXT NOT NULL DEFAULT '[]',
      footer_note TEXT NOT NULL DEFAULT '',
      discount_type TEXT NOT NULL DEFAULT 'flat' CHECK (discount_type IN ('flat','percent')),
      discount_value REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      gst_enabled INTEGER NOT NULL DEFAULT 0,
      gst_rate REAL NOT NULL DEFAULT 18,
      subtotal REAL NOT NULL DEFAULT 0,
      gst_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      round_total INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'included' CHECK (category IN ('included','extra')),
      description TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      qty REAL NOT NULL DEFAULT 1,
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'upi',
      note TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS mous (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mou_no TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'business' CHECK (kind IN ('event','business')),
      client_label TEXT NOT NULL DEFAULT '',
      issue_date TEXT NOT NULL,
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT '',
      period_note TEXT NOT NULL DEFAULT '',
      purpose TEXT NOT NULL DEFAULT '',
      schedule TEXT NOT NULL DEFAULT '[]',
      scope_note TEXT NOT NULL DEFAULT '',
      plan_rows TEXT NOT NULL DEFAULT '[]',
      pricing_rows TEXT NOT NULL DEFAULT '[]',
      pricing_total_label TEXT NOT NULL DEFAULT 'Total Budget',
      pricing_total_value TEXT NOT NULL DEFAULT '',
      pricing_note TEXT NOT NULL DEFAULT '',
      our_responsibilities TEXT NOT NULL DEFAULT '[]',
      client_responsibilities TEXT NOT NULL DEFAULT '[]',
      payment_terms TEXT NOT NULL DEFAULT '',
      confidentiality TEXT NOT NULL DEFAULT '',
      termination TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed','terminated')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
    CREATE INDEX IF NOT EXISTS idx_mous_client ON mous(client_id);
  `);

  handle = conn;
  return conn;
}

/** Where the data lives — shown in Settings so the file can be backed up. */
export function databaseFile(): string {
  return DB_FILE;
}

/* ------------------------------------------------------------------- types */

export type DocKind = "event" | "business";

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

export type Invoice = {
  id: number; invoice_no: string; client_id: number; kind: DocKind; title: string;
  issue_date: string; due_date: string; event_window: string; schedule_note: string;
  schedule: ScheduleRow[]; show_summary: boolean;
  commitments: string[]; complimentary: string[]; footer_note: string;
  discount_type: "flat" | "percent"; discount_value: number; discount_amount: number;
  gst_enabled: boolean; gst_rate: number;
  subtotal: number; gst_amount: number; total: number; round_total: boolean;
  created_at: string;
};

export type PlanRow = { label: string; value: string };
export type PricingRow = { label: string; value: string };

export type Mou = {
  id: number; mou_no: string; client_id: number; kind: DocKind; client_label: string;
  issue_date: string; start_date: string; end_date: string; period_note: string;
  purpose: string; schedule: ScheduleRow[]; scope_note: string;
  plan_rows: PlanRow[]; pricing_rows: PricingRow[];
  pricing_total_label: string; pricing_total_value: string; pricing_note: string;
  our_responsibilities: string[]; client_responsibilities: string[];
  payment_terms: string; confidentiality: string; termination: string;
  status: "draft" | "active" | "completed" | "terminated"; created_at: string;
};

export type Payment = {
  id: number; client_id: number; invoice_id: number | null;
  amount: number; date: string; method: string; note: string;
};

/* --------------------------------------------------------------- row shims */

// SQLite has no JSON or boolean column type: lists are stored as JSON text and
// flags as 0/1, so rows are converted here and the rest of the app only ever
// sees ordinary objects.
type Row = Record<string, unknown>;

function json<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const bool = (v: unknown) => v === 1 || v === true;

function toInvoice(r: Row): Invoice {
  return {
    ...(r as unknown as Invoice),
    schedule: json<ScheduleRow[]>(r.schedule, []),
    commitments: json<string[]>(r.commitments, []),
    complimentary: json<string[]>(r.complimentary, []),
    show_summary: bool(r.show_summary),
    gst_enabled: bool(r.gst_enabled),
    round_total: bool(r.round_total),
  };
}

function toMou(r: Row): Mou {
  return {
    ...(r as unknown as Mou),
    schedule: json<ScheduleRow[]>(r.schedule, []),
    plan_rows: json<PlanRow[]>(r.plan_rows, []),
    pricing_rows: json<PricingRow[]>(r.pricing_rows, []),
    our_responsibilities: json<string[]>(r.our_responsibilities, []),
    client_responsibilities: json<string[]>(r.client_responsibilities, []),
  };
}

/* ---------------------------------------------------------------- settings */

export async function getSetting(key: string): Promise<string | null> {
  const row = db().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as Row | undefined;
  return row ? String(row.value) : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  db()
    .prepare(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = db().prepare("SELECT key, value FROM app_settings").all() as Row[];
  return Object.fromEntries(rows.map((r) => [String(r.key), String(r.value)]));
}

/* ----------------------------------------------------------------- clients */

export async function listClients(): Promise<Client[]> {
  return db().prepare("SELECT * FROM clients ORDER BY name COLLATE NOCASE").all() as Client[];
}

export async function getClient(id: number): Promise<Client | null> {
  const row = db().prepare("SELECT * FROM clients WHERE id = ?").get(id) as Client | undefined;
  return row ?? null;
}

export async function insertClient(c: Partial<Client> & { name: string }): Promise<number> {
  const info = db()
    .prepare(
      `INSERT INTO clients (name, org, phone, email, address, city, gstin, notes)
       VALUES (@name, @org, @phone, @email, @address, @city, @gstin, @notes)`
    )
    .run({
      name: c.name,
      org: c.org ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      gstin: c.gstin ?? "",
      notes: c.notes ?? "",
    });
  return Number(info.lastInsertRowid);
}

export async function updateClient(id: number, c: Partial<Client>): Promise<void> {
  db()
    .prepare(
      `UPDATE clients SET name = @name, org = @org, phone = @phone, email = @email,
         address = @address, city = @city, gstin = @gstin, notes = @notes
       WHERE id = @id`
    )
    .run({
      id,
      name: c.name ?? "",
      org: c.org ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      gstin: c.gstin ?? "",
      notes: c.notes ?? "",
    });
}

export async function deleteClient(id: number): Promise<void> {
  db().prepare("DELETE FROM clients WHERE id = ?").run(id);
}

/* --------------------------------------------------------------- numbering */

/**
 * RR-INV-2026-0007 / RR-MOU-2026-0003. The counter bump and the read happen in
 * one transaction, so two documents saved at once can't take the same number.
 */
export async function nextDocNumber(kind: "invoice" | "mou"): Promise<string> {
  const conn = db();
  const year = new Date().getFullYear();
  const prefixKey = kind === "invoice" ? "invoice_prefix" : "mou_prefix";
  const counterKey = `${kind}_counter_${year}`;
  const fallback = kind === "invoice" ? "RR-INV" : "RR-MOU";

  const run = conn.transaction(() => {
    const pref = conn.prepare("SELECT value FROM app_settings WHERE key = ?").get(prefixKey) as Row | undefined;
    const prefix = (pref?.value as string) || fallback;
    const row = conn
      .prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, '1')
         ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(app_settings.value AS INTEGER) + 1 AS TEXT)
         RETURNING value`
      )
      .get(counterKey) as Row;
    return `${prefix}-${year}-${String(row.value).padStart(4, "0")}`;
  });

  return run();
}

/* ---------------------------------------------------------------- invoices */

export type InvoiceRow = Invoice & { client_name: string; client_org: string; paid: number };

export async function listInvoices(clientId?: number): Promise<InvoiceRow[]> {
  const where = clientId ? "WHERE i.client_id = ?" : "";
  const rows = db()
    .prepare(
      `SELECT i.*, c.name AS client_name, c.org AS client_org,
              COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.id), 0) AS paid
       FROM invoices i JOIN clients c ON c.id = i.client_id
       ${where}
       ORDER BY i.issue_date DESC, i.id DESC`
    )
    .all(...(clientId ? [clientId] : [])) as Row[];

  return rows.map((r) => ({
    ...toInvoice(r),
    client_name: String(r.client_name),
    client_org: String(r.client_org),
    paid: Number(r.paid),
  }));
}

export async function getInvoice(
  id: number
): Promise<{ invoice: Invoice; items: InvoiceItem[]; client: Client; paid: number } | null> {
  const conn = db();
  const row = conn.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as Row | undefined;
  if (!row) return null;

  const invoice = toInvoice(row);
  const client = conn.prepare("SELECT * FROM clients WHERE id = ?").get(invoice.client_id) as Client | undefined;
  if (!client) return null;

  const items = conn
    .prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id")
    .all(id) as InvoiceItem[];
  const paidRow = conn
    .prepare("SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE invoice_id = ?")
    .get(id) as Row;

  return { invoice, items, client, paid: Number(paidRow.paid) };
}

export type NewInvoice = Omit<Invoice, "id" | "invoice_no" | "created_at"> & {
  items: Omit<InvoiceItem, "id" | "invoice_id">[];
};

function invoiceParams(inv: NewInvoice) {
  return {
    client_id: inv.client_id,
    kind: inv.kind,
    title: inv.title,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    event_window: inv.event_window,
    schedule_note: inv.schedule_note,
    schedule: JSON.stringify(inv.schedule ?? []),
    show_summary: inv.show_summary ? 1 : 0,
    commitments: JSON.stringify(inv.commitments ?? []),
    complimentary: JSON.stringify(inv.complimentary ?? []),
    footer_note: inv.footer_note,
    discount_type: inv.discount_type,
    discount_value: inv.discount_value,
    discount_amount: inv.discount_amount,
    gst_enabled: inv.gst_enabled ? 1 : 0,
    gst_rate: inv.gst_rate,
    subtotal: inv.subtotal,
    gst_amount: inv.gst_amount,
    total: inv.total,
    round_total: inv.round_total ? 1 : 0,
  };
}

function insertItems(conn: Db, invoiceId: number, items: NewInvoice["items"]) {
  const stmt = conn.prepare(
    `INSERT INTO invoice_items (invoice_id, category, description, note, qty, rate, amount, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  items.forEach((it, i) => {
    stmt.run(invoiceId, it.category, it.description, it.note, it.qty, it.rate, it.amount, i);
  });
}

export async function insertInvoice(inv: NewInvoice): Promise<{ id: number; invoice_no: string }> {
  const conn = db();
  const invoice_no = await nextDocNumber("invoice");

  const run = conn.transaction(() => {
    const info = conn
      .prepare(
        `INSERT INTO invoices (
           invoice_no, client_id, kind, title, issue_date, due_date, event_window, schedule_note,
           schedule, show_summary, commitments, complimentary, footer_note,
           discount_type, discount_value, discount_amount, gst_enabled, gst_rate,
           subtotal, gst_amount, total, round_total
         ) VALUES (
           @invoice_no, @client_id, @kind, @title, @issue_date, @due_date, @event_window, @schedule_note,
           @schedule, @show_summary, @commitments, @complimentary, @footer_note,
           @discount_type, @discount_value, @discount_amount, @gst_enabled, @gst_rate,
           @subtotal, @gst_amount, @total, @round_total
         )`
      )
      .run({ ...invoiceParams(inv), invoice_no });

    const id = Number(info.lastInsertRowid);
    insertItems(conn, id, inv.items);
    return id;
  });

  return { id: run(), invoice_no };
}

export async function updateInvoice(id: number, inv: NewInvoice): Promise<void> {
  const conn = db();
  conn.transaction(() => {
    conn
      .prepare(
        `UPDATE invoices SET
           client_id = @client_id, kind = @kind, title = @title, issue_date = @issue_date,
           due_date = @due_date, event_window = @event_window, schedule_note = @schedule_note,
           schedule = @schedule, show_summary = @show_summary, commitments = @commitments,
           complimentary = @complimentary, footer_note = @footer_note,
           discount_type = @discount_type, discount_value = @discount_value,
           discount_amount = @discount_amount, gst_enabled = @gst_enabled, gst_rate = @gst_rate,
           subtotal = @subtotal, gst_amount = @gst_amount, total = @total, round_total = @round_total
         WHERE id = @id`
      )
      .run({ ...invoiceParams(inv), id });

    conn.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").run(id);
    insertItems(conn, id, inv.items);
  })();
}

export async function deleteInvoice(id: number): Promise<void> {
  db().prepare("DELETE FROM invoices WHERE id = ?").run(id);
}

/* ---------------------------------------------------------------- payments */

export async function insertPayment(p: Omit<Payment, "id">): Promise<void> {
  db()
    .prepare(
      `INSERT INTO payments (client_id, invoice_id, amount, date, method, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(p.client_id, p.invoice_id, p.amount, p.date, p.method, p.note);
}

export async function listPayments(clientId?: number, invoiceId?: number): Promise<Payment[]> {
  const conn = db();
  if (clientId) {
    return conn
      .prepare("SELECT * FROM payments WHERE client_id = ? ORDER BY date DESC, id DESC")
      .all(clientId) as Payment[];
  }
  if (invoiceId) {
    return conn
      .prepare("SELECT * FROM payments WHERE invoice_id = ? ORDER BY date DESC, id DESC")
      .all(invoiceId) as Payment[];
  }
  return conn.prepare("SELECT * FROM payments ORDER BY date DESC, id DESC").all() as Payment[];
}

export async function deletePayment(id: number): Promise<void> {
  db().prepare("DELETE FROM payments WHERE id = ?").run(id);
}

/* -------------------------------------------------------------------- MOUs */

export type MouRow = Mou & { client_name: string };

export async function listMous(clientId?: number): Promise<MouRow[]> {
  const where = clientId ? "WHERE m.client_id = ?" : "";
  const rows = db()
    .prepare(
      `SELECT m.*, c.name AS client_name
       FROM mous m JOIN clients c ON c.id = m.client_id
       ${where}
       ORDER BY m.issue_date DESC, m.id DESC`
    )
    .all(...(clientId ? [clientId] : [])) as Row[];
  return rows.map((r) => ({ ...toMou(r), client_name: String(r.client_name) }));
}

export async function getMou(id: number): Promise<{ mou: Mou; client: Client } | null> {
  const conn = db();
  const row = conn.prepare("SELECT * FROM mous WHERE id = ?").get(id) as Row | undefined;
  if (!row) return null;
  const mou = toMou(row);
  const client = conn.prepare("SELECT * FROM clients WHERE id = ?").get(mou.client_id) as Client | undefined;
  return client ? { mou, client } : null;
}

export type NewMou = Omit<Mou, "id" | "mou_no" | "created_at">;

function mouParams(m: NewMou) {
  return {
    client_id: m.client_id,
    kind: m.kind,
    client_label: m.client_label,
    issue_date: m.issue_date,
    start_date: m.start_date,
    end_date: m.end_date,
    period_note: m.period_note,
    purpose: m.purpose,
    schedule: JSON.stringify(m.schedule ?? []),
    scope_note: m.scope_note,
    plan_rows: JSON.stringify(m.plan_rows ?? []),
    pricing_rows: JSON.stringify(m.pricing_rows ?? []),
    pricing_total_label: m.pricing_total_label,
    pricing_total_value: m.pricing_total_value,
    pricing_note: m.pricing_note,
    our_responsibilities: JSON.stringify(m.our_responsibilities ?? []),
    client_responsibilities: JSON.stringify(m.client_responsibilities ?? []),
    payment_terms: m.payment_terms,
    confidentiality: m.confidentiality,
    termination: m.termination,
    status: m.status,
  };
}

export async function insertMou(m: NewMou): Promise<{ id: number; mou_no: string }> {
  const mou_no = await nextDocNumber("mou");
  const info = db()
    .prepare(
      `INSERT INTO mous (
         mou_no, client_id, kind, client_label, issue_date, start_date, end_date, period_note,
         purpose, schedule, scope_note, plan_rows, pricing_rows, pricing_total_label,
         pricing_total_value, pricing_note, our_responsibilities, client_responsibilities,
         payment_terms, confidentiality, termination, status
       ) VALUES (
         @mou_no, @client_id, @kind, @client_label, @issue_date, @start_date, @end_date, @period_note,
         @purpose, @schedule, @scope_note, @plan_rows, @pricing_rows, @pricing_total_label,
         @pricing_total_value, @pricing_note, @our_responsibilities, @client_responsibilities,
         @payment_terms, @confidentiality, @termination, @status
       )`
    )
    .run({ ...mouParams(m), mou_no });
  return { id: Number(info.lastInsertRowid), mou_no };
}

export async function updateMou(id: number, m: NewMou): Promise<void> {
  db()
    .prepare(
      `UPDATE mous SET
         client_id = @client_id, kind = @kind, client_label = @client_label,
         issue_date = @issue_date, start_date = @start_date, end_date = @end_date,
         period_note = @period_note, purpose = @purpose, schedule = @schedule,
         scope_note = @scope_note, plan_rows = @plan_rows, pricing_rows = @pricing_rows,
         pricing_total_label = @pricing_total_label, pricing_total_value = @pricing_total_value,
         pricing_note = @pricing_note, our_responsibilities = @our_responsibilities,
         client_responsibilities = @client_responsibilities, payment_terms = @payment_terms,
         confidentiality = @confidentiality, termination = @termination, status = @status
       WHERE id = @id`
    )
    .run({ ...mouParams(m), id });
}

export async function deleteMou(id: number): Promise<void> {
  db().prepare("DELETE FROM mous WHERE id = ?").run(id);
}

/* --------------------------------------------------------------- dashboard */

export async function dashboardStats() {
  const conn = db();
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const like = `${month}%`;

  const billed = conn
    .prepare("SELECT COALESCE(SUM(total), 0) AS v FROM invoices WHERE issue_date LIKE ?")
    .get(like) as Row;
  const collected = conn
    .prepare("SELECT COALESCE(SUM(amount), 0) AS v FROM payments WHERE date LIKE ?")
    .get(like) as Row;
  const totals = conn
    .prepare(
      `SELECT (SELECT COALESCE(SUM(total), 0) FROM invoices) AS billed,
              (SELECT COALESCE(SUM(amount), 0) FROM payments) AS paid`
    )
    .get() as Row;
  const counts = conn
    .prepare(
      `SELECT (SELECT COUNT(*) FROM clients) AS clients,
              (SELECT COUNT(*) FROM invoices) AS invoices,
              (SELECT COUNT(*) FROM mous WHERE status = 'active') AS mous`
    )
    .get() as Row;

  return {
    billedThisMonth: Number(billed.v),
    collectedThisMonth: Number(collected.v),
    outstanding: Math.max(0, Number(totals.billed) - Number(totals.paid)),
    clients: Number(counts.clients),
    invoices: Number(counts.invoices),
    activeMous: Number(counts.mous),
  };
}

/* ---------------------------------------------------------------- PIN gate */

export async function getPinHash(): Promise<string | null> {
  return getSetting("pin_hash");
}

export async function savePinHash(hash: string): Promise<void> {
  await setSetting("pin_hash", hash);
}
