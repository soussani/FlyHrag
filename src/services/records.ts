import { db } from "../database/db";
import { defaults, type Flight, type Settings, type Alert } from "../types";
import { fingerprint, validateFlight, delay } from "../utils/flights";
export async function getSettings(): Promise<Settings> {
  return {
    ...defaults,
    ...((await db.preferences.get("settings"))?.value as Partial<Settings>),
  };
}
export async function notify(
  id: string,
  title: string,
  detail: string,
  flightId?: string,
) {
  const prefs = await getSettings();
  if (!prefs.alerts) return;
  const item: Alert = {
    id,
    title,
    detail,
    flightId,
    date: new Date().toISOString(),
    read: false,
  };
  const added = await db.transaction("rw", db.alerts, async () => {
    if (await db.alerts.get(id)) return false;
    await db.alerts.add(item);
    return true;
  });
  if (
    added &&
    prefs.browserAlerts &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.showNotification(title, { body: detail, tag: id });
    } catch {
      /* In-app history remains available when system notifications are unsupported. */
    }
  }
}
export async function saveFlight(f: Flight) {
  const errors = validateFlight(f);
  if (errors.length) throw new Error(errors.join(" "));
  const old = await db.flights.get(f.id);
  await db.transaction("rw", db.flights, async () => {
    const all = await db.flights.toArray();
    if (all.some((v) => v.id !== f.id && fingerprint(v) === fingerprint(f)))
      throw new Error("This flight is already in your history.");
    await db.flights.put({ ...f, updatedAt: new Date().toISOString() });
  });
  if (old && old.status !== f.status)
    await notify(
      `${f.id}:status:${f.status}:${f.updatedAt}`,
      "Flight status changed",
      `${f.number}: ${f.status} · user-entered`,
      f.id,
    );
  if (
    old &&
    delay(old, "Departure") !== delay(f, "Departure") &&
    (delay(f, "Departure") || 0) > 0
  )
    await notify(
      `${f.id}:delay:${delay(f, "Departure")}`,
      "Departure delay updated",
      `${f.number}: ${delay(f, "Departure")} minutes · calculated from entered times`,
      f.id,
    );
}
export async function deleteFlight(id: string) {
  await db.transaction("rw", db.flights, db.alerts, async () => {
    await db.flights.delete(id);
    await db.alerts.filter((a) => a.flightId === id).delete();
  });
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
