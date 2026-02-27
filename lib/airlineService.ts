import { AirlineInfo } from "./types";
import { getAirline, listAirlines } from "soaring-symbols";
import { existsSync } from "fs";
import { join } from "path";

const ASSETS_DIR = join(
  process.cwd(),
  "node_modules",
  "soaring-symbols",
  "dist",
  "assets"
);

function hasLocalSvg(slug: string): "logo" | "icon" | null {
  if (existsSync(join(ASSETS_DIR, slug, "logo.svg"))) return "logo";
  if (existsSync(join(ASSETS_DIR, slug, "icon.svg"))) return "icon";
  return null;
}

export function extractAirlineCode(flightNumber: string): string {
  const match = flightNumber.match(/^([A-Z0-9]{2})/i);
  return match ? match[1].toUpperCase() : "";
}

export async function getAirlineInfo(
  airlineCode: string
): Promise<AirlineInfo> {
  const airline = getAirline(airlineCode);

  if (airline) {
    const variant = hasLocalSvg(airline.slug);
    const logoUrl = variant
      ? `/api/airline-logo?code=${airlineCode}&variant=${variant}`
      : `https://pics.avs.io/200/70/${airlineCode}.png`;

    const alliance =
      airline.alliance || ALLIANCE_MAP[airlineCode] || undefined;

    return {
      name: airline.name,
      iata: airline.iata,
      icao: airline.icao,
      alliance,
      logoUrl,
      primaryColor: airline.branding?.primary_color,
    };
  }

  return {
    name: getAirlineNameFallback(airlineCode),
    iata: airlineCode,
    alliance: ALLIANCE_MAP[airlineCode] || undefined,
    logoUrl: `https://pics.avs.io/200/70/${airlineCode}.png`,
  };
}

export function getAvailableAirlines(): string[] {
  return listAirlines().map((a) => `${a.iata} ${a.name}`);
}

function getAirlineNameFallback(code: string): string {
  const knownAirlines: Record<string, string> = {
    MU: "China Eastern Airlines",
    CA: "Air China",
    CZ: "China Southern Airlines",
    HU: "Hainan Airlines",
    "3U": "Sichuan Airlines",
    ZH: "Shenzhen Airlines",
    FM: "Shanghai Airlines",
    MF: "XiamenAir",
    "8L": "Lucky Air",
    SC: "Shandong Airlines",
    GJ: "Loong Air",
    TV: "Tibet Airlines",
    GS: "Tianjin Airlines",
    PN: "West Air",
    EU: "Chengdu Airlines",
    KN: "China United Airlines",
    NS: "Hebei Airlines",
    JD: "Beijing Capital Airlines",
    DZ: "Donghai Airlines",
    QW: "Qingdao Airlines",
    Y8: "Suparna Airlines",
    "9C": "Spring Airlines",
    HO: "Juneyao Airlines",
    KY: "Kunming Airlines",
    GT: "Air Guilin",
  };

  return knownAirlines[code] || `Airline ${code}`;
}

const ALLIANCE_MAP: Record<string, string> = {
  MU: "SkyTeam",
  CA: "Star Alliance",
  CZ: "SkyTeam",
  HU: "Star Alliance",
  FM: "SkyTeam",
};
