import MouForm from "@/components/views/MouForm";
import { createMouAction } from "@/app/actions";
import { listClients, listPackages } from "@/lib/db";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewMouPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const [clients, packages] = await Promise.all([listClients(), listPackages("business")]);
  return (
    <>
      <PageTitle title="New MOU" />
      <MouForm
        action={createMouAction}
        clients={clients}
        packages={packages}
        presetClientId={client ? Number(client) : undefined}
        submitLabel="Save MOU"
      />
    </>
  );
}
