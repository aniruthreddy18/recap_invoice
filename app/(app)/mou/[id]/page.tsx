import Link from "next/link";
import { notFound } from "next/navigation";
import { getMou, getSettings } from "@/lib/db";
import { companyFrom } from "@/lib/defaults";
import { Card, LinkButton, PageTitle, SectionTitle, StatusPill } from "@/components/ui";
import MouPreview from "@/components/views/MouPreview";
import { longDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MouPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getMou(Number(id));
  if (!found) notFound();
  const company = companyFrom(await getSettings());
  const { mou, client } = found;

  return (
    <>
      <PageTitle
        title={mou.mou_no}
        action={<LinkButton href={`/mou/${mou.id}/edit`} variant="ghost">Edit</LinkButton>}
      />

      <Card className="p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href={`/clients/${client.id}`} className="font-semibold text-navy hover:underline">
              {mou.client_label || client.name}
            </Link>
            <div className="text-sm text-mute">
              {longDate(mou.issue_date)}
              {mou.start_date && mou.end_date ? ` · ${longDate(mou.start_date)} → ${longDate(mou.end_date)}` : ""}
            </div>
          </div>
          <StatusPill status={mou.status} />
        </div>
        <a
          href={`/api/mous/${mou.id}/pdf`}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-3 font-semibold text-white hover:bg-blue"
        >
          ⬇ Download PDF
        </a>
      </Card>

      <SectionTitle className="mb-2">Preview</SectionTitle>
      <MouPreview mou={mou} client={client} company={company} />
    </>
  );
}
