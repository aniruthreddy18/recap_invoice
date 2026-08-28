import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { C, LOGO, registerFonts, s } from "./theme";
import type { Client, Invoice, InvoiceItem } from "@/lib/db";
import { computeTotals, itemsToInput, scheduleSummary, summaryFromEvents } from "@/lib/invoice";
import { longDate, money, money2, shortDateParts } from "@/lib/format";
import type { Company } from "@/lib/defaults";

export default function InvoiceDoc({
  invoice,
  items,
  client,
  company,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client;
  company: Company;
}) {
  registerFonts();

  const t = computeTotals(itemsToInput(items), {
    discountType: invoice.discount_type,
    discountValue: Number(invoice.discount_value),
    gstEnabled: invoice.gst_enabled,
    gstRate: Number(invoice.gst_rate),
    roundTotal: invoice.round_total,
  });
  // Counts come from the event rows when the invoice has them; older invoices
  // are still parsed out of their schedule text.
  const summary = invoice.events?.length
    ? summaryFromEvents(invoice.events)
    : scheduleSummary(invoice.schedule ?? []);
  const gstRate = Number(invoice.gst_rate);
  const hasBank = Boolean(company.account_no || company.upi);

  return (
    <Document title={`${invoice.invoice_no} — ${client.name}`} author={company.name}>
      <Page size="LETTER" style={s.page}>
        {/* header */}
        <View style={s.between}>
          <Image src={LOGO} style={s.logo} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.h1}>INVOICE</Text>
            {invoice.title ? <Text style={s.mute}>{invoice.title}</Text> : null}
          </View>
        </View>
        <View style={s.rule} />

        {/* parties */}
        <View style={[s.between, { marginTop: 14 }]}>
          <View style={{ maxWidth: "55%" }}>
            <Text style={s.label}>BILLED TO</Text>
            <Text style={[s.strong, { fontSize: 11, marginTop: 3 }]}>{client.name}</Text>
            {client.org ? <Text style={s.mute}>{client.org}</Text> : null}
            {client.address ? <Text style={s.mute}>{client.address}</Text> : null}
            {client.city ? <Text style={s.mute}>{client.city}</Text> : null}
            {client.gstin ? <Text style={s.mute}>GSTIN {client.gstin}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>INVOICE DETAILS</Text>
            <Detail label="Invoice No:" value={invoice.invoice_no} />
            <Detail label="Invoice Date:" value={longDate(invoice.issue_date)} />
            {invoice.due_date ? <Detail label="Due Date:" value={longDate(invoice.due_date)} /> : null}
            {invoice.event_window ? <Detail label="Event Window:" value={invoice.event_window} /> : null}
          </View>
        </View>

        {/* what the chosen plan covers */}
        {invoice.plan_details?.length ? (
          <View style={{ marginTop: 20 }} wrap={false}>
            <Text style={s.h2}>
              {invoice.plan_name ? `${invoice.plan_name} — what's included` : "What's included"}
            </Text>
            <View style={s.thead}>
              <Text style={[s.th, { width: "34%" }]}>Item</Text>
              <Text style={[s.th, { width: "66%" }]}>Details</Text>
            </View>
            {invoice.plan_details.map((d, i) => (
              <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
                <Text style={[s.td, s.strong, { width: "34%" }]}>{d.label}</Text>
                <Text style={[s.td, { width: "66%" }]}>{d.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* schedule */}
        {invoice.schedule?.length ? (
          <View style={{ marginTop: 20 }}>
            <Text style={s.h2}>{invoice.title || "Schedule"}</Text>
            {invoice.schedule_note ? (
              <Text style={[s.mute, { marginTop: -4, marginBottom: 8 }]}>{invoice.schedule_note}</Text>
            ) : null}
            <View style={s.thead}>
              <Text style={[s.th, { width: "9%" }]}>Date</Text>
              <Text style={[s.th, { width: "21%" }]}>Event</Text>
              <Text style={[s.th, { width: "42%" }]}>Included Reels</Text>
              <Text style={[s.th, { width: "28%" }]}>Extra Deliverables</Text>
            </View>
            {invoice.schedule.map((r, i) => {
              const d = shortDateParts(r.date);
              return (
                <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
                  <View style={[s.td, { width: "9%" }]}>
                    <Text>{d.month}</Text>
                    <Text>{d.day}</Text>
                  </View>
                  <View style={[s.td, { width: "21%" }]}>
                    <Text>{r.event}</Text>
                    {r.place ? <Text style={[s.mute, { fontSize: 7.5 }]}>{r.place}</Text> : null}
                  </View>
                  <Text style={[s.td, { width: "42%" }]}>{r.included}</Text>
                  <Text style={[s.td, { width: "28%" }]}>{r.extra || "—"}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* reel count summary */}
        {invoice.show_summary && invoice.schedule?.length ? (
          <View style={{ marginTop: 20 }} break={invoice.schedule.length > 5}>
            <Text style={s.h2}>Reel Count Summary</Text>
            <View style={s.thead}>
              <Text style={[s.th, { width: "60%" }]}>Event</Text>
              <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Included</Text>
              <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Conceptual</Text>
            </View>
            {summary.rows.map((r, i) => (
              <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
                <Text style={[s.td, { width: "60%" }]}>{r.event}</Text>
                <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{r.included}</Text>
                <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{r.extra}</Text>
              </View>
            ))}
            <View style={[s.row, { borderTopWidth: 1.2, borderTopColor: C.navy }]}>
              <Text style={[s.td, s.strong, { width: "60%" }]}>Total</Text>
              <Text style={[s.td, s.strong, { width: "20%", textAlign: "right" }]}>{summary.totalIncluded}</Text>
              <Text style={[s.td, s.strong, { width: "20%", textAlign: "right" }]}>{summary.totalExtra}</Text>
            </View>
          </View>
        ) : null}

        {/* pricing */}
        <View style={{ marginTop: 22 }} wrap={false}>
          <Text style={s.h2}>Pricing</Text>
          <View style={s.thead}>
            <Text style={[s.th, { width: "52%" }]}>Item</Text>
            <Text style={[s.th, { width: "16%", textAlign: "right" }]}>Rate</Text>
            <Text style={[s.th, { width: "12%", textAlign: "right" }]}>Qty</Text>
            <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Amount</Text>
          </View>
          {items.map((it, i) => (
            <View key={it.id} style={[s.tr, i % 2 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
              <Text style={[s.td, { width: "52%" }]}>
                {it.description}
                {it.note ? <Text style={[s.mute, { fontSize: 7.5 }]}> ({it.note})</Text> : null}
              </Text>
              <Text style={[s.td, { width: "16%", textAlign: "right" }]}>{money(Number(it.rate))}</Text>
              <Text style={[s.td, { width: "12%", textAlign: "right" }]}>{Number(it.qty)}</Text>
              <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{money(Number(it.amount))}</Text>
            </View>
          ))}

          {/* totals */}
          <View style={{ marginTop: 16, marginLeft: "auto", width: 250 }}>
            {t.hasExtra ? (
              <>
                <Total label="Included Reels Subtotal" value={money2(t.includedSubtotal)} />
                {invoice.gst_enabled ? <Total label={`GST on Included (${gstRate}%)`} value={money2(t.includedGst)} /> : null}
                <Total label="Included Total" value={money2(t.includedTotal)} strong />
                <Total label="Extra Reels Subtotal" value={money2(t.extraSubtotal)} spaced />
                {invoice.gst_enabled ? <Total label={`GST on Extra (${gstRate}%)`} value={money2(t.extraGst)} /> : null}
                <Total label="Extra Total" value={money2(t.extraTotal)} strong />
              </>
            ) : null}
            <Total label="Subtotal" value={money2(t.subtotal)} spaced={t.hasExtra} />
            {t.discountAmount > 0 ? <Total label="Discount" value={`- ${money2(t.discountAmount)}`} /> : null}
            {invoice.gst_enabled ? <Total label={`GST (${gstRate}%)`} value={money2(t.gstAmount)} /> : null}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                backgroundColor: C.navyBar,
                paddingVertical: 9,
                paddingHorizontal: 12,
                borderRadius: 3,
                marginTop: 8,
              }}
            >
              <Text style={{ color: C.white, fontWeight: 700, fontSize: 10 }}>Final Amount</Text>
              <Text style={{ color: C.white, fontWeight: 700, fontSize: 11 }}>{money2(t.total)}</Text>
            </View>
          </View>
        </View>

        {/* commitments */}
        {invoice.commitments?.length ? (
          <View style={{ marginTop: 24 }} break={items.length + (invoice.schedule?.length ?? 0) > 6}>
            <Text style={s.h2}>Our Commitments</Text>
            {invoice.commitments.map((c, i) => (
              <View key={i} style={s.bullet}>
                <Text style={s.dot}>•</Text>
                <Text style={{ flex: 1 }}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {invoice.complimentary?.length ? (
          <View style={{ marginTop: 18 }}>
            <Text style={s.h2}>Complimentary Deliverables</Text>
            {invoice.complimentary.map((c, i) => (
              <View key={i} style={s.bullet}>
                <Text style={s.dot}>•</Text>
                <Text style={{ flex: 1 }}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {hasBank ? (
          <View style={{ marginTop: 18 }} wrap={false}>
            <Text style={s.h2}>Payment Details</Text>
            {company.account_no ? (
              <Text style={s.mute}>
                {[company.bank_name, company.account_name, `A/C ${company.account_no}`, company.ifsc ? `IFSC ${company.ifsc}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
            {company.upi ? <Text style={s.mute}>UPI: {company.upi}</Text> : null}
          </View>
        ) : null}

        {invoice.footer_note ? (
          <Text style={[s.mute, { marginTop: 20, fontSize: 7.5 }]}>
            {t.total !== t.rawTotal ? `Final Amount rounded from ${money2(t.rawTotal)}. ` : ""}
            {invoice.footer_note}
          </Text>
        ) : null}

        <Text style={s.footerLeft} fixed>
          {company.name} · {company.phone} · {company.email}
          {company.gstin ? ` · GSTIN ${company.gstin}` : ""}
        </Text>
        <Text
          style={s.footerRight}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ marginTop: 2 }}>
      <Text style={s.mute}>{label} </Text>
      <Text style={s.strong}>{value}</Text>
    </Text>
  );
}

function Total({ label, value, strong, spaced }: { label: string; value: string; strong?: boolean; spaced?: boolean }) {
  return (
    <View style={[s.between, { marginTop: spaced ? 8 : 2 }]}>
      <Text style={strong ? s.strong : s.mute}>{label}</Text>
      <Text style={strong ? s.strong : { color: C.ink }}>{value}</Text>
    </View>
  );
}
