"use client";

import { useState } from "react";
import { Button, Card, Collapse, Field, Input, Label, Segmented, Select, Textarea } from "@/components/ui";
import ClientPicker, { type ClientChoice } from "@/components/views/ClientPicker";
import { today } from "@/lib/format";
import {
  DEFAULT_CLIENT_RESPONSIBILITIES, DEFAULT_CONFIDENTIALITY, DEFAULT_EVENT_PLAN_ROWS,
  DEFAULT_OUR_RESPONSIBILITIES, DEFAULT_PAYMENT_TERMS, DEFAULT_PLAN_ROWS, DEFAULT_PRICING_NOTE,
  DEFAULT_TERMINATION, defaultPurpose,
} from "@/lib/defaults";
import { money } from "@/lib/format";
import type { Client, DocKind, Mou, Package, PlanRow, PricingRow, ScheduleRow } from "@/lib/db";

type Props = {
  action: (form: FormData) => void;
  clients: Client[];
  packages: Package[];
  presetClientId?: number;
  mou?: Mou;
  submitLabel: string;
};

const MONTH_CHOICES = [1, 3, 6];

const blankRow = (): ScheduleRow => ({ date: "", event: "", place: "", included: "", extra: "" });

export default function MouForm({ action, clients, packages, presetClientId, mou, submitLabel }: Props) {
  const preset = clients.find((c) => c.id === (mou?.client_id ?? presetClientId));

  const [kind, setKind] = useState<DocKind>(mou?.kind ?? "business");
  const [client, setClient] = useState<ClientChoice>({
    clientId: preset?.id ?? 0,
    name: mou?.client_label || preset?.name || "",
    phone: preset?.phone ?? "",
    city: preset?.city ?? "",
  });
  const [label, setLabel] = useState(mou?.client_label ?? preset?.name ?? "");
  const [issueDate, setIssueDate] = useState(mou?.issue_date ?? today());
  const [startDate, setStartDate] = useState(mou?.start_date ?? "");
  const [endDate, setEndDate] = useState(mou?.end_date ?? "");
  const [periodNote, setPeriodNote] = useState(mou?.period_note ?? "");
  const [purpose, setPurpose] = useState(mou?.purpose ?? "");
  const [planRows, setPlanRows] = useState<PlanRow[]>(
    mou?.plan_rows?.length ? mou.plan_rows : DEFAULT_PLAN_ROWS
  );
  const [schedule, setSchedule] = useState<ScheduleRow[]>(mou?.schedule ?? []);
  const [scopeNote, setScopeNote] = useState(mou?.scope_note ?? "");
  const [pricingRows, setPricingRows] = useState<PricingRow[]>(
    mou?.pricing_rows?.length ? mou.pricing_rows : [{ label: "Content Creation", value: "" }]
  );
  const [totalLabel, setTotalLabel] = useState(mou?.pricing_total_label ?? "Total Budget");
  const [totalValue, setTotalValue] = useState(mou?.pricing_total_value ?? "");
  const [pricingNote, setPricingNote] = useState(mou?.pricing_note ?? "");
  const [ourResp, setOurResp] = useState((mou?.our_responsibilities ?? DEFAULT_OUR_RESPONSIBILITIES).join("\n"));
  const [clientResp, setClientResp] = useState((mou?.client_responsibilities ?? DEFAULT_CLIENT_RESPONSIBILITIES).join("\n"));
  const [paymentTerms, setPaymentTerms] = useState(mou?.payment_terms ?? DEFAULT_PAYMENT_TERMS);
  const [confidentiality, setConfidentiality] = useState(mou?.confidentiality ?? DEFAULT_CONFIDENTIALITY);
  const [termination, setTermination] = useState(mou?.termination ?? DEFAULT_TERMINATION);
  const [status, setStatus] = useState(mou?.status ?? "active");
  const [packageId, setPackageId] = useState<number | null>(mou?.package_id ?? null);
  const [months, setMonths] = useState<number>(mou?.months ?? 1);

  const selectedPackage = packages.find((p) => p.id === packageId) ?? null;

  /**
   * Choosing a package fills the plan and pricing tables from it. Everything
   * stays editable afterwards — the package is a starting point, not a lock.
   */
  const applyPackage = (pkg: Package | null, m: number) => {
    setPackageId(pkg?.id ?? null);
    setMonths(m);
    if (!pkg) return;

    const perMonth = pkg.price;
    const total = perMonth * m;
    setPlanRows([
      { label: "Plan", value: pkg.name },
      { label: "Duration", value: `${m} month${m === 1 ? "" : "s"}` },
      ...(pkg.included_reels ? [{ label: "Reels", value: `${pkg.included_reels} per month` }] : []),
      ...(pkg.included_conceptual ? [{ label: "Concept Reels", value: `${pkg.included_conceptual} per month` }] : []),
      ...(pkg.included_posters ? [{ label: "Posters", value: `${pkg.included_posters} per month` }] : []),
      ...pkg.details,
      { label: "Support", value: "Complete content creation support" },
    ]);
    setPricingRows([
      { label: `${pkg.name} Plan`, value: `${money(perMonth)} per month` },
      ...(m > 1 ? [{ label: "Duration", value: `${m} months` }] : []),
    ]);
    setTotalValue(total > 0 ? money(total) : "");
    setPeriodNote(`${m} month${m === 1 ? "" : "s"}`);
  };

  const isEvent = kind === "event";
  const who = label.trim() || client.name.trim();
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  const payload = JSON.stringify({
    client_id: client.clientId,
    new_client_name: client.clientId ? "" : client.name,
    new_client_phone: client.phone,
    new_client_city: client.city,
    kind,
    package_id: isEvent ? null : packageId,
    months,
    client_label: who,
    issue_date: issueDate,
    start_date: startDate,
    end_date: endDate,
    period_note: periodNote,
    purpose: purpose.trim() || defaultPurpose(who, kind),
    schedule: isEvent ? schedule.filter((r) => r.event.trim()) : [],
    scope_note: isEvent ? scopeNote : "",
    plan_rows: isEvent ? [] : planRows.filter((r) => r.label.trim() && r.value.trim()),
    pricing_rows: pricingRows.filter((r) => r.label.trim() && r.value.trim()),
    pricing_total_label: totalLabel,
    pricing_total_value: totalValue,
    pricing_note: pricingNote,
    our_responsibilities: lines(ourResp),
    client_responsibilities: lines(clientResp),
    payment_terms: paymentTerms,
    confidentiality,
    termination,
    status,
  });

  const onClientChange = (v: ClientChoice) => {
    setClient(v);
    if (!mou) setLabel(v.name);
  };

  const setRow = (idx: number, patch: Partial<ScheduleRow>) =>
    setSchedule((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const canSave = client.name.trim() !== "";

  return (
    <form action={action} className="grid gap-4">
      {mou && <input type="hidden" name="id" value={mou.id} />}
      <input type="hidden" name="payload" value={payload} />

      <Segmented
        value={kind}
        onChange={(k) => {
          setKind(k);
          if (!mou) setPlanRows(k === "event" ? DEFAULT_EVENT_PLAN_ROWS : DEFAULT_PLAN_ROWS);
        }}
        options={[
          { value: "business", label: "Business", hint: "Monthly retainer, content plan" },
          { value: "event", label: "Event", hint: "Wedding, function coverage" },
        ]}
      />

      {!isEvent && (
        <Card className="p-4 grid gap-4">
          <div>
            <Label>Package</Label>
            <div className="grid gap-2 sm:grid-cols-2 mt-1.5">
              {packages.map((p) => {
                const active = p.id === packageId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPackage(p, months)}
                    className={`rounded-lg border px-4 py-3 text-left cursor-pointer transition-colors ${
                      active ? "border-navy bg-navy text-white" : "border-line bg-paper hover:bg-field"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span className="tnum font-bold">
                        {p.price > 0 ? `${money(p.price)}/mo` : "price not set"}
                      </span>
                    </div>
                    <div className={`text-xs mt-0.5 ${active ? "text-white/70" : "text-mute"}`}>
                      {[
                        p.included_reels ? `${p.included_reels} reels` : "",
                        p.included_posters ? `${p.included_posters} posters` : "",
                        p.included_conceptual ? `${p.included_conceptual} conceptual` : "",
                      ].filter(Boolean).join(" · ") || "nothing included yet"}
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPackageId(null)}
                className={`rounded-lg border px-4 py-3 text-left cursor-pointer transition-colors ${
                  packageId === null ? "border-navy bg-navy text-white" : "border-line bg-paper hover:bg-field"
                }`}
              >
                <div className="font-semibold">Customised</div>
                <div className={`text-xs mt-0.5 ${packageId === null ? "text-white/70" : "text-mute"}`}>
                  Write the plan and pricing yourself
                </div>
              </button>
            </div>
            {selectedPackage && selectedPackage.price === 0 && (
              <p className="mt-2 text-sm text-amber">
                {selectedPackage.name} has no price yet — set it in Settings → Packages.
              </p>
            )}
          </div>

          <div>
            <Label>Duration</Label>
            <div className="flex gap-2 mt-1.5">
              {MONTH_CHOICES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => applyPackage(selectedPackage, m)}
                  className={`rounded-lg border px-5 py-2.5 font-semibold cursor-pointer transition-colors ${
                    months === m ? "border-navy bg-navy text-white" : "border-line bg-paper hover:bg-field"
                  }`}
                >
                  {m} month{m === 1 ? "" : "s"}
                </button>
              ))}
            </div>
            {selectedPackage && selectedPackage.price > 0 && (
              <p className="mt-2 text-sm text-mute">
                {money(selectedPackage.price)} × {months} ={" "}
                <span className="font-bold text-navy">{money(selectedPackage.price * months)}</span>
              </p>
            )}
          </div>
        </Card>
      )}

      <Card className="p-4 grid gap-4">
        <ClientPicker clients={clients} value={client} onChange={onClientChange} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="MOU date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Mou["status"])}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
            </Select>
          </Field>
          <Field label={isEvent ? "Coverage starts" : "Service starts"}>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label={isEvent ? "Coverage ends" : "Service ends"}>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
      </Card>

      {isEvent ? (
        <Card className="p-4 grid gap-4">
          <div>
            <Label>Events covered</Label>
            <p className="text-xs text-mute mt-0.5">Each row becomes a line in the MOU&apos;s coverage table.</p>
          </div>
          {schedule.map((row, idx) => (
            <div key={idx} className="rounded-lg border border-line p-3 grid gap-3 sm:grid-cols-3">
              <Field label="Date">
                <Input type="date" value={row.date} onChange={(e) => setRow(idx, { date: e.target.value })} />
              </Field>
              <Field label="Event">
                <Input value={row.event} onChange={(e) => setRow(idx, { event: e.target.value })} placeholder="Wedding" />
              </Field>
              <Field label="Place">
                <Input value={row.place} onChange={(e) => setRow(idx, { place: e.target.value })} placeholder="Hyderabad" />
              </Field>
              <Field label="Deliverables (separate with ;)" className="sm:col-span-3">
                <Textarea rows={2} value={row.included} onChange={(e) => setRow(idx, { included: e.target.value })} placeholder="Couple Reel; Family Reel; Teaser" />
              </Field>
              <div className="sm:col-span-3">
                <Button type="button" variant="ghost" onClick={() => setSchedule((xs) => xs.filter((_, i) => i !== idx))}>
                  Remove event
                </Button>
              </div>
            </div>
          ))}
          <div>
            <Button type="button" variant="ghost" onClick={() => setSchedule((xs) => [...xs, blankRow()])}>
              + Add event
            </Button>
          </div>
          <Field label="Coverage note (optional)">
            <Input value={scopeNote} onChange={(e) => setScopeNote(e.target.value)} placeholder="Team of two, full-day coverage at each event." />
          </Field>
        </Card>
      ) : (
        <Card className="p-4 grid gap-3">
          <div>
            <Label>Service plan</Label>
            <p className="text-xs text-mute mt-0.5">Fill in what applies; blank rows are dropped.</p>
          </div>
          {planRows.map((r, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
              <Input
                value={r.label}
                onChange={(e) => setPlanRows((xs) => xs.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                aria-label="Item"
              />
              <Input
                value={r.value}
                onChange={(e) => setPlanRows((xs) => xs.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))}
                placeholder="24 Reels"
                aria-label="Details"
              />
              <button
                type="button" aria-label="Remove row"
                onClick={() => setPlanRows((xs) => xs.filter((_, i) => i !== idx))}
                className="text-mute hover:text-red px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
          <div>
            <Button type="button" variant="ghost" onClick={() => setPlanRows((xs) => [...xs, { label: "", value: "" }])}>
              + Add row
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 grid gap-3">
        <Label>Pricing</Label>
        {pricingRows.map((r, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
            <Input
              value={r.label}
              onChange={(e) => setPricingRows((xs) => xs.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
              placeholder="Content Creation"
              aria-label="Component"
            />
            <Input
              value={r.value}
              onChange={(e) => setPricingRows((xs) => xs.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))}
              placeholder="₹30,000 + 18% GST (₹5,400) = ₹35,400"
              aria-label="Amount"
            />
            <button
              type="button" aria-label="Remove row"
              onClick={() => setPricingRows((xs) => xs.filter((_, i) => i !== idx))}
              className="text-mute hover:text-red px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
        <div>
          <Button type="button" variant="ghost" onClick={() => setPricingRows((xs) => [...xs, { label: "", value: "" }])}>
            + Add row
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr] pt-3 border-t border-line">
          <Input value={totalLabel} onChange={(e) => setTotalLabel(e.target.value)} aria-label="Total label" />
          <Input value={totalValue} onChange={(e) => setTotalValue(e.target.value)} placeholder="₹40,400" aria-label="Total amount" />
        </div>
      </Card>

      <Collapse title="Clauses and wording" hint="Purpose, responsibilities, payment, confidentiality, termination — all pre-filled">
        <div className="grid gap-4 pt-3">
          <Field label="Purpose (leave blank for the standard sentence)">
            <Textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={defaultPurpose(who || "the client", kind)} />
          </Field>
          <Field label="Period note">
            <Input value={periodNote} onChange={(e) => setPeriodNote(e.target.value)} placeholder={isEvent ? "three events" : "four weeks"} />
          </Field>
          <Field label="Name as it appears in the MOU">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Dr. Nagakumari" />
          </Field>
          <Field label="Note under the pricing table">
            <Textarea rows={2} value={pricingNote} onChange={(e) => setPricingNote(e.target.value)} placeholder={DEFAULT_PRICING_NOTE} />
          </Field>
          <Field label="Responsibilities of RecapReels (one per line)">
            <Textarea rows={4} value={ourResp} onChange={(e) => setOurResp(e.target.value)} />
          </Field>
          <Field label="Responsibilities of the client (one per line)">
            <Textarea rows={4} value={clientResp} onChange={(e) => setClientResp(e.target.value)} />
          </Field>
          <Field label="Payment terms">
            <Textarea rows={2} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </Field>
          <Field label="Confidentiality">
            <Textarea rows={2} value={confidentiality} onChange={(e) => setConfidentiality(e.target.value)} />
          </Field>
          <Field label="Termination">
            <Textarea rows={2} value={termination} onChange={(e) => setTermination(e.target.value)} />
          </Field>
        </div>
      </Collapse>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canSave}>{submitLabel}</Button>
        {!canSave && <span className="text-sm text-mute">Add a client name to save.</span>}
      </div>
    </form>
  );
}
