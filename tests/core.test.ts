import { toUTC } from "../src/utils/timezone";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import Dexie from "dexie";
import { db, FlyDatabase } from "../src/database/db";
import {
  toLocal,
  distance,
  stats,
  validateFlight,
  delay,
  connection,
  fingerprint,
  geodesic,
  duration,
} from "../src/utils/flights";
import {
  parseImport,
  applyImport,
  flightsCSV,
  backup,
} from "../src/services/imports";
import { saveFlight, deleteFlight } from "../src/services/records";
import { searchAirports } from "../src/services/airports";
import {
  parseState,
  fresh,
  getPosition,
  ProviderError,
} from "../src/providers/opensky";
import { flight, evn, lca } from "./fixtures";
beforeEach(async () => {
  vi.stubEnv("VITE_OPENSKY_PERMISSION_CONFIRMED", "true");
  await Promise.all(db.tables.map((t) => t.clear()));
});
afterEach(() => vi.unstubAllGlobals());
describe("time and flight calculations", () => {
  it("converts airport local time to UTC", () =>
    expect(toUTC("2025-01-03T00:00", "Asia/Yerevan")).toBe(
      "2025-01-02T20:00:00Z",
    ));
  it("round-trips an overnight local arrival", () =>
    expect(toLocal("2025-01-02T22:00:00Z", "Asia/Nicosia")).toBe(
      "2025-01-03T00:00",
    ));
  it("rejects ambiguous daylight-saving time", () =>
    expect(() => toUTC("2025-11-02T01:30", "America/New_York")).toThrow());
  it("rejects nonexistent daylight-saving time", () =>
    expect(() => toUTC("2025-03-09T02:30", "America/New_York")).toThrow());
  it("validates overnight flights in UTC", () =>
    expect(validateFlight(flight())).toEqual([]));
  it("rejects an arrival before departure", () =>
    expect(
      validateFlight(flight({ scheduledArrival: "2025-01-02T19:00:00Z" })),
    ).toContain(
      "Arrival must be after departure. Check dates and time zones.",
    ));
  it("requires evidence for an aircraft assignment", () =>
    expect(validateFlight(flight({ icao24: "abc123" }))).toContain(
      "Explain how this aircraft was identified for this flight.",
    ));
  it("computes distance and zero distance", () => {
    expect(distance(evn, lca)).toBeGreaterThan(1100);
    expect(distance(evn, lca)).toBeLessThan(1300);
    expect(distance(evn, evn)).toBe(0);
  });
  it("handles antimeridian arcs without globe-spanning segments", () => {
    const arc = geodesic(
      { ...evn, lat: 40, lon: 170 },
      { ...lca, lat: 40, lon: -170 },
    );
    expect(
      arc.every((p, i) => !i || Math.abs(p[1] - arc[i - 1][1]) < 180),
    ).toBe(true);
  });
  it("calculates delay from actual ahead of estimated", () =>
    expect(
      delay(
        flight({
          actualDeparture: "2025-01-02T20:25:00Z",
          estimatedDeparture: "2025-01-02T21:00:00Z",
        }),
        "Departure",
      ),
    ).toBe(25));
  it("uses scheduled duration when only one actual time is present", () =>
    expect(duration(flight({ actualDeparture: "2025-01-03T01:00:00Z" }))).toBe(
      120,
    ));
  it("leaves unavailable delay unknown", () =>
    expect(delay(flight(), "Arrival")).toBeNull());
  it("excludes cancelled flights from flown statistics", () => {
    const s = stats([flight(), flight({ status: "Cancelled" })]);
    expect(s.done).toBe(1);
    expect(s.duration).toBe(120);
    expect(s.countries).toBe(2);
    expect(s.cancelled).toBe(1);
  });
  it("does not promote a past scheduled flight to completed", () =>
    expect(stats([flight({ status: "Scheduled" })]).done).toBe(0));
  it("normalizes flight numbers and ISO precision for duplicates", () =>
    expect(fingerprint(flight({ number: "test 101" }))).toBe(
      fingerprint(flight({ scheduledDeparture: "2025-01-02T20:00:00.000Z" })),
    ));
  it("classifies a connection using transparent buffers", () => {
    const b = flight({
      origin: lca,
      destination: evn,
      scheduledDeparture: "2025-01-02T23:00:00Z",
    });
    expect(connection(flight(), b, 45)?.rating).toBe("Tight");
    expect(connection(flight(), b, 70)?.rating).toBe("At risk");
  });
  it("rejects mismatched-airport and cancelled connections", () => {
    expect(connection(flight(), flight(), 0)).toBeNull();
    expect(
      connection(flight({ status: "Cancelled" }), flight({ origin: lca }), 0),
    ).toBeNull();
  });
});
describe("airport lookup", () => {
  it.each(["EVN", "UDYZ", "Zvartnots", "Yerevan", "Armenia", "AM"])(
    "finds airport by %s",
    (q) => expect(searchAirports([evn, lca], q)[0].id).toBe("UDYZ"),
  );
});
describe("local flight lifecycle and imports", () => {
  it("creates, edits and deletes flight records", async () => {
    const f = flight();
    await saveFlight(f);
    await saveFlight({ ...f, notes: "Window seat" });
    expect((await db.flights.get(f.id))?.notes).toBe("Window seat");
    await deleteFlight(f.id);
    expect(await db.flights.count()).toBe(0);
  });
  it("prevents duplicate manual entries", async () => {
    await saveFlight(flight());
    await expect(saveFlight(flight())).rejects.toThrow("already");
  });
  it("handles quoted commas and newlines in CSV", () => {
    const f = flight({ notes: "Hello, world\nSecond line" });
    const p = parseImport(flightsCSV([f]), "csv", [evn, lca], []);
    expect(p.rows[0].errors).toEqual([]);
    expect(p.rows[0].flight?.notes).toBe(f.notes);
  });
  it("rejects timestamps without explicit offsets", () => {
    const p = parseImport(
      JSON.stringify([flight({ scheduledDeparture: "2025-01-02T20:00:00" })]),
      "json",
      [evn, lca],
      [],
    );
    expect(p.rows[0].errors.join()).toContain("offset");
  });
  it("reports all invalid rows and imports none until corrected", async () => {
    const p = parseImport(
      JSON.stringify([flight(), { number: "BAD" }]),
      "json",
      [evn, lca],
      [],
    );
    expect(p.rows).toHaveLength(2);
    await expect(applyImport(p, false)).rejects.toThrow("Correct invalid");
    expect(await db.flights.count()).toBe(0);
  });
  it("detects duplicate rows within the same import", async () => {
    const p = parseImport(
      JSON.stringify([flight(), flight()]),
      "json",
      [evn, lca],
      [],
    );
    expect(p.rows[1].duplicate).toBe(true);
    expect(await applyImport(p, false)).toEqual({ added: 1, duplicates: 1 });
  });
  it("restores backup preferences and favorites while preserving existing fields", async () => {
    const f = flight({ notes: "Keep me" });
    await saveFlight(f);
    await db.favorites.put({ id: evn.id });
    const b = await backup();
    await db.favorites.clear();
    const p = parseImport(
      JSON.stringify(b),
      "json",
      [evn, lca],
      await db.flights.toArray(),
    );
    await applyImport(p, true);
    expect(await db.flights.count()).toBe(1);
    expect((await db.flights.get(f.id))?.notes).toBe("Keep me");
    expect(await db.favorites.count()).toBe(1);
  });
  it("migrates version-one records without data loss", async () => {
    const name = "migration-" + crypto.randomUUID();
    const old = new Dexie(name);
    old.version(1).stores({
      flights: "id,scheduledDeparture,status",
      preferences: "key",
      favorites: "id",
    });
    await old.table("flights").add(flight({ id: "legacy" }));
    old.close();
    const upgraded = new FlyDatabase(name);
    await upgraded.open();
    expect(await upgraded.flights.get("legacy")).toBeDefined();
    expect(await upgraded.positions.count()).toBe(0);
    await upgraded.delete();
  });
});
describe("OpenSky data integrity", () => {
  const state = {
    states: [
      [
        "abc123",
        " TEST ",
        null,
        1700000000,
        1700000000,
        44,
        40,
        10000,
        false,
        200,
        90,
        2,
      ],
    ],
  };
  it("parses actual coordinates and units", () => {
    expect(parseState(state, "abc123")).toMatchObject({
      lat: 40,
      lon: 44,
      altitude: 10000,
      speed: 200,
      callsign: "TEST",
    });
  });
  it("keeps null position unknown", () =>
    expect(
      parseState(
        { states: [["abc123", null, null, null, 1, null, null]] },
        "abc123",
      ),
    ).toBeNull());
  it("rejects malformed upstream responses", () =>
    expect(() => parseState({ wrong: [] }, "abc123")).toThrow());
  it("labels old and future timestamps stale", () => {
    const p = parseState(state, "abc123")!;
    expect(fresh(p, 1700000030000)).toBe(true);
    expect(fresh(p, 1700000300000)).toBe(false);
    expect(fresh(p, 1600000030000)).toBe(false);
  });
  it("reports authentication failure without inventing data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 401 })),
    );
    await expect(getPosition("abc123")).rejects.toThrow("Anonymous access");
    expect(await db.positions.count()).toBe(0);
  });
  it("reports a network/CORS error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(getPosition("abc123")).rejects.toBeInstanceOf(ProviderError);
  });
  it("deduplicates concurrent requests", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(state)));
    vi.stubGlobal("fetch", fetcher);
    await Promise.all([getPosition("abc123"), getPosition("abc123")]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await db.positions.count()).toBe(1);
  });
});
