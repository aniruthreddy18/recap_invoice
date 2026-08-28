/**
 * Renders both templates with fixture data — no database needed — so the
 * layout can be compared side by side with the original documents.
 *
 *   npx tsx scripts/render-sample.tsx [outDir]
 */
import { renderToFile } from "@react-pdf/renderer";
import path from "path";
import InvoiceDoc from "@/lib/pdf/InvoiceDoc";
import MouDoc from "@/lib/pdf/MouDoc";
import {
  DEFAULT_CLIENT_RESPONSIBILITIES, DEFAULT_COMMITMENTS, DEFAULT_CONFIDENTIALITY,
  DEFAULT_OUR_RESPONSIBILITIES, DEFAULT_PAYMENT_TERMS, DEFAULT_PRICING_NOTE,
  DEFAULT_TERMINATION, companyFrom, defaultPurpose,
} from "@/lib/defaults";
import type { Client, Invoice, InvoiceItem, Mou } from "@/lib/db";

const out = process.argv[2] || ".";

const client = {
  id: 1, name: "Reshmi Doddi", org: "", phone: "", email: "",
  address: "", city: "Hyderabad", gstin: "", notes: "", created_at: "",
} satisfies Client;

const invoice = {
  id: 1,
  invoice_no: "RR-INV-2026-0001",
  client_id: 1,
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
  discount_amount: 0,
  gst_enabled: true,
  gst_rate: 18,
  subtotal: 67491,
  gst_amount: 12148.38,
  total: 79640,
  round_total: true,
  created_at: "",
} satisfies Invoice;

const items = [
  { id: 1, invoice_id: 1, category: "included", description: "Standard Reel", note: "₹1,999 list · ₹1,799 discounted", qty: 31, rate: 1800, amount: 55800, sort_order: 0 },
  { id: 2, invoice_id: 1, category: "extra", description: "Extra Customized Reel", note: "", qty: 9, rate: 1299, amount: 11691, sort_order: 1 },
] satisfies InvoiceItem[];

const mouClient = { ...client, id: 2, name: "Dr. Nagakumari", city: "" } satisfies Client;

const mou = {
  id: 1,
  mou_no: "RR-MOU-2026-0001",
  client_id: 2,
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
  created_at: "",
} satisfies Mou;

async function main() {
  const company = companyFrom({});
  await renderToFile(
    <InvoiceDoc invoice={invoice} items={items} client={client} company={company} />,
    path.join(out, "sample-invoice.pdf")
  );
  await renderToFile(
    <MouDoc mou={mou} client={mouClient} company={company} />,
    path.join(out, "sample-mou.pdf")
  );
  console.log("wrote sample-invoice.pdf and sample-mou.pdf to", out);
}

main();
