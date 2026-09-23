import { useQuery } from "@tanstack/react-query";
import type { Airport } from "../types";
export async function loadAirports(): Promise<Airport[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/airports.json`);
  if (!response.ok)
    throw new Error(
      "Airport database could not be loaded. Connect once to download it for offline use.",
    );
  return response.json();
}
export function useAirports() {
  return useQuery({
    queryKey: ["airports"],
    queryFn: loadAirports,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
const indexes = new WeakMap<
  Airport[],
  { airport: Airport; text: string; codes: string[] }[]
>();
export function searchAirports(all: Airport[], query: string) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  let index = indexes.get(all);
  if (!index) {
    index = all.map((airport) => ({
      airport,
      text: [
        airport.iata,
        airport.icao,
        airport.id,
        airport.name,
        airport.city,
        airport.country,
        airport.countryName,
      ]
        .join("\n")
        .toLocaleLowerCase(),
      codes: [airport.iata, airport.icao, airport.id].map((v) =>
        v.toLocaleLowerCase(),
      ),
    }));
    indexes.set(all, index);
  }
  return index
    .filter((item) => item.text.includes(q))
    .sort(
      (a, b) =>
        Number(b.codes.includes(q)) - Number(a.codes.includes(q)) ||
        Number(b.airport.type === "large_airport") -
          Number(a.airport.type === "large_airport"),
    )
    .slice(0, 35)
    .map((item) => item.airport);
}
