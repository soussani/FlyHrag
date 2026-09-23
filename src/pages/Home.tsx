import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  Globe2,
  ShieldCheck,
  PlaneTakeoff,
} from "lucide-react";
import { useFlights, useSettings } from "../app/context";
import { AddButton, Empty, FlightCard, PageTitle } from "../components/UI";
import { completed } from "../utils/flights";
export default function Home() {
  const flights = useFlights(),
    { settings } = useSettings();
  const active = flights.filter((f) => f.status === "Airborne");
  const upcoming = flights
    .filter(
      (f) =>
        !completed(f) &&
        f.status !== "Cancelled" &&
        f.status !== "Airborne" &&
        Date.parse(f.scheduledDeparture) >= Date.now(),
    )
    .reverse();
  const recent = flights.filter(completed).slice(0, 3);
  const other = flights.filter(
    (f) =>
      !completed(f) &&
      f.status !== "Cancelled" &&
      f.status !== "Airborne" &&
      Date.parse(f.scheduledDeparture) < Date.now(),
  );
  return (
    <>
      <PageTitle
        eyebrow={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        title="Your journeys"
        action={
          <Link
            className="icon-button"
            to="/notifications"
            aria-label="Notifications"
          >
            <Bell size={21} />
          </Link>
        }
      />
      <div className="welcome-line">
        <span>Good to see you, {settings.name}.</span>
        <AddButton />
      </div>
      {!flights.length ? (
        <div className="home-empty panel">
          <div className="boarding-heading">
            <span>
              <PlaneTakeoff size={18} /> YOUR NEXT CHAPTER
            </span>
            <span>01 / ∞</span>
          </div>
          <Empty
            title="A world of journeys ahead."
            detail="Add your next flight or bring your past adventures along. Your personal flight companion starts here."
            action={<AddButton />}
          />
          <div className="ticket-footer">
            <ShieldCheck size={16} />
            <span>Private by default. Saved on your device.</span>
          </div>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <div className="section-heading">
                <h2>In the air</h2>
                <span className="caption">Saved status</span>
              </div>
              {active.map((f) => (
                <FlightCard key={f.id} flight={f} featured />
              ))}
            </section>
          )}
          {upcoming.length > 0 && (
            <section>
              <div className="section-heading">
                <h2>Next departure</h2>
                <span className="caption">{upcoming.length} upcoming</span>
              </div>
              <FlightCard flight={upcoming[0]} featured />
              {upcoming.slice(1).map((f) => (
                <FlightCard key={f.id} flight={f} />
              ))}
            </section>
          )}
          {other.length > 0 && (
            <section>
              <h2>Awaiting an update</h2>
              <p className="caption">
                Scheduled times have passed. Status stays as recorded until you
                update it.
              </p>
              {other.map((f) => (
                <FlightCard key={f.id} flight={f} />
              ))}
            </section>
          )}
          {recent.length > 0 && (
            <section>
              <div className="section-heading">
                <h2>Recently landed</h2>
                <Link to="/passport" className="text-link">
                  View history <ArrowUpRight size={15} />
                </Link>
              </div>
              {recent.map((f) => (
                <FlightCard key={f.id} flight={f} />
              ))}
            </section>
          )}
          {flights
            .filter((f) => f.status === "Cancelled")
            .map((f) => (
              <FlightCard key={f.id} flight={f} />
            ))}
        </>
      )}
      <div className="home-links">
        <Link to="/passport">
          <div className="link-icon">
            <Globe2 size={24} />
          </div>
          <h3>Your flying story</h3>
          <p>Every journey, one Passport.</p>
          <ArrowUpRight size={20} />
        </Link>
        <Link to="/airports">
          <div className="link-icon">
            <PlaneTakeoff size={24} />
          </div>
          <h3>Explore airports</h3>
          <p>Find your next point of departure.</p>
          <ArrowUpRight size={20} />
        </Link>
      </div>
      <div className="footnote">
        <span className="brand-small">FH</span> THE WORLD, A FLIGHT AT A TIME
      </div>
    </>
  );
}
