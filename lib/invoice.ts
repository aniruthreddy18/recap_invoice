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

/* ------------------------------------------------------ event reel pricing */

export const DEFAULT_REEL_RATE = 2000;
export const DEFAULT_CONCEPTUAL_RATE = 1000;

export type EventRow = {
  date: string;
  event: string;
  place: string;
  reels: number;
  conceptual: number;
  /** Free-text extras that aren't priced per reel. */
  notes: string;
};

export type Rates = { reel: number; conceptual: number };

export type PackageLike = {
  name: string;
  price: number;
  included_reels: number;
  included_conceptual: number;
};

export type EventQuote = {
  totalReels: number;
  totalConceptual: number;
  includedReels: number;
  includedConceptual: number;
  extraReels: number;
  extraConceptual: number;
  lines: ItemInput[];
};

/**
 * Turns the event list into priced lines.
 *
 * With a package: its price covers the reels and conceptual reels it includes,
 * and only the overflow is charged per reel. Without one, every reel is charged.
 * Counts are pooled across all events rather than per event, because a client
 * books one package for the whole wedding, not one per function.
 */
export function quoteEvents(
  events: EventRow[],
  pkg: PackageLike | null,
  rates: Rates = { reel: DEFAULT_REEL_RATE, conceptual: DEFAULT_CONCEPTUAL_RATE }
): EventQuote {
  const totalReels = events.reduce((n, e) => n + Math.max(0, Number(e.reels) || 0), 0);
  const totalConceptual = events.reduce((n, e) => n + Math.max(0, Number(e.conceptual) || 0), 0);

  const includedReels = pkg ? Math.max(0, pkg.included_reels) : 0;
  const includedConceptual = pkg ? Math.max(0, pkg.included_conceptual) : 0;

  const extraReels = Math.max(0, totalReels - includedReels);
  const extraConceptual = Math.max(0, totalConceptual - includedConceptual);

  const lines: ItemInput[] = [];

  if (pkg) {
    const covers = [
      pkg.included_reels ? `${pkg.included_reels} reels` : "",
      pkg.included_conceptual ? `${pkg.included_conceptual} conceptual` : "",
    ].filter(Boolean).join(" + ");
    lines.push({
      category: "included",
      description: `${pkg.name} Package`,
      note: covers ? `includes ${covers}` : "",
      qty: 1,
      rate: pkg.price,
    });
    if (extraReels > 0) {
      lines.push({ category: "extra", description: "Additional Reel", note: "", qty: extraReels, rate: rates.reel });
    }
    if (extraConceptual > 0) {
      lines.push({ category: "extra", description: "Conceptual Reel", note: "", qty: extraConceptual, rate: rates.conceptual });
    }
  } else {
    if (totalReels > 0) {
      lines.push({ category: "included", description: "Reel", note: "", qty: totalReels, rate: rates.reel });
    }
    if (totalConceptual > 0) {
      lines.push({ category: "included", description: "Conceptual Reel", note: "", qty: totalConceptual, rate: rates.conceptual });
    }
  }

  return {
    totalReels, totalConceptual, includedReels, includedConceptual,
    extraReels, extraConceptual, lines,
  };
}

/** The schedule rows the PDF prints, derived from the priced event list. */
export function eventsToSchedule(events: EventRow[]): ScheduleRow[] {
  return events
    .filter((e) => e.event.trim() !== "")
    .map((e) => ({
      date: e.date,
      event: e.event,
      place: e.place,
      included: [
        e.reels ? `${e.reels} Reel${e.reels === 1 ? "" : "s"}` : "",
        e.conceptual ? `${e.conceptual} Conceptual Reel${e.conceptual === 1 ? "" : "s"}` : "",
      ].filter(Boolean).join("; "),
      extra: e.notes,
    }));
}

/** Reads the schedule back into editable event rows (for the edit screen). */
export function scheduleToEvents(schedule: ScheduleRow[]): EventRow[] {
  // The "included" cell is written by eventsToSchedule as
  // "12 Reels; 3 Conceptual Reels" — parsed by splitting rather than by regex,
  // which is easier to read and impossible to get wrong with escaping.
  const parse = (cell: string) => {
    let reels = 0;
    let conceptual = 0;
    for (const part of cell.split(";")) {
      const words = part.trim().split(/\s+/);
      const n = Number(words[0]);
      if (!Number.isFinite(n)) continue;
      if (part.toLowerCase().includes("conceptual")) conceptual += n;
      else if (part.toLowerCase().includes("reel")) reels += n;
    }
    return { reels, conceptual };
  };

  return schedule.map((r) => {
    const { reels, conceptual } = parse(r.included ?? "");
    return {
      date: r.date,
      event: r.event,
      place: r.place,
      reels,
      conceptual,
      notes: r.extra,
    };
  });
}
