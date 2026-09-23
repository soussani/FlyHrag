import { readFile, writeFile } from "node:fs/promises";
const stations = JSON.parse(
  await readFile("public/data/weather-stations.json", "utf8"),
);
if (
  !Array.isArray(stations) ||
  stations.length > 50 ||
  stations.some((s) => !/^\w{4}$/.test(s))
)
  throw Error("Use at most 50 valid public ICAO station codes.");
let old = {
  fetchedAt: null,
  source: "AviationWeather.gov",
  stations,
  metars: [],
  tafs: [],
};
try {
  old = JSON.parse(await readFile("public/data/weather.json", "utf8"));
} catch {}
const results = {};
const errors = [];
for (const product of ["metar", "taf"]) {
  try {
    const url = `https://aviationweather.gov/api/data/${product}?ids=${stations.join(",")}&format=json`;
    const r = await fetch(url, {
      headers: { "User-Agent": "FlyHrag-Educational-PWA/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    const data = r.status === 204 ? [] : await r.json();
    if (
      !Array.isArray(data) ||
      data.some(
        (v) =>
          typeof v.icaoId !== "string" ||
          typeof v[product === "metar" ? "rawOb" : "rawTAF"] !== "string",
      )
    )
      throw Error("Malformed report");
    results[product + "s"] = data;
  } catch (e) {
    errors.push(`${product}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
if (errors.length) {
  console.error(`Previous snapshot preserved: ${errors.join("; ")}`);
  process.exitCode = 1;
} else {
  await writeFile(
    "public/data/weather.json",
    JSON.stringify({
      source: "AviationWeather.gov",
      fetchedAt: new Date().toISOString(),
      stations,
      ...results,
    }),
  );
  console.log(`Weather updated for ${stations.length} public stations.`);
}
