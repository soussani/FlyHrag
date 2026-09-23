# Implementation audit

## Implemented, integrated features

- Five tabs and linked entry, details, aircraft/history, timeline, connection, import/export, notifications, favorites, diagnostics and about views.
- Private Dexie flight CRUD, schema upgrade from v1 to v2, favorites, preferences, alerts, import logs, cached observations.
- Airport-local date entry, explicit UTC-offset option, overnight and DST validation, duplicate protection.
- Worldwide OurAirports lookup, geographic IANA zones, coordinates/elevation, local airport time, favorites and related flights.
- Opt-in per-aircraft adsb.fi observation adapter, quota/error handling, cache, exponential retry, stale labels, external provider live-map link and validated JSON observation import. OpenSky history queries are disabled by default pending written permission.
- Leaflet route/airport/aircraft maps, original heading-oriented aircraft marker, fit/follow, geodesic approximations, bounded observed segments, OSM attribution.
- Flight details, expandable fields, user-entered timelines, actual/estimated time differences and honest unavailable operational fields.
- Official METAR/TAF snapshots, readable basic weather/forecast periods and raw reports, station-based official links.
- Connection detection and transparent planning calculations with user-entered buffers.
- Passport filters, metrics, monthly chart, yearly/route/airline/airport/aircraft/seat/cabin rankings, longest/shortest route and delay history drilldowns.
- CSV/JSON import with row preview, editable corrections, duplicate detection and atomic rejection of invalid batches. Export and merging JSON backup restore.
- Light/dark/system themes, units and time preferences, notification controls, cache clearing, persistent-storage request and deletion controls.
- Production PWA shell, icon assets, manifest, update prompt, offline saved data, airport directory and lazy-screen availability.
- GitHub Pages build/deploy and public-data refresh workflows. No production backend or secrets.

## Explicitly unavailable or narrower than the ideal specification

- Commercial flight schedule search cannot be reliably implemented with the selected anonymous free feeds. The screen explains this and offers manual ticket entry.
- No automatic official status, boarding/gate, aircraft allocation/change, commercial rotation or flight-progress verification. Current aircraft observations are independent of user-entered flight status.
- When explicitly permitted and enabled, OpenSky history queries use only the previous complete UTC day and may still be rejected. Direct adsb.fi and ADSB.lol probes lacked CORS headers, so browser live tracking is unavailable unless the provider permits the deployed origin. External live-map and JSON report import are the working alternatives; no proxy bypass is used.
- Delay predictions and confidence scores are unavailable. Delays use entered time differences; no causal weather assertion.
- Weather snapshots refresh every six hours for 20 configured public airports, not an on-demand worldwide proxy. Text decoding covers common weather and basic forecast periods, not every METAR/TAF grammar element.
- No airport congestion feed, immigration advice, official minimum connection-time database, walking navigation or satellite service.
- Connection gate/terminal and buffer fields are session planning inputs. The calculator does not persist connection plans as flight records.
- In-app/system notifications cover edited status/delay and first associated aircraft observations. No closed-app push, inferred takeoff/landing alerts, or fully automated airline-change feed.
- Distance and map routes are approximations; time totals use actual pairs when both are present, otherwise scheduled pairs. No globe mode or offline tile packs.
- History capacity is limited by browser storage. Large CSV imports can be split; single uploaded files are capped at 50 MB. No account/cloud synchronization.
- GitHub deployment and physical iPhone installation require the repository/account/device steps in README; they cannot be certified solely by local production testing.

No fictional flight records or aircraft positions ship in production. Synthetic records appear only in isolated test fixtures.
