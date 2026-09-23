import { useState } from "react";
import { Link } from "react-router-dom";
import { useFlights } from "../app/context";
import { PageTitle, Notice } from "../components/UI";
import FlightMap from "../maps/FlightMap";
import { completed, toLocal } from "../utils/flights";
export default function MapPage() {
  const all = useFlights();
  const [year, setYear] = useState(""),
    [airline, setAirline] = useState(""),
    [airport, setAirport] = useState(""),
    [history, setHistory] = useState(true);
  const flights = all.filter(
    (f) =>
      (!history || completed(f)) &&
      (!year || toLocal(f.scheduledDeparture, f.origin.tz).startsWith(year)) &&
      (!airline || f.airline === airline) &&
      (!airport || [f.origin.id, f.destination.id].includes(airport)),
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR PERSONAL FLIGHT NETWORK"
        title="The world below"
      />
      <div className="panel form-grid">
        <label>
          Year
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">All time</option>
            {[
              ...new Set(
                all.map((f) =>
                  toLocal(f.scheduledDeparture, f.origin.tz).slice(0, 4),
                ),
              ),
            ]
              .sort()
              .map((v) => (
                <option key={v}>{v}</option>
              ))}
          </select>
        </label>
        <label>
          Airline
          <select value={airline} onChange={(e) => setAirline(e.target.value)}>
            <option value="">All airlines</option>
            {[...new Set(all.map((f) => f.airline).filter(Boolean))].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Airport
          <select value={airport} onChange={(e) => setAirport(e.target.value)}>
            <option value="">All airports</option>
            {[
              ...new Set(all.flatMap((f) => [f.origin.id, f.destination.id])),
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={history}
            onChange={(e) => setHistory(e.target.checked)}
          />{" "}
          Completed flights only
        </label>
      </div>
      <FlightMap flights={flights} height={500} />
      <Notice>
        {flights.length} saved routes. Dashed arcs are great-circle
        approximations. Open an individual flight to request aircraft
        observations.
      </Notice>
      {flights.length > 0 && (
        <div className="panel">
          {flights.map((f) => (
            <Link key={f.id} className="row-link" to={`/flight/${f.id}`}>
              <span>
                {f.origin.iata || f.origin.id} →{" "}
                {f.destination.iata || f.destination.id}
              </span>
              <span>{f.number}</span>
            </Link>
          ))}
        </div>
      )}
      <p className="caption">
        Public OpenStreetMap tiles load on demand and are not bulk-cached. Maps
        may be incomplete offline; saved routes and records remain available.
      </p>
    </>
  );
}
