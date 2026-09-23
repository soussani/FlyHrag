export interface Metar {
  icaoId: string;
  rawOb: string;
  obsTime: number;
  temp?: number;
  dewp?: number;
  wdir?: number | string;
  wspd?: number;
  visib?: string | number;
  altim?: number;
  wxString?: string | null;
  fltCat?: string;
}
export interface Taf {
  icaoId: string;
  rawTAF: string;
  validTimeFrom?: number;
  validTimeTo?: number;
  fcsts?: {
    timeFrom: number;
    timeTo: number;
    wdir?: number | string;
    wspd?: number;
    visib?: string | number;
    wxString?: string | null;
  }[];
}
export interface WeatherSnapshot {
  fetchedAt: string | null;
  source: string;
  metars: Metar[];
  tafs: Taf[];
  stations: string[];
  errors?: string[];
}
export async function getWeather(): Promise<WeatherSnapshot> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/weather.json`);
  if (!r.ok) throw new Error("Weather snapshot unavailable.");
  const data = await r.json();
  if (!Array.isArray(data.metars) || !Array.isArray(data.tafs))
    throw new Error("Invalid weather snapshot.");
  return data;
}
export function explainWeather(code: string | null | undefined = "") {
  code = typeof code === "string" ? code : "";
  const meanings: Record<string, string> = {
    RA: "rain",
    SN: "snow",
    TS: "thunderstorm",
    FG: "fog",
    BR: "mist",
    SH: "showers",
    DZ: "drizzle",
    HZ: "haze",
    FZ: "freezing",
    GR: "hail",
  };
  return code
    .split(" ")
    .map((part) => {
      const intensity = part.startsWith("-")
        ? "light "
        : part.startsWith("+")
          ? "heavy "
          : "";
      return (
        intensity +
        (part.replace(/^[+-]/, "").match(/.{1,2}/g) || [])
          .map((t) => meanings[t] || t)
          .join(" ")
      );
    })
    .join(", ");
}
