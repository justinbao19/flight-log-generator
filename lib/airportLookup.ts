export interface AirportResult {
  iata: string;
  icao: string;
  name: string;
}

type AirportDataModule = typeof import("airport-data-js");
let airportDataModule: AirportDataModule | null = null;

async function getModule(): Promise<AirportDataModule> {
  if (!airportDataModule) {
    airportDataModule = (await import("airport-data-js")) as AirportDataModule;
  }
  return airportDataModule;
}

export async function lookupByIata(
  code: string
): Promise<AirportResult | null> {
  try {
    const mod = await getModule();
    const results = await mod.getAirportByIata(code.toUpperCase());
    if (results && results.length > 0) {
      const a = results[0];
      return { iata: a.iata || "", icao: a.icao || "", name: a.airport || "" };
    }
  } catch {
    // code not found
  }
  return null;
}

export async function lookupByIcao(
  code: string
): Promise<AirportResult | null> {
  try {
    const mod = await getModule();
    const results = await mod.getAirportByIcao(code.toUpperCase());
    if (results && results.length > 0) {
      const a = results[0];
      return { iata: a.iata || "", icao: a.icao || "", name: a.airport || "" };
    }
  } catch {
    // code not found
  }
  return null;
}

export async function searchByName(
  query: string
): Promise<AirportResult[]> {
  try {
    const mod = await getModule();
    const results = await mod.searchByName(query);
    if (results && results.length > 0) {
      return results.slice(0, 10).map((a) => ({
        iata: a.iata || "",
        icao: a.icao || "",
        name: a.airport || "",
      }));
    }
  } catch {
    // search failed
  }
  return [];
}
