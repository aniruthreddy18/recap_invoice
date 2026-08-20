import Link from "next/link";
import { listInvoices } from "@/lib/db";
import { Card, EmptyState, LinkButton, PageTitle, StatusPill, payStatus } from "@/components/ui";
import { longDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await listInvoices();
  return (
    <>
      <PageTitle title="Invoices" action={<LinkButton href="/invoices/new">New invoice</LinkButton>} />
      {invoices.length === 0 ? (
        <Card>
          <EmptyState message="No invoices yet." action={<LinkButton href="/invoices/new">Create one</LinkButton>} />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {invoices.map((i) => (
            <Link key={i.id} href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-field">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">
                  {i.client_name} <span className="text-mute font-normal">· {i.invoice_no}</span>
                </div>
                <div className="text-sm text-mute truncate">
                  {longDate(i.issue_date)}{i.title ? ` · ${i.title}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-navy tnum">{money(Number(i.total))}</div>
                <StatusPill status={payStatus(Number(i.total), Number(i.paid))} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
