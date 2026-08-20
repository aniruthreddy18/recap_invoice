export function rupees(n: number, decimals = 0): string {
  return "₹" + n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Money the way the sample documents show it: paise only when they matter. */
export function money(n: number): string {
  return rupees(n, Number.isInteger(n) ? 0 : 2);
}

export function money2(n: number): string {
  return rupees(n, 2);
}

/** "2026-08-15" -> "15 Aug 2026". Falls back to the raw string if unparseable. */
export function longDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** "2026-08-15" -> "15th August 2026", the phrasing the MOU uses. */
export function ordinalDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${suffix} ${d.toLocaleDateString("en-IN", { month: "long" })} ${d.getFullYear()}`;
}

/** "2026-08-15" -> { day: "Aug", num: "15" } for the schedule table's date cell. */
export function shortDateParts(iso: string): { month: string; day: string } {
  if (!iso) return { month: "", day: "" };
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return { month: iso, day: "" };
  return {
    month: d.toLocaleDateString("en-IN", { month: "short" }),
    day: String(d.getDate()),
  };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Filename-safe slug for downloaded PDFs. */
export function slug(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "client";
}
