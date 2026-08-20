import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { Client } from "@/lib/db";

export default function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: (form: FormData) => void;
  client?: Client;
  submitLabel: string;
}) {
  return (
    <form action={action}>
      {client && <input type="hidden" name="id" value={client.id} />}
      <Card className="p-4 grid gap-4 sm:grid-cols-2">
        <Field label="Name *" className="sm:col-span-2">
          <Input name="name" defaultValue={client?.name} required placeholder="Reshmi Doddi" />
        </Field>
        <Field label="Business / title">
          <Input name="org" defaultValue={client?.org} placeholder="Dr. / Clinic name" />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={client?.phone} placeholder="+91 …" inputMode="tel" />
        </Field>
        <Field label="Email">
          <Input name="email" defaultValue={client?.email} type="email" />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={client?.city} placeholder="Hyderabad" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Textarea name="address" defaultValue={client?.address} rows={2} />
        </Field>
        <Field label="GSTIN">
          <Input name="gstin" defaultValue={client?.gstin} placeholder="Optional" />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={client?.notes} rows={2} />
        </Field>
      </Card>
      <div className="mt-4">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
