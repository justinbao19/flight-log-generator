import { metarParser } from "aewx-metar-parser";

const WEATHER_CODES: Record<string, string> = {
  "+": "Heavy",
  "-": "Light",
  VC: "Vicinity",
  MI: "Shallow",
  PR: "Partial",
  BC: "Patches",
  DR: "Drifting",
  BL: "Blowing",
  SH: "Showers",
  TS: "Thunderstorm",
  FZ: "Freezing",
  RA: "Rain",
  DZ: "Drizzle",
  SN: "Snow",
  GR: "Hail",
  GS: "Small Hail",
  IC: "Ice Crystals",
  PL: "Ice Pellets",
  SG: "Snow Grains",
  UP: "Unknown Precip",
  BR: "Mist",
  FG: "Fog",
  FU: "Smoke",
  VA: "Volcanic Ash",
  DU: "Dust",
  SA: "Sand",
  HZ: "Haze",
  PY: "Spray",
  PO: "Dust Whirls",
  SQ: "Squall",
  FC: "Funnel Cloud",
  SS: "Sandstorm",
  DS: "Duststorm",
};

const CLOUD_CODES: Record<string, string> = {
  FEW: "Few",
  SCT: "Scattered",
  BKN: "Broken",
  OVC: "Overcast",
  CLR: "Clear",
  SKC: "Clear",
  NSC: "No Sig. Cloud",
  NCD: "No Cloud",
};

export interface DecodedMetar {
  wind: string;
  visibility: string;
  weather: string;
  clouds: string;
  temperature: string;
  dewpoint: string;
  humidity: string;
  pressure: string;
  flightCategory: string;
}

export function normalizeMetarText(raw: string): string {
  return raw.replace(/^\s*METAR\s+/i, "").trim();
}

function decodeConditions(
  conditions: { code: string }[]
): string {
  if (!conditions || conditions.length === 0) return "None";
  const result: string[] = [];
  let prefix = "";
  for (const c of conditions) {
    if (c.code === "-" || c.code === "+" || c.code === "VC") {
      prefix = WEATHER_CODES[c.code] || c.code;
    } else {
      const meaning = WEATHER_CODES[c.code] || c.code;
      result.push(prefix ? `${prefix} ${meaning}` : meaning);
      prefix = "";
    }
  }
  return result.join(", ") || "None";
}

export function decodeMetar(raw: string): DecodedMetar | null {
  const normalizedRaw = normalizeMetarText(raw);
  if (!normalizedRaw || normalizedRaw.length < 10) return null;

  try {
    const m = metarParser(normalizedRaw);
    const hasCavok = normalizedRaw.toUpperCase().includes("CAVOK");

    let wind = "Calm";
    if (m.wind && m.wind.speed_kts > 0) {
      wind = `${m.wind.degrees}° at ${m.wind.speed_kts} kt`;
      if (m.wind.gust_kts) wind += `, gusting ${m.wind.gust_kts} kt`;
      if (m.wind.degrees_from != null && m.wind.degrees_to != null) {
        wind += `, variable ${m.wind.degrees_from}°–${m.wind.degrees_to}°`;
      }
    }

    let visibility: string;
    if (hasCavok) {
      visibility = "10 km or more";
    } else if (m.visibility) {
      visibility =
        m.visibility.meters >= 9999 ? "10 km or more" : `${m.visibility.meters} m`;
    } else {
      visibility = "N/A";
    }

    const weather = hasCavok ? "No significant weather" : decodeConditions(m.conditions);

    let clouds: string;
    if (hasCavok) {
      clouds = "No significant cloud below 5,000 ft";
    } else if (m.clouds && m.clouds.length > 0) {
      clouds = m.clouds
        .map((c) => `${CLOUD_CODES[c.code] || c.code} ${c.feet}ft`)
        .join(", ");
    } else {
      clouds = "Clear";
    }

    const temperature = m.temperature
      ? `${m.temperature.celsius}°C`
      : "N/A";
    const dewpoint = m.dewpoint
      ? `${m.dewpoint.celsius}°C`
      : "N/A";
    const humidity = m.humidity
      ? `${Math.round(m.humidity.percent)}%`
      : "N/A";
    const pressure = m.barometer ? `${m.barometer.mb} hPa` : "N/A";
    const flightCategory = m.flight_category || "N/A";

    return {
      wind,
      visibility,
      weather,
      clouds,
      temperature,
      dewpoint,
      humidity,
      pressure,
      flightCategory,
    };
  } catch {
    return null;
  }
}

export function decodeMetarSummary(raw: string): string {
  const d = decodeMetar(raw);
  if (!d) return raw;

  const parts = [`Wind ${d.wind}`, `Visibility ${d.visibility}`];
  if (d.weather !== "None") parts.push(d.weather);
  parts.push(d.clouds);
  parts.push(`${d.temperature}/${d.dewpoint}`);
  parts.push(`Pressure ${d.pressure}`);
  parts.push(d.flightCategory);

  return parts.join(" | ");
}
