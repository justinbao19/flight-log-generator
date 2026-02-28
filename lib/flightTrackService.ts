import { FlightTrackData, TrackWaypoint } from "./types";
import { matchWaypoints } from "./navdata";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface FR24FlightEntry {
  identification?: {
    id?: string | null;
    number?: { default?: string };
    callsign?: string | null;
  };
  status?: { text?: string; live?: boolean };
  aircraft?: {
    registration?: string | null;
    hex?: string | null;
    model?: { code?: string; text?: string | null };
  };
  airport?: {
    origin?: {
      name?: string;
      code?: { iata?: string; icao?: string };
      position?: { latitude?: number; longitude?: number };
    } | null;
    destination?: {
      name?: string;
      code?: { iata?: string; icao?: string };
      position?: { latitude?: number; longitude?: number };
    } | null;
  } | null;
  time?: {
    scheduled?: { departure?: number | null; arrival?: number | null } | null;
    real?: { departure?: number | null; arrival?: number | null } | null;
  } | null;
}

interface FR24TrailPoint {
  lat: number;
  lng: number;
  alt: number;
  spd: number;
  ts: number;
  hd: number;
}

interface FR24DetailData {
  identification?: { callsign?: string; number?: { default?: string } };
  aircraft?: { registration?: string; hex?: string };
  airport?: {
    origin?: {
      name?: string;
      code?: { iata?: string; icao?: string };
      position?: { latitude?: number; longitude?: number };
    };
    destination?: {
      name?: string;
      code?: { iata?: string; icao?: string };
      position?: { latitude?: number; longitude?: number };
    };
  };
  trail?: FR24TrailPoint[];
  firstTimestamp?: number;
}

function tsToDateStr(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

async function fetchFlightList(
  flightNumber: string
): Promise<FR24FlightEntry[]> {
  const url = `https://api.flightradar24.com/common/v1/flight/list.json?query=${encodeURIComponent(flightNumber)}&fetchBy=flight&page=1&limit=25`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`FlightRadar24 list API returned ${res.status}`);
  }
  const body = await res.json();
  return body?.result?.response?.data ?? [];
}

function findFlightForDate(
  flights: FR24FlightEntry[],
  dateStr: string
): FR24FlightEntry | null {
  const withId = flights.filter(
    (f) => f.identification?.id
  );

  const dateMatch = withId.find((f) => {
    const depTs =
      f.time?.real?.departure ?? f.time?.scheduled?.departure;
    if (!depTs) return false;
    return tsToDateStr(depTs) === dateStr;
  });
  if (dateMatch) return dateMatch;

  const withReg = withId.filter((f) => f.aircraft?.registration);
  return withReg[0] ?? withId[0] ?? null;
}

async function fetchFlightDetail(
  flightId: string
): Promise<FR24DetailData | null> {
  const url = `https://data-live.flightradar24.com/clickhandler/?version=1.5&flight=${flightId}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data) && data.length === 0) return null;
  return data;
}

export async function getFlightTrack(
  flightNumber: string,
  dateStr: string
): Promise<FlightTrackData> {
  const flights = await fetchFlightList(flightNumber);

  if (flights.length === 0) {
    throw new Error(
      `No flights found for ${flightNumber} on FlightRadar24.`
    );
  }

  const entry = findFlightForDate(flights, dateStr);
  if (!entry?.identification?.id) {
    throw new Error(
      `No flight with track data found for ${flightNumber} on ${dateStr}. ` +
        `Only recent flights (within ~2 weeks) have track data available.`
    );
  }

  const detail = await fetchFlightDetail(entry.identification.id);
  if (!detail?.trail || detail.trail.length === 0) {
    throw new Error(
      `Track data not available for ${flightNumber} on ${dateStr}. ` +
        `The flight may be too old or data has expired.`
    );
  }

  const sortedTrail = [...detail.trail].sort((a, b) => a.ts - b.ts);

  const path: TrackWaypoint[] = sortedTrail.map((p) => ({
    time: p.ts,
    latitude: p.lat,
    longitude: p.lng,
    altitude: Math.round(p.alt * 0.3048),
    track: p.hd,
    onGround: p.alt === 0 && p.spd < 50,
  }));

  const matchedFixes = await matchWaypoints(path);

  const callsign =
    detail.identification?.callsign ??
    entry.identification?.callsign ??
    flightNumber;

  const orig = detail.airport?.origin ?? entry.airport?.origin;
  const dest = detail.airport?.destination ?? entry.airport?.destination;

  return {
    icao24: detail.aircraft?.hex ?? entry.aircraft?.hex ?? "",
    callsign,
    startTime: sortedTrail[0].ts,
    endTime: sortedTrail[sortedTrail.length - 1].ts,
    path,
    matchedFixes,
    departure: {
      iata: orig?.code?.iata ?? "",
      name: orig?.name ?? "",
      lat: orig?.position?.latitude ?? 0,
      lon: orig?.position?.longitude ?? 0,
    },
    arrival: {
      iata: dest?.code?.iata ?? "",
      name: dest?.name ?? "",
      lat: dest?.position?.latitude ?? 0,
      lon: dest?.position?.longitude ?? 0,
    },
  };
}
