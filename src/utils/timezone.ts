import { Temporal } from "@js-temporal/polyfill";
export function toUTC(local: string, tz: string): string {
  if (!local) return "";
  return Temporal.PlainDateTime.from(local)
    .toZonedDateTime(tz, { disambiguation: "reject" })
    .toInstant()
    .toString();
}
