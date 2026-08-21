import { renderToBuffer } from "@react-pdf/renderer";
import { getInvoice, getSettings } from "@/lib/db";
import { isSignedIn } from "@/lib/auth";
import { companyFrom } from "@/lib/defaults";
import InvoiceDoc from "@/lib/pdf/InvoiceDoc";
import { slug } from "@/lib/format";

// react-pdf needs Node APIs (fs for the bundled fonts and logo).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // API routes sit outside the (app) layout, so they check the session too.
  if (!(await isSignedIn())) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const found = await getInvoice(Number(id));
  if (!found) return new Response("Not found", { status: 404 });

  const company = companyFrom(await getSettings());
  const buffer = await renderToBuffer(
    <InvoiceDoc invoice={found.invoice} items={found.items} client={found.client} company={company} />
  );

  const filename = `RecapReels-${found.invoice.invoice_no}-${slug(found.client.name)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
