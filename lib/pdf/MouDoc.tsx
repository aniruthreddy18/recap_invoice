import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { C, LOGO, registerFonts, s } from "./theme";
import type { Client, Mou } from "@/lib/db";
import { ordinalDate, shortDateParts } from "@/lib/format";
import type { Company } from "@/lib/defaults";

export default function MouDoc({
  mou,
  client,
  company,
}: {
  mou: Mou;
  client: Client;
  company: Company;
}) {
  registerFonts();

  const who = mou.client_label || client.name;
  // keep: never split this section across a page break. Only the two tables
  // are allowed to flow, since they can outgrow a page on a long plan.
  const sections: { title: string; body: React.ReactNode; keep?: boolean }[] = [];

  sections.push({ title: "Purpose", body: <Para>{mou.purpose}</Para>, keep: true });

  if (mou.kind === "event" && mou.schedule?.length) {
    sections.push({
      title: "Events Covered",
      body: (
        <View style={{ marginTop: 4 }}>
          <View style={s.thead}>
            <Text style={[s.th, { width: "12%" }]}>Date</Text>
            <Text style={[s.th, { width: "26%" }]}>Event</Text>
            <Text style={[s.th, { width: "62%" }]}>Deliverables</Text>
          </View>
          {mou.schedule.map((r, i) => {
            const d = shortDateParts(r.date);
            return (
              <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
                <Text style={[s.td, { width: "12%" }]}>{[d.month, d.day].filter(Boolean).join(" ")}</Text>
                <View style={[s.td, { width: "26%" }]}>
                  <Text>{r.event}</Text>
                  {r.place ? <Text style={[s.mute, { fontSize: 7.5 }]}>{r.place}</Text> : null}
                </View>
                <Text style={[s.td, { width: "62%" }]}>{r.included}</Text>
              </View>
            );
          })}
          {mou.scope_note ? (
            <Text style={[s.mute, { fontSize: 7.5, marginTop: 8 }]}>{mou.scope_note}</Text>
          ) : null}
        </View>
      ),
    });
  }

  if (mou.kind !== "event" && mou.plan_rows?.length) {
    sections.push({
      title: "Service Plan",
      body: (
        <View style={{ marginTop: 4 }}>
          <View style={s.thead}>
            <Text style={[s.th, { width: "34%" }]}>Item</Text>
            <Text style={[s.th, { width: "66%" }]}>Details</Text>
          </View>
          {mou.plan_rows.map((r, i) => (
            <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
              <Text style={[s.td, s.strong, { width: "34%" }]}>{r.label}</Text>
              <Text style={[s.td, { width: "66%" }]}>{r.value}</Text>
            </View>
          ))}
        </View>
      ),
    });
  }

  if (mou.start_date || mou.end_date) {
    sections.push({
      title: mou.kind === "event" ? "Coverage Period" : "Service Period",
      keep: true,
      body: (
        <Para>
          This engagement runs from <Text style={s.strong}>{ordinalDate(mou.start_date)}</Text> to{" "}
          <Text style={s.strong}>{ordinalDate(mou.end_date)}</Text>
          {mou.period_note ? ` (${mou.period_note})` : ""}.
        </Para>
      ),
    });
  }

  if (mou.pricing_rows?.length) {
    sections.push({
      title: "Pricing",
      body: (
        <View style={{ marginTop: 4 }}>
          <View style={s.thead}>
            <Text style={[s.th, { width: "55%" }]}>Component</Text>
            <Text style={[s.th, { width: "45%", textAlign: "right" }]}>Amount</Text>
          </View>
          {mou.pricing_rows.map((r, i) => (
            <View key={i} style={[s.tr, i % 2 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
              <Text style={[s.td, { width: "55%" }]}>{r.label}</Text>
              <Text style={[s.td, { width: "45%", textAlign: "right" }]}>{r.value}</Text>
            </View>
          ))}
          {mou.pricing_total_value ? (
            <View style={[s.tr, { borderBottomWidth: 0 }]} wrap={false}>
              <Text style={[s.td, s.strong, { width: "55%" }]}>{mou.pricing_total_label || "Total"}</Text>
              <Text style={[s.td, s.strong, { width: "45%", textAlign: "right" }]}>{mou.pricing_total_value}</Text>
            </View>
          ) : null}
          {mou.pricing_note ? (
            <Text style={[s.mute, { fontSize: 7.5, marginTop: 8 }]}>{mou.pricing_note}</Text>
          ) : null}
        </View>
      ),
    });
  }

  if (mou.our_responsibilities?.length) {
    sections.push({
      title: `Responsibilities of ${company.name}`,
      body: <Bullets items={mou.our_responsibilities} />,
      keep: true,
    });
  }

  if (mou.client_responsibilities?.length) {
    sections.push({
      title: `Responsibilities of ${who}`,
      body: <Bullets items={mou.client_responsibilities} />,
      keep: true,
    });
  }

  if (mou.payment_terms) sections.push({ title: "Payment Terms", body: <Para>{mou.payment_terms}</Para>, keep: true });
  if (mou.confidentiality) sections.push({ title: "Confidentiality", body: <Para>{mou.confidentiality}</Para>, keep: true });
  if (mou.termination) sections.push({ title: "Termination", body: <Para>{mou.termination}</Para>, keep: true });

  sections.push({
    title: "Acceptance",
    keep: true,
    body: (
      <>
        <Para>
          By signing below, both parties acknowledge that they understand and agree to the terms of this
          Memorandum of Understanding.
        </Para>
        <View style={[s.row, { marginTop: 28 }]} wrap={false}>
          <SignBlock party={`For ${company.name}`} />
          <SignBlock party={`For ${who}`} />
        </View>
      </>
    ),
  });

  return (
    <Document title={`${mou.mou_no} — ${who}`} author={company.name}>
      <Page size="A4" style={[s.page, { paddingHorizontal: 54 }]}>
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <Image src={LOGO} style={{ width: 96 }} />
          <Text style={[s.h1, { fontSize: 14, marginTop: 14, textAlign: "center" }]}>
            MEMORANDUM OF UNDERSTANDING (MOU)
          </Text>
          <Text style={[s.mute, { marginTop: 2 }]}>
            Between <Text style={s.strong}>{company.name}</Text> and <Text style={s.strong}>{who}</Text>
          </Text>
        </View>

        {sections.map((sec, i) => (
          <View key={i} style={{ marginBottom: 16 }} wrap={!sec.keep}>
            <Text style={[s.h2, { marginBottom: 4 }]}>
              {i + 1}. {sec.title}
            </Text>
            <View style={{ borderBottomWidth: 0.6, borderBottomColor: C.line, marginBottom: 8 }} />
            {sec.body}
          </View>
        ))}

        <Text style={s.footerLeft} fixed>
          {mou.mou_no} · {company.name} · {company.phone} · {company.email}
        </Text>
        <Text
          style={s.footerRight}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={{ marginTop: 2 }}>{children}</Text>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ marginTop: 2 }}>
      {items.map((b, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.dot}>•</Text>
          <Text style={{ flex: 1 }}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

function SignBlock({ party }: { party: string }) {
  return (
    <View style={{ width: "50%", paddingRight: 24 }}>
      <Text style={s.strong}>{party}</Text>
      <View style={{ height: 34 }} />
      <Text style={s.mute}>Authorized Signature</Text>
      <Text style={{ marginTop: 10 }}>Name: ______________________</Text>
      <Text style={{ marginTop: 6 }}>Date: ______________________</Text>
    </View>
  );
}
