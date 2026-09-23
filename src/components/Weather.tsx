import { useQuery } from "@tanstack/react-query";
import { CloudSun, ExternalLink } from "lucide-react";
import { getWeather, explainWeather } from "../providers/weather";
import { ErrorText } from "./UI";
export default function Weather({ icao }: { icao: string }) {
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["weather"],
    queryFn: getWeather,
    staleTime: 15 * 60000,
    retry: 1,
  });
  const metar = data?.metars.find((m) => m.icaoId === icao),
    taf = data?.tafs.find((t) => t.icaoId === icao);
  return (
    <section className="panel weather">
      <div className="section-heading">
        <h2>
          <CloudSun size={20} /> Aviation weather
        </h2>
        <button
          className="text-button"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          Refresh
        </button>
      </div>
      <ErrorText error={error} />
      {isLoading ? (
        <p>Loading weather…</p>
      ) : metar ? (
        <>
          <div className="weather-main">
            <strong>
              {metar.temp ?? "—"}°<small>C</small>
            </strong>
            <div>
              <b>{metar.fltCat || "Category unavailable"}</b>
              <p>
                {explainWeather(metar.wxString) ||
                  "No significant weather reported"}
              </p>
            </div>
          </div>
          <dl className="data-grid">
            <div>
              <dt>Wind</dt>
              <dd>
                {metar.wdir ?? "—"}° / {metar.wspd ?? "—"} kt
              </dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>{metar.visib ?? "—"} statute mi</dd>
            </div>
            <div>
              <dt>Dew point</dt>
              <dd>{metar.dewp ?? "—"} °C</dd>
            </div>
            <div>
              <dt>Pressure</dt>
              <dd>{metar.altim ?? "—"} hPa</dd>
            </div>
          </dl>
          <p className="caption">
            Observed {new Date(metar.obsTime * 1000).toLocaleString()} ·{" "}
            {Date.now() - metar.obsTime * 1000 > 2 * 3600000
              ? "Stale report"
              : "Recent report"}
          </p>
          <details>
            <summary>Original METAR</summary>
            <pre>{metar.rawOb}</pre>
          </details>
        </>
      ) : (
        <p className="muted">
          METAR unavailable for {icao || "this airport"}. Public snapshots cover
          a configured set of airports.
        </p>
      )}
      {taf ? (
        <details>
          <summary>TAF forecast</summary>
          <p className="caption">
            Valid{" "}
            {taf.validTimeFrom
              ? new Date(taf.validTimeFrom * 1000).toLocaleString()
              : "unavailable"}{" "}
            to{" "}
            {taf.validTimeTo
              ? new Date(taf.validTimeTo * 1000).toLocaleString()
              : "unavailable"}
          </p>
          {taf.fcsts?.map((f, i) => (
            <p key={i}>
              {new Date(f.timeFrom * 1000).toLocaleString()} —{" "}
              {new Date(f.timeTo * 1000).toLocaleString()}: wind {f.wdir ?? "—"}
              ° at {f.wspd ?? "—"} kt; visibility {f.visib ?? "—"} mi.{" "}
              {explainWeather(f.wxString)}
            </p>
          ))}
          <pre>{taf.rawTAF}</pre>
        </details>
      ) : (
        <p className="caption">TAF unavailable in this snapshot.</p>
      )}
      <p className="caption">
        AviationWeather.gov · Snapshot{" "}
        {data?.fetchedAt
          ? new Date(data.fetchedAt).toLocaleString()
          : "not downloaded"}
        . Scheduled snapshots may be delayed.
      </p>
      <a
        className="text-link"
        href={`https://aviationweather.gov/data/metar/?id=${encodeURIComponent(icao)}`}
        target="_blank"
        rel="noreferrer"
      >
        Open official weather <ExternalLink size={14} />
      </a>
    </section>
  );
}
