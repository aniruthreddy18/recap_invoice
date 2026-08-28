/**
 * Fills the connected database with one worked example of each document —
 * the wedding invoice and the retainer MOU — so the app can be walked through
 * before any real client exists.
 *
 *   npm run seed
 *
 * Safe to re-run: it replaces the two demo clients. It touches nothing else,
 * but it does write to your real data file — skip it once you have live work.
 */
import {
  insertClient, insertInvoice, insertMou, insertPayment, listClients, deleteClient, setSetting,
} from "@/lib/db";
import { computeTotals } from "@/lib/invoice";
import {
  DEFAULT_CLIENT_RESPONSIBILITIES, DEFAULT_COMMITMENTS, DEFAULT_CONFIDENTIALITY,
  DEFAULT_OUR_RESPONSIBILITIES, DEFAULT_PAYMENT_TERMS, DEFAULT_PRICING_NOTE,
  DEFAULT_TERMINATION, defaultPurpose,
} from "@/lib/defaults";

const DEMO_NAMES = ["Reshmi Doddi", "Dr. Nagakumari"];

for (const c of await listClients()) {
  if (DEMO_NAMES.includes(c.name)) await deleteClient(c.id);
}

await setSetting("upi", "recapreels@upi");

/* ---------------------------------------------- wedding invoice --------- */

const weddingClient = await insertClient({ name: "Reshmi Doddi", city: "Hyderabad" });

const items = [
  { category: "included" as const, description: "Standard Reel", note: "₹1,999 list · ₹1,799 discounted", qty: 31, rate: 1800 },
  { category: "extra" as const, description: "Extra Customized Reel", note: "", qty: 9, rate: 1299 },
];
const t = computeTotals(items, { discountType: "flat", discountValue: 0, gstEnabled: true, gstRate: 18, roundTotal: true });

const invoice = await insertInvoice({
  client_id: weddingClient,
  kind: "event",
  package_id: null,
  events: [],
  extra_lines: [],
  title: "Wedding Content Production",
  issue_date: "2026-07-13",
  due_date: "",
  event_window: "15–31 Aug 2026",
  schedule_note: "Reel deliverables by event, Engagement through Reception.",
  schedule: [
    { date: "2026-08-15", event: "Engagement", place: "Hyderabad", included: "Couple Reel; Close Family Reel; Family Reel; Engagement Teaser Reel", extra: "Couple Conceptual Reel; Family Conceptual Reel; Customized Reel(s)" },
    { date: "2026-08-24", event: "Bride Haldi & Mehendi", place: "Devarakonda", included: "Bride Solo Reel; Family Reel; Overall Event Reel; Conceptual Reel", extra: "Customized Reel(s)" },
    { date: "2026-08-24", event: "Groom Haldi & Mehendi", place: "Hyderabad", included: "Groom Solo Reel; Family Reel; Overall Event Reel; Conceptual Reel", extra: "Customized Reel(s)" },
    { date: "2026-08-25", event: "Bride Pellikuthuru", place: "Devarakonda", included: "Bride Solo Reel; Family Reel; Overall Event Reel; Conceptual Reel", extra: "Customized Reel(s)" },
    { date: "2026-08-25", event: "Groom Pellikoduku", place: "Hyderabad", included: "Groom Solo Reel; Family Reel; Overall Event Reel; Conceptual Reel", extra: "Customized Reel(s)" },
    { date: "2026-08-27", event: "Wedding", place: "Hyderabad", included: "Couple Reel; Talambralu Reel; Family Reel; Close Family Reel; Guest Reel; Appaginthalu Reel; Overall Wedding Teaser (1m30s)", extra: "Family Conceptual Reel; Customized Reel(s)" },
    { date: "2026-08-31", event: "Reception", place: "Hyderabad", included: "Couple Reel; Family Reel; Couple & Family Reel; Overall Reception Reel", extra: "" },
  ],
  show_summary: true,
  commitments: DEFAULT_COMMITMENTS,
  complimentary: [
    "5 Complimentary Reels (in addition to the 31 included reels)",
    "25 Professionally Edited Photos from each event",
    "Event Décor covering venue setup and decorations",
    "Complimentary candid moments captured whenever possible",
  ],
  footer_note: "Prices reflect the limited-time discounted rate on standard reels. This invoice covers deliverables listed above only.",
  discount_type: "flat",
  discount_value: 0,
  discount_amount: t.discountAmount,
  gst_enabled: true,
  gst_rate: 18,
  subtotal: t.subtotal,
  gst_amount: t.gstAmount,
  total: t.total,
  round_total: true,
  items: items.map((i, idx) => ({ ...i, amount: i.qty * i.rate, sort_order: idx })),
});

// part-paid, so the dashboard has something outstanding to show
await insertPayment({ client_id: weddingClient, invoice_id: invoice.id, amount: 30000, date: "2026-08-05", method: "upi", note: "advance" });

/* ------------------------------------------------------ retainer MOU ---- */

const mouClient = await insertClient({ name: "Dr. Nagakumari", org: "Clinic", city: "Hyderabad" });

const mou = await insertMou({
  client_id: mouClient,
  kind: "business",
  package_id: null,
  months: 1,
  schedule: [],
  scope_note: "",
  client_label: "Dr. Nagakumari",
  issue_date: "2026-07-18",
  start_date: "2026-07-18",
  end_date: "2026-08-18",
  period_note: "four weeks",
  purpose: defaultPurpose("Dr. Nagakumari", "business"),
  plan_rows: [
    { label: "Plan", value: "Elite Plan" },
    { label: "Duration", value: "4 Weeks" },
    { label: "Reels", value: "24 Reels" },
    { label: "AI Reels", value: "Not included" },
    { label: "Concept Reels", value: "Not included" },
    { label: "Posters", value: "8 Posters" },
    { label: "Posting Schedule", value: "6 reels per week and 2 posters per week" },
    { label: "Support", value: "Complete content creation support" },
  ],
  pricing_rows: [
    { label: "Reels & Content Creation", value: "₹30,000 + 18% GST (₹5,400) = ₹35,400" },
    { label: "Marketing Budget", value: "₹5,000 (GST not applicable)" },
  ],
  pricing_total_label: "Total Budget",
  pricing_total_value: "₹35,400 + ₹5,000 = ₹40,400",
  pricing_note: DEFAULT_PRICING_NOTE,
  our_responsibilities: DEFAULT_OUR_RESPONSIBILITIES,
  client_responsibilities: DEFAULT_CLIENT_RESPONSIBILITIES,
  payment_terms: DEFAULT_PAYMENT_TERMS,
  confidentiality: DEFAULT_CONFIDENTIALITY,
  termination: DEFAULT_TERMINATION,
  status: "active",
});

/* ------------------------------------------ business retainer invoice --- */

const retainerItems = [
  { category: "included" as const, description: "Elite Plan — 24 Reels + 8 Posters", note: "monthly retainer", qty: 1, rate: 30000 },
  { category: "included" as const, description: "Marketing budget (ad spend)", note: "pass-through", qty: 1, rate: 5000 },
];
const rt = computeTotals(retainerItems, { discountType: "flat", discountValue: 0, gstEnabled: true, gstRate: 18, roundTotal: true });

const retainer = await insertInvoice({
  client_id: mouClient,
  kind: "business",
  package_id: null,
  events: [],
  extra_lines: [],
  title: "Content Services — August 2026",
  issue_date: "2026-08-01",
  due_date: "2026-08-07",
  event_window: "",
  schedule_note: "",
  schedule: [],
  show_summary: false,
  commitments: [],
  complimentary: [],
  footer_note: "Billed monthly against the signed MOU.",
  discount_type: "flat",
  discount_value: 0,
  discount_amount: rt.discountAmount,
  gst_enabled: true,
  gst_rate: 18,
  subtotal: rt.subtotal,
  gst_amount: rt.gstAmount,
  total: rt.total,
  round_total: true,
  items: retainerItems.map((i, idx) => ({ ...i, amount: i.qty * i.rate, sort_order: idx })),
});

console.log(
  `seeded ${invoice.invoice_no} (event, ₹${t.total.toLocaleString("en-IN")}), ` +
    `${retainer.invoice_no} (business, ₹${rt.total.toLocaleString("en-IN")}) and ${mou.mou_no}`
);
process.exit(0);
