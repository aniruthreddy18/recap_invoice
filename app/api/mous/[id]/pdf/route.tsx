import { renderToBuffer } from "@react-pdf/renderer";
import { getMou, getSettings } from "@/lib/db";
import { companyFrom } from "@/lib/defaults";
import MouDoc from "@/lib/pdf/MouDoc";
import { slug } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getMou(Number(id));
  if (!found) return new Response("Not found", { status: 404 });

  const company = companyFrom(await getSettings());
  const buffer = await renderToBuffer(<MouDoc mou={found.mou} client={found.client} company={company} />);

  const filename = `RecapReels-${found.mou.mou_no}-${slug(found.mou.client_label || found.client.name)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
