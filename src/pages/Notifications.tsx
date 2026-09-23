import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { PageTitle, Empty } from "../components/UI";
export default function Notifications() {
  const alerts = useLiveQuery(
    () => db.alerts.orderBy("date").reverse().toArray(),
    [],
    [],
  );
  return (
    <>
      <PageTitle
        eyebrow="FLIGHT UPDATES"
        title="Notifications"
        back="/"
        action={
          <button
            className="text-button"
            onClick={() => db.alerts.toCollection().modify({ read: true })}
          >
            Mark all read
          </button>
        }
      />
      {alerts.length ? (
        alerts.map((a) => (
          <article
            key={a.id}
            className={`panel notification ${!a.read ? "unread" : ""}`}
          >
            <h2>{a.title}</h2>
            <p>{a.detail}</p>
            <small>{new Date(a.date).toLocaleString()}</small>
            {a.flightId && (
              <Link
                className="text-link"
                to={`/flight/${a.flightId}`}
                onClick={() => db.alerts.update(a.id, { read: true })}
              >
                View flight
              </Link>
            )}
          </article>
        ))
      ) : (
        <Empty
          title="All quiet for now."
          detail="Meaningful changes to your saved records and associated aircraft observations will appear here while you use FlyHrag."
        />
      )}
      <p className="caption">
        No remote push service is connected. Closing FlyHrag stops update
        detection.
      </p>
    </>
  );
}
