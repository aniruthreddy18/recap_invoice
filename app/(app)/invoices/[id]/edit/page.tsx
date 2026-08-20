import { notFound } from "next/navigation";
import InvoiceForm from "@/components/views/InvoiceForm";
import { updateInvoiceAction, deleteInvoiceAction } from "@/app/actions";
import { getInvoice, listClients } from "@/lib/db";
import { Collapse, PageTitle } from "@/components/ui";
import ConfirmSubmit from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getInvoice(Number(id));
  if (!found) notFound();
  const clients = await listClients();
  return (
    <>
      <PageTitle title={`Edit ${found.invoice.invoice_no}`} />
      <InvoiceForm
        action={updateInvoiceAction}
        clients={clients}
        invoice={found.invoice}
        items={found.items}
        submitLabel="Save changes"
      />
      <Collapse title="Danger zone" hint="Deleting an invoice also removes the payments recorded against it" className="mt-8">
        <form action={deleteInvoiceAction} className="pt-3">
          <input type="hidden" name="id" value={found.invoice.id} />
          <ConfirmSubmit message={`Delete ${found.invoice.invoice_no}? Payments recorded against it go too. This cannot be undone.`}>
            Delete invoice
          </ConfirmSubmit>
        </form>
      </Collapse>
    </>
  );
}
