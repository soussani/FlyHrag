import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { PageTitle, Notice } from "../components/UI";
export default function Timeline() {
  const { id } = useParams(),
    f = useLiveQuery(() => db.flights.get(id!), [id]);
  if (!f) return <Notice>Loading flight…</Notice>;
  const events = [
    ["Scheduled departure", f.scheduledDeparture, "User-entered"],
    ["Check-in", "", "Unavailable"],
    [
      "Aircraft identified",
      f.icao24 ? f.updatedAt : "",
      f.icao24 ? "User-entered assignment (last edit)" : "Unavailable",
    ],
    ["Inbound departure", "", "Unavailable"],
    ["Inbound landing", "", "Unavailable"],
    ["Boarding", "", "Unavailable"],
    ["Departure", f.actualDeparture, "User-entered"],
    ["Taxiing", "", "Unavailable"],
    ["Takeoff", "", "Unavailable"],
    [
      "Airborne",
      "",
      f.status === "Airborne"
        ? "User-entered status; timestamp unavailable"
        : "Unavailable",
    ],
    ["Landing", "", "Unavailable"],
    ["Arrival", f.actualArrival, "User-entered"],
    [
      "Completed",
      "",
      f.status === "Completed"
        ? "User-entered status; timestamp unavailable"
        : "Unavailable",
    ],
  ];
  return (
    <>
      <PageTitle
        eyebrow={f.number}
        title="Flight timeline"
        back={`/flight/${id}`}
      />
      <section className="panel">
        <ol className="timeline expanded">
          {events.map(([name, t, source]) => (
            <li key={name} className={t ? "recorded" : ""}>
              <div>
                <strong>{name}</strong>
                <small>{source}</small>
              </div>
              <span>{t ? new Date(t).toLocaleString() : "—"}</span>
            </li>
          ))}
        </ol>
        <p className="caption">
          Times shown in your device time zone. A scheduled time passing does
          not confirm an operational event.
        </p>
      </section>
    </>
  );
}
