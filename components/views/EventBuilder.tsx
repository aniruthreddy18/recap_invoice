"use client";

import { Button, Card, Field, Input, Label } from "@/components/ui";
import { money } from "@/lib/format";
import type { EventRow, Rates } from "@/lib/invoice";
import type { Package } from "@/lib/db";

/**
 * The event side of an invoice: pick a package (or price it per reel), then
 * list the functions. Reel counts drive the price, so they live on the same
 * row as the date rather than in a separate pricing table.
 */
export default function EventBuilder({
  packages,
  packageId,
  onPackage,
  events,
  onEvents,
  rates,
  quote,
}: {
  packages: Package[];
  packageId: number | null;
  onPackage: (id: number | null) => void;
  events: EventRow[];
  onEvents: (rows: EventRow[]) => void;
  rates: Rates;
  quote: { totalReels: number; totalConceptual: number; extraReels: number; extraConceptual: number };
}) {
  const setRow = (idx: number, patch: Partial<EventRow>) =>
    onEvents(events.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const addRow = () =>
    onEvents([...events, { date: "", event: "", place: "", reels: 0, conceptual: 0, notes: "" }]);

  const selected = packages.find((p) => p.id === packageId) ?? null;

  return (
    <>
      <div>
        <Label>Plan</Label>
        <div className="grid gap-2 sm:grid-cols-2 mt-1.5">
          {packages.map((p) => {
            const active = p.id === packageId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPackage(p.id)}
                className={`rounded-lg border px-4 py-3 text-left cursor-pointer transition-colors ${
                  active ? "border-navy bg-navy text-white" : "border-line bg-paper hover:bg-field"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{p.name}</span>
                  <span className="tnum font-bold">{p.price > 0 ? money(p.price) : "price not set"}</span>
                </div>
                <div className={`text-xs mt-0.5 ${active ? "text-white/70" : "text-mute"}`}>
                  {[
                    p.included_reels ? `${p.included_reels} reels` : "",
                    p.included_conceptual ? `${p.included_conceptual} conceptual` : "",
                    p.included_posters ? `${p.included_posters} posters` : "",
                  ].filter(Boolean).join(" · ") || "nothing included yet"}
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onPackage(null)}
            className={`rounded-lg border px-4 py-3 text-left cursor-pointer transition-colors ${
              packageId === null ? "border-navy bg-navy text-white" : "border-line bg-paper hover:bg-field"
            }`}
          >
            <div className="font-semibold">Custom</div>
            <div className={`text-xs mt-0.5 ${packageId === null ? "text-white/70" : "text-mute"}`}>
              Every reel priced individually
            </div>
          </button>
        </div>
        {selected && selected.price === 0 && (
          <p className="mt-2 text-sm text-amber">
            {selected.name} has no price yet — set it in Settings → Packages, or use Custom.
          </p>
        )}

        {/* Exactly what the invoice will print under the plan. */}
        {selected && selected.details?.length > 0 && (
          <Card className="mt-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-mute mb-2">
              {selected.name} — printed on the invoice
            </div>
            <div className="grid gap-1.5 text-sm">
              {selected.details.map((d, i) => (
                <div key={i} className="grid grid-cols-[10rem_1fr] gap-3">
                  <span className="font-semibold text-navy">{d.label}</span>
                  <span className="text-mute">{d.value}</span>
                </div>
              ))}
            </div>
            {selected.note && <p className="text-xs text-mute mt-2">{selected.note}</p>}
          </Card>
        )}
      </div>

      <Card className="p-4 grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <Label>Events</Label>
          <span className="text-xs text-mute">
            reels {money(rates.reel)} · conceptual {money(rates.conceptual)}
          </span>
        </div>

        {events.length === 0 && (
          <p className="text-sm text-mute">No events yet — add the first function below.</p>
        )}

        {events.map((row, idx) => (
          <div key={idx} className="rounded-lg border border-line p-3 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[11rem_1fr_1fr]">
              <Field label="Date">
                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) => setRow(idx, { date: e.target.value })}
                  className="w-full"
                />
              </Field>
              <Field label="Event">
                <Input
                  value={row.event}
                  onChange={(e) => setRow(idx, { event: e.target.value })}
                  placeholder="Engagement"
                />
              </Field>
              <Field label="Place">
                <Input
                  value={row.place}
                  onChange={(e) => setRow(idx, { place: e.target.value })}
                  placeholder="Hyderabad"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-[8rem_10rem_1fr_auto] sm:items-end">
              <Field label="Reels">
                <Input
                  type="number" min="0" step="1" inputMode="numeric" value={row.reels}
                  onChange={(e) => setRow(idx, { reels: Math.max(0, Number(e.target.value)) })}
                />
              </Field>
              <Field label="Conceptual reels">
                <Input
                  type="number" min="0" step="1" inputMode="numeric" value={row.conceptual}
                  onChange={(e) => setRow(idx, { conceptual: Math.max(0, Number(e.target.value)) })}
                />
              </Field>
              <Field label="Other deliverables (optional)">
                <Input
                  value={row.notes}
                  onChange={(e) => setRow(idx, { notes: e.target.value })}
                  placeholder="Drone coverage, teaser"
                />
              </Field>
              <button
                type="button"
                aria-label="Remove event"
                onClick={() => onEvents(events.filter((_, i) => i !== idx))}
                className="text-mute hover:text-red px-2 pb-2.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <div>
          <Button type="button" variant="ghost" onClick={addRow}>+ Add event</Button>
        </div>

        <div className="border-t border-line pt-3 grid gap-1 text-sm">
          <div className="flex justify-between text-mute">
            <span>Total reels across {events.length} event{events.length === 1 ? "" : "s"}</span>
            <span className="tnum">{quote.totalReels}</span>
          </div>
          <div className="flex justify-between text-mute">
            <span>Conceptual reels</span>
            <span className="tnum">{quote.totalConceptual}</span>
          </div>
          {selected && (quote.extraReels > 0 || quote.extraConceptual > 0) && (
            <div className="flex justify-between font-semibold text-navy">
              <span>Beyond {selected.name}</span>
              <span className="tnum">
                {[
                  quote.extraReels ? `${quote.extraReels} reels` : "",
                  quote.extraConceptual ? `${quote.extraConceptual} conceptual` : "",
                ].filter(Boolean).join(" + ")}
              </span>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
