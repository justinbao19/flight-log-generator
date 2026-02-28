import { NextRequest, NextResponse } from "next/server";
import { lookupByIcao } from "@/lib/airportLookup";

const AWC_BASE = "https://aviationweather.gov/api/data/metar";
const IEM_BASE = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py";

const UA =
  "FlightLogGenerator/1.0 (metar-proxy; contact@example.com)";

function isWithin15Days(dateStr: string): boolean {
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return false;
  const now = new Date();
  const diff = now.getTime() - target.getTime();
  return diff >= 0 && diff < 15 * 24 * 60 * 60 * 1000;
}

function toAwcDateFromUtcIso(utcIso: string): string {
  const d = new Date(utcIso);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

function localToUtcIso(date: string, time: string, utcOffset: number): string {
  const [h, m] = time.split(":").map(Number);
  const localMinutes = h * 60 + m;
  const utcMinutes = localMinutes - utcOffset * 60;
  const d = new Date(date + "T00:00:00Z");
  d.setUTCMinutes(d.getUTCMinutes() + utcMinutes);
  return d.toISOString();
}

function buildUtcIso(date: string, time?: string, utcOffset?: number): string {
  if (time && utcOffset !== undefined) {
    return localToUtcIso(date, time, utcOffset);
  }
  return date.includes("T") ? date : date + "T23:59:00Z";
}

async function fetchFromAwc(icao: string, date?: string, time?: string, utcOffset?: number): Promise<string | null> {
  let url: string;

  if (date) {
    const utcIso = buildUtcIso(date, time, utcOffset);
    const awcDate = toAwcDateFromUtcIso(utcIso);
    url = `${AWC_BASE}?ids=${icao}&date=${awcDate}&hours=3&format=raw`;
  } else {
    url = `${AWC_BASE}?ids=${icao}&format=raw`;
  }

  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 204) return null;
  if (!res.ok) return null;

  const text = (await res.text()).trim();
  if (!text) return null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  if (date && time) {
    const utcIso = buildUtcIso(date, time, utcOffset);
    const utcD = new Date(utcIso);
    const targetUtcMinutes = utcD.getUTCHours() * 60 + utcD.getUTCMinutes();
    const best = pickClosestMetar(lines, targetUtcMinutes);
    return best || lines[0];
  }

  return lines[0];
}

function pickClosestMetar(
  metars: string[],
  targetUtcMinutes: number
): string | null {
  let bestMetar: string | null = null;
  let bestDiff = Infinity;

  for (const metar of metars) {
    const match = metar.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
    if (!match) continue;
    const metarH = parseInt(match[2], 10);
    const metarM = parseInt(match[3], 10);
    const metarMinutes = metarH * 60 + metarM;

    let diff = Math.abs(metarMinutes - targetUtcMinutes);
    if (diff > 720) diff = 1440 - diff;

    if (diff < bestDiff) {
      bestDiff = diff;
      bestMetar = metar;
    }
  }

  return bestMetar;
}

async function fetchFromIem(icao: string, date: string, time?: string, utcOffset?: number): Promise<string | null> {
  let utcDate: Date;
  if (time && utcOffset !== undefined) {
    utcDate = new Date(localToUtcIso(date, time, utcOffset));
  } else {
    utcDate = new Date(date + "T12:00:00Z");
  }

  const y1 = utcDate.getUTCFullYear();
  const m1 = utcDate.getUTCMonth() + 1;
  const d1 = utcDate.getUTCDate();
  const h1 = Math.max(0, utcDate.getUTCHours() - 2);

  const endDate = new Date(utcDate.getTime() + 2 * 60 * 60 * 1000);
  const y2 = endDate.getUTCFullYear();
  const m2 = endDate.getUTCMonth() + 1;
  const d2 = endDate.getUTCDate();
  const h2 = endDate.getUTCHours();

  const station = icao.length === 4 && icao.startsWith("K") ? icao.slice(1) : icao;

  const url =
    `${IEM_BASE}?station=${station}&data=metar&tz=Etc/UTC&format=onlycomma` +
    `&latlon=no&elev=no&missing=M&trace=T&direct=no` +
    `&report_type=3&report_type=4` +
    `&year1=${y1}&month1=${m1}&day1=${d1}&hour1=${h1}` +
    `&year2=${y2}&month2=${m2}&day2=${d2}&hour2=${h2}`;

  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null;

  const csv = (await res.text()).trim();
  const lines = csv.split("\n").slice(1);

  const metars: string[] = [];
  for (const line of lines) {
    const cols = line.split(",");
    const metarCol = cols[2]?.trim();
    if (metarCol && metarCol.length > 10) {
      metars.push(metarCol);
    }
  }

  if (metars.length === 0) return null;

  if (time) {
    const targetUtcMinutes = utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes();
    return pickClosestMetar(metars, targetUtcMinutes) || metars[metars.length - 1];
  }
  return metars[metars.length - 1];
}

export async function GET(request: NextRequest) {
  const icao = request.nextUrl.searchParams.get("icao")?.toUpperCase();
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const time = request.nextUrl.searchParams.get("time") ?? undefined;
  const utcOffsetParam = request.nextUrl.searchParams.get("utcOffset");
  let utcOffset = utcOffsetParam !== null ? parseFloat(utcOffsetParam) : undefined;

  if (!icao || icao.length < 3 || icao.length > 4) {
    return NextResponse.json(
      { error: "Missing or invalid ICAO code" },
      { status: 400 }
    );
  }

  if (time && utcOffset === undefined) {
    try {
      const airport = await lookupByIcao(icao);
      if (airport?.utcOffset !== undefined) {
        utcOffset = airport.utcOffset;
      }
    } catch {
      // proceed without offset
    }
  }

  try {
    let metar: string | null = null;
    let source: "awc" | "iem" = "awc";

    if (!date || isWithin15Days(date)) {
      metar = await fetchFromAwc(icao, date, time, utcOffset);
      source = "awc";
    }

    if (!metar && date) {
      metar = await fetchFromIem(icao, date, time, utcOffset);
      source = "iem";
    }

    if (!metar) {
      return NextResponse.json(
        { error: `No METAR data found for ${icao}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ metar, source });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch METAR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
