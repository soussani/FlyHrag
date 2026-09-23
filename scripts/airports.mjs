import { writeFile, mkdir } from "node:fs/promises";
import Papa from "papaparse";
import { find } from "geo-tz";
async function csv(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw Error(`${url}: ${r.status}`);
  const parsed = Papa.parse(await r.text(), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) throw Error("Invalid CSV");
  return parsed.data;
}
const root = "https://davidmegginson.github.io/ourairports-data/";
const [rows, countries] = await Promise.all([
  csv(root + "airports.csv"),
  csv(root + "countries.csv"),
]);
const names = Object.fromEntries(countries.map((r) => [r.code, r.name]));
const airports = [];
for (const r of rows) {
  if (r.type === "closed") continue;
  const lat = Number(r.latitude_deg),
    lon = Number(r.longitude_deg);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  const tz = find(lat, lon)[0];
  if (!tz) throw Error(`No timezone: ${r.ident}`);
  airports.push({
    id: r.ident,
    iata: r.iata_code || "",
    icao: r.icao_code || (/^[A-Z]{4}$/.test(r.gps_code) ? r.gps_code : ""),
    name: r.name,
    city: r.municipality || "",
    country: r.iso_country,
    countryName: names[r.iso_country] || r.iso_country,
    lat,
    lon,
    elevation: r.elevation_ft ? Number(r.elevation_ft) : null,
    tz,
    type: r.type,
  });
}
if (airports.length < 30000)
  throw Error("Airport dataset suspiciously small; previous file preserved.");
await mkdir("public/data", { recursive: true });
await writeFile("public/data/airports.json", JSON.stringify(airports));
await writeFile(
  "public/data/airports-meta.json",
  JSON.stringify(
    {
      source: "OurAirports",
      url: "https://ourairports.com/data/",
      license: "Public domain",
      fetchedAt: new Date().toISOString(),
      count: airports.length,
      timezones:
        "geo-tz / timezone-boundary-builder (ODbL), geographic lookup; verify near borders",
    },
    null,
    2,
  ),
);
console.log(`Wrote ${airports.length} worldwide airports.`);
