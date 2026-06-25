"use client";

import { useEffect, useMemo, useState } from "react";
import PDFTemplate from "@/components/PDFTemplate";
import {
  AirlineInfo,
  DisplayMode,
  FlightData,
  createEmptyFlightData,
} from "@/lib/types";

interface AgentDraftResponse {
  hasDraft: boolean;
  draft: {
    data: FlightData;
  } | null;
}

declare global {
  interface Window {
    __FLIGHT_LOG_READY__?: boolean;
    __FLIGHT_LOG_ERROR__?: string;
  }
}

function isDisplayMode(value: string | null): value is DisplayMode {
  return value === "professional" || value === "standard";
}

export default function AgentPdfPage() {
  const [flightData, setFlightData] = useState<FlightData>(createEmptyFlightData());
  const [airline, setAirline] = useState<AirlineInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayMode = useMemo<DisplayMode>(() => {
    if (typeof window === "undefined") return "professional";
    const requested = new URLSearchParams(window.location.search).get("mode");
    return isDisplayMode(requested) ? requested : "professional";
  }, []);

  useEffect(() => {
    window.__FLIGHT_LOG_READY__ = false;
    window.__FLIGHT_LOG_ERROR__ = undefined;

    fetch("/api/agent/flight-log/draft", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Draft request failed: ${res.status}`);
        return (await res.json()) as AgentDraftResponse;
      })
      .then((body) => {
        if (!body.hasDraft || !body.draft?.data?.flightNumber) {
          throw new Error("No agent draft with a flight number was found.");
        }
        setFlightData(body.draft.data);
        setLoaded(true);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load draft";
        setError(message);
        window.__FLIGHT_LOG_ERROR__ = message;
      });
  }, []);

  useEffect(() => {
    if (!loaded || !flightData.flightNumber) return;
    const code = flightData.flightNumber.match(/^([A-Z0-9]{2})/i)?.[1]?.toUpperCase();
    if (!code) {
      window.__FLIGHT_LOG_READY__ = true;
      return;
    }

    fetch(`/api/airline-info?code=${code}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((info) => {
        if (info) setAirline(info as AirlineInfo);
      })
      .catch(() => {
        setAirline({
          name: `Airline ${code}`,
          iata: code,
          logoUrl: `https://pics.avs.io/800/280/${code}.png`,
        });
      })
      .finally(() => {
        window.setTimeout(() => {
          window.__FLIGHT_LOG_READY__ = true;
        }, 750);
      });
  }, [flightData.flightNumber, loaded]);

  if (error) {
    return (
      <main className="min-h-screen bg-white p-10 text-red-700">
        <h1 className="text-xl font-bold">Flight Log render failed</h1>
        <p className="mt-2 font-mono text-sm">{error}</p>
      </main>
    );
  }

  if (!loaded) {
    return (
      <main className="min-h-screen bg-white p-10 text-slate-600">
        Loading flight log draft…
      </main>
    );
  }

  return (
    <main className="bg-white text-black print:bg-white">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0;
        }
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `}</style>
      <PDFTemplate data={flightData} airline={airline} displayMode={displayMode} />
    </main>
  );
}
