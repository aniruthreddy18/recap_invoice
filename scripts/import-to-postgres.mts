/**
 * Loads data/export.json into the Postgres database named by DATABASE_URL.
 *
 *   npx tsx scripts/import-to-postgres.mts
 *
 * The export came from the SQLite version of this app (scripts/export-local-data.mts
 * at commit 408ce55). Run this once, against an empty database; it refuses to
 * run if clients already exist, so it can't double-import.
 */
import fs from "fs";
import path from "path";
import {
  insertClient, insertInvoice, insertMou, insertPayment, listClients, setSetting,
  type NewInvoice, type NewMou,
} from "@/lib/db";

type Row = Record<string, unknown>;

const file = path.join(process.cwd(), "data", "export.json");
if (!fs.existsSync(file)) throw new Error(`no export at ${file}`);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const dump = JSON.parse(fs.readFileSync(file, "utf8")) as {
  clients: Row[]; invoices: Row[]; invoice_items: Row[]; payments: Row[]; mous: Row[]; app_settings: Row[];
};

if ((await listClients()).length > 0) {
  throw new Error("target database already has clients — refusing to import on top of existing data");
}

// SQLite stored lists as JSON text and flags as 0/1.
const list = <T,>(v: unknown): T[] => {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string" && v) { try { return JSON.parse(v) as T[]; } catch { return []; } }
  return [];
};
const bool = (v: unknown) => v === 1 || v === true;
const str = (v: unknown) => String(v ?? "");

// Old ids don't survive the copy, so references are remapped as they go.
const clientIds = new Map<number, number>();
for (const c of dump.clients) {
  const id = await insertClient({
    name: str(c.name), org: str(c.org), phone: str(c.phone), email: str(c.email),
    address: str(c.address), city: str(c.city), gstin: str(c.gstin), notes: str(c.notes),
  });
  clientIds.set(Number(c.id), id);
}

const invoiceIds = new Map<number, number>();
for (const inv of dump.invoices) {
  const items = dump.invoice_items
    .filter((it) => Number(it.invoice_id) === Number(inv.id))
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map((it, i) => ({
      category: (it.category as "included" | "extra") ?? "included",
      description: str(it.description), note: str(it.note),
      qty: Number(it.qty), rate: Number(it.rate), amount: Number(it.amount), sort_order: i,
    }));

  const { id } = await insertInvoice({
    client_id: clientIds.get(Number(inv.client_id))!,
    kind: (inv.kind as NewInvoice["kind"]) ?? "event",
    title: str(inv.title),
    issue_date: str(inv.issue_date),
    due_date: str(inv.due_date),
    event_window: str(inv.event_window),
    schedule_note: str(inv.schedule_note),
    schedule: list<NewInvoice["schedule"][number]>(inv.schedule),
    show_summary: bool(inv.show_summary),
    commitments: list<string>(inv.commitments),
    complimentary: list<string>(inv.complimentary),
    footer_note: str(inv.footer_note),
    discount_type: (inv.discount_type as "flat" | "percent") ?? "flat",
    discount_value: Number(inv.discount_value ?? 0),
    discount_amount: Number(inv.discount_amount ?? 0),
    gst_enabled: bool(inv.gst_enabled),
    gst_rate: Number(inv.gst_rate ?? 18),
    subtotal: Number(inv.subtotal ?? 0),
    gst_amount: Number(inv.gst_amount ?? 0),
    total: Number(inv.total ?? 0),
    round_total: bool(inv.round_total),
    items,
  });
  invoiceIds.set(Number(inv.id), id);
}

for (const p of dump.payments) {
  await insertPayment({
    client_id: clientIds.get(Number(p.client_id))!,
    invoice_id: p.invoice_id ? (invoiceIds.get(Number(p.invoice_id)) ?? null) : null,
    amount: Number(p.amount), date: str(p.date),
    method: str(p.method) || "upi", note: str(p.note),
  });
}

for (const m of dump.mous) {
  await insertMou({
    client_id: clientIds.get(Number(m.client_id))!,
    kind: (m.kind as NewMou["kind"]) ?? "business",
    client_label: str(m.client_label),
    issue_date: str(m.issue_date),
    start_date: str(m.start_date),
    end_date: str(m.end_date),
    period_note: str(m.period_note),
    purpose: str(m.purpose),
    schedule: list<NewMou["schedule"][number]>(m.schedule),
    scope_note: str(m.scope_note),
    plan_rows: list<NewMou["plan_rows"][number]>(m.plan_rows),
    pricing_rows: list<NewMou["pricing_rows"][number]>(m.pricing_rows),
    pricing_total_label: str(m.pricing_total_label) || "Total Budget",
    pricing_total_value: str(m.pricing_total_value),
    pricing_note: str(m.pricing_note),
    our_responsibilities: list<string>(m.our_responsibilities),
    client_responsibilities: list<string>(m.client_responsibilities),
    payment_terms: str(m.payment_terms),
    confidentiality: str(m.confidentiality),
    termination: str(m.termination),
    status: (m.status as NewMou["status"]) ?? "active",
  });
}

// Company details and prefixes carry over. The PIN, session token, counters and
// lockout state deliberately don't: the hosted app starts with a fresh PIN.
const SKIP = new Set(["pin_hash", "session_token", "failed_attempts", "lockout_until"]);
for (const s of dump.app_settings) {
  const key = str(s.key);
  if (SKIP.has(key) || key.includes("_counter_")) continue;
  await setSetting(key, str(s.value));
}

console.log(
  `imported ${dump.clients.length} clients, ${dump.invoices.length} invoices, ` +
    `${dump.payments.length} payments, ${dump.mous.length} MOUs`
);
process.exit(0);
