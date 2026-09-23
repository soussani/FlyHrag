# FlyHrag

An original iPhone-first aviation PWA with private flight history, a personal Passport, worldwide airport search, real aircraft observation requests and official aviation-weather snapshots. React, TypeScript, Vite, Tailwind CSS, Lucide, React Router, TanStack Query, Dexie/IndexedDB, Leaflet/OpenStreetMap, Recharts and vite-plugin-pwa. Production is entirely static.

## Run locally

Use **Node.js 24 LTS** (minimum 22.12) and npm. No keys, credit card or backend required.

```sh
cd FlyHrag
npm install
npm run dev
```

Open the URL printed by Vite with `/FlyHrag/` appended, normally `http://127.0.0.1:5173/FlyHrag/`. Development mode does not register the production service worker.

```sh
npm test
npm run build
npm run preview
```

Preview at `http://127.0.0.1:4173/FlyHrag/`. The production preview includes the service worker. `package-lock.json` is included; automated builds use `npm ci`.

## Deploy free on GitHub Pages

1. Create a **public** GitHub repository named exactly **FlyHrag**. GitHub Pages and standard public-repository Actions usage do not require paid hosting. Keep within GitHub's service limits; private-repository Pages availability depends on your plan.
2. Upload all repository contents, including `.github/workflows`, `public/data`, `package-lock.json`, and hidden configuration files. Do not upload `node_modules`, personal exports, `.env` secrets or test outputs.
3. Use branch `main`. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. In **Actions**, enable workflows if asked. Run **Build and deploy FlyHrag**, or push to `main`.
5. The workflow checks out source, installs with `npm ci`, runs unit tests, builds, uploads the Pages artifact and deploys. Its environment output links to `https://USERNAME.github.io/FlyHrag/`.
6. For weather updates, allow the repository's `GITHUB_TOKEN` to write contents (Settings → Actions → General → Workflow permissions, if organization policy requires it). Enable **Update public aviation data**. Branch protection must permit that bot commit or you must update snapshots manually.

The deployment workflow calls GitHub Pages directly. The data workflow explicitly calls the reusable deployment workflow after committing snapshots, because a `GITHUB_TOKEN` push does not trigger another push workflow. Snapshots are part of deployed `dist/data`, not just an unrelated Actions artifact.

The delivered ZIP is ready for this process; no GitHub repository or live deployment is created by packaging it.

### Paths

`vite.config.ts` sets `/FlyHrag/`, and the manifest start/scope use the same prefix. HashRouter URLs such as `/FlyHrag/#/passport` avoid GitHub Pages deep-link 404s. All data and icon fetches use `import.meta.env.BASE_URL`. If you rename the repository or use a custom root domain, update Vite base, manifest start/scope, Workbox weather path and Playwright base URL together and rerun production tests.

## Install on iPhone

Open the deployed HTTPS URL in **Safari → Share → Add to Home Screen**. Launch FlyHrag from its icon. Leave the first online load open until **ready for offline journeys** appears. The airport directory is about 16 MB uncompressed (normally compressed by hosting); the one-time offline download may take a little time. Large notches/Home indicators use safe-area padding. Portrait, landscape, dark mode, system theme and reduced motion are supported. Real hardware testing is still recommended: emulated WebKit is not an actual installed iOS PWA.

When an update is available, a banner offers **Update**. Save form edits first. App updates preserve IndexedDB flight history.

## Add and manage flights

Home → Add flight. Search departure and arrival by IATA, ICAO, airport name, city or country. Enter each timestamp in that airport's local time; set the arrival date explicitly for overnight trips. Ambiguous or nonexistent daylight-saving times are rejected. The advanced explicit-offset option supports repeated local hours.

Airline, status, actual/estimated times, seat, cabin, aircraft and notes are your records, not inferred airline information. A commercial flight-number/route search explains when free schedule lookup is unavailable and keeps manual entry available. Edit or delete from flight details.

To request aircraft data, add a six-character **ICAO24** address and evidence associating it with that flight. Do not substitute registration or airline flight number. Open **Where's my plane?**, refresh, or enable periodic queries. The default adsb.fi adapter may be blocked by CORS; failures preserve prior observations with timestamps. Default polling is five minutes, pauses while hidden, and stops for completed/cancelled flights. There is no globally scraped live fleet, no fake position and no secret in frontend code.

### Aircraft access verified limitations

Direct probes of adsb.fi and ADSB.lol on 23 September 2026 returned JSON but no `Access-Control-Allow-Origin` header, including when an Origin header was supplied. **In-app live positions therefore cannot be promised on a static GitHub Pages origin.** FlyHrag displays this limitation, provides the official adsb.fi live-map link for the identified aircraft, and supports importing the matching public JSON report (validated coordinates/timestamps, clearly marked user-imported). It does not bypass CORS or run a hidden proxy. Failed polling stops until you manually retry.

The independent **OpenSky** adapter is retained for permitted usage, but its requests are disabled by default: [current terms](https://opensky-network.org/about/terms-of-use) require prior written permission for operational integration. Only after obtaining that permission may a repository owner set `VITE_OPENSKY_PERMISSION_CONFIRMED=true` in the build environment. No credential is accepted by the frontend, and no paid provider is required. Previous-day OpenSky movements remain unavailable by default; local observed-position history still works.

## Passport, maps and connections

Passport calculates completed flights, distance estimates, time, airports/countries, airlines, aircraft, route rankings, seat/cabin counts, monthly/yearly totals, extremes and recorded delays. Cancelled records do not inflate flown statistics. Filters cover year/date range/airline/airport/country/model/status. Tap metrics or rankings for underlying records. Countries reached means airport countries in completed records, not proof of immigration entry. Durations use actual times when present, scheduled times otherwise; distance is a great-circle estimate.

Historical routes and individual maps use geodesic approximations with antimeridian handling. Dashed lines are not filed routes. Solid observed aircraft segments omit long gaps. Panning disables follow. Map tiles require connectivity and are never bulk-downloaded.

Connection Assistant finds departures from the arrival airport within 48 hours. Enter planning buffers for deplaning, walking, baggage and boarding cutoff. Available margin drives transparent Relaxed/Normal/Tight/At risk labels. It does not invent terminal/immigration rules or guarantee transfers. Gate/terminal fields and buffers are session planning inputs.

## Import, export and backups

Settings → Import & restore accepts CSV, JSON arrays and FlyHrag JSON backups. Download the CSV header template from that screen. Required columns:

- `number`, `origin`, `destination`, `scheduledDeparture`, `scheduledArrival`.
- Airports use IATA/ICAO/OurAirports identifiers.
- Timestamps use ISO 8601 with `Z` or an explicit offset, for example the _format_ `YYYY-MM-DDTHH:mm:ss+04:00`.
- Optional columns: `airline`, `status`, `actualDeparture`, `actualArrival`, `estimatedDeparture`, `estimatedArrival`, `model`, `registration`, `icao24`, `evidence`, `seat`, `cabin`, `notes`.
- Missing status becomes Unknown. Allowed statuses appear in the entry form.

Preview shows every row, invalid fields and duplicates. Correct content in the editor and preview again. Invalid rows block the entire import; no silent discards. Confirm imports new records only. Duplicate matching normalizes flight number, airports and departure instant. Existing fields remain untouched. CSV exports protect spreadsheet formula injection; formula-like text may have a protective leading apostrophe.

Settings → Export & backup downloads flight CSV, a JSON array, or a full backup. Full backups include flights, preferences, favorites, positions, notifications and import history. Restore merges flights and optionally restores supporting personal data, preserving existing duplicate flights. Import logs record each import. **Keep backups outside the browser.** IndexedDB does not sync devices, and iOS may evict browser storage. Exported files are private itineraries: do not commit them.

## Public datasets

The repository includes a real airport directory, derived geographic time zones and a real weather snapshot. Refresh manually:

```sh
npm run data:airports
npm run data:weather
npm run icons
```

Airports use public-domain OurAirports data. The generator excludes closed facilities and validates a minimum record count before replacing the previous valid file. Time zones come from geo-tz boundaries, not a guessed country offset. See licensing and source-specific limits in [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md).

AviationWeather.gov disallows CORS. The GitHub Actions data workflow fetches METAR/TAF every six hours for the public list `public/data/weather-stations.json` (maximum 50). It preserves the prior snapshot and fails visibly if fetching/validation fails. Scheduled jobs are not exact timers and inactive repositories may have schedules disabled. Reports always show observation and snapshot times. Open the official weather link for an airport outside the configured list.

## Offline and notifications

The production service worker caches application assets, all lazy screen chunks, icons and airport data. Personal records are in Dexie. Offline you can reopen, search cached airports, view/edit flights and notes, calculate Passport/connection data, import/export and inspect saved observations. Weather can use its last cached snapshot. No live tracking continues offline and map tiles may be missing.

In-app alerts are stored and deduplicated for entered status/delay changes and first associated aircraft observations. System notifications can be requested in Settings where supported. iOS requires an installed Home Screen PWA for notification support. This app has **no remote push backend** and does not promise alerts while closed. Weather updates, operational takeoff/landing and connection changes are not automatically notified without reliable event sources.

## Testing

```sh
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Playwright uses the **production build**, two iPhone-sized browser projects, and the `/FlyHrag/` base. Tests include startup/navigation, mobile overflow, map initialization, CRUD, airport favorites, import/duplicate preview, backup download, manifest/icon paths, service worker and offline reopening/search. Vitest covers calculations, DST/overnight flights, imports, migration, API failures and stale observations. On older macOS versions, Playwright may install a frozen WebKit runtime that is incompatible with its driver. Run `npm run test:e2e -- --project=chromium-iphone` locally in that case; the Linux CI workflow retains both projects.

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for actual executed results and limits.

## Troubleshooting

- **Blank page or missing assets:** repository name/path is case-sensitive. Use `/FlyHrag/`. Enable Pages' GitHub Actions source and inspect the deploy job. Hash routes must remain after `#`.
- **Outdated app:** save edits and accept the update banner; close/reopen installed app. Diagnostics shows commit, build time and worker scope. Do not delete site data without a backup.
- **Offline shell missing:** open production HTTPS site online and wait for caching. Dev mode is not the offline build. Very low device storage can prevent caching.
- **Aircraft API unavailable / CORS:** the provider controls access. Check your network and quota; wait after 429. Do not use public CORS proxies or embed OAuth secrets. Continue using saved data/manual records.
- **Aircraft not identified:** add a real ICAO24 plus evidence; no commercial-number mapping is assumed. A valid address may have no receiver coverage.
- **Weather missing or old:** inspect snapshot timestamps, configured station list and update-data workflow. A refresh only retrieves the latest deployed snapshot, not a direct NOAA query. Provider failure preserves previous data.
- **Actions push denied:** allow bot content writes or refresh snapshots locally and commit them. Organization/branch protection can override workflow permissions.
- **Pages deployment fails:** inspect Pages environment restrictions, permissions and artifact step. Repository must be configured for Actions deployment. Workflow failures are not reported as successful deployments.
- **Import rejected:** correct every invalid row in the preview editor. Include explicit time offsets and valid airport IDs. Backups merge rather than replace flights.
- **Storage error:** export first, clear cached aviation data, request persistent storage and free device space. The quota is shown in Diagnostics.

## Repository structure

`src/pages` screens; `src/components` shared UI; `src/database` Dexie migrations; `src/providers` independently normalized external data; `src/services` airport lookup/import/export/persistence; `src/utils` calculations; `src/maps` Leaflet; `scripts` data/icon generators; `public/data` public datasets; `tests` unit and browser coverage; `.github/workflows` build, tests and snapshot publication.

Original app code is MIT licensed. Dataset/provider terms are separate. FlyHrag is educational and should not replace official airline, airport or aviation safety information.

## Delivery preview

The actual empty Home screen is shown in [docs/screenshots/home-iphone.png](docs/screenshots/home-iphone.png). No fictional flights are shipped. For a detailed implementation audit, read [docs/FEATURES.md](docs/FEATURES.md).
