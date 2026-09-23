import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Upload, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { useAirports } from "../services/airports";
import { useFlights } from "../app/context";
import {
  parseImport,
  applyImport,
  backup,
  flightsCSV,
  csvTemplate,
  type ImportPreview,
} from "../services/imports";
import { download } from "../services/records";
import { PageTitle, Notice, ErrorText } from "../components/UI";
export default function ImportExport() {
  const exportMode = useLocation().pathname === "/export";
  const { data: airports = [] } = useAirports(),
    flights = useFlights();
  const [text, setText] = useState(""),
    [kind, setKind] = useState<"csv" | "json">("csv"),
    [preview, setPreview] = useState<ImportPreview>(),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState(""),
    [restore, setRestore] = useState(true),
    [busy, setBusy] = useState(false);
  const runPreview = () => {
    setError(undefined);
    setMessage("");
    try {
      setPreview(parseImport(text, kind, airports, flights));
    } catch (e) {
      setError(e);
      setPreview(undefined);
    }
  };
  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await applyImport(preview, restore && preview.backup);
      setMessage(
        `${result.added} flights imported. ${result.duplicates} duplicates kept unchanged.`,
      );
      setPreview(undefined);
      setText("");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR DATA, ALWAYS YOURS"
        title={exportMode ? "Export & backup" : "Import flights"}
        back="/settings"
      />
      {exportMode ? (
        <>
          <section className="panel">
            <FileJson className="feature-icon" />
            <h2>Everything, in one backup.</h2>
            <p>
              Flights, preferences, favorites, saved aircraft observations and
              notification history in a portable JSON file.
            </p>
            <button
              className="button primary"
              onClick={async () => {
                try {
                  download(
                    `FlyHrag-backup-${new Date().toISOString().slice(0, 10)}.json`,
                    JSON.stringify(await backup(), null, 2),
                  );
                } catch (e) {
                  setError(e);
                }
              }}
            >
              <Download size={18} /> Download backup
            </button>
          </section>
          <section className="panel">
            <FileSpreadsheet className="feature-icon" />
            <h2>Flight records</h2>
            <p>Export {flights.length} flights as CSV or a JSON array.</p>
            <div className="button-group">
              <button
                className="button secondary"
                onClick={() =>
                  download(
                    "FlyHrag-flights.csv",
                    flightsCSV(flights),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                Export CSV
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  download(
                    "FlyHrag-flights.json",
                    JSON.stringify(flights, null, 2),
                  )
                }
              >
                Export JSON
              </button>
            </div>
          </section>
          <Notice>
            Keep backups somewhere safe. Browser storage on iOS can be removed;
            it is not permanent storage and does not synchronize between
            devices. Exported files contain your private travel history.
          </Notice>
        </>
      ) : (
        <>
          <section className="panel">
            <Upload className="feature-icon" />
            <h2>Bring your journeys along.</h2>
            <p>
              Import CSV, a JSON flight array, or a FlyHrag backup. Every row is
              checked before saving.
            </p>
            <label className="file-input">
              Choose a file
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 50 * 1024 * 1024) {
                    setError(
                      new Error(
                        "File exceeds the 50 MB import limit. Split CSV imports into smaller files.",
                      ),
                    );
                    return;
                  }
                  setText(await file.text());
                  setKind(
                    file.name.toLowerCase().endsWith(".csv") ? "csv" : "json",
                  );
                  setPreview(undefined);
                  setMessage("");
                }}
              />
            </label>
            <button
              className="text-button"
              onClick={() =>
                download("FlyHrag-import-template.csv", csvTemplate, "text/csv")
              }
            >
              Download CSV template
            </button>
          </section>
          <section className="panel">
            <div className="form-grid">
              <label>
                Format
                <select
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as "csv" | "json");
                    setPreview(undefined);
                  }}
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON / backup</option>
                </select>
              </label>
            </div>
            <label>
              Import content · editable
              <textarea
                rows={8}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setPreview(undefined);
                }}
                spellCheck={false}
              />
            </label>
            <p className="caption">
              Use airport IATA/ICAO/OurAirports identifiers. Dates must be ISO
              timestamps with Z or an explicit offset. Required columns: number,
              origin, destination, scheduledDeparture, scheduledArrival. Missing
              status becomes Unknown. Correct errors in the text above and
              preview again.
            </p>
            <button
              className="button primary"
              disabled={!text || !airports.length}
              onClick={runPreview}
            >
              Preview import
            </button>
          </section>
          {preview && (
            <section className="panel">
              <h2>Review {preview.rows.length} records</h2>
              <p>
                {
                  preview.rows.filter((r) => !r.errors.length && !r.duplicate)
                    .length
                }{" "}
                new · {preview.rows.filter((r) => r.duplicate).length}{" "}
                duplicates ·{" "}
                {preview.rows.filter((r) => r.errors.length).length} invalid
              </p>
              <div className="import-preview">
                {preview.rows.map((r) => (
                  <div
                    key={r.row}
                    className={`preview-row ${r.errors.length ? "invalid" : ""}`}
                  >
                    <strong>
                      Row {r.row} · {r.flight?.number || "Invalid record"}
                    </strong>
                    <p>
                      {r.errors.length
                        ? r.errors.join(" ")
                        : r.duplicate
                          ? "Duplicate — existing data will stay unchanged"
                          : `${r.flight?.origin.iata || r.flight?.origin.id} → ${r.flight?.destination.iata || r.flight?.destination.id}`}
                    </p>
                  </div>
                ))}
              </div>
              {preview.backup && (
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={restore}
                    onChange={(e) => setRestore(e.target.checked)}
                  />{" "}
                  Restore preferences, favorites and saved observations too
                </label>
              )}
              <Notice>
                Nothing is imported while invalid rows remain. Existing flights
                are never overwritten. Duplicate records are reported and
                skipped.
              </Notice>
              <button
                className="button primary"
                onClick={commit}
                disabled={
                  busy ||
                  !preview.rows.length ||
                  preview.rows.some((r) => r.errors.length)
                }
              >
                {busy ? "Importing…" : "Confirm import"}
              </button>
            </section>
          )}
        </>
      )}
      <ErrorText error={error} />
      {message && <Notice>{message}</Notice>}
    </>
  );
}
