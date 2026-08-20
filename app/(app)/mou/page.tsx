import Link from "next/link";
import { listMous } from "@/lib/db";
import { Card, EmptyState, LinkButton, PageTitle, StatusPill } from "@/components/ui";
import { longDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MousPage() {
  const mous = await listMous();
  return (
    <>
      <PageTitle title="MOUs" action={<LinkButton href="/mou/new">New MOU</LinkButton>} />
      {mous.length === 0 ? (
        <Card>
          <EmptyState message="No MOUs yet." action={<LinkButton href="/mou/new">Create one</LinkButton>} />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {mous.map((m) => (
            <Link key={m.id} href={`/mou/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-field">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">
                  {m.client_label || m.client_name} <span className="text-mute font-normal">· {m.mou_no}</span>
                </div>
                <div className="text-sm text-mute">{longDate(m.issue_date)}</div>
              </div>
              <StatusPill status={m.status} />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
