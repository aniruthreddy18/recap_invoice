import InvoiceForm from "@/components/views/InvoiceForm";
import { createInvoiceAction } from "@/app/actions";
import { getSettings, listClients, listPackages } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { ratesFrom } from "@/lib/defaults";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const [clients, packages, settings] = await Promise.all([
    listClients(), listPackages("event"), getSettings(),
  ]);
  return (
    <>
      <PageTitle title="New invoice" />
      <InvoiceForm
        action={createInvoiceAction}
        clients={clients}
        packages={packages}
        rates={ratesFrom(settings)}
        presetClientId={client ? Number(client) : undefined}
        submitLabel="Save invoice"
      />
    </>
  );
}
