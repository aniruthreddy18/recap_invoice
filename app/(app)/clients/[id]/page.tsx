import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, listInvoices, listMous, listPayments } from "@/lib/db";
import { Card, EmptyState, LinkButton, PageTitle, SectionTitle, StatusPill, payStatus } from "@/components/ui";
import PaymentForm from "@/components/views/PaymentForm";
import { longDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = Number(id);
  const client = await getClient(clientId);
  if (!client) notFound();

  const [invoices, mous, payments] = await Promise.all([
    listInvoices(clientId),
    listMous(clientId),
    listPayments(clientId),
  ]);

  const billed = invoices.reduce((s, i) => s + Number(i.total), 0);
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const due = Math.max(0, billed - paid);

  return (
    <>
      <PageTitle
        title={client.name}
        action={<LinkButton href={`/clients/${client.id}/edit`} variant="ghost">Edit</LinkButton>}
      />

      <Card className="p-4 mb-5">
        <div className="grid gap-1 text-sm text-mute">
          {client.org && <div>{client.org}</div>}
          {client.phone && <div>{client.phone}</div>}
          {client.email && <div>{client.email}</div>}
          {(client.address || client.city) && <div>{[client.address, client.city].filter(Boolean).join(", ")}</div>}
          {client.gstin && <div>GSTIN {client.gstin}</div>}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-line text-center">
          <div>
            <div className="text-xs uppercase tracking-wide text-mute">Billed</div>
            <div className="font-bold text-navy tnum">{money(billed)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-mute">Received</div>
            <div className="font-bold text-green tnum">{money(paid)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-mute">Outstanding</div>
            <div className="font-bold text-navy tnum">{money(due)}</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 mb-6">
        <LinkButton href={`/invoices/new?client=${client.id}`}>New invoice</LinkButton>
        <LinkButton href={`/mou/new?client=${client.id}`} variant="ghost">New MOU</LinkButton>
      </div>

      <SectionTitle className="mb-2">Invoices</SectionTitle>
      <Card className="divide-y divide-line mb-6">
        {invoices.length === 0 ? (
          <EmptyState message="No invoices yet." />
        ) : (
          invoices.map((i) => (
            <Link key={i.id} href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-field">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{i.invoice_no}</div>
                <div className="text-sm text-mute">{longDate(i.issue_date)}{i.title ? ` · ${i.title}` : ""}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-navy tnum">{money(Number(i.total))}</div>
                <StatusPill status={payStatus(Number(i.total), Number(i.paid))} />
              </div>
            </Link>
          ))
        )}
      </Card>

      <SectionTitle className="mb-2">MOUs</SectionTitle>
      <Card className="divide-y divide-line mb-6">
        {mous.length === 0 ? (
          <EmptyState message="No MOUs yet." />
        ) : (
          mous.map((m) => (
            <Link key={m.id} href={`/mou/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-field">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{m.mou_no}</div>
                <div className="text-sm text-mute">{longDate(m.issue_date)}</div>
              </div>
              <StatusPill status={m.status} />
            </Link>
          ))
        )}
      </Card>

      <SectionTitle className="mb-2">Record a payment</SectionTitle>
      <Card className="p-4 mb-6">
        <PaymentForm clientId={client.id} due={due} />
      </Card>

      <SectionTitle className="mb-2">Ledger</SectionTitle>
      <Card className="divide-y divide-line">
        {payments.length === 0 ? (
          <EmptyState message="No payments recorded." />
        ) : (
          payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-ink">{longDate(p.date)}</div>
                <div className="text-xs text-mute uppercase">{p.method}{p.note ? ` · ${p.note}` : ""}</div>
              </div>
              <div className="font-bold text-green tnum">{money(Number(p.amount))}</div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
