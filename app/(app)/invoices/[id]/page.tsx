import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice, listPayments } from "@/lib/db";
import { Card, LinkButton, PageTitle, SectionTitle, StatusPill, payStatus } from "@/components/ui";
import InvoicePreview from "@/components/views/InvoicePreview";
import PaymentForm from "@/components/views/PaymentForm";
import { longDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getInvoice(Number(id));
  if (!found) notFound();
  const { invoice, items, client, paid } = found;
  const payments = await listPayments(undefined, invoice.id);
  const due = Math.max(0, Number(invoice.total) - paid);

  return (
    <>
      <PageTitle
        title={invoice.invoice_no}
        action={<LinkButton href={`/invoices/${invoice.id}/edit`} variant="ghost">Edit</LinkButton>}
      />

      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/clients/${client.id}`} className="font-semibold text-navy hover:underline">
              {client.name}
            </Link>
            <div className="text-sm text-mute">{longDate(invoice.issue_date)}</div>
          </div>
          <div className="text-right">
            <div className="display font-bold text-navy text-xl tnum">{money(Number(invoice.total))}</div>
            <StatusPill status={payStatus(Number(invoice.total), paid)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-line text-sm">
          <div>Received <span className="font-bold text-green tnum">{money(paid)}</span></div>
          <div className="text-right">Due <span className="font-bold text-navy tnum">{money(due)}</span></div>
        </div>
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-3 font-semibold text-white hover:bg-blue"
        >
          ⬇ Download PDF
        </a>
      </Card>

      <SectionTitle className="mb-2">Payments</SectionTitle>
      <Card className="p-4 mb-3">
        <PaymentForm clientId={client.id} invoiceId={invoice.id} due={due} />
      </Card>
      {payments.length > 0 && (
        <Card className="divide-y divide-line mb-6">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">{longDate(p.date)}</div>
                <div className="text-xs uppercase text-mute">{p.method}</div>
              </div>
              <div className="font-bold text-green tnum">{money(Number(p.amount))}</div>
            </div>
          ))}
        </Card>
      )}

      <SectionTitle className="mb-2 mt-6">Preview</SectionTitle>
      <InvoicePreview invoice={invoice} items={items} client={client} />
    </>
  );
}
