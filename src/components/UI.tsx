import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Plane, Plus } from "lucide-react";
import { useSettings } from "../app/context";
import type { Flight } from "../types";
import { time, date, delay } from "../utils/flights";
export function PageTitle({
  eyebrow,
  title,
  action,
  back,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  back?: string;
}) {
  return (
    <header className="page-title">
      {back && (
        <Link className="icon-button back" to={back} aria-label="Go back">
          <ArrowLeft size={20} />
        </Link>
      )}
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}
export function Empty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Plane size={32} strokeWidth={1.3} />
      </div>
      <h2>{title}</h2>
      <p>{detail}</p>
      {action}
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`notice ${error ? "error" : ""}`}
    >
      {children}
    </div>
  );
}
export function AddButton() {
  return (
    <Link to="/add" className="button primary">
      <Plus size={18} /> Add flight
    </Link>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${["Completed", "Landed"].includes(status) ? "success" : status === "Cancelled" ? "danger" : status === "Delayed" ? "warning" : ""}`}
    >
      {status}
    </span>
  );
}
export function FlightCard({
  flight: f,
  featured = false,
}: {
  flight: Flight;
  featured?: boolean;
}) {
  const { settings } = useSettings();
  const d = delay(f, "Departure");
  return (
    <Link
      to={`/flight/${f.id}`}
      className={`flight-card ${featured ? "featured" : ""}`}
    >
      <div className="card-top">
        <span className="airline-mark">
          <Plane size={16} />
        </span>
        <div>
          <strong>{f.airline || "Personal flight"}</strong>
          <small>
            {f.number} · {date(f.scheduledDeparture, f.origin.tz)}
          </small>
        </div>
        <StatusBadge status={f.status} />
      </div>
      <div className="route">
        <div>
          <h2>{f.origin.iata || f.origin.id}</h2>
          <span>{f.origin.city || f.origin.name}</span>
        </div>
        <div className="route-line">
          <i />
          <Plane size={23} />
          <i />
        </div>
        <div>
          <h2>{f.destination.iata || f.destination.id}</h2>
          <span>{f.destination.city || f.destination.name}</span>
        </div>
      </div>
      <div className="flight-times">
        <div>
          <strong>
            {time(
              f.actualDeparture || f.estimatedDeparture || f.scheduledDeparture,
              f.origin.tz,
              settings.timeFormat === "12",
            )}
          </strong>
          <small>Departure · local</small>
        </div>
        <div>
          <strong>
            {time(
              f.actualArrival || f.estimatedArrival || f.scheduledArrival,
              f.destination.tz,
              settings.timeFormat === "12",
            )}
          </strong>
          <small>Arrival · local</small>
        </div>
      </div>
      <div className="card-bottom">
        <span>
          {d && d > 0
            ? `${d} min departure delay`
            : "User-entered flight record"}
        </span>
        <ArrowUpRight size={17} />
      </div>
    </Link>
  );
}
export function Metric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="metric" onClick={onClick} disabled={!onClick}>
      <strong>{value}</strong>
      <span>
        {label}
        {onClick && <ArrowUpRight size={13} />}
      </span>
    </button>
  );
}
export function ErrorText({ error }: { error: unknown }) {
  return error ? (
    <Notice error>
      {error instanceof Error ? error.message : String(error)}
    </Notice>
  ) : null;
}
