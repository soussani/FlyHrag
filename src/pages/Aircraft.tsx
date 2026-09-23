import { useParams, Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Position } from "../types";
import { db } from "../database/db";
import { getMovements, openSkyAllowed } from "../providers/opensky";
import { PageTitle, Notice, ErrorText } from "../components/UI";
import AircraftTracker from "../components/AircraftTracker";
export default function Aircraft() {
  const { id } = useParams(),
    f = useLiveQuery(() => db.flights.get(id!), [id]);
  const observations = useLiveQuery<Position[], Position[]>(
    () =>
      f?.icao24
        ? db.positions
            .where("icao24")
            .equals(f.icao24)
            .reverse()
            .sortBy("timestamp")
        : Promise.resolve([]),
    [f?.icao24],
    [],
  );
  const [enabled, setEnabled] = useState(false);
  const history = useQuery({
    queryKey: ["movements", f?.icao24],
    queryFn: () => getMovements(f!.icao24),
    enabled: enabled && !!f?.icao24,
    retry: false,
    staleTime: 3600000,
  });
  if (!f) return <Notice>Loading flight…</Notice>;
  return (
    <>
      <PageTitle
        eyebrow="WHERE’S MY PLANE?"
        title={f.registration || f.icao24?.toUpperCase() || "Aircraft details"}
        back={`/flight/${id}`}
      />
      <section className="panel">
        <dl className="data-grid">
          <div>
            <dt>Aircraft model</dt>
            <dd>{f.model || "Unavailable"}</dd>
          </div>
          <div>
            <dt>Registration</dt>
            <dd>{f.registration || "Unavailable"}</dd>
          </div>
          <div>
            <dt>ICAO24</dt>
            <dd>{f.icao24 || "Not identified"}</dd>
          </div>
          <div>
            <dt>Association</dt>
            <dd>{f.evidence || "Not identified"}</dd>
          </div>
        </dl>
        <p className="caption">
          Registration, commercial flight number, callsign and ICAO24 are
          distinct identifiers. Aircraft model and association are user-entered.
        </p>
      </section>
      <AircraftTracker flight={f} />
      <section className="panel">
        <h2>Previous aircraft movements</h2>
        {!openSkyAllowed() && (
          <Notice>
            OpenSky historical queries are disabled because its terms require
            prior written permission for operational app use. Saved observations
            from your sessions are listed below.
          </Notice>
        )}
        <p>
          Request the previous complete UTC day. OpenSky infers airport
          endpoints from observations and processes history overnight. This is
          not a confirmed commercial rotation.
        </p>
        <button
          className="button secondary"
          disabled={
            !openSkyAllowed() || !f.icao24 || !f.evidence || history.isFetching
          }
          onClick={() => {
            setEnabled(true);
            void history.refetch();
          }}
        >
          {history.isFetching ? "Requesting…" : "Request aircraft history"}
        </button>
        <ErrorText error={history.error} />
        {observations.slice(0, 30).map((p) => (
          <div className="movement" key={p.key}>
            <strong>{p.callsign || p.icao24}</strong>
            <p>
              {p.lat.toFixed(4)}, {p.lon.toFixed(4)} · {p.source}
              {p.imported ? " · user-imported report" : ""}
            </p>
            <small>
              {new Date(p.timestamp * 1000).toLocaleString()} · observed
              position, not a route or takeoff event
            </small>
          </div>
        ))}
        {history.data?.length === 0 && (
          <Notice>
            No previous movements available for this aircraft and date.
          </Notice>
        )}
        {history.data?.map((m) => (
          <div className="movement" key={m.firstSeen}>
            <strong>
              {m.estDepartureAirport || "Unknown origin"} →{" "}
              {m.estArrivalAirport || "Unknown destination"}
            </strong>
            <p>{m.callsign || "No callsign"} · estimated endpoints</p>
            <small>
              First observed {new Date(m.firstSeen * 1000).toLocaleString()}
              <br />
              Last observed {new Date(m.lastSeen * 1000).toLocaleString()}
            </small>
          </div>
        ))}
        <p className="caption">
          Authentication may be required. FlyHrag never publishes API secrets or
          invents missing rotations. Aircraft change detection is unavailable
          without verified assignment data.
        </p>
        <Link className="text-link" to={`/flight/${id}/edit`}>
          Update aircraft assignment
        </Link>
      </section>
    </>
  );
}
