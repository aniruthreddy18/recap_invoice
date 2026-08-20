import InvoiceForm from "@/components/views/InvoiceForm";
import { createInvoiceAction } from "@/app/actions";
import { listClients } from "@/lib/db";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clients = await listClients();
  return (
    <>
      <PageTitle title="New invoice" />
      <InvoiceForm
        action={createInvoiceAction}
        clients={clients}
        presetClientId={client ? Number(client) : undefined}
        submitLabel="Save invoice"
      />
    </>
  );
}
