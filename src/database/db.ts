import Dexie, { type Table } from "dexie";
import type {
  Flight,
  Position,
  Alert,
  Preference,
  ImportLog,
  CacheRecord,
} from "../types";
export class FlyDatabase extends Dexie {
  flights!: Table<Flight, string>;
  positions!: Table<Position, string>;
  preferences!: Table<Preference, string>;
  favorites!: Table<{ id: string }, string>;
  alerts!: Table<Alert, string>;
  imports!: Table<ImportLog, string>;
  cache!: Table<CacheRecord, string>;
  constructor(name = "FlyHrag") {
    super(name);
    this.version(1).stores({
      flights: "id,scheduledDeparture,status",
      preferences: "key",
      favorites: "id",
    });
    this.version(2).stores({
      positions: "key,icao24,timestamp",
      alerts: "id,date",
      imports: "id,date",
      cache: "key",
    });
  }
}
export const db = new FlyDatabase();
