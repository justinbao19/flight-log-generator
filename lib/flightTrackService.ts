import { FlightTrackData, TrackWaypoint } from "./types";
import { matchWaypoints } from "./navdata";
import { getAirline } from "soaring-symbols";

function iataToIcaoCallsign(flightNumber: string): string | null {
  const match = flightNumber.match(/^([A-Z0-9]{2})(\d+)/i);
  if (!match) return null;

  const iataCode = match[1].toUpperCase();
  const flightNum = match[2];

  const airline = getAirline(iataCode);
  if (airline?.icao) {
    return `${airline.icao}${flightNum}`;
  }

  return null;
}

interface AdsbdbRoute {
  callsign: string;
  origin: {
    iata_code: string;
    icao_code: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  destination: {
    iata_code: string;
    icao_code: string;
    name: string;
    latitude: number;
    longitude: number;
  };
}

async function fetchRouteFromAdsbdb(
  callsign: string
): Promise<AdsbdbRoute | null> {
  try {
    const res = await fetch(
      `https://api.adsbdb.com/v0/callsign/${callsign}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.response?.flightroute || null;
  } catch {
    return null;
  }
}

interface OpenSkyFlight {
  icao24: string;
  callsign: string;
  firstSeen: number;
  lastSeen: number;
  estDepartureAirport: string | null;
  estArrivalAirport: string | null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getOpenSkyAuthHeaders(): Promise<Record<string, string>> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (clientId && clientSecret) {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return { Authorization: `Bearer ${cachedToken.token}` };
    }

    const res = await fetch(
      "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      throw new Error(`OpenSky OAuth2 token request failed: ${res.status}`);
    }

    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return { Authorization: `Bearer ${cachedToken.token}` };
  }

  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;
  if (username && password) {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    return { Authorization: `Basic ${auth}` };
  }

  throw new Error(
    "OpenSky credentials not configured. " +
    "Set OPENSKY_CLIENT_ID + OPENSKY_CLIENT_SECRET (OAuth2, recommended for new accounts), " +
    "or OPENSKY_USERNAME + OPENSKY_PASSWORD (Basic Auth, legacy accounts only)."
  );
}

async function findFlightOnOpenSky(
  depIcao: string,
  arrIcao: string,
  dateStr: string
): Promise<OpenSkyFlight | null> {
  const dayStart = Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
  const dayEnd = dayStart + 86400;

  const headers = await getOpenSkyAuthHeaders();

  try {
    const url = `https://opensky-network.org/api/flights/arrival?airport=${arrIcao}&begin=${dayStart}&end=${dayEnd}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const flights: OpenSkyFlight[] = await res.json();
    const match = flights.find(
      (f) =>
        f.estDepartureAirport === depIcao && f.estArrivalAirport === arrIcao
    );
    return match || flights[0] || null;
  } catch {
    return null;
  }
}

interface OpenSkyTrack {
  icao24: string;
  startTime: number;
  endTime: number;
  callsign: string;
  path: [number, number | null, number | null, number | null, number | null, boolean][];
}

async function fetchTrackFromOpenSky(
  icao24: string,
  time: number
): Promise<OpenSkyTrack | null> {
  const headers = await getOpenSkyAuthHeaders();
  try {
    const url = `https://opensky-network.org/api/tracks/all?icao24=${icao24}&time=${time}`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getFlightTrack(
  flightNumber: string,
  dateStr: string
): Promise<FlightTrackData> {
  await getOpenSkyAuthHeaders();

  const callsign = iataToIcaoCallsign(flightNumber);
  if (!callsign) {
    throw new Error(`Cannot resolve ICAO callsign for ${flightNumber}`);
  }

  const route = await fetchRouteFromAdsbdb(callsign);
  if (!route) {
    throw new Error(
      `No route data found for callsign ${callsign}. The flight may not exist in the database.`
    );
  }

  const depIcao = route.origin.icao_code;
  const arrIcao = route.destination.icao_code;

  const flight = await findFlightOnOpenSky(
    depIcao,
    arrIcao,
    dateStr
  );
  if (!flight) {
    throw new Error(
      `No flight found on OpenSky for ${depIcao}->${arrIcao} on ${dateStr}. ` +
      `Track data is typically available the day after the flight.`
    );
  }

  const midTime = Math.floor((flight.firstSeen + flight.lastSeen) / 2);
  const track = await fetchTrackFromOpenSky(
    flight.icao24,
    midTime
  );
  if (!track || !track.path || track.path.length === 0) {
    throw new Error(
      `Track data not yet available for this flight. Please try again later.`
    );
  }

  const path: TrackWaypoint[] = track.path
    .filter((wp) => wp[1] != null && wp[2] != null)
    .map((wp) => ({
      time: wp[0],
      latitude: wp[1]!,
      longitude: wp[2]!,
      altitude: wp[3] ?? 0,
      track: wp[4] ?? 0,
      onGround: wp[5],
    }));

  const matchedFixes = await matchWaypoints(path);

  return {
    icao24: flight.icao24,
    callsign: callsign,
    startTime: track.startTime,
    endTime: track.endTime,
    path,
    matchedFixes,
    departure: {
      iata: route.origin.iata_code,
      name: route.origin.name,
      lat: route.origin.latitude,
      lon: route.origin.longitude,
    },
    arrival: {
      iata: route.destination.iata_code,
      name: route.destination.name,
      lat: route.destination.latitude,
      lon: route.destination.longitude,
    },
  };
}
