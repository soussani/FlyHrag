import Papa from "papaparse";
import { db } from "../database/db";
import {
  statuses,
  type Airport,
  type Flight,
  type Settings,
  defaults,
} from "../types";
import { fingerprint, validateFlight } from "../utils/flights";
const columns = [
  "number",
  "airline",
  "origin",
  "destination",
  "scheduledDeparture",
  "scheduledArrival",
  "actualDeparture",
  "actualArrival",
  "estimatedDeparture",
  "estimatedArrival",
  "status",
  "model",
  "registration",
  "icao24",
  "evidence",
  "seat",
  "cabin",
  "notes",
];
export const csvTemplate = columns.join(",") + "\r\n";
export function flightsCSV(flights: Flight[]) {
  return Papa.unparse(
    flights.map((f) =>
      Object.fromEntries(
        columns.map((k) => [
          k,
          k === "origin"
            ? f.origin.id
            : k === "destination"
              ? f.destination.id
              : f[k as keyof Flight],
        ]),
      ),
    ),
    { columns, escapeFormulae: true },
  );
}
export interface PreviewRow {
  row: number;
  sourceId?: string;
  flight?: Flight;
  errors: string[];
  duplicate: boolean;
}
export interface ImportPreview {
  rows: PreviewRow[];
  settings?: Settings;
  favorites?: { id: string }[];
  extras?: {
    positions: unknown[];
    alerts: unknown[];
    imports: unknown[];
    cache: unknown[];
  };
  backup: boolean;
}
export function parseImport(
  text: string,
  kind: "csv" | "json",
  airports: Airport[],
  existing: Flight[],
): ImportPreview {
  let raw: unknown,
    backup = false,
    settings: Settings | undefined,
    favorites: { id: string }[] | undefined,
    extras: ImportPreview["extras"];
  if (kind === "csv") {
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
    });
    if (parsed.errors.length)
      throw new Error(
        parsed.errors
          .map((e) => `Row ${(e.row || 0) + 2}: ${e.message}`)
          .join("\n"),
      );
    raw = parsed.data;
  } else {
    raw = JSON.parse(text);
    if (
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      "format" in raw
    ) {
      const b = raw as Record<string, unknown>;
      if (b.format !== "FlyHrag" || b.version !== 1)
        throw new Error("Unsupported backup format or version.");
      backup = true;
      raw = b.flights;
      if (b.settings) {
        const s = b.settings as Settings;
        settings = { ...defaults, ...s };
        if (
          !["system", "light", "dark"].includes(settings.theme) ||
          ![0, 300, 600, 900].includes(settings.refresh) ||
          !["km", "mi", "nm"].includes(settings.distance) ||
          !["24", "12"].includes(settings.timeFormat) ||
          typeof settings.name !== "string" ||
          !["kt", "km/h"].includes(settings.speed) ||
          !["ft", "m"].includes(settings.altitude) ||
          !["standard", "muted"].includes(settings.mapAppearance) ||
          [
            settings.follow,
            settings.routes,
            settings.alerts,
            settings.browserAlerts,
          ].some((v) => typeof v !== "boolean")
        )
          throw new Error("Invalid backup preferences.");
      }
      for (const key of ["favorites", "positions", "alerts", "imports"]) {
        if (b[key] !== undefined && !Array.isArray(b[key]))
          throw new Error(`Invalid backup ${key}: expected an array.`);
      }
      const record = (value: unknown): value is Record<string, unknown> =>
        !!value && typeof value === "object";
      const validDate = (value: unknown) =>
        typeof value === "string" && Number.isFinite(Date.parse(value));
      if (
        Array.isArray(b.favorites) &&
        b.favorites.some((v) => !record(v) || typeof v.id !== "string")
      )
        throw new Error("Invalid favorite in backup. Nothing was restored.");
      if (
        Array.isArray(b.positions) &&
        b.positions.some(
          (v) =>
            !record(v) ||
            typeof v.key !== "string" ||
            typeof v.icao24 !== "string" ||
            !/^[a-f0-9]{6}$/.test(v.icao24) ||
            typeof v.lat !== "number" ||
            !Number.isFinite(v.lat) ||
            Math.abs(v.lat) > 90 ||
            typeof v.lon !== "number" ||
            !Number.isFinite(v.lon) ||
            Math.abs(v.lon) > 180 ||
            typeof v.timestamp !== "number" ||
            !Number.isFinite(v.timestamp) ||
            typeof v.fetchedAt !== "number" ||
            typeof v.callsign !== "string" ||
            (v.onGround !== null && typeof v.onGround !== "boolean") ||
            !["OpenSky", "adsb.fi"].includes(String(v.source)) ||
            [v.altitude, v.speed, v.heading, v.verticalRate].some(
              (n) =>
                n !== null && (typeof n !== "number" || !Number.isFinite(n)),
            ),
        )
      )
        throw new Error(
          "Invalid aircraft observation in backup. Nothing was restored.",
        );
      if (
        Array.isArray(b.alerts) &&
        b.alerts.some(
          (v) =>
            !record(v) ||
            typeof v.id !== "string" ||
            typeof v.title !== "string" ||
            typeof v.detail !== "string" ||
            typeof v.read !== "boolean" ||
            !validDate(v.date),
        )
      )
        throw new Error(
          "Invalid notification in backup. Nothing was restored.",
        );
      if (
        Array.isArray(b.imports) &&
        b.imports.some(
          (v) =>
            !record(v) ||
            typeof v.id !== "string" ||
            !validDate(v.date) ||
            [v.added, v.duplicates, v.errors].some(
              (n) => typeof n !== "number" || !Number.isInteger(n) || n < 0,
            ),
        )
      )
        throw new Error("Invalid import log in backup. Nothing was restored.");
      if (Array.isArray(b.favorites))
        favorites = b.favorites.filter(
          (x): x is { id: string } => !!x && typeof x.id === "string",
        );
      extras = {
        positions: Array.isArray(b.positions) ? b.positions : [],
        alerts: Array.isArray(b.alerts) ? b.alerts : [],
        imports: Array.isArray(b.imports) ? b.imports : [],
        cache: [],
      };
    }
  }
  if (!Array.isArray(raw))
    throw new Error("Expected a JSON array of flights or a FlyHrag backup.");
  const byId = new Map(
    airports
      .flatMap(
        (a) =>
          [
            [a.id, a],
            [a.iata, a],
            [a.icao, a],
          ] as [string, Airport][],
      )
      .filter(([k]) => k),
  );
  const seen = new Set(existing.map(fingerprint));
  const rows: PreviewRow[] = raw.map((r, i) => {
    try {
      if (!r || typeof r !== "object")
        throw new Error("Expected a flight object.");
      const str = (k: string) => (typeof r[k] === "string" ? r[k].trim() : "");
      const airport = (k: string) => {
        const value = r[k];
        const id = typeof value === "string" ? value : value?.id;
        const a = byId.get(String(id).toUpperCase());
        if (!a) throw new Error(`Unknown ${k} airport: ${id || "missing"}`);
        return a;
      };
      const now = new Date().toISOString();
      const f: Flight = {
        id: crypto.randomUUID(),
        airline: str("airline"),
        number: str("number"),
        origin: airport("origin"),
        destination: airport("destination"),
        scheduledDeparture: str("scheduledDeparture"),
        scheduledArrival: str("scheduledArrival"),
        actualDeparture: str("actualDeparture"),
        actualArrival: str("actualArrival"),
        estimatedDeparture: str("estimatedDeparture"),
        estimatedArrival: str("estimatedArrival"),
        status: (str("status") || "Unknown") as Flight["status"],
        model: str("model"),
        registration: str("registration"),
        icao24: str("icao24").toLowerCase(),
        evidence: str("evidence"),
        seat: str("seat"),
        cabin: str("cabin"),
        notes: str("notes"),
        source: "user",
        createdAt: str("createdAt") || now,
        updatedAt: now,
      };
      const errors = validateFlight(f);
      if (!statuses.includes(f.status)) errors.push("Unknown status.");
      for (const k of [
        "scheduledDeparture",
        "scheduledArrival",
        "actualDeparture",
        "actualArrival",
        "estimatedDeparture",
        "estimatedArrival",
      ] as const) {
        if (f[k]) {
          if (
            !/(Z|[+-]\d\d:\d\d)$/.test(f[k]) ||
            !Number.isFinite(Date.parse(f[k]))
          )
            errors.push(
              `${k} must be ISO 8601 with Z or an explicit UTC offset.`,
            );
          else f[k] = new Date(f[k]).toISOString();
        }
      }
      const key = fingerprint(f),
        duplicate = seen.has(key);
      if (!errors.length) seen.add(key);
      return {
        row: i + 1,
        sourceId: backup ? str("id") : undefined,
        flight: f,
        errors,
        duplicate,
      };
    } catch (e) {
      return {
        row: i + 1,
        errors: [String((e as Error).message)],
        duplicate: false,
      };
    }
  });
  return { rows, settings, favorites, extras, backup };
}
export async function applyImport(preview: ImportPreview, restore: boolean) {
  if (preview.rows.some((r) => r.errors.length))
    throw new Error(
      "Correct invalid rows before importing. Nothing was saved.",
    );
  let added = 0,
    duplicates = 0;
  await db.transaction(
    "rw",
    [
      db.flights,
      db.preferences,
      db.favorites,
      db.imports,
      db.positions,
      db.alerts,
    ],
    async () => {
      const all = await db.flights.toArray(),
        seen = new Set(all.map(fingerprint)),
        ids = new Map<string, string>(),
        existingIds = new Map(all.map((f) => [fingerprint(f), f.id]));
      for (const row of preview.rows) {
        if (!row.flight) continue;
        const key = fingerprint(row.flight);
        if (seen.has(key)) {
          if (row.sourceId) ids.set(row.sourceId, existingIds.get(key)!);
          duplicates++;
          continue;
        }
        seen.add(key);
        existingIds.set(key, row.flight.id);
        if (row.sourceId) ids.set(row.sourceId, row.flight.id);
        await db.flights.add(row.flight);
        added++;
      }
      if (restore) {
        if (preview.settings)
          await db.preferences.put({
            key: "settings",
            value: preview.settings,
          });
        if (preview.favorites) await db.favorites.bulkPut(preview.favorites);
        for (const p of preview.extras?.positions || []) {
          if (
            p &&
            typeof p === "object" &&
            "key" in p &&
            "icao24" in p &&
            "lat" in p &&
            "lon" in p &&
            "timestamp" in p &&
            typeof p.key === "string" &&
            typeof p.lat === "number" &&
            Math.abs(p.lat) <= 90 &&
            typeof p.lon === "number" &&
            Math.abs(p.lon) <= 180 &&
            typeof p.timestamp === "number"
          )
            await db.positions.put(p as import("../types").Position);
        }
        for (const a of preview.extras?.alerts || []) {
          if (
            a &&
            typeof a === "object" &&
            "id" in a &&
            "title" in a &&
            "detail" in a &&
            "date" in a &&
            typeof a.id === "string" &&
            typeof a.title === "string" &&
            typeof a.detail === "string" &&
            typeof a.date === "string"
          )
            await db.alerts.put({
              ...a,
              flightId:
                "flightId" in a && typeof a.flightId === "string"
                  ? ids.get(a.flightId)
                  : undefined,
            } as import("../types").Alert);
        }
        for (const log of preview.extras?.imports || []) {
          if (
            log &&
            typeof log === "object" &&
            "id" in log &&
            "date" in log &&
            "added" in log &&
            "duplicates" in log &&
            "errors" in log &&
            typeof log.id === "string" &&
            typeof log.date === "string" &&
            typeof log.added === "number" &&
            typeof log.duplicates === "number" &&
            typeof log.errors === "number"
          )
            await db.imports.put(log as import("../types").ImportLog);
        }
      }
      await db.imports.add({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        added,
        duplicates,
        errors: 0,
      });
    },
  );
  return { added, duplicates };
}
export async function backup() {
  return {
    format: "FlyHrag",
    version: 1,
    exportedAt: new Date().toISOString(),
    flights: await db.flights.toArray(),
    settings: (await db.preferences.get("settings"))?.value || defaults,
    favorites: await db.favorites.toArray(),
    positions: await db.positions.toArray(),
    alerts: await db.alerts.toArray(),
    imports: await db.imports.toArray(),
  };
}
