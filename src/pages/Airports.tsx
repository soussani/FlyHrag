import { useMemo, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Star, Search, ArrowUpRight } from "lucide-react";
import { db } from "../database/db";
import { useAirports, searchAirports } from "../services/airports";
import { useFlights } from "../app/context";
import {
  PageTitle,
  Notice,
  ErrorText,
  Empty,
  FlightCard,
} from "../components/UI";
import FlightMap from "../maps/FlightMap";
import Weather from "../components/Weather";
export default function Airports() {
  const { id } = useParams();
  const { data = [], error, isLoading } = useAirports();
  const flights = useFlights();
  const favorites = useLiveQuery(() => db.favorites.toArray(), [], []);
  const [text, setText] = useState(""),
    [q, setQ] = useState(""),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setTimeout(() => setQ(text), 180);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const list = useMemo(
    () =>
      q
        ? searchAirports(data, q)
        : data.filter((a) => favorites.some((f) => f.id === a.id)),
    [data, q, favorites],
  );
  const a = data.find((a) => a.id === id);
  async function toggle(id: string) {
    if (favorites.some((f) => f.id === id)) await db.favorites.delete(id);
    else await db.favorites.put({ id });
  }
  if (id)
    return a ? (
      <>
        <PageTitle
          eyebrow={`${a.countryName} / ${a.icao || a.id}`}
          title={a.iata || a.id}
          back="/airports"
          action={
            <button
              className={`icon-button ${favorites.some((f) => f.id === id) ? "starred" : ""}`}
              aria-label="Toggle favorite airport"
              onClick={() => toggle(id)}
            >
              <Star size={22} />
            </button>
          }
        />
        <h2>{a.name}</h2>
        <p className="muted">
          {a.city} · {a.countryName}
        </p>
        <FlightMap airport={a} />
        <section className="panel">
          <dl className="data-grid">
            <div>
              <dt>Local time</dt>
              <dd>
                {new Intl.DateTimeFormat(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: a.tz,
                }).format(now)}
              </dd>
            </div>
            <div>
              <dt>Time zone</dt>
              <dd>{a.tz}</dd>
            </div>
            <div>
              <dt>Coordinates</dt>
              <dd>
                {a.lat.toFixed(4)}, {a.lon.toFixed(4)}
              </dd>
            </div>
            <div>
              <dt>Elevation</dt>
              <dd>
                {a.elevation === null
                  ? "Unavailable"
                  : `${a.elevation.toLocaleString()} ft`}
              </dd>
            </div>
          </dl>
          <p className="caption">
            OurAirports · Geographic time zone from geo-tz. Verify
            boundary-sensitive historical times.
          </p>
        </section>
        <Weather icao={a.icao} />
        <section className="panel">
          <h2>Airport advisories</h2>
          <p className="muted">
            Airport-wide delays, terminal information and official operational
            advisories are unavailable in the connected free sources.
          </p>
        </section>
        <h2>Your flights here</h2>
        {flights
          .filter((f) => f.origin.id === id || f.destination.id === id)
          .map((f) => (
            <FlightCard flight={f} key={f.id} />
          ))}
      </>
    ) : (
      <Notice>
        {isLoading ? "Loading airports…" : "Airport not found."}
        <ErrorText error={error} />
      </Notice>
    );
  return (
    <>
      <PageTitle
        eyebrow="ON THE GROUND"
        title="Airports"
        action={
          <button
            className={`icon-button ${onlyFavorites ? "starred" : ""}`}
            aria-label="Show favorite airports"
            onClick={() => setOnlyFavorites(!onlyFavorites)}
          >
            <Star size={22} />
          </button>
        }
      />
      <div className="search-input large">
        <Search size={21} />
        <input
          aria-label="Search airports"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Where are you heading?"
        />
      </div>
      <p className="caption">
        Search {data.length.toLocaleString()} worldwide airports by code, name,
        city or country.
      </p>
      <ErrorText error={error} />
      {isLoading ? (
        <div className="skeleton">Loading airport database…</div>
      ) : (
        <>
          <div className="section-heading">
            <h2>{onlyFavorites || !q ? "Your favorites" : "Search results"}</h2>
            <span className="caption">
              {onlyFavorites ? favorites.length : list.length}
            </span>
          </div>
          <div className="panel airport-list">
            {(onlyFavorites
              ? data.filter((a) => favorites.some((f) => f.id === a.id))
              : list
            ).map((a) => (
              <div className="airport-row" key={a.id}>
                <Link to={`/airport/${a.id}`}>
                  <span className="airport-code">{a.iata || a.id}</span>
                  <span>
                    <strong>{a.city || a.name}</strong>
                    <small>
                      {a.name} · {a.countryName}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
                <button
                  className={`icon-button ${favorites.some((f) => f.id === a.id) ? "starred" : ""}`}
                  aria-label={`Favorite ${a.iata || a.id}`}
                  onClick={() => toggle(a.id)}
                >
                  <Star size={18} />
                </button>
              </div>
            ))}
          </div>
          {!list.length && !onlyFavorites && (
            <Empty
              title={q ? "No airports found" : "Keep your airports close."}
              detail={
                q
                  ? "Try an IATA code, ICAO code, city or country."
                  : "Search worldwide and save your favorites with the star."
              }
            />
          )}
        </>
      )}
    </>
  );
}
