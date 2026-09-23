import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { saveFlight } from "../services/records";
import { statuses, type Airport, type Flight } from "../types";
import { toLocal } from "../utils/flights";
import { toUTC } from "../utils/timezone";
import AirportInput from "../components/AirportInput";
import { ErrorText, Notice, PageTitle } from "../components/UI";
export default function FlightForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const saved = useLiveQuery(
    async () => (id ? await db.flights.get(id) : undefined),
    [id],
  );
  if (id && !saved) return <Notice>Loading flight…</Notice>;
  return (
    <Editor
      key={id || "new"}
      flight={saved}
      historical={params.has("historical")}
    />
  );
}
function Editor({
  flight,
  historical,
}: {
  flight?: Flight;
  historical: boolean;
}) {
  const nav = useNavigate();
  const [origin, setOrigin] = useState<Airport | undefined>(flight?.origin),
    [destination, setDestination] = useState<Airport | undefined>(
      flight?.destination,
    );
  const [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("Manual entry");
  const [lookup, setLookup] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const data = new FormData(e.currentTarget),
      str = (k: string) => String(data.get(k) || "").trim();
    try {
      if (!origin || !destination)
        throw new Error("Choose both airports from the search results.");
      const now = new Date().toISOString();
      const convert = (field: string, tz: string) => {
        const value = str(field);
        if (!value) return "";
        if (ambiguous && !/(Z|[+-]\d\d:\d\d)$/.test(value))
          throw new Error(
            "ISO timestamps must include Z or an explicit UTC offset.",
          );
        return ambiguous ? new Date(value).toISOString() : toUTC(value, tz);
      };
      const f: Flight = {
        id: flight?.id || crypto.randomUUID(),
        airline: str("airline"),
        number: str("number").toUpperCase(),
        origin,
        destination,
        scheduledDeparture: convert("scheduledDeparture", origin.tz),
        scheduledArrival: convert("scheduledArrival", destination.tz),
        actualDeparture: convert("actualDeparture", origin.tz),
        actualArrival: convert("actualArrival", destination.tz),
        estimatedDeparture: convert("estimatedDeparture", origin.tz),
        estimatedArrival: convert("estimatedArrival", destination.tz),
        model: str("model"),
        registration: str("registration").toUpperCase(),
        icao24: str("icao24").toLowerCase(),
        evidence: str("evidence"),
        seat: str("seat"),
        cabin: str("cabin"),
        status: str("status") as Flight["status"],
        notes: str("notes"),
        source: "user",
        createdAt: flight?.createdAt || now,
        updatedAt: now,
      };
      await saveFlight(f);
      nav(`/flight/${f.id}`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const field = (
    name: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={String(flight?.[name as keyof Flight] || "")}
        maxLength={name === "notes" ? 10000 : 500}
      />
    </label>
  );
  const timeField = (
    key:
      | "scheduledDeparture"
      | "scheduledArrival"
      | "actualDeparture"
      | "actualArrival"
      | "estimatedDeparture"
      | "estimatedArrival",
    label: string,
    required = false,
  ) => {
    const tz = key.includes("Departure") ? origin?.tz : destination?.tz;
    return (
      <label key={`${key}:${ambiguous}`}>
        {label}
        <input
          aria-label={label}
          name={key}
          type={ambiguous ? "text" : "datetime-local"}
          required={required}
          defaultValue={
            flight?.[key]
              ? ambiguous
                ? flight[key]
                : toLocal(flight[key], tz || "UTC")
              : ""
          }
          placeholder={ambiguous ? "2026-11-01T01:30:00-04:00" : undefined}
        />
        <small>
          {ambiguous
            ? "Include Z or UTC offset"
            : tz || "Choose an airport first"}
        </small>
      </label>
    );
  };
  return (
    <>
      <PageTitle
        eyebrow={historical ? "YOUR AVIATION HISTORY" : "YOUR ITINERARY"}
        title={
          flight
            ? "Edit flight"
            : historical
              ? "Add a past flight"
              : "Add a flight"
        }
        back={flight ? `/flight/${flight.id}` : "/"}
      />
      {!flight && (
        <>
          <div className="segmented">
            {["Manual entry", "Flight number", "Route"].map((v) => (
              <button
                key={v}
                className={mode === v ? "selected" : ""}
                onClick={() => {
                  setMode(v);
                  setLookup(false);
                }}
              >
                {v}
              </button>
            ))}
          </div>
          {mode !== "Manual entry" && (
            <section className="panel">
              <h2>
                {mode === "Flight number"
                  ? "Search a commercial flight"
                  : "Find a route"}
              </h2>
              <p>
                Free sources do not reliably resolve commercial schedules. Enter
                your ticket details below to save a verified personal record.
              </p>
              <button
                className="button secondary"
                onClick={() => setLookup(true)}
              >
                Check lookup availability
              </button>
              {lookup && (
                <Notice>
                  Automatic commercial schedule lookup is unavailable. Manual
                  entry supports any flight number and date.
                </Notice>
              )}
            </section>
          )}
        </>
      )}
      <form onSubmit={submit}>
        <section className="panel form-grid">
          <h2 className="full">Flight essentials</h2>
          {field("number", "Flight number", "text", true)}
          {field("airline", "Airline")}
          <AirportInput
            label="Departure airport"
            value={origin}
            onChange={setOrigin}
          />
          <AirportInput
            label="Arrival airport"
            value={destination}
            onChange={setDestination}
          />
          {timeField("scheduledDeparture", "Scheduled departure", true)}
          {timeField("scheduledArrival", "Scheduled arrival", true)}
          <p className="caption full">
            Use the local date and time at each airport. For overnight flights,
            set the arrival date explicitly. Time zones come from geographic
            boundaries.
          </p>
          <label>
            Status
            <select
              name="status"
              defaultValue={
                flight?.status || (historical ? "Completed" : "Scheduled")
              }
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Cabin class
            <select name="cabin" defaultValue={flight?.cabin || ""}>
              {["", "Economy", "Premium economy", "Business", "First"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c || "Not recorded"}
                  </option>
                ),
              )}
            </select>
          </label>
        </section>
        <details className="panel" open={!!flight}>
          <summary>Times, aircraft & personal details</summary>
          <div className="form-grid">
            {timeField("actualDeparture", "Actual departure")}
            {timeField("actualArrival", "Actual arrival")}
            {timeField("estimatedDeparture", "Estimated departure")}
            {timeField("estimatedArrival", "Estimated arrival")}
            {field("model", "Aircraft model")}
            {field("registration", "Registration")}
            {field("seat", "Seat")}
            {field("icao24", "ICAO24 transponder address")}
            <label className="full">
              Aircraft association evidence
              <input
                name="evidence"
                defaultValue={flight?.evidence}
                maxLength={2000}
              />
              <small>
                Record your source tying this specific aircraft to this flight.
                A flight number alone is insufficient.
              </small>
            </label>
            <label className="full">
              Personal notes
              <textarea
                name="notes"
                rows={4}
                defaultValue={flight?.notes}
                maxLength={10000}
              />
            </label>
          </div>
        </details>
        <details className="panel">
          <summary>Daylight-saving time ambiguity</summary>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={ambiguous}
              onChange={(e) => setAmbiguous(e.target.checked)}
            />{" "}
            Enter ISO timestamps with explicit UTC offsets
          </label>
          <p className="caption">
            Use for repeated local hours during clock changes. Switching clears
            unsaved time inputs. Example format: YYYY-MM-DDTHH:mm:ss±HH:mm.
          </p>
        </details>
        <ErrorText error={error} />
        <Notice>
          All information on this form is saved as user-entered. Your flight
          history stays on this device.
        </Notice>
        <button
          className="button primary full-width"
          disabled={busy}
          type="submit"
        >
          {busy ? "Saving…" : flight ? "Save changes" : "Save flight"}
        </button>
      </form>
    </>
  );
}
