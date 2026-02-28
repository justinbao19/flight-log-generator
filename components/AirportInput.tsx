"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  lookupByIata,
  lookupByIcao,
  searchByName,
  AirportResult,
} from "@/lib/airportLookup";
import { TowerControl } from "lucide-react";

interface AirportInputProps {
  name: string;
  iata: string;
  icao: string;
  onAirportChange: (airport: {
    name: string;
    iata: string;
    icao: string;
    utcOffset?: number;
  }) => void;
  labelPrefix?: string;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 sm:py-2 text-base sm:text-sm text-slate-900 transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] pl-10 pr-3";
const IATA_ICAO_INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 sm:py-2 text-base sm:text-sm text-slate-900 transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]";

export default function AirportInput({
  name,
  iata,
  icao,
  onAirportChange,
  labelPrefix,
}: AirportInputProps) {
  const [suggestions, setSuggestions] = useState<AirportResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = useCallback(
    (airport: AirportResult) => {
      onAirportChange({
        name: airport.name,
        iata: airport.iata,
        icao: airport.icao,
        utcOffset: airport.utcOffset,
      });
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightIdx(-1);
    },
    [onAirportChange]
  );

  const handleNameChange = (value: string) => {
    onAirportChange({ name: value, iata, icao });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await searchByName(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightIdx(-1);
    }, 300);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleIataChange = async (value: string) => {
    const upper = value.toUpperCase();
    onAirportChange({ name, iata: upper, icao });

    if (upper.length === 3) {
      const result = await lookupByIata(upper);
      if (result) {
        onAirportChange({
          name: result.name,
          iata: upper,
          icao: result.icao,
          utcOffset: result.utcOffset,
        });
      }
    }
  };

  const handleIcaoChange = async (value: string) => {
    const upper = value.toUpperCase();
    onAirportChange({ name, iata, icao: upper });

    if (upper.length === 4) {
      const result = await lookupByIcao(upper);
      if (result) {
        onAirportChange({
          name: result.name,
          iata: result.iata,
          icao: upper,
          utcOffset: result.utcOffset,
        });
      }
    }
  };

  return (
    <>
      <div className="col-span-1 sm:col-span-2 relative" ref={wrapperRef}>
        <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
          {labelPrefix ? `${labelPrefix} Name` : "Airport Name"}
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            <TowerControl className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={name || ""}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={handleNameKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className={INPUT_CLASS}
            autoComplete="off"
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white/90 backdrop-blur-xl shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={`${s.iata}-${s.icao}-${i}`}
                className="px-2 py-1"
                onMouseDown={() => selectSuggestion(s)}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                <div
                  className={`px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors ${
                    i === highlightIdx
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-800 hover:bg-slate-50/80"
                  }`}
                >
                  <span className="font-medium">{s.name}</span>
                  {(s.iata || s.icao) && (
                    <span className="ml-2 text-xs text-slate-400">
                      {[s.iata, s.icao].filter(Boolean).join(" / ")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
          IATA
        </label>
        <input
          type="text"
          value={iata || ""}
          onChange={(e) => handleIataChange(e.target.value)}
          maxLength={3}
          className={IATA_ICAO_INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
          ICAO
        </label>
        <input
          type="text"
          value={icao || ""}
          onChange={(e) => handleIcaoChange(e.target.value)}
          maxLength={4}
          className={IATA_ICAO_INPUT_CLASS}
        />
      </div>
    </>
  );
}
