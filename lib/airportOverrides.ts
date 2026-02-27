import type { AirportResult } from "./airportLookup";

/**
 * Local airport data that overrides or supplements airport-data-js.
 * Add entries here for newly opened airports or reassigned IATA/ICAO codes
 * that the upstream library hasn't updated yet.
 */
const overrides: AirportResult[] = [
  // IATA codes reassigned to new Chinese airports
  { iata: "LIJ", icao: "ZSLI", name: "Lishui Jinyun Airport", utcOffset: 8 },
  { iata: "JNH", icao: "ZSJX", name: "Jiaxing Nanhu Airport", utcOffset: 8 },

  // Completely missing from upstream library
  { iata: "BZJ", icao: "ZSBO", name: "Bozhou Airport", utcOffset: 8 },
  { iata: "DHH", icao: "ZWLK", name: "Balikun Dahe Airport", utcOffset: 8 },

  // ICAO codes updated (old codes still in library)
  { iata: "JSJ", icao: "ZYJS", name: "Jiansanjiang Shidi Airport", utcOffset: 8 },
  { iata: "TVS", icao: "ZBSN", name: "Tangshan Sannvhe Airport", utcOffset: 8 },
  { iata: "SHS", icao: "ZHJZ", name: "Jingzhou Shashi Airport", utcOffset: 8 },
  { iata: "JNG", icao: "ZSJG", name: "Jining Daan Airport", utcOffset: 8 },
];

const byIata = new Map<string, AirportResult>();
const byIcao = new Map<string, AirportResult>();

for (const entry of overrides) {
  if (entry.iata) byIata.set(entry.iata.toUpperCase(), entry);
  if (entry.icao) byIcao.set(entry.icao.toUpperCase(), entry);
}

export function overrideByIata(code: string): AirportResult | null {
  return byIata.get(code.toUpperCase()) ?? null;
}

export function overrideByIcao(code: string): AirportResult | null {
  return byIcao.get(code.toUpperCase()) ?? null;
}

export function overrideSearchByName(query: string): AirportResult[] {
  const q = query.toLowerCase();
  return overrides.filter((a) => a.name.toLowerCase().includes(q));
}
