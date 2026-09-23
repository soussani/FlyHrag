import { db } from "../database/db";
import type { Position } from "../types";
export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
export const fresh = (p: Position, now = Date.now()) =>
  p.timestamp * 1000 <= now + 30000 && now - p.timestamp * 1000 < 120000;
export function parseState(raw: unknown, id: string): Position | null {
  if (!raw || typeof raw !== "object" || !("states" in raw))
    throw new ProviderError("Malformed OpenSky response.");
  const states = (raw as { states: unknown }).states;
  if (states === null) return null;
  if (!Array.isArray(states))
    throw new ProviderError("Malformed state vectors.");
  const row = states.find((r) => Array.isArray(r) && r[0] === id);
  if (!row) return null;
  const n = (x: unknown) =>
    typeof x === "number" && Number.isFinite(x) ? x : null;
  if (n(row[5]) === null || n(row[6]) === null || n(row[3]) === null)
    return null;
  if (
    Math.abs(row[5]) > 180 ||
    Math.abs(row[6]) > 90 ||
    typeof row[8] !== "boolean"
  )
    throw new ProviderError("Invalid aircraft coordinates.");
  return {
    key: `${id}:${row[3]}`,
    icao24: id,
    callsign: typeof row[1] === "string" ? row[1].trim() : "",
    lon: row[5],
    lat: row[6],
    timestamp: row[3],
    altitude: n(row[7]),
    speed: n(row[9]),
    heading: n(row[10]),
    verticalRate: n(row[11]),
    onGround: row[8],
    fetchedAt: Date.now(),
    source: "OpenSky",
  };
}
let blockedUntil = 0;
const pending = new Map<string, Promise<unknown>>();
export const openSkyAllowed = () =>
  import.meta.env.VITE_OPENSKY_PERMISSION_CONFIRMED === "true";
async function request(path: string): Promise<unknown> {
  if (!openSkyAllowed())
    throw new ProviderError(
      "OpenSky integration is disabled: operational API use requires prior written permission. The default aircraft provider is adsb.fi.",
      403,
    );
  if (Date.now() < blockedUntil)
    throw new ProviderError(
      "OpenSky requests paused after a rate limit. Try later.",
      429,
    );
  const existing = pending.get(path);
  if (existing) return existing;
  const task = (async () => {
    let r: Response;
    try {
      r = await fetch(`https://opensky-network.org/api/${path}`, {
        signal: AbortSignal.timeout(15000),
        credentials: "omit",
      });
    } catch {
      throw new ProviderError(
        "OpenSky is unreachable. Network, CORS or provider access may be unavailable. Saved data remains available.",
      );
    }
    if (r.status === 429) {
      blockedUntil =
        Date.now() +
        Math.max(
          300,
          Number(r.headers.get("X-Rate-Limit-Retry-After-Seconds")) || 3600,
        ) *
          1000;
      throw new ProviderError(
        "OpenSky quota reached. Refresh has been paused.",
        429,
      );
    }
    if (r.status === 401 || r.status === 403)
      throw new ProviderError(
        "Anonymous access is unavailable. FlyHrag does not put API credentials in the browser.",
        r.status,
      );
    if (r.status === 404) return null;
    if (!r.ok)
      throw new ProviderError(`OpenSky returned HTTP ${r.status}.`, r.status);
    try {
      return await r.json();
    } catch {
      throw new ProviderError("OpenSky returned invalid JSON.");
    }
  })();
  pending.set(path, task);
  try {
    return await task;
  } finally {
    pending.delete(path);
  }
}
async function fetchPosition(id: string): Promise<Position | null> {
  if (!/^[a-f0-9]{6}$/.test(id))
    throw new ProviderError("A six-character ICAO24 address is required.");
  const cache = await db.cache.get(`request:${id}`);
  if (cache && Date.now() - cache.updatedAt < 60000)
    return cache.value as Position | null;
  const p = parseState(await request(`states/all?icao24=${id}`), id);
  if (p) await db.positions.put(p);
  await db.cache.put({ key: `request:${id}`, value: p, updatedAt: Date.now() });
  return p;
}
export interface Movement {
  icao24: string;
  firstSeen: number;
  lastSeen: number;
  estDepartureAirport: string | null;
  estArrivalAirport: string | null;
  callsign: string | null;
}
export async function getMovements(id: string): Promise<Movement[]> {
  const end = Math.floor(Date.now() / 86400000) * 86400,
    begin = end - 86400;
  const key = `movements:${id}:${end}`,
    cached = await db.cache.get(key);
  if (cached) return cached.value as Movement[];
  const raw = await request(
    `flights/aircraft?icao24=${id}&begin=${begin}&end=${end}`,
  );
  if (raw === null) return [];
  if (
    !Array.isArray(raw) ||
    raw.some(
      (r) =>
        r.icao24 !== id ||
        !Number.isFinite(r.firstSeen) ||
        !Number.isFinite(r.lastSeen),
    )
  )
    throw new ProviderError("Malformed aircraft history response.");
  await db.cache.put({ key, value: raw, updatedAt: Date.now() });
  return raw;
}

const positionPending = new Map<string, Promise<Position | null>>();
export async function getPosition(id: string): Promise<Position | null> {
  const previous = positionPending.get(id);
  if (previous) return previous;
  const task = fetchPosition(id);
  positionPending.set(id, task);
  try {
    return await task;
  } finally {
    positionPending.delete(id);
  }
}
