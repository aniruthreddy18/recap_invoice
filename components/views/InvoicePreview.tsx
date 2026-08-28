import Image from "next/image";
import type { Client, Invoice, InvoiceItem } from "@/lib/db";
import { computeTotals, itemsToInput, lineAmount, scheduleSummary, summaryFromEvents } from "@/lib/invoice";
import { longDate, money, money2, shortDateParts } from "@/lib/format";

/**
 * On-screen twin of the PDF. Kept deliberately close to lib/pdf/InvoiceDoc.tsx
 * so what you approve here is what downloads.
 */
export default function InvoicePreview({
  invoice,
  items,
  client,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client;
}) {
  const t = computeTotals(itemsToInput(items), {
    discountType: invoice.discount_type,
    discountValue: Number(invoice.discount_value),
    gstEnabled: invoice.gst_enabled,
    gstRate: Number(invoice.gst_rate),
    roundTotal: invoice.round_total,
  });
  const summary = invoice.events?.length
    ? summaryFromEvents(invoice.events)
    : scheduleSummary(invoice.schedule ?? []);

  return (
    <div className="bg-paper border border-line rounded-xl p-5 sm:p-8 text-[13px]">
      <header className="flex items-start justify-between gap-4 pb-4 border-b-2 border-navy">
        <Image src="/logo-wordmark.png" alt="RecapReels" width={274} height={87} className="h-9 w-auto" />
        <div className="text-right">
          <div className="display text-navy font-bold text-2xl tracking-tight">INVOICE</div>
          {invoice.title && <div className="text-mute">{invoice.title}</div>}
        </div>
      </header>

      <div className="flex justify-between gap-6 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-mute">Billed to</div>
          <div className="font-bold text-navy mt-1">{client.name}</div>
          {client.org && <div className="text-mute">{client.org}</div>}
          {client.address && <div className="text-mute">{client.address}</div>}
          {client.city && <div className="text-mute">{client.city}</div>}
          {client.gstin && <div className="text-mute">GSTIN {client.gstin}</div>}
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-widest text-mute">Invoice details</div>
          <div className="mt-1">No: <span className="font-bold text-navy">{invoice.invoice_no}</span></div>
          <div>Invoice Date: <span className="font-bold text-navy">{longDate(invoice.issue_date)}</span></div>
          {invoice.due_date && <div>Due: <span className="font-bold text-navy">{longDate(invoice.due_date)}</span></div>}
          {invoice.event_window && <div>Event Window: <span className="font-bold text-navy">{invoice.event_window}</span></div>}
        </div>
      </div>

      {invoice.plan_details?.length > 0 && (
        <section className="mt-4">
          <h3 className="display text-navy font-bold text-base mb-2">
            {invoice.plan_name ? `${invoice.plan_name} — what's included` : "What's included"}
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy text-white text-left">
                <Th className="w-1/3">Item</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.plan_details.map((d, i) => (
                <tr key={i} className={i % 2 ? "bg-field" : ""}>
                  <Td className="font-bold text-navy">{d.label}</Td>
                  <Td>{d.value}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {invoice.schedule?.length > 0 && (
        <section className="mt-6">
          <h3 className="display text-navy font-bold text-base">{invoice.title || "Schedule"}</h3>
          {invoice.schedule_note && <p className="text-mute mb-2">{invoice.schedule_note}</p>}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy text-white text-left">
                  <Th>Date</Th><Th>Event</Th><Th>Included Reels</Th><Th>Extra Deliverables</Th>
                </tr>
              </thead>
              <tbody>
                {invoice.schedule.map((r, i) => {
                  const d = shortDateParts(r.date);
                  return (
                    <tr key={i} className={i % 2 ? "bg-field" : ""}>
                      <Td><div>{d.month}</div><div>{d.day}</div></Td>
                      <Td>
                        <div>{r.event}</div>
                        {r.place && <div className="text-mute text-xs">{r.place}</div>}
                      </Td>
                      <Td>{r.included}</Td>
                      <Td>{r.extra || "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {invoice.show_summary && invoice.schedule?.length > 0 && (
        <section className="mt-6">
          <h3 className="display text-navy font-bold text-base mb-2">Reel Count Summary</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy text-white text-left">
                <Th>Event</Th><Th className="text-right">Included</Th><Th className="text-right">Conceptual</Th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-field" : ""}>
                  <Td>{r.event}</Td>
                  <Td className="text-right tnum">{r.included}</Td>
                  <Td className="text-right tnum">{r.extra}</Td>
                </tr>
              ))}
              <tr className="border-t-2 border-navy font-bold text-navy">
                <Td>Total</Td>
                <Td className="text-right tnum">{summary.totalIncluded}</Td>
                <Td className="text-right tnum">{summary.totalExtra}</Td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-6">
        <h3 className="display text-navy font-bold text-base mb-2">Pricing</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-navy text-white text-left">
              <Th>Item</Th><Th className="text-right">Rate</Th><Th className="text-right">Qty</Th><Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className={i % 2 ? "bg-field" : ""}>
                <Td>
                  {it.description}
                  {it.note && <span className="text-mute text-xs"> ({it.note})</span>}
                </Td>
                <Td className="text-right tnum">{money(Number(it.rate))}</Td>
                <Td className="text-right tnum">{Number(it.qty)}</Td>
                <Td className="text-right tnum">{money(Number(it.amount))}</Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full sm:w-80 grid gap-1.5">
          {t.hasExtra && (
            <>
              <Line label="Included Reels Subtotal" value={money2(t.includedSubtotal)} />
              {invoice.gst_enabled && <Line label={`GST on Included (${Number(invoice.gst_rate)}%)`} value={money2(t.includedGst)} />}
              <Line label="Included Total" value={money2(t.includedTotal)} strong />
              <Line label="Extra Reels Subtotal" value={money2(t.extraSubtotal)} />
              {invoice.gst_enabled && <Line label={`GST on Extra (${Number(invoice.gst_rate)}%)`} value={money2(t.extraGst)} />}
              <Line label="Extra Total" value={money2(t.extraTotal)} strong />
            </>
          )}
          <Line label="Subtotal" value={money2(t.subtotal)} />
          {t.discountAmount > 0 && <Line label="Discount" value={`− ${money2(t.discountAmount)}`} />}
          {invoice.gst_enabled && <Line label={`GST (${Number(invoice.gst_rate)}%)`} value={money2(t.gstAmount)} />}
          <div className="flex justify-between items-center bg-navy text-white rounded-md px-4 py-2.5 mt-1">
            <span className="font-bold">Final Amount</span>
            <span className="font-bold tnum">{money2(t.total)}</span>
          </div>
        </div>
      </section>

      {invoice.commitments?.length > 0 && (
        <Bullets title="Our Commitments" items={invoice.commitments} />
      )}
      {invoice.complimentary?.length > 0 && (
        <Bullets title="Complimentary Deliverables" items={invoice.complimentary} />
      )}

      {invoice.footer_note && (
        <p className="mt-6 pt-4 border-t border-line text-xs text-mute">
          {t.total !== t.rawTotal ? `Final Amount rounded from ${money2(t.rawTotal)}. ` : ""}
          {invoice.footer_note}
        </p>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-xs font-semibold ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top border-b border-line ${className}`}>{children}</td>;
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-bold text-navy" : "text-mute"}`}>
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h3 className="display text-navy font-bold text-base mb-2">{title}</h3>
      <ul className="grid gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-blue">•</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
