// Default document wording, lifted from the two documents this app replaces:
// ~/Downloads/Wedding Invoice.pdf and ~/Downloads/NAGAKURMARI MOU.pdf.
// Everything here is only a starting point — each field stays editable on the
// form, and the company block can be overridden for good in /settings.

export const COMPANY = {
  name: "RecapReels",
  tagline: "Event recap films & social content",
  phone: "+91 63045 83037",
  email: "recapreelsbusiness@gmail.com",
  city: "Hyderabad",
  gstin: "",
  bank_name: "",
  account_name: "RecapReels",
  account_no: "",
  ifsc: "",
  upi: "",
};

export const SETTING_KEYS = [
  "company_name", "company_tagline", "company_phone", "company_email",
  "company_city", "company_gstin", "bank_name", "account_name", "account_no",
  "ifsc", "upi", "invoice_prefix", "mou_prefix",
] as const;

export function companyFrom(settings: Record<string, string>) {
  return {
    name: settings.company_name || COMPANY.name,
    tagline: settings.company_tagline || COMPANY.tagline,
    phone: settings.company_phone || COMPANY.phone,
    email: settings.company_email || COMPANY.email,
    city: settings.company_city || COMPANY.city,
    gstin: settings.company_gstin || "",
    bank_name: settings.bank_name || "",
    account_name: settings.account_name || "",
    account_no: settings.account_no || "",
    ifsc: settings.ifsc || "",
    upi: settings.upi || "",
  };
}

export type Company = ReturnType<typeof companyFrom>;

export const DEFAULT_COMMITMENTS = [
  "We arrive at the venue before the event begins to ensure complete coverage from start to finish.",
  "We provide end-to-end coverage throughout the entire event.",
  "We help maintain your complete social media profile with professionally curated content.",
  "All photos, reels, and videos are posted only after your approval.",
  "A dedicated point of contact will be assigned for all content coordination and communication.",
  "All raw footage and files will be shared securely via Google Drive.",
  "We work closely with our clients and are flexible in creating customized and conceptual reels based on your preferences.",
  "Our team focuses on capturing every important moment with cinematic storytelling and high-quality edits.",
];

/** Retainer work happens off-site, so the event promises don't apply. */
export const DEFAULT_BUSINESS_COMMITMENTS = [
  "We plan, script, shoot and edit every piece of content in the agreed plan.",
  "We help maintain your complete social media profile with professionally curated content.",
  "Nothing is posted before your approval.",
  "A dedicated point of contact is assigned for all content coordination and communication.",
  "All raw footage and final files are shared securely via Google Drive.",
  "Reels are delivered on the agreed posting schedule.",
];

export const DEFAULT_BUSINESS_COMPLIMENTARY = [
  "Monthly performance summary of published content",
  "Caption and hashtag suggestions with every delivery",
];

export const DEFAULT_COMPLIMENTARY = [
  "Complimentary Reels in addition to the included reels",
  "25 Professionally Edited Photos from each event",
  "Event Décor covering venue setup and decorations",
  "Complimentary candid moments captured whenever possible",
];

export const DEFAULT_FOOTER_NOTE =
  "Prices reflect the agreed rate. This invoice covers the deliverables listed above only.";

/* ---------------------------------------------------------------- MOU text */

export const DEFAULT_PLAN_ROWS = [
  { label: "Plan", value: "" },
  { label: "Duration", value: "" },
  { label: "Reels", value: "" },
  { label: "AI Reels", value: "Not included" },
  { label: "Concept Reels", value: "Not included" },
  { label: "Posters", value: "" },
  { label: "Posting Schedule", value: "" },
  { label: "Support", value: "Complete content creation support" },
];

export const DEFAULT_OUR_RESPONSIBILITIES = [
  "Plan, script, create, edit, and deliver the agreed content.",
  "Maintain professional quality and timely delivery.",
  "Coordinate with the client for approvals before publishing, if required.",
];

export const DEFAULT_CLIENT_RESPONSIBILITIES = [
  "Provide branding materials, logos, and required information.",
  "Provide timely feedback and approvals.",
  "Ensure access to locations and personnel required for content creation.",
];

export const DEFAULT_PAYMENT_TERMS =
  "Payment amount, schedule, and method shall be mutually agreed upon and mentioned in the attached quotation/invoice.";

export const DEFAULT_CONFIDENTIALITY =
  "Both parties agree to maintain the confidentiality of any proprietary or sensitive information shared during the engagement.";

export const DEFAULT_TERMINATION =
  "Either party may terminate this MOU by providing written notice. Payment for completed work up to the termination date shall remain payable.";

export const DEFAULT_EVENT_PLAN_ROWS = [
  { label: "Coverage", value: "" },
  { label: "Reels", value: "" },
  { label: "Photos", value: "" },
  { label: "Delivery", value: "Within 15 working days of the final event" },
];

export function defaultPurpose(clientLabel: string, kind: "event" | "business" = "business"): string {
  const who = clientLabel || "the client";
  return kind === "event"
    ? `This Memorandum of Understanding (MOU) establishes the terms under which RecapReels will provide event coverage, reels and photo content for ${who}.`
    : `This Memorandum of Understanding (MOU) establishes the terms under which RecapReels will provide digital content creation and social media content services to ${who}.`;
}

export const DEFAULT_PRICING_NOTE =
  "Marketing budget is a pass-through spend for ad placements and platform promotion; GST is not applicable on this portion.";
