import { NextRequest, NextResponse } from "next/server";
import { getAirlineInfo } from "@/lib/airlineService";
import { requireAgentWriteAccess } from "@/lib/agentAuth";
import { getBacktestBaseline } from "@/lib/flightBacktestFixtures";
import { createFlightDataFromPartial, mergeFlightData } from "@/lib/flightLogFields";
import { lookupByIata, lookupByIcao } from "@/lib/airportLookup";
import { FlightData, FlightLookupResult, FlightTrackData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SourceStatus {
  ok: boolean;
  detail: string;
}

interface EnrichBody {
  flightNumber?: string;
  date?: string;
  data?: Partial<FlightData>;
  include?: {
    lookup?: boolean;
    airports?: boolean;
    metar?: boolean;
    track?: boolean;
    photo?: boolean;
    airline?: boolean;
    baseline?: boolean;
  };
}

export async function POST(request: NextRequest) {
  const authError = requireAgentWriteAccess(request);
  if (authError) return authError;

  const status: Record<string, SourceStatus> = {};

  try {
    const body = (await request.json()) as EnrichBody;
    const include = body.include ?? {};
    const seedFlightNumber =
      body.flightNumber?.trim().toUpperCase() ||
      body.data?.flightNumber?.trim().toUpperCase();
    const seedDate = body.date?.trim() || body.data?.date?.trim();

    if (!seedFlightNumber || !seedDate) {
      return NextResponse.json(
        { error: "flightNumber and date are required for enrichment" },
        { status: 400 }
      );
    }

    let data = createFlightDataFromPartial({
      ...body.data,
      flightNumber: seedFlightNumber,
      date: seedDate,
    });

    if (include.baseline !== false) {
      const baseline = getBacktestBaseline(seedFlightNumber, seedDate);
      if (baseline) {
        data = mergeFlightData(data, baseline, { overwrite: false });
        status.baseline = {
          ok: true,
          detail: "Applied CA8565 public backtest baseline for route, schedule, and distance.",
        };
      } else {
        status.baseline = {
          ok: false,
          detail: "No built-in baseline for this flight/date.",
        };
      }
    }

    if (include.airline !== false) {
      const code = seedFlightNumber.match(/^([A-Z0-9]{2})/i)?.[1] ?? "";
      if (code) {
        try {
          const airline = await getAirlineInfo(code);
          status.airline = {
            ok: true,
            detail: `Resolved airline as ${airline.name}.`,
          };
        } catch (err) {
          status.airline = {
            ok: false,
            detail: err instanceof Error ? err.message : "Airline lookup failed.",
          };
        }
      }
    }

    if (include.lookup !== false) {
      const result = await fetchJson<FlightLookupResult>(
        request,
        `/api/flight-lookup?flight=${encodeURIComponent(seedFlightNumber)}&date=${encodeURIComponent(seedDate)}`
      );
      if (result.ok) {
        data = mergeFlightData(
          data,
          {
            registration: result.data.registration,
            aircraftType: result.data.aircraftType,
            callSign: result.data.callSign,
            departure: result.data.origin
              ? {
                  ...data.departure,
                  airport: {
                    iata: result.data.origin.iata,
                    icao: (result.data.origin as { icao?: string }).icao || "",
                    name: result.data.origin.name || "",
                  },
                }
              : undefined,
            arrival: result.data.destination
              ? {
                  ...data.arrival,
                  airport: {
                    iata: result.data.destination.iata,
                    icao: (result.data.destination as { icao?: string }).icao || "",
                    name: result.data.destination.name || "",
                  },
                }
              : undefined,
          },
          { overwrite: false }
        );
        status.lookup = { ok: true, detail: "Flight lookup returned usable data." };
      } else {
        status.lookup = {
          ok: false,
          detail: result.error || "Flight lookup unavailable.",
        };
      }
    }

    if (include.airports !== false) {
      data = await enrichAirportPair(data, status);
    }

    if (include.metar !== false) {
      await enrichMetar(request, data, "departure", status);
      await enrichMetar(request, data, "arrival", status);
    }

    let trackData: FlightTrackData | undefined;
    if (include.track !== false) {
      const result = await fetchJson<FlightTrackData>(
        request,
        `/api/flight-track?flight=${encodeURIComponent(seedFlightNumber)}&date=${encodeURIComponent(seedDate)}`
      );
      if (result.ok) {
        trackData = result.data;
        if (trackData.matchedFixes?.length > 0 && !data.majorWaypoints) {
          data.majorWaypoints = trackData.matchedFixes.map((fix) => fix.name).join(" - ");
        }
        status.track = { ok: true, detail: "Flight track returned usable data." };
      } else {
        status.track = {
          ok: false,
          detail:
            result.error ||
            "Flight track unavailable. This often happens when FlightRadar24 blocks unofficial access or the track is expired.",
        };
      }
    }

    if (include.photo !== false && data.registration) {
      const result = await fetchJson<{ photos?: Array<{ fullUrl?: string; url?: string; photographer?: string; link?: string }> }>(
        request,
        `/api/aircraft-photo?reg=${encodeURIComponent(data.registration)}`
      );
      if (result.ok) {
        const first = result.data.photos?.[0];
        if (first) {
          status.photo = {
            ok: true,
            detail: `Found an aircraft photo candidate by ${first.photographer || "Unknown"}.`,
          };
        } else {
          status.photo = {
            ok: false,
            detail: "No aircraft photo candidate found.",
          };
        }
      } else {
        status.photo = {
          ok: false,
          detail: result.error || "No aircraft photo candidate found.",
        };
      }
    } else if (include.photo !== false) {
      status.photo = {
        ok: false,
        detail: "Registration is not known, so aircraft photo search was skipped.",
      };
    }

    return NextResponse.json({
      data,
      trackData,
      status,
      recommendedDraftRequest: {
        method: "PUT",
        path: "/api/agent/flight-log/draft",
        body: {
          source: "agent-enrich",
          data,
          trackData,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enrich flight log data";
    return NextResponse.json({ error: message, status }, { status: 500 });
  }
}

async function enrichAirportPair(
  data: FlightData,
  status: Record<string, SourceStatus>
): Promise<FlightData> {
  const next = structuredCloneSafe(data);
  await enrichAirport(next, "departure", status);
  await enrichAirport(next, "arrival", status);
  return next;
}

async function enrichAirport(
  data: FlightData,
  which: "departure" | "arrival",
  status: Record<string, SourceStatus>
): Promise<void> {
  const info = data[which];
  const airport =
    (info.airport.iata && (await lookupByIata(info.airport.iata))) ||
    (info.airport.icao && (await lookupByIcao(info.airport.icao)));

  if (!airport) {
    status[`${which}Airport`] = {
      ok: false,
      detail: `No local airport match for ${info.airport.iata || info.airport.icao || which}.`,
    };
    return;
  }

  data[which] = {
    ...info,
    airport: {
      iata: airport.iata || info.airport.iata,
      icao: airport.icao || info.airport.icao,
      name: airport.name || info.airport.name,
    },
    utcOffset: airport.utcOffset ?? info.utcOffset,
  };
  status[`${which}Airport`] = {
    ok: true,
    detail: `Resolved ${which} airport as ${data[which].airport.name}.`,
  };
}

async function enrichMetar(
  request: NextRequest,
  data: FlightData,
  which: "departure" | "arrival",
  status: Record<string, SourceStatus>
): Promise<void> {
  const info = data[which];
  const icao = info.airport.icao;
  if (!icao) {
    status[`${which}Metar`] = {
      ok: false,
      detail: `Skipped ${which} METAR because ICAO is missing.`,
    };
    return;
  }

  const params = new URLSearchParams({ icao, date: data.date });
  const time = info.actualTime || info.scheduledTime;
  if (time) params.set("time", time);
  if (info.utcOffset !== undefined) params.set("utcOffset", String(info.utcOffset));

  const result = await fetchJson<{ metar?: string; source?: string }>(
    request,
    `/api/metar?${params}`
  );

  if (result.ok && result.data?.metar) {
    data[which] = {
      ...info,
      metar: result.data.metar,
    };
    status[`${which}Metar`] = {
      ok: true,
      detail: `Fetched ${which} METAR from ${result.data.source || "weather source"}.`,
    };
  } else {
    status[`${which}Metar`] = {
      ok: false,
      detail: result.ok ? `No ${which} METAR found.` : result.error || `No ${which} METAR found.`,
    };
  }
}

async function fetchJson<T>(
  request: NextRequest,
  path: string
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const url = new URL(path, request.nextUrl.origin);
    const res = await fetch(url, { cache: "no-store" });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      return {
        ok: false,
        error: `Source returned ${res.status} ${res.statusText}: ${text.slice(0, 160)}`,
      };
    }
    const body = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: body?.error || `Source returned ${res.status} ${res.statusText}`,
      };
    }
    return { ok: true, data: body as T };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Source request failed",
    };
  }
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
