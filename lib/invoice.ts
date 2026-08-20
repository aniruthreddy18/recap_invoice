import type { InvoiceItem, ScheduleRow } from "./db";

export type ItemInput = {
  category: "included" | "extra";
  description: string;
  note: string;
  qty: number;
  rate: number;
};

export type TotalsInput = {
  discountType: "flat" | "percent";
  discountValue: number;
  gstEnabled: boolean;
  gstRate: number;
  roundTotal: boolean;
};

export type Totals = {
  includedSubtotal: number;
  extraSubtotal: number;
  includedGst: number;
  extraGst: number;
  includedTotal: number;
  extraTotal: number;
  hasExtra: boolean;
  subtotal: number;
  discountAmount: number;
  taxable: number;
  gstAmount: number;
  rawTotal: number;
  total: number;
};

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function lineAmount(item: { qty: number; rate: number }): number {
  return round2(item.qty * item.rate);
}

/**
 * Line items -> subtotal -> discount -> optional GST -> final amount.
 *
 * The included/extra split exists because the sample invoice shows both blocks
 * separately before the combined total; when an invoice has no "extra" items
 * the split simply isn't rendered.
 */
export function computeTotals(items: ItemInput[], opts: TotalsInput): Totals {
  const included = items.filter((i) => i.category === "included");
  const extra = items.filter((i) => i.category === "extra");

  const includedSubtotal = round2(sum(included.map(lineAmount)));
  const extraSubtotal = round2(sum(extra.map(lineAmount)));
  const subtotal = round2(includedSubtotal + extraSubtotal);

  const discountAmount = round2(
    opts.discountType === "percent"
      ? (subtotal * opts.discountValue) / 100
      : Math.min(opts.discountValue, subtotal)
  );
  const taxable = round2(subtotal - discountAmount);

  const rate = opts.gstEnabled ? opts.gstRate : 0;
  // Discount is applied to the combined subtotal, so the per-block GST figures
  // are shown pre-discount — same as the sample, where there is no discount.
  const includedGst = round2((includedSubtotal * rate) / 100);
  const extraGst = round2((extraSubtotal * rate) / 100);
  const gstAmount = round2((taxable * rate) / 100);

  const rawTotal = round2(taxable + gstAmount);
  const total = opts.roundTotal ? Math.ceil(rawTotal) : rawTotal;

  return {
    includedSubtotal,
    extraSubtotal,
    includedGst,
    extraGst,
    includedTotal: round2(includedSubtotal + includedGst),
    extraTotal: round2(extraSubtotal + extraGst),
    hasExtra: extra.length > 0,
    subtotal,
    discountAmount,
    taxable,
    gstAmount,
    rawTotal,
    total,
  };
}

export type SummaryRow = { event: string; included: number; extra: number };

/** Reel Count Summary — counts the semicolon-separated deliverables per event. */
export function scheduleSummary(schedule: ScheduleRow[]): { rows: SummaryRow[]; totalIncluded: number; totalExtra: number } {
  const count = (s: string) =>
    s.split(";").map((x) => x.trim()).filter((x) => x && x !== "—" && x !== "-").length;
  const rows = schedule.map((r) => ({
    event: r.event,
    included: count(r.included),
    extra: count(r.extra),
  }));
  return {
    rows,
    totalIncluded: sum(rows.map((r) => r.included)),
    totalExtra: sum(rows.map((r) => r.extra)),
  };
}

export function itemsToInput(items: InvoiceItem[]): ItemInput[] {
  return items.map((i) => ({
    category: i.category,
    description: i.description,
    note: i.note,
    qty: i.qty,
    rate: i.rate,
  }));
}
