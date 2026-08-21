/**
 * One-off: copy everything out of the old Postgres database into the local
 * SQLite file. Run once, from the project root, with PG_URL pointing at the
 * old database:
 *
 *   PG_URL=postgres://postgres@127.0.0.1:55432/recapops npx tsx scripts/migrate-from-postgres.mts
 *
 * Kept in the repo as the record of how the data moved; it is not part of the
 * running app and can be deleted once the old database is gone.
 */
import { execFileSync } from "child_process";
import {
  insertClient, insertInvoice, insertMou, insertPayment, listClients, setSetting,
  type NewInvoice, type NewMou,
} from "@/lib/db";

const PG = process.env.PG_URL;
if (!PG) throw new Error("PG_URL is not set");

const PSQL = "/opt/homebrew/opt/postgresql@17/bin/psql";

/** Runs a query and returns the rows as JSON, avoiding a driver dependency. */
function query<T>(sql: string): T[] {
  const out = execFileSync(PSQL, [PG!, "-t", "-A", "-c", `SELECT COALESCE(json_agg(t), '[]') FROM (${sql}) t`], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out.trim()) as T[];
}

if ((await listClients()).length > 0) {
  throw new Error("SQLite database already has clients — refusing to import on top of existing data");
}

const clients = query<Record<string, string>>("SELECT * FROM clients ORDER BY id");
const invoices = query<Record<string, unknown>>("SELECT * FROM invoices ORDER BY id");
const items = query<Record<string, unknown>>("SELECT * FROM invoice_items ORDER BY id");
const payments = query<Record<string, unknown>>("SELECT * FROM payments ORDER BY id");
const mous = query<Record<string, unknown>>("SELECT * FROM mous ORDER BY id");
const settings = query<{ key: string; value: string }>("SELECT * FROM app_settings");

// Old ids don't survive the copy, so every reference is remapped as it goes.
const clientIds = new Map<number, number>();
for (const c of clients) {
  const id = await insertClient({
    name: c.name, org: c.org ?? "", phone: c.phone ?? "", email: c.email ?? "",
    address: c.address ?? "", city: c.city ?? "", gstin: c.gstin ?? "", notes: c.notes ?? "",
  });
  clientIds.set(Number(c.id), id);
}

const invoiceIds = new Map<number, number>();
for (const inv of invoices) {
  const own = items
    .filter((it) => Number(it.invoice_id) === Number(inv.id))
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .map((it, i) => ({
      category: it.category as "included" | "extra",
      description: String(it.description), note: String(it.note ?? ""),
      qty: Number(it.qty), rate: Number(it.rate), amount: Number(it.amount), sort_order: i,
    }));

  const { id } = await insertInvoice({
    client_id: clientIds.get(Number(inv.client_id))!,
    kind: (inv.kind as "event" | "business") ?? "event",
    title: String(inv.title ?? ""),
    issue_date: String(inv.issue_date),
    due_date: String(inv.due_date ?? ""),
    event_window: String(inv.event_window ?? ""),
    schedule_note: String(inv.schedule_note ?? ""),
    schedule: (inv.schedule as NewInvoice["schedule"]) ?? [],
    show_summary: Boolean(inv.show_summary),
    commitments: (inv.commitments as string[]) ?? [],
    complimentary: (inv.complimentary as string[]) ?? [],
    footer_note: String(inv.footer_note ?? ""),
    discount_type: (inv.discount_type as "flat" | "percent") ?? "flat",
    discount_value: Number(inv.discount_value ?? 0),
    discount_amount: Number(inv.discount_amount ?? 0),
    gst_enabled: Boolean(inv.gst_enabled),
    gst_rate: Number(inv.gst_rate ?? 18),
    subtotal: Number(inv.subtotal ?? 0),
    gst_amount: Number(inv.gst_amount ?? 0),
    total: Number(inv.total ?? 0),
    round_total: Boolean(inv.round_total),
    items: own,
  });
  invoiceIds.set(Number(inv.id), id);
}

for (const p of payments) {
  await insertPayment({
    client_id: clientIds.get(Number(p.client_id))!,
    invoice_id: p.invoice_id ? (invoiceIds.get(Number(p.invoice_id)) ?? null) : null,
    amount: Number(p.amount), date: String(p.date),
    method: String(p.method ?? "upi"), note: String(p.note ?? ""),
  });
}

for (const m of mous) {
  await insertMou({
    client_id: clientIds.get(Number(m.client_id))!,
    kind: (m.kind as "event" | "business") ?? "business",
    client_label: String(m.client_label ?? ""),
    issue_date: String(m.issue_date),
    start_date: String(m.start_date ?? ""),
    end_date: String(m.end_date ?? ""),
    period_note: String(m.period_note ?? ""),
    purpose: String(m.purpose ?? ""),
    schedule: (m.schedule as NewMou["schedule"]) ?? [],
    scope_note: String(m.scope_note ?? ""),
    plan_rows: (m.plan_rows as NewMou["plan_rows"]) ?? [],
    pricing_rows: (m.pricing_rows as NewMou["pricing_rows"]) ?? [],
    pricing_total_label: String(m.pricing_total_label ?? "Total Budget"),
    pricing_total_value: String(m.pricing_total_value ?? ""),
    pricing_note: String(m.pricing_note ?? ""),
    our_responsibilities: (m.our_responsibilities as string[]) ?? [],
    client_responsibilities: (m.client_responsibilities as string[]) ?? [],
    payment_terms: String(m.payment_terms ?? ""),
    confidentiality: String(m.confidentiality ?? ""),
    termination: String(m.termination ?? ""),
    status: (m.status as NewMou["status"]) ?? "active",
  });
}

// Company details and prefixes carry over; the PIN hash and old session token
// do not, so the first launch sets a fresh PIN.
for (const s of settings) {
  if (s.key === "pin_hash" || s.key === "session_token") continue;
  if (s.key.includes("_counter_")) continue; // counters were re-derived above
  await setSetting(s.key, s.value);
}

console.log(
  `migrated ${clients.length} clients, ${invoices.length} invoices, ` +
    `${payments.length} payments, ${mous.length} MOUs`
);
process.exit(0);
