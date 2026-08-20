import { recordPaymentAction } from "@/app/actions";
import { Button, Input, Label, Select } from "@/components/ui";
import { today } from "@/lib/format";

export default function PaymentForm({
  clientId,
  invoiceId,
  due,
}: {
  clientId: number;
  invoiceId?: number;
  due?: number;
}) {
  return (
    <form action={recordPaymentAction} className="grid gap-3 sm:grid-cols-4 items-end">
      <input type="hidden" name="client_id" value={clientId} />
      {invoiceId && <input type="hidden" name="invoice_id" value={invoiceId} />}
      <div className="sm:col-span-1">
        <Label htmlFor="pay-amount">Amount</Label>
        <Input
          id="pay-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder={due ? String(Math.round(due)) : "0"}
          required
        />
      </div>
      <div>
        <Label htmlFor="pay-date">Date</Label>
        <Input id="pay-date" name="date" type="date" defaultValue={today()} />
      </div>
      <div>
        <Label htmlFor="pay-method">Method</Label>
        <Select id="pay-method" name="method" defaultValue="upi">
          <option value="upi">UPI</option>
          <option value="bank">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <Button type="submit">Record payment</Button>
    </form>
  );
}
