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

const PUBLIC_AIRLINE_LOGO_DIR = join(
  process.cwd(),
  "public",
  "airline-logos"
);

const CUSTOM_AIRLINE_LOGOS: Record<string, string> = {
  TK: "Turkish Airlines.svg",
  OU: "Croatia Airlines.png",
};

function hasLocalSvg(slug: string): "logo" | "icon" | null {
  if (existsSync(join(ASSETS_DIR, slug, "logo.svg"))) return "logo";
  if (existsSync(join(ASSETS_DIR, slug, "icon.svg"))) return "icon";
  return null;
}

function getCustomLogoUrl(airlineCode: string): string | null {
  const code = airlineCode.toUpperCase();
  const candidates = [
    CUSTOM_AIRLINE_LOGOS[code],
    `${code}.svg`,
    `${code}.png`,
    `${code}.jpg`,
    `${code}.jpeg`,
  ].filter(Boolean) as string[];

  const fileName = candidates.find((candidate) =>
    existsSync(join(PUBLIC_AIRLINE_LOGO_DIR, candidate))
  );

  return fileName ? `/airline-logos/${encodeURIComponent(fileName)}` : null;
}

function shouldSuppressAllianceLogo(airlineCode: string): boolean {
  return airlineCode.toUpperCase() === "TK";
}

export function extractAirlineCode(flightNumber: string): string {
  const match = flightNumber.match(/^([A-Z0-9]{2})/i);
  return match ? match[1].toUpperCase() : "";
}

export async function getAirlineInfo(
  airlineCode: string
): Promise<AirlineInfo> {
  const code = airlineCode.toUpperCase();
  const airline = getAirline(code);
  const customLogoUrl = getCustomLogoUrl(code);

  if (airline) {
    const variant = hasLocalSvg(airline.slug);
    const logoUrl = customLogoUrl || (variant
      ? `/api/airline-logo?code=${airlineCode}&variant=${variant}`
      : `https://pics.avs.io/800/280/${code}.png`);

    const alliance =
      airline.alliance || ALLIANCE_MAP[code] || undefined;

    return {
      name: airline.name,
      iata: airline.iata,
      icao: airline.icao,
      alliance,
      logoUrl,
      allianceLogoUrl:
        alliance && !shouldSuppressAllianceLogo(code)
          ? ALLIANCE_LOGO_MAP[alliance]
          : undefined,
      primaryColor: airline.branding?.primary_color,
    };
  }

  const fallbackAlliance = ALLIANCE_MAP[code] || undefined;
  return {
    name: getAirlineNameFallback(code),
    iata: code,
    alliance: fallbackAlliance,
    allianceLogoUrl: fallbackAlliance && !shouldSuppressAllianceLogo(code)
      ? ALLIANCE_LOGO_MAP[fallbackAlliance]
      : undefined,
    logoUrl: customLogoUrl || `https://pics.avs.io/800/280/${code}.png`,
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
    OU: "Croatia Airlines",
  };

  return knownAirlines[code] || `Airline ${code}`;
}

const ALLIANCE_MAP: Record<string, string> = {
  MU: "SkyTeam",
  CA: "Star Alliance",
  CZ: "SkyTeam",
  HU: "Star Alliance",
  FM: "SkyTeam",
  OU: "Star Alliance",
};

const ALLIANCE_LOGO_MAP: Record<string, string> = {
  "Star Alliance": "/alliances/star-alliance.svg",
  SkyTeam: "/alliances/skyteam.svg",
  oneworld: "/alliances/oneworld.svg",
};
