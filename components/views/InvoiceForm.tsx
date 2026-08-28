"use client";

import { useMemo, useState } from "react";
import { Button, Card, Collapse, Field, Input, Label, Segmented, Select, Textarea } from "@/components/ui";
import ClientPicker, { type ClientChoice } from "@/components/views/ClientPicker";
import {
  computeTotals, eventsToSchedule, lineAmount, quoteEvents, scheduleToEvents,
  type EventRow, type ItemInput, type Rates,
} from "@/lib/invoice";
import EventBuilder from "@/components/views/EventBuilder";
import { money, money2, today } from "@/lib/format";
import {
  DEFAULT_BUSINESS_COMMITMENTS, DEFAULT_BUSINESS_COMPLIMENTARY, DEFAULT_COMMITMENTS,
  DEFAULT_COMPLIMENTARY, DEFAULT_FOOTER_NOTE,
} from "@/lib/defaults";
import type { Client, DocKind, Invoice, InvoiceItem, Package } from "@/lib/db";

type Props = {
  action: (form: FormData) => void;
  clients: Client[];
  /** Event packages and business plans; the form picks the right set. */
  packages: Package[];
  rates: Rates;
  presetClientId?: number;
  invoice?: Invoice;
  items?: InvoiceItem[];
  submitLabel: string;
};

const blankItem = (category: "included" | "extra" = "included"): ItemInput => ({
  category,
  description: "",
  note: "",
  qty: 1,
  rate: 0,
});

// Starting line items per document kind — a first row you can just overtype,
// rather than an empty grid you have to think about.
const STARTERS: Record<DocKind, ItemInput[]> = {
  event: [{ category: "included", description: "Standard Reel", note: "", qty: 1, rate: 1800 }],
  business: [{ category: "included", description: "Monthly Content Package", note: "", qty: 1, rate: 0 }],
};

// An event invoice promises things a retainer invoice can't ("we arrive at the
// venue before the event begins"), so the boilerplate follows the kind.
const COMMITMENTS: Record<DocKind, string[]> = {
  event: DEFAULT_COMMITMENTS,
  business: DEFAULT_BUSINESS_COMMITMENTS,
};

const COMPLIMENTARY: Record<DocKind, string[]> = {
  event: DEFAULT_COMPLIMENTARY,
  business: DEFAULT_BUSINESS_COMPLIMENTARY,
};

const text = (lines: string[]) => lines.join("\n");

export default function InvoiceForm({
  action, clients, packages, rates, presetClientId, invoice, items, submitLabel,
}: Props) {
  const preset = clients.find((c) => c.id === (invoice?.client_id ?? presetClientId));

  const [kind, setKind] = useState<DocKind>(invoice?.kind ?? "event");
  const [client, setClient] = useState<ClientChoice>({
    clientId: preset?.id ?? 0,
    name: preset?.name ?? "",
    phone: preset?.phone ?? "",
    city: preset?.city ?? "",
  });
  const [title, setTitle] = useState(invoice?.title ?? "");
  const [issueDate, setIssueDate] = useState(invoice?.issue_date ?? today());
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? "");
  const [eventWindow, setEventWindow] = useState(invoice?.event_window ?? "");
  const [scheduleNote, setScheduleNote] = useState(invoice?.schedule_note ?? "");
  const [showSummary, setShowSummary] = useState(invoice?.show_summary ?? true);
  const [packageId, setPackageId] = useState<number | null>(invoice?.package_id ?? null);
  // Documents raised before the event builder existed have no stored events and
  // their prices live in invoice_items. Those are loaded as manual lines and
  // their schedule is passed through untouched, so editing an old invoice can
  // never silently reprice it.
  const legacy = Boolean(invoice) && !invoice?.events?.length;
  const [events, setEvents] = useState<EventRow[]>(invoice?.events ?? []);
  // Manual charges that sit alongside whatever the event builder priced.
  const [lineItems, setLineItems] = useState<ItemInput[]>(
    invoice
      ? invoice.extra_lines?.length
        ? invoice.extra_lines.map((i) => ({ ...i }))
        : (items ?? []).map((i) => ({
            category: i.category, description: i.description, note: i.note,
            qty: Number(i.qty), rate: Number(i.rate),
          }))
      : kind === "business"
        ? STARTERS.business
        : [] // new event invoices get their lines from the event builder
  );
  const [gstEnabled, setGstEnabled] = useState(invoice?.gst_enabled ?? false);
  const [gstRate, setGstRate] = useState(Number(invoice?.gst_rate ?? 18));
  const [discountType, setDiscountType] = useState<"flat" | "percent">(invoice?.discount_type ?? "flat");
  const [discountValue, setDiscountValue] = useState(Number(invoice?.discount_value ?? 0));
  const [roundTotal, setRoundTotal] = useState(invoice?.round_total ?? true);
  const [commitments, setCommitments] = useState(
    invoice ? invoice.commitments.join("\n") : text(COMMITMENTS[kind])
  );
  const [complimentary, setComplimentary] = useState(
    invoice ? invoice.complimentary.join("\n") : text(COMPLIMENTARY[kind])
  );
  const [footerNote, setFooterNote] = useState(invoice?.footer_note ?? DEFAULT_FOOTER_NOTE);

  const isEvent = kind === "event";

  const kindPackages = packages.filter((p) => p.kind === kind);
  const selectedPackage = kindPackages.find((p) => p.id === packageId) ?? null;

  // Same function the server uses when saving, so the figures on screen and
  // the figures stored can't drift apart.
  const quote = useMemo(
    () => quoteEvents(kind === "event" ? events : [], kind === "event" ? selectedPackage : null, rates),
    [kind, events, selectedPackage, rates]
  );

  const pricedLines = kind === "event" ? quote.lines : [];
  const allLines = [...pricedLines, ...lineItems.filter((i) => i.description.trim() !== "")];

  const totals = useMemo(
    () => computeTotals(allLines, { discountType, discountValue, gstEnabled, gstRate, roundTotal }),
    [allLines, discountType, discountValue, gstEnabled, gstRate, roundTotal]
  );

  const payload = JSON.stringify({
    client_id: client.clientId,
    new_client_name: client.clientId ? "" : client.name,
    new_client_phone: client.phone,
    new_client_city: client.city,
    kind,
    package_id: isEvent ? packageId : null,
    events: isEvent ? events : [],
    // Only sent for documents that predate the builder; the server keeps it
    // rather than regenerating an empty schedule.
    legacy_schedule: legacy ? (invoice?.schedule ?? []) : [],
    extra_lines: lineItems.filter((i) => i.description.trim() !== ""),
    title: title || (isEvent ? "Event Content Production" : "Content Services"),
    issue_date: issueDate,
    due_date: dueDate,
    event_window: isEvent ? eventWindow : "",
    schedule_note: isEvent ? scheduleNote : "",
    show_summary: isEvent && showSummary,
    commitments: commitments.split("\n").map((s) => s.trim()).filter(Boolean),
    complimentary: complimentary.split("\n").map((s) => s.trim()).filter(Boolean),
    footer_note: footerNote,
    discount_type: discountType,
    discount_value: discountValue,
    gst_enabled: gstEnabled,
    gst_rate: gstRate,
    round_total: roundTotal,
  });

  const setItem = (idx: number, patch: Partial<ItemInput>) =>
    setLineItems((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const canSave = client.name.trim() !== "" && allLines.length > 0;

  return (
    <form action={action} className="grid gap-4">
      {invoice && <input type="hidden" name="id" value={invoice.id} />}
      <input type="hidden" name="payload" value={payload} />

      {/* 1 — what kind of invoice */}
      <Segmented
        value={kind}
        onChange={(k) => {
          const previous = kind;
          setKind(k);
          setPackageId(null); // the plan lists differ per kind
          if (invoice) return;
          // Only replace what the user hasn't touched.
          if (lineItems.length === 1 && lineItems[0].rate === STARTERS[previous][0].rate) {
            setLineItems(STARTERS[k]);
          }
          if (commitments === text(COMMITMENTS[previous])) setCommitments(text(COMMITMENTS[k]));
          if (complimentary === text(COMPLIMENTARY[previous])) setComplimentary(text(COMPLIMENTARY[k]));
        }}
        options={[
          { value: "event", label: "Event", hint: "Wedding, function — reels per event" },
          { value: "business", label: "Business", hint: "Retainer, content package" },
        ]}
      />

      {/* 2 — who and when */}
      <Card className="p-4 grid gap-4">
        <ClientPicker clients={clients} value={client} onChange={setClient} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          {isEvent ? (
            <Field label="Event dates (optional)">
              <Input value={eventWindow} onChange={(e) => setEventWindow(e.target.value)} placeholder="15–31 Aug 2026" />
            </Field>
          ) : (
            <Field label="Due date (optional)">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          )}
        </div>
      </Card>

      {/* 3 — the plan and the events it covers (event invoices only) */}
      {isEvent && (
        <EventBuilder
          packages={kindPackages}
          packageId={packageId}
          onPackage={setPackageId}
          events={events}
          onEvents={setEvents}
          rates={rates}
          quote={quote}
        />
      )}

      {/* 3b — business invoices bill a subscription plan, not reels */}
      {!isEvent && (
        <Card className="p-4 grid gap-3">
          <Label>Plan</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {kindPackages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPackageId(p.id);
                  setLineItems([
                    { category: "included", description: `${p.name} Plan`, note: "per month", qty: 1, rate: p.price },
                  ]);
                }}
                className={`rounded-lg border px-4 py-3 text-left cursor-pointer transition-colors ${
                  p.id === packageId ? "border-navy bg-navy text-white" : "border-line bg-paper hover:bg-field"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{p.name}</span>
                  <span className="tnum font-bold">{p.price > 0 ? `${money(p.price)}/mo` : "price not set"}</span>
                </div>
                <div className={`text-xs mt-0.5 ${p.id === packageId ? "text-white/70" : "text-mute"}`}>
                  {[
                    p.included_reels ? `${p.included_reels} reels` : "",
                    p.included_conceptual ? `${p.included_conceptual} AI reels` : "",
                    p.included_posters ? `${p.included_posters} posters` : "",
                  ].filter(Boolean).join(" · ")}
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPackageId(null)}
              className={`rounded-lg border px-4 py-3 text-left cursor-pointer transition-colors ${
                packageId === null ? "border-navy bg-navy text-white" : "border-line bg-paper hover:bg-field"
              }`}
            >
              <div className="font-semibold">Custom</div>
              <div className={`text-xs mt-0.5 ${packageId === null ? "text-white/70" : "text-mute"}`}>
                Write the charges yourself
              </div>
            </button>
          </div>
          <p className="text-xs text-mute">
            Prices are before GST — turn GST on below to add it.
          </p>
        </Card>
      )}

      {/* 4 — what the events priced, plus anything charged on top */}
      {isEvent && pricedLines.length > 0 && (
        <Card className="p-4 grid gap-2">
          <Label>Priced from the events above</Label>
          {pricedLines.map((l, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {l.description}
                {l.note ? <span className="text-mute"> ({l.note})</span> : null}
                {l.qty !== 1 ? <span className="text-mute"> × {l.qty}</span> : null}
              </span>
              <span className="tnum font-semibold text-navy">{money(lineAmount(l))}</span>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-4 grid gap-3">
        <div className="flex items-center justify-between">
          <Label>{isEvent ? "Additional charges" : "What they\u2019re paying for"}</Label>
          <span className="text-xs text-mute">rate × qty</span>
        </div>

        {lineItems.map((item, idx) => (
          <div key={idx} className="grid gap-2 rounded-lg border border-line p-3 sm:border-0 sm:p-0 sm:grid-cols-[1fr_7rem_5rem_auto] sm:items-center">
            <Input
              value={item.description}
              onChange={(e) => setItem(idx, { description: e.target.value })}
              placeholder={isEvent ? "Standard Reel" : "Monthly Content Package"}
            />
            {/* stacked on a phone, so each number needs its own label there */}
            <div>
              <span className="block text-xs text-mute mb-1 sm:hidden">Rate ₹</span>
              <Input
                type="number" step="0.01" inputMode="decimal" value={item.rate}
                onChange={(e) => setItem(idx, { rate: Number(e.target.value) })} aria-label="Rate"
              />
            </div>
            <div>
              <span className="block text-xs text-mute mb-1 sm:hidden">Qty</span>
              <Input
                type="number" step="0.01" inputMode="decimal" value={item.qty}
                onChange={(e) => setItem(idx, { qty: Number(e.target.value) })} aria-label="Quantity"
              />
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span className="font-bold text-navy tnum">{money(lineAmount(item))}</span>
              <button
                type="button"
                aria-label="Remove line"
                onClick={() => setLineItems((xs) => xs.filter((_, i) => i !== idx))}
                className="text-mute hover:text-red px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => setLineItems((xs) => [...xs, blankItem()])}>
            + Add line
          </Button>
          {isEvent && (
            <Button type="button" variant="ghost" onClick={() => setLineItems((xs) => [...xs, blankItem("extra")])}>
              + Add extra-reel line
            </Button>
          )}
        </div>

        {isEvent && lineItems.some((i) => i.category === "extra") && (
          <p className="text-xs text-mute">
            Lines added as “extra” are totalled separately on the invoice, the way the wedding quote does it.
          </p>
        )}
      </Card>

      {/* 4 — money */}
      <Card className="p-4 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>GST</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={gstEnabled} onChange={(e) => setGstEnabled(e.target.checked)} />
                Charge GST
              </label>
              {gstEnabled && (
                <>
                  <Input
                    type="number" step="0.01" inputMode="decimal" value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))} className="w-24" aria-label="GST rate"
                  />
                  <span className="text-sm text-mute">%</span>
                </>
              )}
            </div>
          </div>
          <div>
            <Label>Discount</Label>
            <div className="flex gap-2">
              <Input
                type="number" step="0.01" inputMode="decimal" value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
              <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")} className="w-24">
                <option value="flat">₹</option>
                <option value="percent">%</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-3 grid gap-1.5 text-sm">
          <Row label="Subtotal" value={money2(totals.subtotal)} />
          {totals.discountAmount > 0 && <Row label="Discount" value={`− ${money2(totals.discountAmount)}`} />}
          {gstEnabled && <Row label={`GST (${gstRate}%)`} value={money2(totals.gstAmount)} />}
          <div className="flex justify-between items-center rounded-lg bg-navy text-white px-4 py-3 mt-1">
            <span className="font-bold">Total</span>
            <span className="font-bold tnum text-lg">{money(totals.total)}</span>
          </div>
        </div>
      </Card>

      {/* 5 — everything optional, folded away */}
      {isEvent && (
        <Collapse
          title="Schedule wording"
          hint="How the event table is introduced on the PDF"
        >
          <div className="grid gap-4 pt-3">
            <Field label="Section note">
              <Input
                value={scheduleNote}
                onChange={(e) => setScheduleNote(e.target.value)}
                placeholder="Reel deliverables by event, Engagement through Reception."
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-mute">
              <input type="checkbox" checked={showSummary} onChange={(e) => setShowSummary(e.target.checked)} />
              Include the reel count summary table
            </label>
          </div>
        </Collapse>
      )}

      <Collapse title="Wording and extras" hint="Subtitle, commitments, complimentary items, footer — all pre-filled">
        <div className="grid gap-4 pt-3">
          <Field label="Document subtitle">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEvent ? "Event Content Production" : "Content Services"}
            />
          </Field>
          {isEvent && (
            <Field label="Due date">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          )}
          <Field label="Our commitments (one per line — leave blank to omit)">
            <Textarea rows={5} value={commitments} onChange={(e) => setCommitments(e.target.value)} />
          </Field>
          <Field label="Complimentary deliverables (one per line)">
            <Textarea rows={3} value={complimentary} onChange={(e) => setComplimentary(e.target.value)} />
          </Field>
          <Field label="Footer note">
            <Textarea rows={2} value={footerNote} onChange={(e) => setFooterNote(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-mute">
            <input type="checkbox" checked={roundTotal} onChange={(e) => setRoundTotal(e.target.checked)} />
            Round the final amount up to the whole rupee
          </label>
          {lineItems.some((i) => i.note) || (
            <p className="text-xs text-mute">
              Tip: line notes (like “₹1,999 list · ₹1,799 discounted”) can be added after saving, from Edit.
            </p>
          )}
        </div>
      </Collapse>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canSave}>{submitLabel}</Button>
        {!canSave && <span className="text-sm text-mute">Add a client name and one line to save.</span>}
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-mute">
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}
