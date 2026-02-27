declare module "aewx-metar-parser" {
  interface MetarWind {
    degrees: number;
    speed_kts: number;
    speed_mps: number;
    gust_kts: number | null;
    gust_mps: number | null;
    degrees_from: number | null;
    degrees_to: number | null;
  }

  interface MetarVisibility {
    miles: number;
    miles_text: string;
    meters: number;
    meters_text: string;
  }

  interface MetarCondition {
    code: string;
  }

  interface MetarCloud {
    code: string;
    feet: number;
    meters: number;
  }

  interface MetarCeiling {
    feet: number | null;
    meters: number | null;
  }

  interface MetarTemperature {
    celsius: number;
    fahrenheit: number;
  }

  interface MetarHumidity {
    percent: number;
  }

  interface MetarBarometer {
    hg: number;
    kpa: number;
    mb: number;
  }

  interface MetarResult {
    raw_text: string;
    raw_parts: string[];
    icao: string;
    observed: string;
    wind: MetarWind;
    visibility: MetarVisibility;
    conditions: MetarCondition[];
    clouds: MetarCloud[];
    ceiling: MetarCeiling;
    temperature: MetarTemperature;
    dewpoint: MetarTemperature;
    humidity: MetarHumidity;
    barometer: MetarBarometer;
    flight_category: string;
    icao_flight_category: string;
  }

  export function metarParser(raw: string): MetarResult;
}
