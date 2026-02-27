import { AirlineInfo } from "./types";

let soaringSymbols: typeof import("soaring-symbols") | null = null;

async function getSoaringSymbols() {
  if (!soaringSymbols) {
    soaringSymbols = await import("soaring-symbols");
  }
  return soaringSymbols;
}

export function extractAirlineCode(flightNumber: string): string {
  const match = flightNumber.match(/^([A-Z0-9]{2})/i);
  return match ? match[1].toUpperCase() : "";
}

export async function getAirlineInfo(
  airlineCode: string
): Promise<AirlineInfo> {
  const ss = await getSoaringSymbols();
  const airline = ss.getAirline(airlineCode);

  if (airline) {
    const assets = ss.getAssets(airlineCode);
    let logoUrl: string | undefined;

    if (assets?.logo?.color) {
      logoUrl = `/api/airline-logo?code=${airlineCode}&type=logo`;
    } else if (assets?.icon?.color) {
      logoUrl = `/api/airline-logo?code=${airlineCode}&type=icon`;
    }

    return {
      name: airline.name,
      iata: airline.iata,
      icao: airline.icao,
      alliance: airline.alliance || undefined,
      logoUrl:
        logoUrl ||
        `https://content.airhex.com/content/logos/airlines_${airlineCode}_200_70_r.png`,
      primaryColor: airline.branding?.primary_color,
    };
  }

  return {
    name: getAirlineNameFallback(airlineCode),
    iata: airlineCode,
    logoUrl: `https://content.airhex.com/content/logos/airlines_${airlineCode}_200_70_r.png`,
  };
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

export function getAllianceForCode(code: string): string | undefined {
  return ALLIANCE_MAP[code];
}
