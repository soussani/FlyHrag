import { PageTitle } from "../components/UI";
export default function About() {
  return (
    <>
      <PageTitle
        eyebrow="YOUR PERSONAL FLIGHT COMPANION"
        title="FlyHrag"
        back="/settings"
      />
      <section className="panel">
        <img
          className="about-mark"
          src={`${import.meta.env.BASE_URL}icons/mark.svg`}
          alt="FlyHrag monogram"
        />
        <h2>The world, a flight at a time.</h2>
        <p>
          An original, personal educational aviation PWA. Your flights and
          history remain in this browser’s IndexedDB. There is no account,
          automatic cross-device sync, advertising or analytics.
        </p>
        <p>
          For iPhone: open the deployed HTTPS site in Safari, tap Share, then
          Add to Home Screen. Open once online to cache the app and airport
          directory.
        </p>
        <p>
          Export regular JSON backups. iOS may remove browser data under storage
          pressure. Map tiles require connectivity; saved flights, Passport and
          airport lookup work offline after installation.
        </p>
      </section>
      <section className="panel">
        <h2>Data sources & attribution</h2>
        <p>
          <a href="https://ourairports.com/data/">OurAirports</a>: public-domain
          airport directory.
        </p>
        <p>
          <a href="https://github.com/evansiroky/node-geo-tz">geo-tz</a> and{" "}
          <a href="https://github.com/evansiroky/timezone-boundary-builder">
            timezone-boundary-builder
          </a>
          : geographic IANA time zones; boundary data under ODbL.
        </p>
        <p>
          <a href="https://adsb.fi/">adsb.fi</a>: aircraft observations, subject
          to coverage, access and quotas. Not an airline schedule service.
        </p>
        <p>
          <a href="https://aviationweather.gov/data/api/">
            AviationWeather.gov
          </a>
          : official METAR and TAF snapshots for configured public airports.
        </p>
        <p>
          <a href="https://www.openstreetmap.org/copyright">
            OpenStreetMap contributors
          </a>
          : map data under ODbL. Tiles follow the OSM tile usage policy.
        </p>
      </section>
      <section className="panel">
        <h2>Honest by design</h2>
        <p>
          OpenSky was evaluated; its adapter and history queries remain disabled
          unless the repository owner obtains prior written permission for
          operational use and explicitly enables the build flag. No paid
          dependency is required.
        </p>
        <p>
          Unknown data stays unknown. Flight statuses and aircraft assignments
          are user-entered. Observed aircraft positions are labeled with source
          and timestamp. Routes are great-circle approximations, not filed or
          actual flight paths.
        </p>
        <p>
          Official airline schedules, gates, automatic aircraft assignment,
          delay predictions, terminal rules, aircraft changes and reliable
          closed-app push are unavailable in this architecture. Use your airline
          and airport for operational travel decisions.
        </p>
      </section>
    </>
  );
}
