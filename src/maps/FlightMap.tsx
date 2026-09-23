import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import { LocateFixed, Route } from "lucide-react";
import { Link } from "react-router-dom";
import type { Airport, Flight, Position } from "../types";
import { geodesic } from "../utils/flights";
import { useSettings } from "../app/context";
import { fresh } from "../providers/opensky";
import "leaflet/dist/leaflet.css";
function Controls({
  points,
  position,
  follow,
  setFollow,
}: {
  points: [number, number][];
  position?: Position;
  follow: boolean;
  setFollow: (v: boolean) => void;
}) {
  const map = useMap();
  const fit = () => {
    if (points.length)
      map.fitBounds(points, { padding: [40, 40], maxZoom: 10 });
  };
  useEffect(() => {
    fit();
  }, [JSON.stringify(points)]);
  useMapEvents({ dragstart: () => setFollow(false), zoomstart: () => {} });
  useEffect(() => {
    if (follow && position && fresh(position))
      map.panTo([position.lat, position.lon]);
  }, [position?.key, follow]);
  return (
    <div className="map-controls">
      <button
        disabled={!points.length}
        onClick={fit}
        aria-label="Fit routes"
        title="Fit routes"
      >
        <Route size={19} />
      </button>
      {position && (
        <button
          className={follow ? "active" : ""}
          onClick={() => {
            map.panTo([position.lat, position.lon]);
            setFollow(!follow);
          }}
          aria-label={follow ? "Stop following aircraft" : "Follow aircraft"}
        >
          <LocateFixed size={19} />
        </button>
      )}
    </div>
  );
}
export default function FlightMap({
  flights = [],
  airport,
  position,
  track = [],
  height = 360,
}: {
  flights?: Flight[];
  airport?: Airport;
  position?: Position;
  track?: Position[];
  height?: number;
}) {
  const { settings } = useSettings();
  const [follow, setFollow] = useState(settings.follow);
  const arcs = useMemo(
    () =>
      flights.map((f) => ({ f, points: geodesic(f.origin, f.destination) })),
    [flights],
  );
  const points = arcs.flatMap((a) => [a.points[0], a.points.at(-1)!]);
  if (airport) points.push([airport.lat, airport.lon]);
  if (position && !points.length) points.push([position.lat, position.lon]);
  const airports = [
    ...new Map(
      [
        ...flights.flatMap((f) => [f.origin, f.destination]),
        ...(airport ? [airport] : []),
      ].map((a) => [a.id, a]),
    ).values(),
  ];
  const icon = position
    ? L.divIcon({
        className: "aircraft-icon",
        html: `<svg viewBox="0 0 40 40" width="40" height="40" style="transform:rotate(${position.heading ?? 0}deg)"><path d="M20 4 24 17 36 24 36 28 23 25 23 33 28 36 28 38 20 35 12 38 12 36 17 33 17 25 4 28 4 24 16 17Z" fill="${fresh(position) ? "#268ae6" : "#7d8b9b"}" stroke="white" stroke-width="1.7"/></svg>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
    : undefined;
  return (
    <div
      className={`map-shell ${settings.mapAppearance === "muted" ? "muted-map" : ""}`}
      style={{ height }}
    >
      <MapContainer
        center={[32, 25]}
        zoom={2}
        minZoom={2}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {settings.routes &&
          arcs.map(({ f, points }) => (
            <Polyline
              key={f.id}
              positions={points}
              pathOptions={{
                color: "#368fde",
                weight: 2.5,
                opacity: 0.7,
                dashArray: "5 7",
              }}
            >
              <Popup>
                <Link to={`/flight/${f.id}`}>
                  {f.number} · {f.origin.iata} → {f.destination.iata}
                </Link>
                <br />
                Great-circle approximation
              </Popup>
            </Polyline>
          ))}
        {airports.map((a) => (
          <CircleMarker
            key={a.id}
            center={[
              a.lat,
              flights.length === 1 && a.id === flights[0].destination.id
                ? arcs[0].points.at(-1)![1]
                : a.lon,
            ]}
            radius={5}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: "#163f67",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <Link to={`/airport/${a.id}`}>
                {a.iata || a.id} · {a.name}
              </Link>
            </Popup>
          </CircleMarker>
        ))}
        {track.length > 1 &&
          track.slice(1).map((p, i) => {
            const prev = track[i];
            return p.timestamp - prev.timestamp < 900 &&
              Math.abs(p.lon - prev.lon) < 180 ? (
              <Polyline
                key={p.key}
                positions={[
                  [prev.lat, prev.lon],
                  [p.lat, p.lon],
                ]}
                pathOptions={{ color: "#0b9c87", weight: 3 }}
              />
            ) : null;
          })}
        {position && (
          <Marker position={[position.lat, position.lon]} icon={icon}>
            <Popup>
              {position.callsign || position.icao24}
              <br />
              {fresh(position) ? "Recent observation" : "Stale observation"}
              <br />
              {new Date(position.timestamp * 1000).toLocaleString()}
            </Popup>
          </Marker>
        )}
        <Controls
          points={points}
          position={position}
          follow={follow}
          setFollow={setFollow}
        />
      </MapContainer>
      <div className="map-legend">
        <span className="dashed" /> Great-circle approximation
        {track.length > 1 && <> · Solid: observed segments</>}
      </div>
    </div>
  );
}
