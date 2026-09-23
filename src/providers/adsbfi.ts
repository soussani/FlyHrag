import { db } from "../database/db";
import type { Position } from "../types";
import { ProviderError } from "./opensky";

// Public, personal non-commercial endpoint. No feeder-only or global requests.
export function parseADSB(raw: unknown, id: string): Position | null {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("ac" in raw) ||
    !Array.isArray(raw.ac)
  )
    throw new ProviderError("Malformed adsb.fi aircraft response.");
  const row = raw.ac.find(
    (value: unknown) =>
      value && typeof value === "object" && "hex" in value && value.hex === id,
  );
  if (!row) return null;
  const n = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  if (n(row.lat) === null || n(row.lon) === null || n(row.seen_pos) === null)
    return null;
  if (
    Math.abs(row.lat) > 90 ||
    Math.abs(row.lon) > 180 ||
    row.seen_pos < 0 ||
    !("now" in raw) ||
    n(raw.now) === null
  )
    throw new ProviderError("Invalid adsb.fi position or timestamp.");
  const now = Number(raw.now) > 1e12 ? Number(raw.now) / 1000 : Number(raw.now);
  const timestamp = now - row.seen_pos;
  return {
    key: `adsbfi:${id}:${timestamp}`,
    icao24: id,
    callsign: typeof row.flight === "string" ? row.flight.trim() : "",
    lat: row.lat,
    lon: row.lon,
    altitude: n(row.alt_baro) === null ? null : row.alt_baro * 0.3048,
    speed: n(row.gs) === null ? null : row.gs * 0.514444,
    heading: n(row.track),
    verticalRate: n(row.baro_rate) === null ? null : row.baro_rate * 0.00508,
    onGround:
      row.alt_baro === "ground"
        ? true
        : n(row.alt_baro) === null
          ? null
          : false,
    timestamp,
    fetchedAt: Date.now(),
    source: "adsb.fi",
  };
}
const pending = new Map<string, Promise<Position | null>>();
let nextRequestAt = 0;
async function fetchPosition(id: string): Promise<Position | null> {
  if (!/^[a-f0-9]{6}$/.test(id))
    throw new ProviderError("A six-character ICAO24 address is required.");
  const key = `adsbfi:request:${id}`,
    cached = await db.cache.get(key);
  if (cached && Date.now() - cached.updatedAt < 60000)
    return cached.value as Position | null;
  const blocked = await db.cache.get("adsbfi:blocked");
  if (blocked && Number(blocked.value) > Date.now())
    throw new ProviderError(
      "adsb.fi requests are paused after a rate limit. Try later.",
      429,
    );
  if (Date.now() < nextRequestAt)
    throw new ProviderError(
      "Please allow a moment between aircraft requests.",
      429,
    );
  nextRequestAt = Date.now() + 1100;
  let response: Response;
  try {
    response = await fetch(`https://opendata.adsb.fi/api/v2/hex/${id}`, {
      credentials: "omit",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ProviderError(
      "adsb.fi is unreachable. Network, CORS or provider availability may prevent tracking. Saved observations remain available.",
    );
  }
  if (response.status === 429) {
    const retry = response.headers.get("Retry-After");
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : 600;
    await db.cache.put({
      key: "adsbfi:blocked",
      value: Date.now() + Math.max(60, seconds) * 1000,
      updatedAt: Date.now(),
    });
    throw new ProviderError(
      "adsb.fi rate limit reached. Requests are paused.",
      429,
    );
  }
  if (!response.ok)
    throw new ProviderError(
      `adsb.fi returned HTTP ${response.status}. Access or coverage is unavailable.`,
      response.status,
    );
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ProviderError("adsb.fi returned invalid JSON.");
  }
  const position = parseADSB(raw, id);
  if (position) await db.positions.put(position);
  await db.cache.put({ key, value: position, updatedAt: Date.now() });
  return position;
}
export async function getPosition(id: string) {
  const existing = pending.get(id);
  if (existing) return existing;
  const task = fetchPosition(id);
  pending.set(id, task);
  try {
    return await task;
  } finally {
    pending.delete(id);
  }
}
