import path from "path";
import { Font, StyleSheet } from "@react-pdf/renderer";

// Inter is bundled (public/fonts, OFL) rather than pulled from a CDN: the PDF
// is rendered on the server, and the built-in Helvetica has no ₹ glyph.
let registered = false;

export function registerFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(dir, "Inter_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Inter_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(dir, "Inter_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  // Long deliverable lists are the only place words get broken; Inter's default
  // hyphenation splits brand names oddly, so turn it off.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

export const C = {
  navy: "#0A1444",
  navyBar: "#141338",
  ink: "#333545",
  mute: "#6B6E80",
  line: "#E4E6EE",
  zebra: "#F7F7FA",
  white: "#FFFFFF",
  blue: "#2563EB",
};

export const LOGO = path.join(process.cwd(), "public", "logo-wordmark.png");

export const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
    color: C.ink,
    paddingTop: 44,
    paddingBottom: 54,
    paddingHorizontal: 46,
    lineHeight: 1.45,
  },
  logo: { width: 110 },
  h1: { fontSize: 17, fontWeight: 700, color: C.navy, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 2 },
  h2: { fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 },
  label: { fontSize: 7.5, fontWeight: 600, color: C.mute, letterSpacing: 1.1 },
  mute: { color: C.mute },
  strong: { fontWeight: 700, color: C.navy },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  rule: { borderBottomWidth: 1.4, borderBottomColor: C.navy, marginTop: 10 },
  thead: { flexDirection: "row", backgroundColor: C.navyBar },
  th: { color: C.white, fontSize: 8.5, fontWeight: 600, paddingVertical: 7, paddingHorizontal: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.line },
  td: { paddingVertical: 7, paddingHorizontal: 8, fontSize: 8.5 },
  bullet: { flexDirection: "row", marginBottom: 3.5, paddingRight: 10 },
  dot: { width: 12, color: C.blue },
  footerLeft: {
    position: "absolute",
    bottom: 26,
    left: 46,
    right: 120,
    fontSize: 7,
    color: C.mute,
  },
  footerRight: {
    position: "absolute",
    bottom: 26,
    right: 46,
    fontSize: 7,
    color: C.mute,
    textAlign: "right",
  },
});
