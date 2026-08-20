import Link from "next/link";
import { listClients } from "@/lib/db";
import { Card, EmptyState, LinkButton, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();
  return (
    <>
      <PageTitle title="Clients" action={<LinkButton href="/clients/new">Add client</LinkButton>} />
      {clients.length === 0 ? (
        <Card>
          <EmptyState
            message="No clients yet."
            action={<LinkButton href="/clients/new">Add your first client</LinkButton>}
          />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-field">
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate">{c.name}</div>
                <div className="text-sm text-mute truncate">
                  {[c.org, c.city, c.phone].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <span className="text-mute">›</span>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
