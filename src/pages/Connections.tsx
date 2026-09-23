import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFlights } from "../app/context";
import { connection } from "../utils/flights";
import { PageTitle, Notice, StatusBadge } from "../components/UI";
export default function Connections() {
  const flights = useFlights(),
    [params] = useSearchParams();
  const [first, setFirst] = useState(params.get("flight") || ""),
    [second, setSecond] = useState("");
  const [buffers, setBuffers] = useState({
    deplane: 10,
    walk: 15,
    reclaim: 0,
    recheck: 0,
    cutoff: 30,
  });
  const [baggage, setBaggage] = useState(false);
  const [gates, setGates] = useState({
    arrival: "",
    departure: "",
    arrivalTerminal: "",
    departureTerminal: "",
  });
  const a = flights.find((f) => f.id === first);
  const candidates = flights.filter(
    (f) =>
      a &&
      f.id !== a.id &&
      f.origin.id === a.destination.id &&
      Date.parse(f.scheduledDeparture) > Date.parse(a.scheduledArrival) &&
      Date.parse(f.scheduledDeparture) - Date.parse(a.scheduledArrival) <
        48 * 3600000 &&
      f.status !== "Cancelled",
  );
  const b = candidates.find((f) => f.id === second) || candidates[0];
  const buffer =
    buffers.deplane +
    buffers.walk +
    buffers.cutoff +
    (baggage ? buffers.reclaim + buffers.recheck : 0);
  const result = a && b ? connection(a, b, buffer) : null;
  return (
    <>
      <PageTitle
        eyebrow="MAKE YOUR NEXT DEPARTURE"
        title="Connection assistant"
        back={a ? `/flight/${a.id}` : "/"}
      />
      <section className="panel form-grid">
        <label className="full">
          Arriving flight
          <select
            value={first}
            onChange={(e) => {
              setFirst(e.target.value);
              setSecond("");
            }}
          >
            <option value="">Choose a flight</option>
            {flights.map((f) => (
              <option key={f.id} value={f.id}>
                {f.number} · {f.origin.iata} → {f.destination.iata}
              </option>
            ))}
          </select>
        </label>
        <label className="full">
          Connecting departure
          <select
            value={b?.id || ""}
            onChange={(e) => setSecond(e.target.value)}
          >
            <option value="">Choose a connection</option>
            {candidates.map((f) => (
              <option key={f.id} value={f.id}>
                {f.number} · {f.origin.iata} → {f.destination.iata}
              </option>
            ))}
          </select>
        </label>
        <label>
          Arrival gate
          <input
            placeholder="Not recorded"
            value={gates.arrival}
            onChange={(e) => setGates({ ...gates, arrival: e.target.value })}
          />
        </label>
        <label>
          Departure gate
          <input
            placeholder="Not recorded"
            value={gates.departure}
            onChange={(e) => setGates({ ...gates, departure: e.target.value })}
          />
        </label>
        <label>
          Arrival terminal
          <input
            value={gates.arrivalTerminal}
            onChange={(e) =>
              setGates({ ...gates, arrivalTerminal: e.target.value })
            }
          />
        </label>
        <label>
          Departure terminal
          <input
            value={gates.departureTerminal}
            onChange={(e) =>
              setGates({ ...gates, departureTerminal: e.target.value })
            }
          />
        </label>
        <label className="switch-row full">
          <input
            type="checkbox"
            checked={baggage}
            onChange={(e) => setBaggage(e.target.checked)}
          />{" "}
          Include checked baggage reclaim and recheck
        </label>
        {Object.entries(buffers)
          .filter(([k]) => baggage || !["reclaim", "recheck"].includes(k))
          .map(([k, v]) => (
            <label key={k}>
              {
                {
                  deplane: "Deplaning",
                  walk: "Walking / transfer",
                  reclaim: "Baggage reclaim",
                  recheck: "Baggage recheck",
                  cutoff: "Boarding cutoff",
                }[k]
              }{" "}
              (min)
              <input
                type="number"
                min="0"
                max="1440"
                value={v}
                onChange={(e) =>
                  setBuffers({
                    ...buffers,
                    [k]: Math.max(0, Math.min(1440, Number(e.target.value))),
                  })
                }
              />
            </label>
          ))}
      </section>
      {result ? (
        <section className="panel">
          <div className="section-heading">
            <h2>Transfer at {a!.destination.iata}</h2>
            <StatusBadge status={result.rating} />
          </div>
          <dl className="data-grid">
            <div>
              <dt>Scheduled connection</dt>
              <dd>{Math.round(result.scheduled)} min</dd>
            </div>
            <div>
              <dt>Updated connection</dt>
              <dd>{Math.round(result.updated)} min</dd>
            </div>
            <div>
              <dt>Your transfer allowance</dt>
              <dd>{buffer} min</dd>
            </div>
            <div>
              <dt>Remaining margin</dt>
              <dd>{Math.round(result.available)} min</dd>
            </div>
          </dl>
          <p className="caption">
            Arrival: gate {gates.arrival || "unknown"}, terminal{" "}
            {gates.arrivalTerminal || "unknown"} → Departure: gate{" "}
            {gates.departure || "unknown"}, terminal{" "}
            {gates.departureTerminal || "unknown"}. User-entered session notes.
          </p>
          <ol className="timeline">
            {Object.entries(buffers)
              .filter(([k]) => baggage || !["reclaim", "recheck"].includes(k))
              .map(([k, v]) => (
                <li className="recorded" key={k}>
                  <span>{k}</span>
                  <strong>{v} min · assumption</strong>
                </li>
              ))}
          </ol>
          <p className="caption">
            UTC instants account for time-zone differences. Updated time uses
            actual, then estimated, then scheduled times. Margin = updated
            connection − your allowances. Below 0: at risk; below 30: tight;
            below 90: normal; otherwise relaxed.
          </p>
        </section>
      ) : (
        <Notice>
          Insufficient information. Choose consecutive flights at the same
          airport within 48 hours; cancelled flights cannot form a connection.
        </Notice>
      )}
      <Notice>
        These are your planning assumptions, not airport minimum connection
        times. Gates are session notes. Immigration, visas and terminal
        requirements are not inferred. A connection is never guaranteed.
      </Notice>
    </>
  );
}
