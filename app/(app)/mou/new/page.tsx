import MouForm from "@/components/views/MouForm";
import { createMouAction } from "@/app/actions";
import { listClients } from "@/lib/db";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewMouPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clients = await listClients();
  return (
    <>
      <PageTitle title="New MOU" />
      <MouForm
        action={createMouAction}
        clients={clients}
        presetClientId={client ? Number(client) : undefined}
        submitLabel="Save MOU"
      />
    </>
  );
}
