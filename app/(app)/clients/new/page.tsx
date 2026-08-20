import ClientForm from "@/components/views/ClientForm";
import { createClientAction } from "@/app/actions";
import { PageTitle } from "@/components/ui";

export default function NewClientPage() {
  return (
    <>
      <PageTitle title="New client" />
      <ClientForm action={createClientAction} submitLabel="Save client" />
    </>
  );
}
