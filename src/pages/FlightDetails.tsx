import { useParams, Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Pencil, Trash2, Clock3, ArrowRight } from "lucide-react";
import { db } from "../database/db";
import { deleteFlight } from "../services/records";
import { PageTitle, FlightCard, Notice, ErrorText } from "../components/UI";
import AircraftTracker from "../components/AircraftTracker";
import Weather from "../components/Weather";
import { delay, distance, duration, date, time } from "../utils/flights";
import { useSettings } from "../app/context";
export default function FlightDetails() {
  const { id } = useParams(),
    nav = useNavigate(),
    { settings } = useSettings();
  const f = useLiveQuery(() => db.flights.get(id!), [id]);
  const [error, setError] = useState<unknown>();
  if (!f)
    return (
      <Notice>
        Flight unavailable or loading. <Link to="/">Return home</Link>
      </Notice>
    );
  return (
    <>
      <PageTitle
        eyebrow="FLIGHT DETAILS"
        title={f.number}
        back="/"
        action={
          <Link
            className="icon-button"
            to={`/flight/${f.id}/edit`}
            aria-label="Edit flight"
          >
            <Pencil size={20} />
          </Link>
        }
      />
      <FlightCard flight={f} featured />
      <div className="mini-stats panel">
        <div>
          <small>Great-circle distance</small>
          <strong>
            {Math.round(
              distance(f.origin, f.destination) *
                (settings.distance === "mi"
                  ? 0.621371
                  : settings.distance === "nm"
                    ? 0.539957
                    : 1),
            ).toLocaleString()}{" "}
            {settings.distance}
          </strong>
        </div>
        <div>
          <small>
            {f.actualDeparture && f.actualArrival ? "Recorded" : "Scheduled"}{" "}
            duration
          </small>
          <strong>
            {Math.floor(duration(f) / 60)}h {Math.round(duration(f) % 60)}m
          </strong>
        </div>
      </div>
      <AircraftTracker flight={f} />
      <section className="panel">
        <div className="section-heading">
          <h2>
            <Clock3 size={20} /> Flight timeline
          </h2>
          <Link to={`/flight/${f.id}/timeline`} className="text-link">
            Expand
          </Link>
        </div>
        <ol className="timeline">
          {[
            ["Scheduled departure", f.scheduledDeparture, f.origin.tz],
            ["Actual departure", f.actualDeparture, f.origin.tz],
            ["Actual arrival", f.actualArrival, f.destination.tz],
            ["Scheduled arrival", f.scheduledArrival, f.destination.tz],
          ].map(([label, t, tz]) => (
            <li key={label} className={t ? "recorded" : ""}>
              <div>
                <strong>{label}</strong>
                <small>{t ? "User-entered" : "Unavailable"}</small>
              </div>
              <span>
                {t
                  ? `${time(t, tz, settings.timeFormat === "12")} · ${date(t, tz)}`
                  : "—"}
              </span>
            </li>
          ))}
        </ol>
        <p className="caption">
          Actual times use your recorded departure/arrival events; gate and
          runway events are not inferred.
        </p>
      </section>
      <section className="panel">
        <h2>Timing & delays</h2>
        <dl className="data-grid">
          {(["Departure", "Arrival"] as const).map((k) => (
            <div key={k}>
              <dt>{k} difference</dt>
              <dd>
                {delay(f, k) === null
                  ? "Unavailable"
                  : `${delay(f, k)! > 0 ? "+" : ""}${delay(f, k)} min`}
              </dd>
            </div>
          ))}
        </dl>
        <p className="caption">
          FlyHrag calculation from entered actual or estimated times, not an
          official airline feed.
        </p>
        <Notice>
          Delay prediction unavailable. No reliable inbound rotation or
          operational feed is linked.
        </Notice>
        <Link className="row-link" to={`/connections?flight=${f.id}`}>
          Connection assistant <ArrowRight size={18} />
        </Link>
      </section>
      <Weather icao={f.origin.icao} />
      <details className="panel">
        <summary>Airports & arrival weather</summary>
        <Link className="row-link" to={`/airport/${f.origin.id}`}>
          {f.origin.name}
          <ArrowRight size={18} />
        </Link>
        <Link className="row-link" to={`/airport/${f.destination.id}`}>
          {f.destination.name}
          <ArrowRight size={18} />
        </Link>
        <Weather icao={f.destination.icao} />
      </details>
      <details className="panel" open>
        <summary>Personal details</summary>
        <dl className="data-grid">
          <div>
            <dt>Seat</dt>
            <dd>{f.seat || "Not recorded"}</dd>
          </div>
          <div>
            <dt>Cabin</dt>
            <dd>{f.cabin || "Not recorded"}</dd>
          </div>
          <div>
            <dt>Aircraft</dt>
            <dd>{f.model || "Not recorded"}</dd>
          </div>
          <div>
            <dt>Registration</dt>
            <dd>{f.registration || "Not recorded"}</dd>
          </div>
        </dl>
        <p className="notes">{f.notes || "No personal notes yet."}</p>
        <Link to={`/flight/${f.id}/edit`} className="text-link">
          Edit notes and details
        </Link>
      </details>
      <details className="panel">
        <summary>Data provenance</summary>
        <p>
          Itinerary, status, aircraft assignment and times: your personal
          record. Airport information: OurAirports. Aircraft observations:
          adsb.fi, when fetched. Weather: AviationWeather.gov public snapshots.
        </p>
        <p className="caption">
          Last edited {new Date(f.updatedAt).toLocaleString()}. Current progress
          and official airline updates are unavailable.
        </p>
      </details>
      <ErrorText error={error} />
      <button
        className="button danger-button"
        onClick={async () => {
          if (
            window.confirm("Delete this flight permanently from this device?")
          )
            try {
              await deleteFlight(f.id);
              nav("/");
            } catch (e) {
              setError(e);
            }
        }}
      >
        <Trash2 size={17} /> Delete flight
      </button>
    </>
  );
}
