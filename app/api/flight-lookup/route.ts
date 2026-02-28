import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface FR24FlightEntry {
  identification?: {
    number?: { default?: string };
    callsign?: string | null;
  };
  status?: {
    text?: string;
    live?: boolean;
  };
  aircraft?: {
    model?: { code?: string; text?: string | null };
    registration?: string | null;
    age?: { availability?: unknown } | null;
  };
  airline?: {
    name?: string;
    code?: { iata?: string; icao?: string };
  } | null;
  airport?: {
    origin?: {
      name?: string;
      code?: { iata?: string; icao?: string };
    } | null;
    destination?: {
      name?: string;
      code?: { iata?: string; icao?: string };
    } | null;
  } | null;
  time?: {
    scheduled?: {
      departure?: number | null;
      arrival?: number | null;
    } | null;
    real?: {
      departure?: number | null;
      arrival?: number | null;
    } | null;
  } | null;
}

function tsToDateStr(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

function pickBestFlight(
  flights: FR24FlightEntry[],
  targetDate?: string
): FR24FlightEntry | null {
  const withReg = flights.filter(
    (f) => f.aircraft?.registration
  );

  if (targetDate && withReg.length > 0) {
    const dateMatch = withReg.find((f) => {
      const depTs =
        f.time?.real?.departure ??
        f.time?.scheduled?.departure;
      if (!depTs) return false;
      return tsToDateStr(depTs) === targetDate;
    });
    if (dateMatch) return dateMatch;
  }

  if (withReg.length > 0) return withReg[0];

  const anyWithAirport = flights.find(
    (f) => f.airport?.origin?.code?.iata
  );
  return anyWithAirport ?? flights[0] ?? null;
}

export async function GET(request: NextRequest) {
  const flight = request.nextUrl.searchParams.get("flight");
  const date = request.nextUrl.searchParams.get("date") ?? undefined;

  if (!flight) {
    return NextResponse.json(
      { error: "Missing required parameter: flight" },
      { status: 400 }
    );
  }

  try {
    const url = `https://api.flightradar24.com/common/v1/flight/list.json?query=${encodeURIComponent(flight)}&fetchBy=flight&page=1&limit=25`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `FlightRadar24 returned ${res.status}` },
        { status: 502 }
      );
    }

    const body = await res.json();
    const flights: FR24FlightEntry[] =
      body?.result?.response?.data ?? [];

    if (flights.length === 0) {
      return NextResponse.json(
        { error: `No flights found for ${flight}` },
        { status: 404 }
      );
    }

    const best = pickBestFlight(flights, date);
    if (!best) {
      return NextResponse.json(
        { error: `No matching flight data for ${flight}` },
        { status: 404 }
      );
    }

    const result: Record<string, unknown> = {};

    if (best.aircraft?.registration) {
      result.registration = best.aircraft.registration;
    }
    if (best.aircraft?.model?.text) {
      result.aircraftType = best.aircraft.model.text;
    } else if (best.aircraft?.model?.code) {
      result.aircraftType = best.aircraft.model.code;
    }

    const callsign =
      best.identification?.callsign ?? undefined;
    if (callsign) {
      result.callSign = callsign;
    }

    const origin = best.airport?.origin;
    if (origin?.code?.iata) {
      result.origin = {
        iata: origin.code.iata,
        icao: origin.code.icao || "",
        name: origin.name || "",
      };
    }

    const dest = best.airport?.destination;
    if (dest?.code?.iata) {
      result.destination = {
        iata: dest.code.iata,
        icao: dest.code.icao || "",
        name: dest.name || "",
      };
    }

    if (best.airline?.name) {
      result.airline = best.airline.name;
    }

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to lookup flight";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
