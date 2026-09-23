import { createContext, useContext, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../database/db";
import { defaults, type Settings } from "../types";
const Context = createContext<{
  settings: Settings;
  set: (patch: Partial<Settings>) => Promise<void>;
}>({ settings: defaults, set: async () => {} });
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const record = useLiveQuery(() => db.preferences.get("settings"));
  const settings = { ...defaults, ...(record?.value as Partial<Settings>) };
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);
  return (
    <Context.Provider
      value={{
        settings,
        set: async (patch) => {
          const current = await db.preferences.get("settings");
          await db.preferences.put({
            key: "settings",
            value: {
              ...defaults,
              ...(current?.value as Partial<Settings>),
              ...patch,
            },
          });
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSettings = () => useContext(Context);
export function useFlights() {
  return useLiveQuery(
    () => db.flights.orderBy("scheduledDeparture").reverse().toArray(),
    [],
    [],
  );
}
export function useOnline() {
  const [online, setOnline] = ReactUseState(navigator.onLine);
  useEffect(() => {
    const fn = () => setOnline(navigator.onLine);
    window.addEventListener("online", fn);
    window.addEventListener("offline", fn);
    return () => {
      window.removeEventListener("online", fn);
      window.removeEventListener("offline", fn);
    };
  }, []);
  return online;
}
import { useState as ReactUseState } from "react";
