import { explainWeather } from "../src/providers/weather";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { db } from "../src/database/db";
import { parseADSB, getPosition } from "../src/providers/adsbfi";
import { getPosition as openSkyPosition } from "../src/providers/opensky";
const observation = {
  now: 1700000000000,
  ac: [
    {
      hex: "abc123",
      flight: " TEST ",
      lat: 40,
      lon: 44,
      seen_pos: 10,
      alt_baro: 10000,
      gs: 100,
      track: 90,
      baro_rate: 500,
    },
  ],
};
beforeEach(async () => {
  await db.cache.clear();
  await db.positions.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("normalizes adsb.fi units and uses observed position time", () => {
  const p = parseADSB(observation, "abc123");
  expect(p).toMatchObject({
    source: "adsb.fi",
    callsign: "TEST",
    timestamp: 1699999990,
    altitude: 3048,
    heading: 90,
    onGround: false,
  });
  expect(p!.speed).toBeCloseTo(51.4444);
  expect(p!.verticalRate).toBeCloseTo(2.54);
});
it("keeps missing ground state unknown", () => {
  expect(
    parseADSB(
      { ...observation, ac: [{ ...observation.ac[0], alt_baro: undefined }] },
      "abc123",
    )?.onGround,
  ).toBeNull();
});
it("accepts ground report without inventing altitude", () => {
  expect(
    parseADSB(
      { ...observation, ac: [{ ...observation.ac[0], alt_baro: "ground" }] },
      "abc123",
    ),
  ).toMatchObject({ altitude: null, onGround: true });
});
it("rejects malformed provider responses", () => {
  expect(() => parseADSB({ ac: "bad" }, "abc123")).toThrow();
  expect(() =>
    parseADSB(
      { ...observation, ac: [{ ...observation.ac[0], lat: 100 }] },
      "abc123",
    ),
  ).toThrow();
});
it("returns unavailable for no matching aircraft", () =>
  expect(parseADSB({ now: 1700000000000, ac: [] }, "abc123")).toBeNull());
it("deduplicates adsb.fi requests and caches positions", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(observation)));
  vi.stubGlobal("fetch", fetcher);
  const result = await Promise.all([
    getPosition("abc123"),
    getPosition("abc123"),
  ]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(result[0]?.source).toBe("adsb.fi");
  expect(await db.positions.count()).toBe(1);
  await getPosition("abc123");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("prevents OpenSky access without the permission build flag", async () => {
  vi.stubEnv("VITE_OPENSKY_PERMISSION_CONFIRMED", "false");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await expect(openSkyPosition("abc124")).rejects.toThrow(
    "prior written permission",
  );
  expect(fetcher).not.toHaveBeenCalled();
});

it("handles missing weather condition codes from official reports",()=>{expect(explainWeather(null)).toBe("");expect(explainWeather(undefined)).toBe("");expect(explainWeather("-RA BR")).toBe("light rain, mist");});
