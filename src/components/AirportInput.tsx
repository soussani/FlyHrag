import { useEffect, useId, useMemo, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { useAirports, searchAirports } from "../services/airports";
import type { Airport } from "../types";
import { ErrorText } from "./UI";
export default function AirportInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: Airport;
  onChange: (a: Airport) => void;
}) {
  const id = useId(),
    { data = [], error, isLoading } = useAirports();
  const [text, setText] = useState(""),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text), 160);
    return () => clearTimeout(timer);
  }, [text]);
  const results = useMemo(() => searchAirports(data, query), [data, query]);
  return (
    <div className="airport-input">
      <label htmlFor={id}>{label}</label>
      <div className="search-input">
        <Search size={18} />
        <input
          id={id}
          value={
            open
              ? text
              : value
                ? `${value.iata || value.id} · ${value.city || value.name}`
                : text
          }
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          autoComplete="off"
          aria-expanded={open}
          aria-controls={`${id}-results`}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Code, airport, city or country"
        />
      </div>
      {open && (
        <div className="airport-results" id={`${id}-results`}>
          {isLoading ? (
            <p>Loading worldwide airports…</p>
          ) : (
            results.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => {
                  onChange(a);
                  setText("");
                  setQuery("");
                  setOpen(false);
                }}
              >
                <MapPin size={16} />
                <strong>{a.iata || a.id}</strong>
                <span>
                  {a.name}
                  <small>
                    {a.city} · {a.countryName}
                  </small>
                </span>
              </button>
            ))
          )}
          {query && !results.length && !isLoading && (
            <p>No matching airports.</p>
          )}
          <button
            type="button"
            className="close-search"
            onClick={() => setOpen(false)}
          >
            Close search
          </button>
        </div>
      )}
      <ErrorText error={error} />
    </div>
  );
}
