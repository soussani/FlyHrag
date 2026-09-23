# Verification report

Verified on 23 September 2026 on the provided macOS host with Node 24.19.0.

## Executed results

| Check                                           | Actual result                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency installation                         | Completed; npm reported 0 vulnerabilities at installation.                                                                                                                                                                                           |
| Package/lockfile consistency                    | Exact production and development dependency maps match.                                                                                                                                                                                              |
| `npm test`                                      | **47 tests passed**, 3 test files.                                                                                                                                                                                                                   |
| `npm run build`                                 | **Passed** TypeScript and Vite production build; manifest, service worker and Workbox runtime generated.                                                                                                                                             |
| `npm run test:e2e -- --project=chromium-iphone` | **5 tests passed**, final run 1.5 minutes, production preview under `/FlyHrag/`.                                                                                                                                                                     |
| WebKit iPhone project                           | **Blocked by host runtime**, not passed. The installed macOS 14 frozen WebKit failed before opening a page: `Page.overrideSetting: Unknown setting: PushAPIEnabled`. Modern Linux CI retains this project, but CI was not executed in this delivery. |
| Worldwide airport generation                    | **72,573 airports** generated from real OurAirports data with geographic time-zone lookup.                                                                                                                                                           |
| Official weather ingestion                      | **20 METARs and 20 TAFs** fetched successfully for the configured public stations. Snapshot timestamp is embedded in `public/data/weather.json`.                                                                                                     |
| Icon dimensions                                 | Verified: 180×180 Apple touch, 192×192, 512×512, 512×512 maskable.                                                                                                                                                                                   |
| Workflow syntax/format                          | All three YAML files parsed successfully by Prettier. GitHub execution itself was not performed.                                                                                                                                                     |
| Final source scan                               | No TODO/FIXME/NotImplemented, empty source modules, production mock/dummy/random data, or detected secret-like strings. HTML input hints are legitimate `placeholder` attributes. Synthetic flights exist only in tests.                             |

## Browser checks that passed

- Clean startup, honest empty state, all five main tabs, map initialization.
- iPhone 14 Pro Max emulation (430×932 CSS pixels), no horizontal overflow on the main screens, bottom navigation within viewport.
- Flight creation with airport autocomplete and an overnight route, editing notes, Passport count, deletion.
- Airport search and favorite persistence after reload.
- CSV preview, duplicate detection, confirmed import, JSON backup download.
- Production manifest start URL/display, all icon URLs, active service worker and controller.
- Reopening Passport while browser networking is disabled; cached airport search while offline.
- Home and map screenshots were visually inspected. An earlier toast overlap was corrected by moving the transient status banner away from bottom actions and dismissing offline-ready status after five seconds.

## Unit checks that passed

UTC/local conversion, DST ambiguity/nonexistent times, overnight validation, duration with partial actual times, distances, antimeridian arcs, delays, cancelled-flight exclusion, duplicate normalization, connection thresholds, airport search by code/name/city/country, CRUD, CSV quoting/newlines, timestamp validation, import error preservation and duplicate handling, backup preference/favorite restoration, IndexedDB v1→v2 migration, external provider normalization/failures/staleness/request deduplication, adsb.fi unit conversion and unknown ground state, OpenSky permission gating, and null condition fields in real weather reports.

## External access checks

- adsb.fi: bounded public single-aircraft HTTP query returned valid JSON and HTTP 200. The chosen documentation example had no current position. Responses lacked `Access-Control-Allow-Origin`, including a request with an Origin header. **This does not establish working browser live tracking.** The app discloses the restriction and offers the provider map and labeled JSON observation import.
- ADSB.lol: bounded single-aircraft probe returned HTTP 200, without browser CORS permission; not used as a misleading automatic fallback.
- Airplanes.live: one probe returned HTTP 403; not bypassed.
- AvioADSB: a HEAD request showed same-origin restrictions on its network-wide snapshot; not integrated or downloaded as a global tracking feed.
- OpenSky: documentation and terms were verified. Operational API use requires prior written permission; its adapter/history queries are disabled by default. Test responses for this adapter are isolated fixtures, not evidence of live access.

## Not certified by this run

Actual GitHub Pages publication, scheduled Actions execution, real iPhone Home Screen installation, physical safe-area/keyboard behavior, live Safari notifications, and working in-app aircraft tracking from a deployed origin. These require the account/device/provider access described in README. No user itinerary or API secret was published.

The ZIP is the source repository, not a claim that all premium aviation-app capabilities are available free. See `docs/FEATURES.md` for the implemented scope and honest limitations.
