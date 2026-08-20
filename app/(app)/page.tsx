import Link from "next/link";
import { dashboardStats, listInvoices, listMous } from "@/lib/db";
import { Card, EmptyState, LinkButton, SectionTitle, Stat, StatusPill, payStatus } from "@/components/ui";
import { longDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, invoices, mous] = await Promise.all([dashboardStats(), listInvoices(), listMous()]);
  const month = new Date().toLocaleDateString("en-IN", { month: "long" });

  return (
    <>
      <div className="mb-5">
        <h1 className="display text-navy font-bold text-2xl">Dashboard</h1>
        <p className="text-mute text-sm">
          {plural(stats.clients, "client")} · {plural(stats.invoices, "invoice")} ·{" "}
          {plural(stats.activeMous, "active MOU")}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Stat label={`Billed in ${month}`} value={money(stats.billedThisMonth)} />
        <Stat label={`Collected in ${month}`} value={money(stats.collectedThisMonth)} />
        <Stat label="Outstanding" value={money(stats.outstanding)} hint="across all invoices" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <LinkButton href="/invoices/new">New invoice</LinkButton>
        <LinkButton href="/mou/new" variant="ghost">New MOU</LinkButton>
        <LinkButton href="/clients/new" variant="ghost">Add client</LinkButton>
      </div>

      <SectionTitle className="mb-2">Recent invoices</SectionTitle>
      <Card className="divide-y divide-line mb-6">
        {invoices.length === 0 ? (
          <EmptyState message="Nothing invoiced yet." />
        ) : (
          invoices.slice(0, 5).map((i) => (
            <Link key={i.id} href={`/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-field">
              <div className="min-w-0">
                <div className="font-semibold truncate">{i.client_name}</div>
                <div className="text-sm text-mute">{longDate(i.issue_date)} · {i.invoice_no}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-navy tnum">{money(Number(i.total))}</div>
                <StatusPill status={payStatus(Number(i.total), Number(i.paid))} />
              </div>
            </Link>
          ))
        )}
      </Card>

      <SectionTitle className="mb-2">Recent MOUs</SectionTitle>
      <Card className="divide-y divide-line">
        {mous.length === 0 ? (
          <EmptyState message="No MOUs yet." />
        ) : (
          mous.slice(0, 5).map((m) => (
            <Link key={m.id} href={`/mou/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-field">
              <div className="min-w-0">
                <div className="font-semibold truncate">{m.client_label || m.client_name}</div>
                <div className="text-sm text-mute">{longDate(m.issue_date)} · {m.mou_no}</div>
              </div>
              <StatusPill status={m.status} />
            </Link>
          ))
        )}
      </Card>
    </>
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
