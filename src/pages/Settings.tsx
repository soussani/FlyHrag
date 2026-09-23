import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Download,
  Upload,
  Shield,
  Info,
  Activity,
  Star,
  Bell,
} from "lucide-react";
import { db } from "../database/db";
import { useSettings } from "../app/context";
import type { Settings as Prefs } from "../types";
import { PageTitle, Notice, ErrorText } from "../components/UI";
export default function Settings() {
  const { settings: s, set } = useSettings();
  const [message, setMessage] = useState(""),
    [error, setError] = useState<unknown>();
  const choose = (
    key: keyof Prefs,
    label: string,
    items: { value: string; label: string }[],
  ) => (
    <label className="setting-row">
      <span>{label}</span>
      <select
        value={String(s[key])}
        onChange={(e) =>
          void set({
            [key]: key === "refresh" ? Number(e.target.value) : e.target.value,
          })
        }
      >
        {items.map((i) => (
          <option key={i.value} value={i.value}>
            {i.label}
          </option>
        ))}
      </select>
    </label>
  );
  const toggle = (
    key: "follow" | "routes" | "alerts" | "browserAlerts",
    label: string,
  ) => (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={s[key]}
        onChange={(e) => void set({ [key]: e.target.checked })}
      />
    </label>
  );
  const links = [
    ["/import", "Import & restore", Upload],
    ["/export", "Export & backup", Download],
    ["/favorites", "Favorite airports", Star],
    ["/notifications", "Notification history", Bell],
    ["/diagnostics", "Diagnostics", Activity],
    ["/about", "About FlyHrag", Info],
  ] as const;
  return (
    <>
      <PageTitle eyebrow="MAKE IT YOURS" title="Settings" />
      <section className="panel">
        <h2>General</h2>
        <label className="setting-row">
          <span>Name</span>
          <input
            value={s.name}
            maxLength={50}
            onChange={(e) => void set({ name: e.target.value })}
          />
        </label>
        {choose("theme", "Appearance", [
          { value: "system", label: "Automatic" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ])}
        {choose("timeFormat", "Time format", [
          { value: "24", label: "24 hour" },
          { value: "12", label: "12 hour" },
        ])}
        {choose(
          "distance",
          "Distance",
          ["km", "mi", "nm"].map((value) => ({ value, label: value })),
        )}
        {choose(
          "speed",
          "Speed",
          ["kt", "km/h"].map((value) => ({ value, label: value })),
        )}
        {choose(
          "altitude",
          "Altitude",
          ["ft", "m"].map((value) => ({ value, label: value })),
        )}
      </section>
      <section className="panel">
        <h2>Map & tracking</h2>
        {choose("mapAppearance", "Map appearance", [
          { value: "standard", label: "Standard" },
          { value: "muted", label: "Muted" },
        ])}
        {toggle("follow", "Follow aircraft by default")}
        {toggle("routes", "Show route approximations")}
        {choose("refresh", "Aircraft refresh", [
          { value: "0", label: "Manual only" },
          { value: "300", label: "Every 5 minutes" },
          { value: "600", label: "Every 10 minutes" },
          { value: "900", label: "Every 15 minutes" },
        ])}
        <p className="caption">
          Tracking starts only when enabled on a flight screen. Completed
          flights do not poll. Provider quotas may pause updates.
        </p>
      </section>
      <section className="panel">
        <h2>Notifications</h2>
        {toggle("alerts", "Save in-app alerts")}
        {toggle("browserAlerts", "Show system notifications")}
        <button
          className="text-button"
          onClick={async () => {
            try {
              if (!("Notification" in window))
                throw new Error(
                  "System notifications are unavailable in this browser. On iPhone, install FlyHrag on the Home Screen first.",
                );
              const result = await Notification.requestPermission();
              setMessage(
                `Notification permission: ${result}. In-app history remains available.`,
              );
            } catch (e) {
              setError(e);
            }
          }}
        >
          Request notification permission
        </button>
        <p className="caption">
          Alerts work while FlyHrag is open. Closed-app remote push is not
          provided by this static PWA.
        </p>
      </section>
      <section className="panel">
        <h2>Your Passport</h2>
        {links.map(([url, label, Icon]) => (
          <Link key={url} to={url} className="row-link">
            <span>
              <Icon size={18} /> {label}
            </span>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </section>
      <section className="panel">
        <h2>
          <Shield size={19} /> Privacy & storage
        </h2>
        <p>
          Your history stays on this device. Maps contact OpenStreetMap;
          aircraft queries contact adsb.fi. There are no advertising or
          analytics SDKs.
        </p>
        <button
          className="row-link"
          onClick={async () => {
            const persisted = await navigator.storage?.persist?.();
            setMessage(
              persisted
                ? "Persistent storage granted. Keep backups anyway."
                : "Persistent storage was not granted by this browser. Export regular backups.",
            );
          }}
        >
          Request persistent storage <ArrowUpRight size={17} />
        </button>
        <button
          className="row-link"
          onClick={async () => {
            await db.transaction("rw", db.positions, db.cache, async () => {
              await db.positions.clear();
              await db.cache.clear();
            });
            if ("caches" in window) await caches.delete("flyhrag-weather");
            setMessage(
              "Aircraft and weather caches cleared. Personal flights were preserved.",
            );
          }}
        >
          Clear cached aviation data <ArrowUpRight size={17} />
        </button>
        <button
          className="text-button danger-text"
          onClick={async () => {
            if (
              window.confirm(
                "Permanently delete ALL flight history and related notifications? Export a backup first.",
              )
            ) {
              await db.transaction("rw", db.flights, db.alerts, async () => {
                await db.flights.clear();
                await db.alerts.clear();
              });
              setMessage("Flight history deleted.");
            }
          }}
        >
          Delete all flight history
        </button>
      </section>
      <ErrorText error={error} />
      {message && <Notice>{message}</Notice>}
      <p className="caption center">
        FlyHrag 1.0.0 · Made for your world of flight.
      </p>
    </>
  );
}
