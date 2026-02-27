"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  lookupByIata,
  lookupByIcao,
  searchByName,
  AirportResult,
} from "@/lib/airportLookup";

interface AirportInputProps {
  name: string;
  iata: string;
  icao: string;
  onAirportChange: (airport: { name: string; iata: string; icao: string }) => void;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function AirportInput({
  name,
  iata,
  icao,
  onAirportChange,
}: AirportInputProps) {
  const [suggestions, setSuggestions] = useState<AirportResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
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
        onAirportChange({ name: result.name, iata: upper, icao: result.icao });
      }
    }
  };

  const handleIcaoChange = async (value: string) => {
    const upper = value.toUpperCase();
    onAirportChange({ name, iata, icao: upper });

    if (upper.length === 4) {
      const result = await lookupByIcao(upper);
      if (result) {
        onAirportChange({ name: result.name, iata: result.iata, icao: upper });
      }
    }
  };

  return (
    <>
      <div className="col-span-2 relative" ref={wrapperRef}>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
          Airport Name
        </label>
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
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={`${s.iata}-${s.icao}-${i}`}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  i === highlightIdx
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-800 hover:bg-gray-50"
                }`}
                onMouseDown={() => selectSuggestion(s)}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                <span className="font-medium">{s.name}</span>
                {(s.iata || s.icao) && (
                  <span className="ml-2 text-xs text-gray-400">
                    {[s.iata, s.icao].filter(Boolean).join(" / ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
          IATA
        </label>
        <input
          type="text"
          value={iata || ""}
          onChange={(e) => handleIataChange(e.target.value)}
          maxLength={3}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
          ICAO
        </label>
        <input
          type="text"
          value={icao || ""}
          onChange={(e) => handleIcaoChange(e.target.value)}
          maxLength={4}
          className={INPUT_CLASS}
        />
      </div>
    </>
  );
}
