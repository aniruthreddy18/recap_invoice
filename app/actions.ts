"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  insertClient, updateClient, deleteClient,
  insertInvoice, updateInvoice, deleteInvoice,
  insertPayment, deletePayment,
  insertMou, updateMou, deleteMou,
  getPinHash, savePinHash, setSetting,
  type NewInvoice, type NewMou,
} from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, hashPin, sessionToken } from "@/lib/auth";
import { computeTotals, lineAmount, type ItemInput } from "@/lib/invoice";
import { SETTING_KEYS } from "@/lib/defaults";

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

  const existing = await getPinHash();
  const hash = await hashPin(pin);
  if (existing === null) {
    await savePinHash(hash); // first launch sets the PIN
  } else if (existing !== hash) {
    return { error: "Wrong PIN" };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function changePin(form: FormData): Promise<void> {
  const pin = str(form.get("new_pin"));
  if (pin.length < 4) return;
  await savePinHash(await hashPin(pin));
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
  title: string;
  issue_date: string;
  due_date: string;
  event_window: string;
  schedule_note: string;
  schedule: { date: string; event: string; place: string; included: string; extra: string }[];
  show_summary: boolean;
  commitments: string[];
  complimentary: string[];
  footer_note: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  gst_enabled: boolean;
  gst_rate: number;
  round_total: boolean;
  items: ItemInput[];
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

function buildInvoice(p: InvoicePayload, clientId: number): NewInvoice {
  const items = p.items.filter((i) => i.description.trim() !== "");
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
    title: p.title,
    issue_date: p.issue_date,
    due_date: p.due_date,
    event_window: p.event_window,
    schedule_note: p.schedule_note,
    schedule: p.schedule.filter((r) => r.event.trim() !== ""),
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
  const { id } = await insertInvoice(buildInvoice(p, clientId));
  revalidatePath("/invoices");
  revalidatePath("/clients");
  redirect(`/invoices/${id}`);
}

export async function updateInvoiceAction(form: FormData) {
  const id = num(form.get("id"));
  const p = JSON.parse(str(form.get("payload"))) as InvoicePayload;
  const clientId = await resolveClient(p);
  if (!id || !clientId) return;
  await updateInvoice(id, buildInvoice(p, clientId));
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
