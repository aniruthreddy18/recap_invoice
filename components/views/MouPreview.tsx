import Image from "next/image";
import type { Client, Mou } from "@/lib/db";
import { ordinalDate, shortDateParts } from "@/lib/format";
import type { Company } from "@/lib/defaults";

/** On-screen twin of lib/pdf/MouDoc.tsx. */
export default function MouPreview({ mou, client, company }: { mou: Mou; client: Client; company: Company }) {
  const who = mou.client_label || client.name;
  let n = 0;
  const num = () => ++n;

  return (
    <div className="bg-paper border border-line rounded-xl p-5 sm:p-10 text-[13px]">
      <div className="flex flex-col items-center text-center mb-8">
        <Image src="/logo-wordmark.png" alt="RecapReels" width={274} height={87} className="h-8 w-auto" />
        <h2 className="display text-navy font-bold text-lg mt-4">MEMORANDUM OF UNDERSTANDING (MOU)</h2>
        <p className="text-mute">
          Between <span className="font-bold text-navy">{company.name}</span> and{" "}
          <span className="font-bold text-navy">{who}</span>
        </p>
      </div>

      <Section n={num()} title="Purpose">
        <p>{mou.purpose}</p>
      </Section>

      {mou.kind === "event" && mou.schedule?.length > 0 && (
        <Section n={num()} title="Events Covered">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy text-white text-left">
                <th className="px-3 py-2 text-xs font-semibold">Date</th>
                <th className="px-3 py-2 text-xs font-semibold">Event</th>
                <th className="px-3 py-2 text-xs font-semibold">Deliverables</th>
              </tr>
            </thead>
            <tbody>
              {mou.schedule.map((r, i) => {
                const d = shortDateParts(r.date);
                return (
                  <tr key={i} className={i % 2 ? "bg-field" : ""}>
                    <td className="px-3 py-2 border-b border-line whitespace-nowrap">{[d.month, d.day].filter(Boolean).join(" ")}</td>
                    <td className="px-3 py-2 border-b border-line">
                      <div>{r.event}</div>
                      {r.place && <div className="text-xs text-mute">{r.place}</div>}
                    </td>
                    <td className="px-3 py-2 border-b border-line">{r.included}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {mou.scope_note && <p className="text-xs text-mute mt-2">{mou.scope_note}</p>}
        </Section>
      )}

      {mou.kind !== "event" && mou.plan_rows?.length > 0 && (
        <Section n={num()} title="Service Plan">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy text-white text-left">
                <th className="px-3 py-2 text-xs font-semibold w-1/3">Item</th>
                <th className="px-3 py-2 text-xs font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {mou.plan_rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-field" : ""}>
                  <td className="px-3 py-2 font-bold text-navy border-b border-line">{r.label}</td>
                  <td className="px-3 py-2 border-b border-line">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {(mou.start_date || mou.end_date) && (
        <Section n={num()} title={mou.kind === "event" ? "Coverage Period" : "Service Period"}>
          <p>
            This engagement runs from <b className="text-navy">{ordinalDate(mou.start_date)}</b> to{" "}
            <b className="text-navy">{ordinalDate(mou.end_date)}</b>
            {mou.period_note ? ` (${mou.period_note})` : ""}.
          </p>
        </Section>
      )}

      {mou.pricing_rows?.length > 0 && (
        <Section n={num()} title="Pricing">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy text-white text-left">
                <th className="px-3 py-2 text-xs font-semibold">Component</th>
                <th className="px-3 py-2 text-xs font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {mou.pricing_rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-field" : ""}>
                  <td className="px-3 py-2 border-b border-line">{r.label}</td>
                  <td className="px-3 py-2 border-b border-line text-right tnum">{r.value}</td>
                </tr>
              ))}
              {mou.pricing_total_value && (
                <tr className="font-bold text-navy">
                  <td className="px-3 py-2">{mou.pricing_total_label}</td>
                  <td className="px-3 py-2 text-right tnum">{mou.pricing_total_value}</td>
                </tr>
              )}
            </tbody>
          </table>
          {mou.pricing_note && <p className="text-xs text-mute mt-2">{mou.pricing_note}</p>}
        </Section>
      )}

      {mou.our_responsibilities?.length > 0 && (
        <Section n={num()} title={`Responsibilities of ${company.name}`}>
          <Bullets items={mou.our_responsibilities} />
        </Section>
      )}
      {mou.client_responsibilities?.length > 0 && (
        <Section n={num()} title={`Responsibilities of ${who}`}>
          <Bullets items={mou.client_responsibilities} />
        </Section>
      )}
      {mou.payment_terms && (
        <Section n={num()} title="Payment Terms"><p>{mou.payment_terms}</p></Section>
      )}
      {mou.confidentiality && (
        <Section n={num()} title="Confidentiality"><p>{mou.confidentiality}</p></Section>
      )}
      {mou.termination && (
        <Section n={num()} title="Termination"><p>{mou.termination}</p></Section>
      )}

      <Section n={num()} title="Acceptance">
        <p>
          By signing below, both parties acknowledge that they understand and agree to the terms of this
          Memorandum of Understanding.
        </p>
        <div className="grid grid-cols-2 gap-6 mt-8">
          {[`For ${company.name}`, `For ${who}`].map((party) => (
            <div key={party}>
              <div className="font-bold text-navy">{party}</div>
              <div className="h-10" />
              <div className="text-mute">Authorized Signature</div>
              <div className="mt-2">Name: ______________________</div>
              <div className="mt-1">Date: ______________________</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="display text-navy font-bold text-base">{n}. {title}</h3>
      <div className="border-b border-line my-2" />
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-1.5">
      {items.map((b, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-blue">•</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}
