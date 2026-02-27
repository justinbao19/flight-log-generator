declare module "airport-data-js" {
  interface AirportData {
    iata: string;
    icao: string;
    airport: string;
    time: string;
    utc: number;
    country_code: string;
    continent: string;
    latitude: number;
    longitude: number;
    elevation_ft: number;
    type: string;
    scheduled_service: string;
    wikipedia: string;
    website: string;
    runway_length: number;
    flightradar24_url: string;
    radarbox_url: string;
    flightaware_url: string;
  }

  export function getAirportByIata(code: string): Promise<AirportData[]>;
  export function getAirportByIcao(code: string): Promise<AirportData[]>;
  export function searchByName(query: string): Promise<AirportData[]>;
  export function getAutocompleteSuggestions(query: string): Promise<AirportData[]>;
  export function getAirportByCountryCode(code: string): Promise<AirportData[]>;
  export function getAirportByContinent(code: string): Promise<AirportData[]>;
  export function validateIataCode(code: string): Promise<boolean>;
  export function validateIcaoCode(code: string): Promise<boolean>;
}
