import Link from "next/link";
import { listExpenses, listIncome, monthSummary, recentMonths } from "@/lib/db";
import { Card, EmptyState, LinkButton, PageTitle, SectionTitle, Stat } from "@/components/ui";
import { longDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function shift(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(raw ?? "") ? raw! : new Date().toISOString().slice(0, 7);

  const [summary, income, expenses, trend] = await Promise.all([
    monthSummary(month),
    listIncome(month),
    listExpenses(month),
    recentMonths(6),
  ]);

  const peak = Math.max(1, ...trend.map((t) => Math.max(t.received, t.spent)));
  const profitable = summary.profit >= 0;

  return (
    <>
      <PageTitle
        title="Money"
        action={<LinkButton href="/money/expenses">Record expense</LinkButton>}
      />

      {/* month switcher */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link href={`/money?month=${shift(month, -1)}`} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-semibold text-navy hover:bg-field">
          ‹ Previous
        </Link>
        <div className="font-semibold text-navy">{monthLabel(month)}</div>
        <Link href={`/money?month=${shift(month, 1)}`} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-semibold text-navy hover:bg-field">
          Next ›
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Received" value={money(summary.received)} hint="payments that arrived" />
        <Stat label="Spent" value={money(summary.spent)} hint="expenses recorded" />
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-mute">Profit</div>
          <div className={`display font-bold text-2xl tnum mt-1 ${profitable ? "text-green" : "text-red"}`}>
            {profitable ? "" : "− "}{money(Math.abs(summary.profit))}
          </div>
          <div className="text-xs text-mute mt-1">received − spent</div>
        </Card>
      </div>

      <Card className="p-4 mb-6 grid gap-2 text-sm">
        <div className="flex justify-between text-mute">
          <span>Invoiced this month</span>
          <span className="tnum">{money(summary.invoiced)}</span>
        </div>
        <div className="flex justify-between text-mute">
          <span>Still owed, all time</span>
          <span className="tnum">{money(summary.outstanding)}</span>
        </div>
        <p className="text-xs text-mute pt-1 border-t border-line">
          Profit counts money that actually arrived, so an unpaid invoice doesn&apos;t inflate it.
        </p>
      </Card>

      <SectionTitle className="mb-2">Last 6 months</SectionTitle>
      <Card className="p-4 mb-6">
        <div className="flex items-end justify-between gap-2 h-28">
          {trend.map((t) => (
            <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-0.5 h-20">
                <div
                  className="w-1/3 rounded-t bg-green"
                  style={{ height: `${Math.round((t.received / peak) * 100)}%` }}
                  title={`received ${money(t.received)}`}
                />
                <div
                  className="w-1/3 rounded-t bg-red"
                  style={{ height: `${Math.round((t.spent / peak) * 100)}%` }}
                  title={`spent ${money(t.spent)}`}
                />
              </div>
              <span className={`text-[10px] ${t.month === month ? "font-bold text-navy" : "text-mute"}`}>
                {t.month.slice(5)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 justify-center mt-2 text-xs text-mute">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-green" /> received</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-red" /> spent</span>
        </div>
      </Card>

      <SectionTitle className="mb-2">Money in ({income.length})</SectionTitle>
      <Card className="divide-y divide-line mb-6">
        {income.length === 0 ? (
          <EmptyState message="No payments received this month." />
        ) : (
          income.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{p.client_name}</div>
                <div className="text-sm text-mute">
                  {longDate(p.date)} · {p.method.toUpperCase()}
                  {p.invoice_no ? ` · ${p.invoice_no}` : ""}
                </div>
              </div>
              <div className="font-bold text-green tnum shrink-0">+{money(Number(p.amount))}</div>
            </div>
          ))
        )}
      </Card>

      <SectionTitle className="mb-2">Money out ({expenses.length})</SectionTitle>
      <Card className="divide-y divide-line">
        {expenses.length === 0 ? (
          <EmptyState
            message="No expenses recorded this month."
            action={<LinkButton href="/money/expenses">Record one</LinkButton>}
          />
        ) : (
          expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate capitalize">
                  {e.category}
                  {e.paid_to ? <span className="font-normal text-mute"> · {e.paid_to}</span> : null}
                </div>
                <div className="text-sm text-mute">
                  {longDate(e.date)} · {e.method.toUpperCase()}
                  {e.note ? ` · ${e.note}` : ""}
                </div>
              </div>
              <div className="font-bold text-red tnum shrink-0">−{money(Number(e.amount))}</div>
            </div>
          ))
        )}
      </Card>

      {summary.byCategory.length > 0 && (
        <>
          <SectionTitle className="mb-2 mt-6">Where it went</SectionTitle>
          <Card className="p-4 grid gap-2">
            {summary.byCategory.map((c) => (
              <div key={c.category} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
                <span className="capitalize text-mute">{c.category}</span>
                <span className="h-2 rounded-full bg-field overflow-hidden">
                  <span
                    className="block h-full bg-navy"
                    style={{ width: `${Math.round((c.amount / Math.max(1, summary.spent)) * 100)}%` }}
                  />
                </span>
                <span className="tnum font-semibold">{money(c.amount)}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
