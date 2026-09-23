import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { Radio, RefreshCw } from "lucide-react";
import { db } from "../database/db";
import { getPosition, parseADSB } from "../providers/adsbfi";
import { fresh, ProviderError } from "../providers/opensky";
import { useOnline, useSettings } from "../app/context";
import { notify } from "../services/records";
import type { Flight, Position } from "../types";
import { completed } from "../utils/flights";
import FlightMap from "../maps/FlightMap";
import { ErrorText, Notice } from "./UI";
export default function AircraftTracker({ flight: f }: { flight: Flight }) {
  const { settings } = useSettings(),
    online = useOnline();
  const [enabled, setEnabled] = useState(false);
  const [importError, setImportError] = useState<unknown>();
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const track = useLiveQuery(
    () => db.positions.where("icao24").equals(f.icao24).sortBy("timestamp"),
    [f.icao24],
    [],
  );
  const query = useQuery({
    queryKey: ["position", "adsbfi", f.icao24],
    queryFn: () => getPosition(f.icao24),
    enabled: enabled && online && !completed(f) && f.status !== "Cancelled",
    staleTime: 60000,
    refetchInterval: (q) =>
      q.state.error ? false : settings.refresh * 1000 || false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: (n, e) =>
      !(e instanceof ProviderError && [401, 403, 429].includes(e.status)) &&
      n < 2,
    retryDelay: (n) => Math.min(60000, 5000 * 2 ** n),
  });
  const p = query.data || track.at(-1);
  useEffect(() => {
    const current = query.data;
    if (current && fresh(current)) {
      void notify(
        `aircraft:${f.id}:${current.icao24}`,
        "Aircraft observed",
        `${f.number}: adsb.fi observation available for your associated ICAO24.`,
        f.id,
      );
    }
  }, [query.data?.key]);
  const flights = [f];
  return (
    <section>
      <div className="section-heading">
        <h2>
          <Radio size={19} /> Where’s my plane?
        </h2>
        {f.icao24 && (
          <Link to={`/flight/${f.id}/aircraft`} className="text-link">
            Aircraft details
          </Link>
        )}
      </div>
      {!f.icao24 || !f.evidence ? (
        <>
          <Notice>
            Aircraft not yet identified. Add a verified ICAO24 address and
            association evidence in Edit flight to query an aircraft.
          </Notice>
          <FlightMap flights={flights} />
        </>
      ) : (
        <>
          <div className="panel compact">
            <div className="section-heading">
              <div>
                <strong>{f.registration || f.icao24.toUpperCase()}</strong>
                <p className="caption">
                  User-associated aircraft · {f.evidence}
                </p>
              </div>
              <button
                className="icon-button"
                disabled={query.isFetching || !online}
                aria-label="Refresh aircraft position"
                onClick={() => {
                  setEnabled(true);
                  void query.refetch();
                }}
              >
                <RefreshCw
                  size={18}
                  className={query.isFetching ? "spin" : ""}
                />
              </button>
            </div>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={enabled}
                disabled={completed(f) || f.status === "Cancelled"}
                onChange={(e) => setEnabled(e.target.checked)}
              />{" "}
              Refresh while this screen is open
            </label>
            <p className="caption">
              {settings.refresh
                ? `${settings.refresh / 60}-minute polling; pauses in background.`
                : "Manual refresh selected."}{" "}
              Queries send only this ICAO24 to adsb.fi. Coverage and anonymous
              access are not guaranteed.
            </p>
            <Notice>
              Direct aircraft requests depend on provider CORS support. The
              current adsb.fi endpoint did not return browser CORS permission
              during verification. Use its live map, or import a saved provider
              JSON report below when direct access fails.
            </Notice>
            <a
              className="button secondary"
              href={`https://globe.adsb.fi/?icao=${f.icao24}`}
              target="_blank"
              rel="noreferrer"
            >
              Open provider live map
            </a>
            <details>
              <summary>Import a provider observation</summary>
              <p className="caption">
                Open the public report, save its JSON, then choose that file.
                FlyHrag checks the matching ICAO24, coordinates and provider
                timestamp. Imported observations are labeled and never update
                your flight status.
              </p>
              <a
                className="text-link"
                href={`https://opendata.adsb.fi/api/v2/hex/${f.icao24}`}
                target="_blank"
                rel="noreferrer"
              >
                Open aircraft JSON report
              </a>
              <label>
                Saved adsb.fi JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 5 * 1024 * 1024)
                        throw new Error("Observation file exceeds 5 MB.");
                      const p = parseADSB(
                        JSON.parse(await file.text()),
                        f.icao24,
                      );
                      if (!p)
                        throw new Error(
                          "No matching aircraft position in this report.",
                        );
                      await db.positions.put({ ...p, imported: true });
                      setImportError(undefined);
                    } catch (error) {
                      setImportError(error);
                    }
                  }}
                />
              </label>
              <ErrorText error={importError} />
            </details>
            <ErrorText error={query.error} />
            {query.isSuccess && !query.data && (
              <Notice>
                No current position reported. Any saved observation below is
                historical.
              </Notice>
            )}
            {p ? (
              <>
                <div className="mini-stats">
                  <div>
                    <small>
                      {fresh(p, clock) && online
                        ? "Recent observation"
                        : "Stale / saved observation"}
                    </small>
                    <strong>{p.callsign || "No callsign"}</strong>
                  </div>
                  <div>
                    <small>Altitude</small>
                    <strong>
                      {p.altitude === null
                        ? "—"
                        : Math.round(
                            p.altitude *
                              (settings.altitude === "ft" ? 3.28084 : 1),
                          ).toLocaleString()}{" "}
                      {settings.altitude}
                    </strong>
                  </div>
                  <div>
                    <small>Ground speed</small>
                    <strong>
                      {p.speed === null
                        ? "—"
                        : Math.round(
                            p.speed * (settings.speed === "kt" ? 1.94384 : 3.6),
                          )}{" "}
                      {settings.speed}
                    </strong>
                  </div>
                </div>
                <p className="caption">
                  {p.source}
                  {p.imported ? " · user-imported report" : ""} ·{" "}
                  {new Date(p.timestamp * 1000).toLocaleString()} ·{" "}
                  {p.onGround === null
                    ? "Ground state unavailable"
                    : p.onGround
                      ? "On-ground report"
                      : "Airborne report"}{" "}
                  · Heading {p.heading ?? "—"}° · Vertical rate{" "}
                  {p.verticalRate ?? "—"} m/s
                </p>
              </>
            ) : (
              <p className="muted">
                No saved observations. Refresh to request a real position.
              </p>
            )}
          </div>
          <FlightMap
            flights={flights}
            position={p || undefined}
            track={track.filter(
              (t) =>
                t.timestamp * 1000 >=
                  Date.parse(f.scheduledDeparture) - 6 * 3600000 &&
                t.timestamp * 1000 <=
                  Date.parse(f.scheduledArrival) + 6 * 3600000,
            )}
          />
          <p className="caption">
            Aircraft observations do not automatically confirm this commercial
            flight’s status or progress. No filed route is available.
          </p>
        </>
      )}
      <p className="caption">
        Aircraft data by{" "}
        <a href="https://adsb.fi/" target="_blank" rel="noreferrer">
          adsb.fi
        </a>{" "}
        · personal, non-commercial use.
      </p>
    </section>
  );
}
