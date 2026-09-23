import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Globe2, Plus, ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { useFlights, useSettings } from "../app/context";
import { stats, completed, distance, toLocal } from "../utils/flights";
import type { Flight } from "../types";
import { statuses } from "../types";
import { PageTitle, Metric, Empty, FlightCard } from "../components/UI";
import FlightMap from "../maps/FlightMap";
export default function Passport() {
  const all = useFlights(),
    { settings } = useSettings();
  const [filters, setFilters] = useState({
    year: "",
    airline: "",
    airport: "",
    country: "",
    model: "",
    status: "",
    from: "",
    to: "",
  });
  const [drill, setDrill] = useState<{ label: string; ids: string[] } | null>(
    null,
  );
  const flights = useMemo(
    () =>
      all.filter(
        (f) =>
          (!filters.year ||
            toLocal(f.scheduledDeparture, f.origin.tz).startsWith(
              filters.year,
            )) &&
          (!filters.airline || f.airline === filters.airline) &&
          (!filters.airport ||
            [f.origin.id, f.destination.id].includes(filters.airport)) &&
          (!filters.country ||
            [f.origin.country, f.destination.country].includes(
              filters.country,
            )) &&
          (!filters.model || f.model === filters.model) &&
          (!filters.status || f.status === filters.status) &&
          (!filters.from ||
            toLocal(f.scheduledDeparture, f.origin.tz).slice(0, 10) >=
              filters.from) &&
          (!filters.to ||
            toLocal(f.scheduledDeparture, f.origin.tz).slice(0, 10) <=
              filters.to),
      ),
    [all, filters],
  );
  const s = stats(flights);
  const done = flights.filter(completed);
  const show = (label: string, records = done) => {
    setDrill({ label, ids: records.map((f) => f.id) });
    setTimeout(
      () =>
        document
          .getElementById("records")
          ?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  };
  const unit =
    settings.distance === "km"
      ? 1
      : settings.distance === "mi"
        ? 0.621371
        : 0.539957;
  const select = (
    key: keyof typeof filters,
    label: string,
    values: string[],
  ) => (
    <label>
      {label}
      <select
        value={filters[key]}
        onChange={(e) => {
          setFilters({ ...filters, [key]: e.target.value });
          setDrill(null);
        }}
      >
        <option value="">All {label.toLowerCase()}</option>
        {[...new Set(values.filter(Boolean))].sort().map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  const ranking = (
    label: string,
    items: [string, number][],
    match: (f: Flight, key: string) => boolean,
  ) => (
    <section className="panel">
      <h2>{label}</h2>
      {items.length ? (
        items.slice(0, 8).map(([key, n]) => (
          <button
            className="ranking-row"
            key={key}
            onClick={() =>
              show(
                key,
                done.filter((f) => match(f, key)),
              )
            }
          >
            <span>{key}</span>
            <b>{n}</b>
            <ArrowUpRight size={15} />
          </button>
        ))
      ) : (
        <p className="caption">No completed records with this information.</p>
      )}
    </section>
  );
  return (
    <>
      <PageTitle
        eyebrow="EVERY FLIGHT IS PART OF YOUR STORY"
        title="FlyHrag Passport"
        action={
          <Link
            to="/add?historical=1"
            className="icon-button"
            aria-label="Add historical flight"
          >
            <Plus size={22} />
          </Link>
        }
      />
      <div className="passport-cover">
        <div className="passport-top">
          <span>FLYHRAG</span>
          <Globe2 size={22} />
        </div>
        <h2>
          {settings.name}’s
          <br />
          world of flight.
        </h2>
        <div className="passport-bottom">
          <span>PERSONAL AVIATION PASSPORT</span>
          <span>{String(s.done).padStart(3, "0")} FLIGHTS</span>
        </div>
      </div>
      <details className="panel filters">
        <summary>
          Filter your Passport{" "}
          {Object.values(filters).some(Boolean) && "· Active"}
        </summary>
        <div className="form-grid">
          {select(
            "year",
            "Years",
            all.map((f) =>
              toLocal(f.scheduledDeparture, f.origin.tz).slice(0, 4),
            ),
          )}
          {select(
            "airline",
            "Airlines",
            all.map((f) => f.airline),
          )}
          {select(
            "airport",
            "Airports",
            all.flatMap((f) => [f.origin.id, f.destination.id]),
          )}
          {select(
            "country",
            "Countries",
            all.flatMap((f) => [f.origin.country, f.destination.country]),
          )}
          {select(
            "model",
            "Aircraft",
            all.map((f) => f.model),
          )}
          {select("status", "Statuses", [...statuses])}
          <label>
            From
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
        </div>
        <button
          className="text-button"
          onClick={() => {
            setFilters({
              year: "",
              airline: "",
              airport: "",
              country: "",
              model: "",
              status: "",
              from: "",
              to: "",
            });
            setDrill(null);
          }}
        >
          Reset filters
        </button>
      </details>
      <div className="metrics">
        <Metric
          label="Completed flights"
          value={s.done}
          onClick={() => show("Completed flights")}
        />
        <Metric
          label={`Distance · ${settings.distance}`}
          value={Math.round(s.distance * unit).toLocaleString()}
          onClick={() => show("Distance records")}
        />
        <Metric
          label="Countries reached"
          value={s.countries}
          onClick={() => show("Countries reached")}
        />
        <Metric
          label="Hours in flight"
          value={(s.duration / 60).toFixed(1)}
          onClick={() => show("Flight duration records")}
        />
      </div>
      <p className="caption">
        Completed and landed records only. Distance uses great-circle estimates;
        duration uses actual times where recorded, scheduled times otherwise.
      </p>
      <div className="metrics secondary-metrics">
        <Metric
          label="All records"
          value={s.total}
          onClick={() => show("All records", flights)}
        />
        <Metric
          label="Upcoming"
          value={s.upcoming}
          onClick={() =>
            show(
              "Upcoming",
              flights.filter(
                (f) =>
                  !completed(f) &&
                  f.status !== "Cancelled" &&
                  Date.parse(f.scheduledDeparture) > Date.now(),
              ),
            )
          }
        />
        <Metric
          label="Cancelled"
          value={s.cancelled}
          onClick={() =>
            show(
              "Cancelled",
              flights.filter((f) => f.status === "Cancelled"),
            )
          }
        />
        <Metric
          label="Airports visited"
          value={s.airports.length}
          onClick={() => show("Airports visited")}
        />
      </div>
      <div className="section-heading">
        <h2>Your world, connected</h2>
        <Link className="text-link" to="/map">
          Explore <ArrowUpRight size={15} />
        </Link>
      </div>
      <FlightMap flights={done} />
      {!all.length ? (
        <Empty
          title="Your story is ready to begin."
          detail="Add a past flight or import your flight history to fill your Passport."
          action={
            <div className="button-group">
              <Link className="button primary" to="/add?historical=1">
                Add past flight
              </Link>
              <Link className="button secondary" to="/import">
                Import history
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <section className="panel">
            <h2>Flights by month</h2>
            {s.months.length ? (
              <div className="chart">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={s.months.map(([month, flights]) => ({
                      month,
                      flights,
                    }))}
                  >
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#8393a7" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="flights"
                      fill="#559fe2"
                      radius={[5, 5, 0, 0]}
                      onClick={(_d, index) => {
                        const month = s.months[index]?.[0];
                        if (month)
                          show(
                            month,
                            done.filter((f) =>
                              toLocal(
                                f.scheduledDeparture,
                                f.origin.tz,
                              ).startsWith(month),
                            ),
                          );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p>No completed flights in this selection.</p>
            )}
          </section>
          <div className="two-column">
            {ranking("Most-used airports", s.airports, (f, k) =>
              [
                f.origin.iata || f.origin.id,
                f.destination.iata || f.destination.id,
              ].includes(k),
            )}
            {ranking(
              "Most-flown routes",
              s.routes,
              (f, k) =>
                `${f.origin.iata || f.origin.id} → ${f.destination.iata || f.destination.id}` ===
                k,
            )}
            {ranking("Airlines flown", s.airlines, (f, k) => f.airline === k)}
            {ranking("Aircraft types", s.models, (f, k) => f.model === k)}
            {ranking("Flights by year", s.years, (f, k) =>
              toLocal(f.scheduledDeparture, f.origin.tz).startsWith(k),
            )}
            {ranking("Cabin classes", s.cabins, (f, k) => f.cabin === k)}
            {ranking("Seat history", s.seats, (f, k) => f.seat === k)}
            <section className="panel">
              <h2>Flight highlights</h2>
              {(
                [
                  ["Longest flight", s.longest],
                  ["Shortest flight", s.shortest],
                ] as const
              ).map(
                ([label, f]) =>
                  f && (
                    <Link
                      className="ranking-row"
                      key={label}
                      to={`/flight/${f.id}`}
                    >
                      <span>
                        {label}
                        <small>
                          {f.origin.iata} → {f.destination.iata}
                        </small>
                      </span>
                      <b>
                        {Math.round(
                          distance(f.origin, f.destination) * unit,
                        ).toLocaleString()}{" "}
                        {settings.distance}
                      </b>
                    </Link>
                  ),
              )}
              <button
                className="ranking-row"
                onClick={() =>
                  show(
                    "Recorded arrival delays",
                    done.filter(
                      (f) => !!(f.actualArrival || f.estimatedArrival),
                    ),
                  )
                }
              >
                <span>
                  Worst arrival delay
                  <small>From {s.delays.length} recorded time updates</small>
                </span>
                <b>
                  {s.delays.length ? `${Math.max(0, ...s.delays)} min` : "—"}
                </b>
              </button>
            </section>
          </div>
        </>
      )}
      <section id="records">
        <div className="section-heading">
          <h2>{drill?.label || "Flight history"}</h2>
          {drill && (
            <button className="text-button" onClick={() => setDrill(null)}>
              Show all
            </button>
          )}
        </div>
        {(drill
          ? flights.filter((f) => drill.ids.includes(f.id))
          : flights
        ).map((f) => (
          <FlightCard key={f.id} flight={f} />
        ))}
      </section>
    </>
  );
}
