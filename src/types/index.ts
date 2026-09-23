export interface Airport {
  id: string;
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryName: string;
  lat: number;
  lon: number;
  elevation: number | null;
  tz: string;
  type: string;
}
export const statuses = [
  "Scheduled",
  "Aircraft Identified",
  "Delayed",
  "Airborne",
  "Landed",
  "Completed",
  "Cancelled",
  "Unknown",
] as const;
export type Status = (typeof statuses)[number];
export interface Flight {
  id: string;
  airline: string;
  number: string;
  origin: Airport;
  destination: Airport;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture: string;
  actualArrival: string;
  estimatedDeparture: string;
  estimatedArrival: string;
  model: string;
  registration: string;
  icao24: string;
  evidence: string;
  seat: string;
  cabin: string;
  status: Status;
  notes: string;
  createdAt: string;
  updatedAt: string;
  source: "user";
}
export interface Position {
  key: string;
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  verticalRate: number | null;
  onGround: boolean | null;
  timestamp: number;
  fetchedAt: number;
  imported?: boolean;
  source: "OpenSky" | "adsb.fi";
}
export interface Alert {
  id: string;
  title: string;
  detail: string;
  date: string;
  read: boolean;
  flightId?: string;
}
export interface Preference {
  key: string;
  value: unknown;
}
export interface ImportLog {
  id: string;
  date: string;
  added: number;
  duplicates: number;
  errors: number;
}
export interface CacheRecord {
  key: string;
  value: unknown;
  updatedAt: number;
}
export interface Settings {
  name: string;
  theme: "system" | "light" | "dark";
  timeFormat: "24" | "12";
  distance: "km" | "mi" | "nm";
  speed: "kt" | "km/h";
  altitude: "ft" | "m";
  follow: boolean;
  routes: boolean;
  refresh: number;
  alerts: boolean;
  browserAlerts: boolean;
  mapAppearance: "standard" | "muted";
}
export const defaults: Settings = {
  name: "Hrag",
  theme: "system",
  timeFormat: "24",
  distance: "km",
  speed: "kt",
  altitude: "ft",
  follow: false,
  routes: true,
  refresh: 300,
  alerts: true,
  browserAlerts: false,
  mapAppearance: "standard",
};
