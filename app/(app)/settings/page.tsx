import { getSettings, storageLabel } from "@/lib/db";
import { changePin, saveSettingsAction } from "@/app/actions";
import { companyFrom } from "@/lib/defaults";
import { Button, Card, Field, Input, PageTitle, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const company = companyFrom(settings);
  const storage = storageLabel();

  return (
    <>
      <PageTitle title="Settings" />

      <form action={saveSettingsAction} className="grid gap-6">
        <div>
          <SectionTitle className="mb-2">Company</SectionTitle>
          <Card className="p-4 grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="company_name" defaultValue={company.name} />
            </Field>
            <Field label="Tagline">
              <Input name="company_tagline" defaultValue={company.tagline} />
            </Field>
            <Field label="Phone">
              <Input name="company_phone" defaultValue={company.phone} />
            </Field>
            <Field label="Email">
              <Input name="company_email" defaultValue={company.email} />
            </Field>
            <Field label="City">
              <Input name="company_city" defaultValue={company.city} />
            </Field>
            <Field label="GSTIN">
              <Input name="company_gstin" defaultValue={company.gstin} placeholder="Leave blank if not registered" />
            </Field>
          </Card>
        </div>

        <div>
          <SectionTitle className="mb-2">Payment details</SectionTitle>
          <p className="text-sm text-mute mb-2">
            Shown on invoices only when filled in.
          </p>
          <Card className="p-4 grid gap-4 sm:grid-cols-2">
            <Field label="Bank">
              <Input name="bank_name" defaultValue={company.bank_name} />
            </Field>
            <Field label="Account name">
              <Input name="account_name" defaultValue={company.account_name} />
            </Field>
            <Field label="Account number">
              <Input name="account_no" defaultValue={company.account_no} />
            </Field>
            <Field label="IFSC">
              <Input name="ifsc" defaultValue={company.ifsc} />
            </Field>
            <Field label="UPI ID" className="sm:col-span-2">
              <Input name="upi" defaultValue={company.upi} placeholder="name@bank" />
            </Field>
          </Card>
        </div>

        <div>
          <SectionTitle className="mb-2">Document numbering</SectionTitle>
          <Card className="p-4 grid gap-4 sm:grid-cols-2">
            <Field label="Invoice prefix">
              <Input name="invoice_prefix" defaultValue={settings.invoice_prefix || "RR-INV"} />
            </Field>
            <Field label="MOU prefix">
              <Input name="mou_prefix" defaultValue={settings.mou_prefix || "RR-MOU"} />
            </Field>
          </Card>
        </div>

        <div>
          <Button type="submit">Save settings</Button>
        </div>
      </form>

      <SectionTitle className="mt-10 mb-2">Change PIN</SectionTitle>
      <Card className="p-4">
        <form action={changePin} className="flex flex-wrap items-end gap-3">
          <Field label="New PIN (4–8 digits)">
            <Input name="new_pin" type="password" inputMode="numeric" pattern="[0-9]{4,8}" required />
          </Field>
          <Button type="submit" variant="ghost">Update PIN</Button>
        </form>
      </Card>

      <SectionTitle className="mt-10 mb-2">Your data</SectionTitle>
      <Card className="p-4 grid gap-2 text-sm text-mute">
        <p>Clients, invoices, MOUs and payments are stored in a hosted Postgres database.</p>
        <code className="block overflow-x-auto rounded-lg bg-field px-3 py-2 text-xs text-ink">
          {storage}
        </code>
        <p>
          Everyone who signs in with the PIN sees the same data, from any device. Backups are
          handled by the database provider — check their dashboard for point-in-time restore.
        </p>
      </Card>
    </>
  );
}
