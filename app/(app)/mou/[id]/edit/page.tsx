import { notFound } from "next/navigation";
import MouForm from "@/components/views/MouForm";
import { updateMouAction, deleteMouAction } from "@/app/actions";
import { getMou, listClients, listPackages } from "@/lib/db";
import { Collapse, PageTitle } from "@/components/ui";
import ConfirmSubmit from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";

export default async function EditMouPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getMou(Number(id));
  if (!found) notFound();
  const [clients, packages] = await Promise.all([listClients(), listPackages("mou")]);
  return (
    <>
      <PageTitle title={`Edit ${found.mou.mou_no}`} />
      <MouForm
        action={updateMouAction}
        clients={clients}
        packages={packages}
        mou={found.mou}
        submitLabel="Save changes"
      />
      <Collapse title="Danger zone" className="mt-8">
        <form action={deleteMouAction} className="pt-3">
          <input type="hidden" name="id" value={found.mou.id} />
          <ConfirmSubmit message={`Delete ${found.mou.mou_no}? This cannot be undone.`}>
            Delete MOU
          </ConfirmSubmit>
        </form>
      </Collapse>
    </>
  );
}
