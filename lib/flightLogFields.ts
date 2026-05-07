import { FlightData, createEmptyFlightData } from "./types";

export type FlightLogFieldType =
  | "string"
  | "number"
  | "date"
  | "time"
  | "enum"
  | "dataUrl";

export interface FlightLogFieldDefinition {
  path: string;
  label: string;
  section: string;
  type: FlightLogFieldType;
  required?: boolean;
  enumValues?: string[];
  example?: string | number;
  description: string;
  autoFill?: string;
}

export interface FlightLogFieldUpdate {
  path: string;
  value: unknown;
  source?: string;
  confidence?: number;
}

export const FLIGHT_LOG_FIELDS: FlightLogFieldDefinition[] = [
  {
    path: "flightNumber",
    label: "Flight Number",
    section: "General Flight Info",
    type: "string",
    required: true,
    example: "CA8565",
    description: "Commercial flight number shown to passengers.",
    autoFill: "Used to derive airline info and query flight lookup sources.",
  },
  {
    path: "callSign",
    label: "Call Sign",
    section: "General Flight Info",
    type: "string",
    example: "CCA8565",
    description: "ATC callsign, often airline ICAO prefix plus flight number.",
    autoFill: "May be returned by the flight lookup source.",
  },
  {
    path: "date",
    label: "Date",
    section: "General Flight Info",
    type: "date",
    required: true,
    example: "2026-05-07",
    description: "Local departure date in YYYY-MM-DD format.",
  },
  {
    path: "aircraftType",
    label: "Aircraft Type",
    section: "General Flight Info",
    type: "string",
    example: "Airbus A321",
    description: "Aircraft model or type text.",
    autoFill: "May be returned by the flight lookup source.",
  },
  {
    path: "registration",
    label: "Registration",
    section: "General Flight Info",
    type: "string",
    example: "B-8579",
    description: "Aircraft registration number.",
    autoFill: "Used for aircraft photo search.",
  },
  {
    path: "flightDuration",
    label: "Flight Duration",
    section: "General Flight Info",
    type: "string",
    example: "2h 35min",
    description: "Gate-to-gate or airborne duration displayed in the log.",
    autoFill: "The editor calculates this when actual times and UTC offsets are present.",
  },
  {
    path: "aircraftAge",
    label: "Aircraft Age",
    section: "General Flight Info",
    type: "string",
    example: "7.5 Yrs",
    description: "Aircraft age at the flight date.",
  },
  {
    path: "distance.km",
    label: "Distance (km)",
    section: "General Flight Info",
    type: "number",
    example: 1203,
    description: "Great-circle or flown distance in kilometers.",
  },
  {
    path: "distance.nm",
    label: "Distance (nm)",
    section: "General Flight Info",
    type: "number",
    example: 650,
    description: "Great-circle or flown distance in nautical miles.",
  },
  {
    path: "cruisingAltitude",
    label: "Cruising Altitude",
    section: "General Flight Info",
    type: "string",
    example: "FL351",
    description: "Cruise altitude or flight level.",
    autoFill: "May be inferred from flight track max cruise altitude.",
  },
  {
    path: "majorWaypoints",
    label: "Major Waypoints",
    section: "General Flight Info",
    type: "string",
    example: "POMOK - PIMOL - UDINO",
    description: "Representative route fixes shown in the PDF.",
    autoFill: "Filled from matched fixes when flight track data is available.",
  },
  {
    path: "departure.airport.name",
    label: "Departure Airport Name",
    section: "Departure Info",
    type: "string",
    example: "Shanghai Pudong International Airport",
    description: "Full English departure airport name.",
    autoFill: "Filled from airport lookup when IATA or ICAO is known.",
  },
  {
    path: "departure.airport.iata",
    label: "Departure IATA",
    section: "Departure Info",
    type: "string",
    example: "PVG",
    description: "Three-letter departure airport passenger code.",
    autoFill: "Triggers local airport name, ICAO, and UTC offset lookup in the editor.",
  },
  {
    path: "departure.airport.icao",
    label: "Departure ICAO",
    section: "Departure Info",
    type: "string",
    example: "ZSPD",
    description: "Four-letter departure airport ICAO code.",
    autoFill: "Required for METAR fetch.",
  },
  {
    path: "departure.parkingBay",
    label: "Departure Parking Bay",
    section: "Departure Info",
    type: "string",
    example: "D12",
    description: "Departure gate, stand, or parking bay.",
  },
  {
    path: "departure.runway",
    label: "Takeoff Runway",
    section: "Departure Info",
    type: "string",
    example: "17L",
    description: "Runway used for takeoff.",
  },
  {
    path: "departure.scheduledTime",
    label: "Scheduled Departure",
    section: "Departure Info",
    type: "time",
    example: "20:30",
    description: "Scheduled local departure time in HH:MM.",
  },
  {
    path: "departure.actualTime",
    label: "Actual Departure",
    section: "Departure Info",
    type: "time",
    example: "20:41",
    description: "Actual local departure time in HH:MM.",
  },
  {
    path: "departure.offChocks",
    label: "Off-Chocks Time",
    section: "Departure Info",
    type: "time",
    example: "20:35",
    description: "Pushback or off-block time in HH:MM.",
  },
  {
    path: "departure.metar",
    label: "Departure METAR",
    section: "Departure Info",
    type: "string",
    example: "METAR ZSPD 071200Z 12006KT 9999 FEW030 22/17 Q1012 NOSIG",
    description: "Raw METAR weather report near departure time.",
    autoFill: "Fetched from public aviation weather sources when ICAO is known.",
  },
  {
    path: "departure.utcOffset",
    label: "Departure UTC Offset",
    section: "Departure Info",
    type: "number",
    example: 8,
    description: "Departure airport local UTC offset in hours.",
    autoFill: "Usually filled by local airport lookup.",
  },
  {
    path: "arrival.airport.name",
    label: "Arrival Airport Name",
    section: "Arrival Info",
    type: "string",
    example: "Guangzhou Baiyun International Airport",
    description: "Full English arrival airport name.",
    autoFill: "Filled from airport lookup when IATA or ICAO is known.",
  },
  {
    path: "arrival.airport.iata",
    label: "Arrival IATA",
    section: "Arrival Info",
    type: "string",
    example: "CAN",
    description: "Three-letter arrival airport passenger code.",
    autoFill: "Triggers local airport name, ICAO, and UTC offset lookup in the editor.",
  },
  {
    path: "arrival.airport.icao",
    label: "Arrival ICAO",
    section: "Arrival Info",
    type: "string",
    example: "ZGGG",
    description: "Four-letter arrival airport ICAO code.",
    autoFill: "Required for METAR fetch.",
  },
  {
    path: "arrival.runway",
    label: "Landing Runway",
    section: "Arrival Info",
    type: "string",
    example: "02R",
    description: "Runway used for landing.",
  },
  {
    path: "arrival.parkingBay",
    label: "Arrival Parking Bay",
    section: "Arrival Info",
    type: "string",
    example: "B21",
    description: "Arrival gate, stand, or parking bay.",
  },
  {
    path: "arrival.scheduledTime",
    label: "Scheduled Arrival",
    section: "Arrival Info",
    type: "time",
    example: "23:05",
    description: "Scheduled local arrival time in HH:MM.",
  },
  {
    path: "arrival.actualTime",
    label: "Actual Arrival",
    section: "Arrival Info",
    type: "time",
    example: "23:16",
    description: "Actual local arrival time in HH:MM.",
  },
  {
    path: "arrival.onChocks",
    label: "On-Chocks Time",
    section: "Arrival Info",
    type: "time",
    example: "23:20",
    description: "On-block or gate arrival time in HH:MM.",
  },
  {
    path: "arrival.metar",
    label: "Arrival METAR",
    section: "Arrival Info",
    type: "string",
    example: "METAR ZGGG 071500Z 16005KT 9999 FEW025 25/21 Q1010 NOSIG",
    description: "Raw METAR weather report near arrival time.",
    autoFill: "Fetched from public aviation weather sources when ICAO is known.",
  },
  {
    path: "arrival.utcOffset",
    label: "Arrival UTC Offset",
    section: "Arrival Info",
    type: "number",
    example: 8,
    description: "Arrival airport local UTC offset in hours.",
    autoFill: "Usually filled by local airport lookup.",
  },
  {
    path: "seatNumber",
    label: "Seat Number",
    section: "Passenger Info",
    type: "string",
    example: "31A",
    description: "Passenger seat number.",
  },
  {
    path: "cabinClass",
    label: "Cabin Class",
    section: "Passenger Info",
    type: "enum",
    enumValues: ["First", "Business", "Premium Economy", "Economy"],
    example: "Economy",
    description: "Cabin class selected in the editor.",
  },
  {
    path: "bagTag",
    label: "Bag Tag",
    section: "Passenger Info",
    type: "string",
    example: "CA 123456",
    description: "Optional checked baggage tag text.",
  },
  {
    path: "selectedPhoto.dataUrl",
    label: "Aircraft Photo Data URL",
    section: "Media",
    type: "dataUrl",
    description: "Base64 data URL used in the PDF aircraft photo area.",
  },
  {
    path: "selectedPhoto.photographer",
    label: "Aircraft Photo Photographer",
    section: "Media",
    type: "string",
    example: "Unknown",
    description: "Aircraft photo credit.",
  },
  {
    path: "selectedPhoto.link",
    label: "Aircraft Photo Source Link",
    section: "Media",
    type: "string",
    example: "https://www.planespotters.net/...",
    description: "Source page for the selected aircraft photo.",
  },
  {
    path: "boardingPass.imageDataUrl",
    label: "Boarding Pass Image Data URL",
    section: "Media",
    type: "dataUrl",
    description: "Base64 data URL used in the PDF boarding pass area.",
  },
  {
    path: "boardingPass.source",
    label: "Boarding Pass Source",
    section: "Media",
    type: "enum",
    enumValues: ["image", "pkpass"],
    example: "image",
    description: "Whether the boarding pass came from an image or Apple Wallet pass.",
  },
  {
    path: "boardingPass.parsedData.passengerName",
    label: "Boarding Pass Passenger Name",
    section: "Media",
    type: "string",
    example: "JUSTIN BAO",
    description: "Passenger name parsed from a boarding pass.",
  },
  {
    path: "boardingPass.parsedData.flightNumber",
    label: "Boarding Pass Flight Number",
    section: "Media",
    type: "string",
    example: "CA8565",
    description: "Flight number parsed from a boarding pass.",
  },
  {
    path: "boardingPass.parsedData.seatNumber",
    label: "Boarding Pass Seat Number",
    section: "Media",
    type: "string",
    example: "31A",
    description: "Seat number parsed from a boarding pass.",
  },
  {
    path: "boardingPass.parsedData.gate",
    label: "Boarding Pass Gate",
    section: "Media",
    type: "string",
    example: "D75",
    description: "Gate parsed from a boarding pass.",
  },
  {
    path: "boardingPass.parsedData.boardingTime",
    label: "Boarding Pass Boarding Time",
    section: "Media",
    type: "time",
    example: "19:50",
    description: "Boarding time parsed from a boarding pass.",
  },
  {
    path: "boardingPass.parsedData.departureAirport",
    label: "Boarding Pass Departure Airport",
    section: "Media",
    type: "string",
    example: "PVG",
    description: "Departure airport code parsed from a boarding pass.",
  },
  {
    path: "boardingPass.parsedData.arrivalAirport",
    label: "Boarding Pass Arrival Airport",
    section: "Media",
    type: "string",
    example: "CAN",
    description: "Arrival airport code parsed from a boarding pass.",
  },
];

const FIELD_BY_PATH = new Map(FLIGHT_LOG_FIELDS.map((field) => [field.path, field]));

export function getFlightLogField(path: string): FlightLogFieldDefinition | undefined {
  return FIELD_BY_PATH.get(path);
}

export function isFlightLogFieldPath(path: string): boolean {
  return FIELD_BY_PATH.has(path);
}

export function createFlightDataFromPartial(partial?: Partial<FlightData>): FlightData {
  return mergeFlightData(createEmptyFlightData(), partial ?? {}, { overwrite: true });
}

export function mergeFlightData(
  base: FlightData,
  incoming: Partial<FlightData>,
  options: { overwrite?: boolean } = {}
): FlightData {
  const overwrite = options.overwrite ?? false;
  const next = structuredCloneSafe(base);
  const source = incoming as Record<string, unknown>;

  for (const field of FLIGHT_LOG_FIELDS) {
    const value = getNestedValue(source, field.path);
    if (value === undefined || value === null || value === "") continue;
    const current = getNestedValue(next as unknown as Record<string, unknown>, field.path);
    if (overwrite || current === undefined || current === null || current === "" || current === 0) {
      setFlightLogFieldValue(next, field.path, value);
    }
  }

  return next;
}

export function applyFlightLogUpdates(
  base: FlightData,
  updates: FlightLogFieldUpdate[]
): FlightData {
  const next = structuredCloneSafe(base);
  for (const update of updates) {
    setFlightLogFieldValue(next, update.path, update.value);
  }
  return next;
}

export function setFlightLogFieldValue(
  data: FlightData,
  path: string,
  rawValue: unknown
): void {
  const field = getFlightLogField(path);
  if (!field) {
    throw new Error(`Unknown flight log field path: ${path}`);
  }

  const value = coerceFieldValue(field, rawValue);
  const keys = path.split(".");
  let target = data as unknown as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (
      target[key] === undefined ||
      target[key] === null ||
      typeof target[key] !== "object"
    ) {
      target[key] = {};
    }
    target = target[key] as Record<string, unknown>;
  }

  target[keys[keys.length - 1]] = value;
}

export function coerceFieldValue(
  field: FlightLogFieldDefinition,
  rawValue: unknown
): string | number | undefined {
  if (rawValue === null || rawValue === undefined) return undefined;

  if (field.type === "number") {
    if (typeof rawValue === "number") return Number.isFinite(rawValue) ? rawValue : undefined;
    const n = Number(String(rawValue).replace(/,/g, ""));
    if (!Number.isFinite(n)) {
      throw new Error(`${field.path} must be a number`);
    }
    return n;
  }

  const value = String(rawValue).trim();
  if (!value) return "";

  if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field.path} must use YYYY-MM-DD format`);
  }

  if (field.type === "time" && !/^\d{2}:\d{2}$/.test(value)) {
    throw new Error(`${field.path} must use HH:MM format`);
  }

  if (field.type === "enum" && field.enumValues && !field.enumValues.includes(value)) {
    throw new Error(`${field.path} must be one of: ${field.enumValues.join(", ")}`);
  }

  if (field.type === "dataUrl" && !value.startsWith("data:")) {
    throw new Error(`${field.path} must be a data URL`);
  }

  return value;
}

export function getNestedValue(source: Record<string, unknown>, path: string): unknown {
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
