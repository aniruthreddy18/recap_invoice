import Link from "next/link";
import { listPackages } from "@/lib/db";
import { savePackageAction, deletePackageAction } from "@/app/actions";
import { Button, Card, Field, Input, PageTitle, SectionTitle } from "@/components/ui";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { money } from "@/lib/format";
import type { Package } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const packages = await listPackages();
  const event = packages.filter((p) => p.kind === "event");
  const business = packages.filter((p) => p.kind === "business");

  return (
    <>
      <PageTitle
        title="Packages"
        action={<Link href="/settings" className="text-sm font-semibold text-blue">← Settings</Link>}
      />

      <Card className="p-4 mb-6 text-sm text-mute">
        These are the plans offered on the invoice and MOU forms. Prices start at zero — set your real
        numbers here once and every new document picks them up. Event prices cover a whole job; MOU
        prices are <b>per month</b>.
      </Card>

      <SectionTitle className="mb-2">Event plans</SectionTitle>
      <div className="grid gap-3 mb-8">
        {event.map((p) => <PackageCard key={p.id} pkg={p} perMonth={false} />)}
        <NewPackage kind="event" nextSort={event.length} />
      </div>

      <SectionTitle className="mb-2">Business plans (subscription)</SectionTitle>
      <div className="grid gap-3">
        {business.map((p) => <PackageCard key={p.id} pkg={p} perMonth />)}
        <NewPackage kind="business" nextSort={business.length} />
      </div>
    </>
  );
}

function PackageCard({ pkg, perMonth }: { pkg: Package; perMonth: boolean }) {
  return (
    <Card className="p-4">
      <form action={savePackageAction} className="grid gap-4">
        <input type="hidden" name="id" value={pkg.id} />
        <input type="hidden" name="kind" value={pkg.kind} />
        <input type="hidden" name="sort_order" value={pkg.sort_order} />
        <input type="hidden" name="details" value={JSON.stringify(pkg.details ?? [])} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input name="name" defaultValue={pkg.name} required />
          </Field>
          <Field label={perMonth ? "Price per month (₹)" : "Price (₹)"}>
            <Input name="price" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={pkg.price} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={perMonth ? "Reels per month" : "Reels included"}>
            <Input name="included_reels" type="number" min="0" step="1" defaultValue={pkg.included_reels} />
          </Field>
          <Field label="Conceptual reels included">
            <Input name="included_conceptual" type="number" min="0" step="1" defaultValue={pkg.included_conceptual} />
          </Field>
          <Field label="Posters included">
            <Input name="included_posters" type="number" min="0" step="1" defaultValue={pkg.included_posters} />
          </Field>
        </div>

        <Field label="Note (optional)">
          <Input name="note" defaultValue={pkg.note} placeholder="Anything else this plan covers" />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <Button type="submit" variant="ghost">Save {pkg.name}</Button>
          <span className="text-sm text-mute tnum">
            {pkg.price > 0 ? `${money(pkg.price)}${perMonth ? " / month" : ""}` : "no price set"}
          </span>
        </div>
      </form>

      <form action={deletePackageAction} className="mt-3 pt-3 border-t border-line">
        <input type="hidden" name="id" value={pkg.id} />
        <ConfirmSubmit message={`Delete the ${pkg.name} package? Documents already created keep their prices.`} className="!px-3 !py-1.5 text-sm">
          Delete
        </ConfirmSubmit>
      </form>
    </Card>
  );
}

function NewPackage({ kind, nextSort }: { kind: "event" | "business"; nextSort: number }) {
  return (
    <Card className="p-4">
      <form action={savePackageAction} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="sort_order" value={nextSort} />
        <Field label="Add another plan">
          <Input name="name" placeholder="Plan name" required />
        </Field>
        <Field label={kind === "business" ? "Price / month" : "Price"}>
          <Input name="price" type="number" step="0.01" min="0" defaultValue={0} />
        </Field>
        <Button type="submit" variant="ghost">Add</Button>
      </form>
    </Card>
  );
}
