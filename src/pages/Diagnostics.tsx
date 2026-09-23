import { useEffect, useState } from "react";
import { db } from "../database/db";
import { PageTitle, Notice } from "../components/UI";
declare const __BUILD_COMMIT__: string;
declare const __BUILD_DATE__: string;
export default function Diagnostics() {
  const [info, setInfo] = useState<Record<string, string>>({});
  async function inspect() {
    try {
      const storage = await navigator.storage?.estimate?.();
      const reg = await navigator.serviceWorker?.getRegistration();
      const keys = "caches" in window ? await caches.keys() : [];
      const metadata = await fetch(
        `${import.meta.env.BASE_URL}data/airports-meta.json`,
      ).then((r) => r.json());
      const weather = await fetch(
        `${import.meta.env.BASE_URL}data/weather.json`,
      ).then((r) => r.json());
      setInfo({
        Version: "1.0.0",
        Build: __BUILD_DATE__,
        Commit: __BUILD_COMMIT__,
        "Deployment URL": location.origin + import.meta.env.BASE_URL,
        "Base path": import.meta.env.BASE_URL,
        "PWA display": matchMedia("(display-mode: standalone)").matches
          ? "Standalone"
          : "Browser tab",
        "Service worker": reg?.active?.state || "Not active",
        "Service worker scope": reg?.scope || "Unavailable",
        IndexedDB: db.isOpen() ? "Open, schema 2" : "Closed",
        "Flight records": String(await db.flights.count()),
        "Cache names": keys.join(", ") || "None",
        "Storage usage": `${((storage?.usage || 0) / 1048576).toFixed(1)} MB`,
        "Storage quota": `${((storage?.quota || 0) / 1048576).toFixed(0)} MB`,
        Network: navigator.onLine ? "Online" : "Offline",
        "Airport database": `${metadata.count} · ${metadata.fetchedAt}`,
        "Weather snapshot": weather.fetchedAt || "Unavailable",
        "Aircraft observations": String(await db.positions.count()),
      });
    } catch (e) {
      setInfo({ Error: String(e) });
    }
  }
  useEffect(() => {
    void inspect();
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="UNDER THE WING"
        title="Diagnostics"
        back="/settings"
        action={
          <button className="text-button" onClick={inspect}>
            Refresh
          </button>
        }
      />
      <section className="panel">
        <dl className="diagnostics">
          {Object.entries(info).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Notice>
        Data-source availability: airport lookup is bundled; weather is a
        periodic static snapshot; adsb.fi is queried per identified aircraft. A
        successful app build does not guarantee upstream API access.
      </Notice>
    </>
  );
}
