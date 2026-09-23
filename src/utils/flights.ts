import type { Airport, Flight } from "../types";
export const completed = (f: Flight) =>
  ["Completed", "Landed"].includes(f.status);
export function toLocal(iso: string, tz: string) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const value = (key: string) => parts.find((p) => p.type === key)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}
export function time(iso: string, tz: string, hour12 = false) {
  return iso
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
        hour12,
      }).format(new Date(iso))
    : "—";
}
export function date(iso: string, tz = "UTC") {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: tz,
  }).format(new Date(iso));
}
export function minutes(a: string, b: string) {
  return (Date.parse(b) - Date.parse(a)) / 60000;
}
export function delay(f: Flight, kind: "Departure" | "Arrival") {
  const updated = f[`actual${kind}`] || f[`estimated${kind}`];
  return updated ? Math.round(minutes(f[`scheduled${kind}`], updated)) : null;
}
export function distance(
  a: Pick<Airport, "lat" | "lon">,
  b: Pick<Airport, "lat" | "lon">,
) {
  const r = Math.PI / 180;
  const d =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(d), Math.sqrt(Math.max(0, 1 - d)));
}
export function fingerprint(f: Flight) {
  return [
    f.number.replace(/\s/g, "").toUpperCase(),
    f.origin.id,
    f.destination.id,
    Number.isFinite(Date.parse(f.scheduledDeparture))
      ? new Date(f.scheduledDeparture).toISOString()
      : f.scheduledDeparture,
  ].join("|");
}
export function validateFlight(f: Flight) {
  const errors: string[] = [];
  if (!f.number.trim()) errors.push("Flight number is required.");
  if (!f.origin?.id || !f.destination?.id) errors.push("Choose both airports.");
  if (f.origin?.id === f.destination?.id)
    errors.push("Departure and arrival must differ.");
  if (
    !Number.isFinite(Date.parse(f.scheduledDeparture)) ||
    !Number.isFinite(Date.parse(f.scheduledArrival))
  )
    errors.push("Valid departure and arrival dates are required.");
  else if (minutes(f.scheduledDeparture, f.scheduledArrival) <= 0)
    errors.push("Arrival must be after departure. Check dates and time zones.");
  for (const key of [
    "actualDeparture",
    "actualArrival",
    "estimatedDeparture",
    "estimatedArrival",
  ] as const) {
    if (f[key] && !Number.isFinite(Date.parse(f[key])))
      errors.push(`Invalid ${key}.`);
  }
  if (
    f.actualDeparture &&
    f.actualArrival &&
    minutes(f.actualDeparture, f.actualArrival) <= 0
  )
    errors.push("Actual arrival must follow actual departure.");
  if (f.icao24 && !/^[0-9a-f]{6}$/i.test(f.icao24))
    errors.push("ICAO24 must contain six hexadecimal characters.");
  if (f.icao24 && !f.evidence.trim())
    errors.push("Explain how this aircraft was identified for this flight.");
  return errors;
}
export function duration(f: Flight) {
  return f.actualDeparture && f.actualArrival
    ? minutes(f.actualDeparture, f.actualArrival)
    : minutes(f.scheduledDeparture, f.scheduledArrival);
}
export function stats(flights: Flight[]) {
  const done = flights.filter(completed);
  const counts = (values: string[]) =>
    Object.entries(
      values
        .filter(Boolean)
        .reduce<Record<string, number>>(
          (a, v) => ((a[v] = (a[v] || 0) + 1), a),
          {},
        ),
    ).sort((a, b) => b[1] - a[1]);
  return {
    total: flights.length,
    done: done.length,
    cancelled: flights.filter((f) => f.status === "Cancelled").length,
    upcoming: flights.filter(
      (f) =>
        !completed(f) &&
        f.status !== "Cancelled" &&
        Date.parse(f.scheduledDeparture) > Date.now(),
    ).length,
    distance: done.reduce((s, f) => s + distance(f.origin, f.destination), 0),
    duration: done.reduce((s, f) => s + duration(f), 0),
    countries: new Set(
      done.flatMap((f) => [f.origin.country, f.destination.country]),
    ).size,
    airports: counts(
      done.flatMap((f) => [
        f.origin.iata || f.origin.id,
        f.destination.iata || f.destination.id,
      ]),
    ),
    airlines: counts(done.map((f) => f.airline)),
    models: counts(done.map((f) => f.model)),
    routes: counts(
      done.map(
        (f) =>
          `${f.origin.iata || f.origin.id} → ${f.destination.iata || f.destination.id}`,
      ),
    ),
    seats: counts(done.map((f) => f.seat)),
    cabins: counts(done.map((f) => f.cabin)),
    months: counts(
      done.map((f) => toLocal(f.scheduledDeparture, f.origin.tz).slice(0, 7)),
    ).sort(),
    years: counts(
      done.map((f) => toLocal(f.scheduledDeparture, f.origin.tz).slice(0, 4)),
    ).sort(),
    delays: done.flatMap((f) =>
      delay(f, "Arrival") === null ? [] : [delay(f, "Arrival")!],
    ),
    longest: [...done].sort(
      (a, b) =>
        distance(b.origin, b.destination) - distance(a.origin, a.destination),
    )[0],
    shortest: [...done].sort(
      (a, b) =>
        distance(a.origin, a.destination) - distance(b.origin, b.destination),
    )[0],
  };
}
export function connection(a: Flight, b: Flight, buffer: number) {
  if (
    a.destination.id !== b.origin.id ||
    a.status === "Cancelled" ||
    b.status === "Cancelled"
  )
    return null;
  const scheduled = minutes(a.scheduledArrival, b.scheduledDeparture);
  const updated = minutes(
    a.actualArrival || a.estimatedArrival || a.scheduledArrival,
    b.actualDeparture || b.estimatedDeparture || b.scheduledDeparture,
  );
  const available = updated - buffer;
  return {
    scheduled,
    updated,
    available,
    rating:
      available < 0
        ? "At risk"
        : available < 30
          ? "Tight"
          : available < 90
            ? "Normal"
            : "Relaxed",
  };
}
export function geodesic(a: Airport, b: Airport): [number, number][] {
  const rad = Math.PI / 180;
  const p = [a.lat * rad, a.lon * rad],
    q = [b.lat * rad, b.lon * rad];
  const angle = distance(a, b) / 6371;
  if (angle < 1e-8)
    return [
      [a.lat, a.lon],
      [b.lat, b.lon],
    ];
  const result: [number, number][] = [];
  let previous = a.lon;
  for (let i = 0; i <= 64; i++) {
    const t = i / 64,
      A = Math.sin((1 - t) * angle) / Math.sin(angle),
      B = Math.sin(t * angle) / Math.sin(angle);
    const x =
        A * Math.cos(p[0]) * Math.cos(p[1]) +
        B * Math.cos(q[0]) * Math.cos(q[1]),
      y =
        A * Math.cos(p[0]) * Math.sin(p[1]) +
        B * Math.cos(q[0]) * Math.sin(q[1]),
      z = A * Math.sin(p[0]) + B * Math.sin(q[0]);
    let lon = Math.atan2(y, x) / rad;
    while (lon - previous > 180) lon -= 360;
    while (lon - previous < -180) lon += 360;
    result.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / rad, lon]);
    previous = lon;
  }
  return result;
}
