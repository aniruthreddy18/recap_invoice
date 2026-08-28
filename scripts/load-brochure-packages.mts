/**
 * Replaces the placeholder packages with the ones from the RecapReels
 * brochures. Safe to re-run: it matches on (kind, name) and updates in place,
 * so prices you have since edited by hand are the only thing it overwrites.
 *
 *   npx tsx scripts/load-brochure-packages.mts
 */
import { listPackages, insertPackage, updatePackage, deletePackage } from "@/lib/db";
import { SEED_PACKAGES } from "@/lib/db";

const existing = await listPackages();
const wanted = SEED_PACKAGES;

for (const w of wanted) {
  const match = existing.find((e) => e.kind === w.kind && e.name === w.name);
  if (match) {
    await updatePackage(match.id, w);
    console.log(`updated  ${w.kind}/${w.name}`);
  } else {
    await insertPackage(w);
    console.log(`inserted ${w.kind}/${w.name}`);
  }
}

// Placeholders that the brochures replaced (event Gold/Elite/Premium at ₹0).
for (const e of existing) {
  const stillWanted = wanted.some((w) => w.kind === e.kind && w.name === e.name);
  if (!stillWanted && e.price === 0) {
    await deletePackage(e.id);
    console.log(`removed  ${e.kind}/${e.name} (unused placeholder)`);
  }
}

console.log("done");
process.exit(0);
