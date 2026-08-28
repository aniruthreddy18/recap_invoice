"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  insertClient, updateClient, deleteClient,
  insertInvoice, updateInvoice, deleteInvoice,
  insertPayment, deletePayment,
  insertMou, updateMou, deleteMou,
  getPinHash, savePinHash, setSetting,
  insertPackage, updatePackage, deletePackage,
  insertExpense, deleteExpense,
  type NewInvoice, type NewMou, type Package,
} from "@/lib/db";
import {
  clearFailedAttempts, endSession, hashPin, lockoutRemainingMs, recordFailedAttempt, startSession,
} from "@/lib/auth";
import {
  computeTotals, eventsToSchedule, lineAmount, quoteEvents,
  type EventRow, type ItemInput,
} from "@/lib/invoice";
import { getSettings, listPackages } from "@/lib/db";
import { ratesFrom, SETTING_KEYS } from "@/lib/defaults";

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const num = (v: FormDataEntryValue | null) => {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? 0 : n;
};

/* ------------------------------------------------------------------- auth */

export async function submitPin(_prev: unknown, form: FormData): Promise<{ error?: string }> {
  const pin = str(form.get("pin"));
  const next = str(form.get("next")) || "/";
  if (pin.length < 4) return { error: "PIN must be at least 4 digits" };

  // The keypad is reachable by anyone who has the URL, so wrong guesses are
  // capped before they get anywhere.
  const locked = await lockoutRemainingMs();
  if (locked > 0) {
    return { error: `Too many wrong attempts. Try again in ${Math.ceil(locked / 60000)} minute(s).` };
  }

  const existing = await getPinHash();
  const hash = hashPin(pin);
  if (existing === null) {
    await savePinHash(hash); // first launch sets the PIN
  } else if (existing !== hash) {
    const left = await recordFailedAttempt();
    return {
      error: left > 0 ? `Wrong PIN — ${left} attempt(s) left` : "Too many wrong attempts. Locked for 5 minutes.",
    };
  }

  await clearFailedAttempts();
  await startSession();
  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function changePin(form: FormData): Promise<void> {
  const pin = str(form.get("new_pin"));
  if (pin.length < 4) return;
  await savePinHash(hashPin(pin));
  revalidatePath("/settings");
}

/* ---------------------------------------------------------------- clients */

function clientFrom(form: FormData) {
  return {
    name: str(form.get("name")),
    org: str(form.get("org")),
    phone: str(form.get("phone")),
    email: str(form.get("email")),
    address: str(form.get("address")),
    city: str(form.get("city")),
    gstin: str(form.get("gstin")),
    notes: str(form.get("notes")),
  };
}

export async function createClientAction(form: FormData) {
  const c = clientFrom(form);
  if (!c.name) return;
  const id = await insertClient(c);
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

export async function updateClientAction(form: FormData) {
  const id = num(form.get("id"));
  const c = clientFrom(form);
  if (!id || !c.name) return;
  await updateClient(id, c);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClientAction(form: FormData) {
  const id = num(form.get("id"));
  if (!id) return;
  await deleteClient(id);
  revalidatePath("/clients");
  redirect("/clients");
}

/* --------------------------------------------------------------- invoices */

// The invoice form is a client component holding line items, schedule rows and
// bullet lists in state; it ships the whole thing as one JSON field rather than
// trying to express nested arrays in flat FormData keys.
type InvoicePayload = {
  client_id: number;
  // Typed straight into the invoice form instead of picking an existing
  // client — the most common case is a client who doesn't exist yet.
  new_client_name?: string;
  new_client_phone?: string;
  new_client_city?: string;
  kind: "event" | "business";
  package_id: number | null;
  events: EventRow[];
  legacy_schedule?: { date: string; event: string; place: string; included: string; extra: string }[];
  extra_lines: ItemInput[];
  title: string;
  issue_date: string;
  due_date: string;
  event_window: string;
  schedule_note: string;
  show_summary: boolean;
  commitments: string[];
  complimentary: string[];
  footer_note: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  gst_enabled: boolean;
  gst_rate: number;
  round_total: boolean;
};

/** Resolve the client the document belongs to, creating them if they're new. */
async function resolveClient(p: {
  client_id?: number;
  new_client_name?: string;
  new_client_phone?: string;
  new_client_city?: string;
}): Promise<number> {
  if (p.client_id) return p.client_id;
  const name = (p.new_client_name ?? "").trim();
  if (!name) return 0;
  return insertClient({
    name,
    phone: (p.new_client_phone ?? "").trim(),
    city: (p.new_client_city ?? "").trim(),
  });
}

/**
 * Prices the invoice on the server from the stored package and event list.
 * The form computes the same figures for live display, but what gets saved is
 * always recomputed here — a browser can't talk this into a different total.
 */
async function buildInvoice(p: InvoicePayload, clientId: number): Promise<NewInvoice> {
  const settings = await getSettings();
  const rates = ratesFrom(settings);

  const events = p.kind === "event" ? (p.events ?? []).filter((e) => e.event.trim() !== "") : [];
  const pkg = p.package_id
    ? (await listPackages("event")).find((x) => x.id === p.package_id) ?? null
    : null;

  const quoted = p.kind === "event" ? quoteEvents(events, pkg, rates).lines : [];
  const extras = (p.extra_lines ?? []).filter((i) => i.description.trim() !== "");
  const items = [...quoted, ...extras];

  const t = computeTotals(items, {
    discountType: p.discount_type,
    discountValue: p.discount_value,
    gstEnabled: p.gst_enabled,
    gstRate: p.gst_rate,
    roundTotal: p.round_total,
  });
  return {
    client_id: clientId,
    kind: p.kind,
    package_id: p.kind === "event" ? p.package_id : null,
    events,
    extra_lines: extras,
    title: p.title,
    issue_date: p.issue_date,
    due_date: p.due_date,
    event_window: p.event_window,
    schedule_note: p.schedule_note,
    // An older invoice keeps the schedule it was written with; a new one has
    // it generated from the event rows.
    schedule: events.length ? eventsToSchedule(events) : (p.legacy_schedule ?? []),
    show_summary: p.show_summary,
    commitments: p.commitments.filter((c) => c.trim() !== ""),
    complimentary: p.complimentary.filter((c) => c.trim() !== ""),
    footer_note: p.footer_note,
    discount_type: p.discount_type,
    discount_value: p.discount_value,
    discount_amount: t.discountAmount,
    gst_enabled: p.gst_enabled,
    gst_rate: p.gst_rate,
    subtotal: t.subtotal,
    gst_amount: t.gstAmount,
    total: t.total,
    round_total: p.round_total,
    items: items.map((i, idx) => ({
      category: i.category,
      description: i.description,
      note: i.note,
      qty: i.qty,
      rate: i.rate,
      amount: lineAmount(i),
      sort_order: idx,
    })),
  };
}

export async function createInvoiceAction(form: FormData) {
  const p = JSON.parse(str(form.get("payload"))) as InvoicePayload;
  const clientId = await resolveClient(p);
  if (!clientId) return;
  const { id } = await insertInvoice(await buildInvoice(p, clientId));
  revalidatePath("/invoices");
  revalidatePath("/clients");
  redirect(`/invoices/${id}`);
}

export async function updateInvoiceAction(form: FormData) {
  const id = num(form.get("id"));
  const p = JSON.parse(str(form.get("payload"))) as InvoicePayload;
  const clientId = await resolveClient(p);
  if (!id || !clientId) return;
  await updateInvoice(id, await buildInvoice(p, clientId));
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function deleteInvoiceAction(form: FormData) {
  const id = num(form.get("id"));
  if (!id) return;
  await deleteInvoice(id);
  revalidatePath("/invoices");
  redirect("/invoices");
}

/* --------------------------------------------------------------- payments */

export async function recordPaymentAction(form: FormData) {
  const client_id = num(form.get("client_id"));
  const invoice_id = num(form.get("invoice_id")) || null;
  const amount = num(form.get("amount"));
  if (!client_id || amount <= 0) return;
  await insertPayment({
    client_id,
    invoice_id,
    amount,
    date: str(form.get("date")) || new Date().toISOString().slice(0, 10),
    method: str(form.get("method")) || "upi",
    note: str(form.get("note")),
  });
  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath(`/clients/${client_id}`);
  if (invoice_id) revalidatePath(`/invoices/${invoice_id}`);
}

export async function deletePaymentAction(form: FormData) {
  const id = num(form.get("id"));
  if (!id) return;
  await deletePayment(id);
  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath("/clients");
}

/* ------------------------------------------------------------------- MOUs */

type MouPayload = NewMou & {
  new_client_name?: string;
  new_client_phone?: string;
  new_client_city?: string;
};

export async function createMouAction(form: FormData) {
  const p = JSON.parse(str(form.get("payload"))) as MouPayload;
  const clientId = await resolveClient(p);
  if (!clientId) return;
  const { id } = await insertMou({ ...p, client_id: clientId });
  revalidatePath("/mou");
  revalidatePath("/clients");
  redirect(`/mou/${id}`);
}

export async function updateMouAction(form: FormData) {
  const id = num(form.get("id"));
  const p = JSON.parse(str(form.get("payload"))) as MouPayload;
  const clientId = await resolveClient(p);
  if (!id || !clientId) return;
  await updateMou(id, { ...p, client_id: clientId });
  revalidatePath("/mou");
  revalidatePath(`/mou/${id}`);
  redirect(`/mou/${id}`);
}

export async function deleteMouAction(form: FormData) {
  const id = num(form.get("id"));
  if (!id) return;
  await deleteMou(id);
  revalidatePath("/mou");
  redirect("/mou");
}

/* --------------------------------------------------------------- settings */

export async function saveSettingsAction(form: FormData) {
  for (const key of SETTING_KEYS) {
    await setSetting(key, str(form.get(key)));
  }
  revalidatePath("/settings");
  revalidatePath("/invoices");
}

/* ---------------------------------------------------------------- packages */

function packageFrom(form: FormData): Omit<Package, "id"> {
  return {
    kind: str(form.get("kind")) === "mou" ? "mou" : "event",
    name: str(form.get("name")),
    price: num(form.get("price")),
    included_reels: Math.max(0, Math.round(num(form.get("included_reels")))),
    included_conceptual: Math.max(0, Math.round(num(form.get("included_conceptual")))),
    included_posters: Math.max(0, Math.round(num(form.get("included_posters")))),
    details: JSON.parse(str(form.get("details")) || "[]"),
    note: str(form.get("note")),
    sort_order: Math.round(num(form.get("sort_order"))),
  };
}

export async function savePackageAction(form: FormData) {
  const id = num(form.get("id"));
  const p = packageFrom(form);
  if (!p.name) return;
  if (id) await updatePackage(id, p);
  else await insertPackage(p);
  revalidatePath("/settings/packages");
  revalidatePath("/invoices/new");
  revalidatePath("/mou/new");
}

export async function deletePackageAction(form: FormData) {
  const id = num(form.get("id"));
  if (!id) return;
  await deletePackage(id);
  revalidatePath("/settings/packages");
}

/* ---------------------------------------------------------------- expenses */

export async function addExpenseAction(form: FormData) {
  const amount = num(form.get("amount"));
  if (amount <= 0) return;
  await insertExpense({
    date: str(form.get("date")) || new Date().toISOString().slice(0, 10),
    category: str(form.get("category")) || "other",
    amount,
    paid_to: str(form.get("paid_to")),
    method: str(form.get("method")) || "upi",
    note: str(form.get("note")),
  });
  revalidatePath("/money");
  revalidatePath("/money/expenses");
}

export async function deleteExpenseAction(form: FormData) {
  const id = num(form.get("id"));
  if (!id) return;
  await deleteExpense(id);
  revalidatePath("/money");
  revalidatePath("/money/expenses");
}
