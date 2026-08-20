import { notFound } from "next/navigation";
import ClientForm from "@/components/views/ClientForm";
import { updateClientAction, deleteClientAction } from "@/app/actions";
import { getClient } from "@/lib/db";
import { Collapse, PageTitle } from "@/components/ui";
import ConfirmSubmit from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(Number(id));
  if (!client) notFound();
  return (
    <>
      <PageTitle title="Edit client" />
      <ClientForm action={updateClientAction} client={client} submitLabel="Save changes" />
      <Collapse title="Danger zone" hint="Deleting a client also deletes their invoices, MOUs and payment history" className="mt-8">
        <form action={deleteClientAction} className="pt-3">
          <input type="hidden" name="id" value={client.id} />
          <ConfirmSubmit
            message={`Delete ${client.name}? Their invoices, MOUs and payments are deleted too. This cannot be undone.`}
          >
            Delete client and all its documents
          </ConfirmSubmit>
        </form>
      </Collapse>
    </>
  );
}
