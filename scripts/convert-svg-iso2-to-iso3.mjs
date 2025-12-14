import fs from "node:fs";
import path from "node:path";
import countries from "i18n-iso-countries";

// --- load locale JSON manually (no import assertions) ---
const localePath = path.join(
  process.cwd(),
  "node_modules",
  "i18n-iso-countries",
  "langs",
  "en.json"
);

const localeData = JSON.parse(fs.readFileSync(localePath, "utf8"));
countries.registerLocale(localeData);

// --- paths ---
const inFile = path.join(process.cwd(), "public", "maps", "world-iso2.svg");
const outFile = path.join(process.cwd(), "public", "maps", "world-iso3.svg");

if (!fs.existsSync(inFile)) {
  console.error(`Input SVG not found: ${inFile}`);
  process.exit(1);
}

const svg = fs.readFileSync(inFile, "utf8");

// Replace id="xx" (ISO2) with id="XXX" (ISO3)
let replaced = 0;
const used = new Set();

const out = svg.replace(/id="([A-Za-z]{2})"/g, (match, iso2Raw) => {
  const iso2 = iso2Raw.toUpperCase();
  const iso3 = countries.alpha2ToAlpha3(iso2);

  if (!iso3) return match; // unknown code → keep original

  // avoid duplicates
  if (used.has(iso3)) return match;

  used.add(iso3);
  replaced += 1;
  return `id="${iso3}"`;
});

fs.writeFileSync(outFile, out, "utf8");

console.log(`Done. Replaced ${replaced} id attributes.`);
console.log(`Output file: ${outFile}`);
