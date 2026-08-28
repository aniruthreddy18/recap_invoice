import { addExpenseAction, deleteExpenseAction } from "@/app/actions";
import { EXPENSE_CATEGORIES, listExpenses } from "@/lib/db";
import { Button, Card, EmptyState, Field, Input, PageTitle, SectionTitle, Select } from "@/components/ui";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { longDate, money, today } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await listExpenses();
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageTitle title="Expenses" />

      <SectionTitle className="mb-2">Record an expense</SectionTitle>
      <Card className="p-4 mb-6">
        <form action={addExpenseAction} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount *">
              <Input name="amount" type="number" step="0.01" min="0" inputMode="decimal" required placeholder="0" />
            </Field>
            <Field label="Date">
              <Input name="date" type="date" defaultValue={today()} />
            </Field>
            <Field label="Category">
              <Select name="category" defaultValue="equipment">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Paid to">
              <Input name="paid_to" placeholder="Vendor or person" />
            </Field>
            <Field label="Method">
              <Select name="method" defaultValue="upi">
                <option value="upi">UPI</option>
                <option value="bank">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Note">
              <Input name="note" placeholder="What it was for" />
            </Field>
          </div>
          <div>
            <Button type="submit">Add expense</Button>
          </div>
        </form>
      </Card>

      <SectionTitle className="mb-2">All expenses · {money(total)}</SectionTitle>
      <Card className="divide-y divide-line">
        {expenses.length === 0 ? (
          <EmptyState message="Nothing recorded yet." />
        ) : (
          expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate capitalize">
                  {e.category}
                  {e.paid_to ? <span className="font-normal text-mute"> · {e.paid_to}</span> : null}
                </div>
                <div className="text-sm text-mute truncate">
                  {longDate(e.date)} · {e.method.toUpperCase()}
                  {e.note ? ` · ${e.note}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-red tnum">−{money(Number(e.amount))}</span>
                <form action={deleteExpenseAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmSubmit message={`Delete this ${money(Number(e.amount))} expense?`} className="!px-2 !py-1 text-sm">
                    ✕
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
