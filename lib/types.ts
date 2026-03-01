export type DisplayMode = "professional" | "standard";

export interface AirportInfo {
  airport: {
    iata: string;
    icao: string;
    name: string;
  };
  parkingBay?: string;
  runway?: string;
  scheduledTime: string;
  actualTime?: string;
  offChocks?: string;
  onChocks?: string;
  metar?: string;
  utcOffset?: number;
}

export interface SelectedPhoto {
  dataUrl: string;
  photographer: string;
  link: string;
}

export interface BoardingPassData {
  imageDataUrl: string;
  source: "image" | "pkpass";
  parsedData?: {
    passengerName?: string;
    flightNumber?: string;
    seatNumber?: string;
    gate?: string;
    boardingTime?: string;
    departureAirport?: string;
    arrivalAirport?: string;
  };
}

export interface FlightData {
  flightNumber: string;
  callSign?: string;
  date: string;
  aircraftType: string;
  registration: string;
  flightDuration: string;
  aircraftAge?: string;
  distance: {
    km: number;
    nm: number;
  };
  cruisingAltitude: string;
  majorWaypoints?: string;
  departure: AirportInfo;
  arrival: AirportInfo;
  seatNumber?: string;
  cabinClass?: string;
  bagTag?: string;
  selectedPhoto?: SelectedPhoto;
  boardingPass?: BoardingPassData;
}

export interface TrackWaypoint {
  time: number;
  latitude: number;
  longitude: number;
  altitude: number;
  track: number;
  onGround: boolean;
}

export interface MatchedFix {
  name: string;
  lat: number;
  lon: number;
  trackIndex: number;
}

export interface FlightTrackData {
  icao24: string;
  callsign: string;
  startTime: number;
  endTime: number;
  path: TrackWaypoint[];
  matchedFixes: MatchedFix[];
  departure: { iata: string; name: string; lat: number; lon: number };
  arrival: { iata: string; name: string; lat: number; lon: number };
}

function createEmptyAirportInfo(): AirportInfo {
  return {
    airport: { iata: "", icao: "", name: "" },
    parkingBay: "",
    runway: "",
    scheduledTime: "",
    actualTime: "",
    offChocks: "",
    onChocks: "",
    metar: "",
    utcOffset: undefined,
  };
}

export function createEmptyFlightData(): FlightData {
  return {
    flightNumber: "",
    callSign: "",
    date: "",
    aircraftType: "",
    registration: "",
    flightDuration: "",
    aircraftAge: "",
    distance: { km: 0, nm: 0 },
    cruisingAltitude: "",
    majorWaypoints: "",
    departure: createEmptyAirportInfo(),
    arrival: createEmptyAirportInfo(),
    seatNumber: "",
    cabinClass: "",
    bagTag: "",
  };
}

export function createSampleFlightData(): FlightData {
  return {
    flightNumber: "MU5137",
    callSign: "CES5137",
    date: "2026-02-28",
    aircraftType: "A321-231",
    registration: "B-1615",
    flightDuration: "2h 02min",
    distance: { km: 1075, nm: 580 },
    cruisingAltitude: "FL276",
    majorWaypoints: "POMOK - PIMOL - UDINO - GOLAL",
    departure: {
      airport: {
        iata: "SHA",
        icao: "ZSSS",
        name: "Shanghai Hongqiao International Airport",
      },
      parkingBay: "D12",
      runway: "36L",
      scheduledTime: "09:20",
      actualTime: "09:32",
      offChocks: "09:25",
      metar: "METAR ZSSS 280100Z 36004KT 9999 FEW040 10/03 Q1026 NOSIG",
      utcOffset: 8,
    },
    arrival: {
      airport: {
        iata: "PKX",
        icao: "ZBAD",
        name: "Beijing Daxing International Airport",
      },
      parkingBay: "B21",
      runway: "11R",
      scheduledTime: "11:25",
      actualTime: "11:35",
      onChocks: "11:40",
      metar: "METAR ZBAD 280300Z 02008KT CAVOK 05/M06 Q1029 NOSIG",
      utcOffset: 8,
    },
    seatNumber: "31A",
    cabinClass: "Economy",
    bagTag: "MU 782156",
  };
}

export interface FlightLookupResult {
  registration?: string;
  aircraftType?: string;
  callSign?: string;
  airline?: string;
  origin?: { iata: string; name: string };
  destination?: { iata: string; name: string };
}

export interface AircraftPhoto {
  url: string;
  fullUrl: string;
  thumbnailUrl: string;
  photographer: string;
  link: string;
  source: "planespotters" | "airport-data";
}

export interface AirlineInfo {
  name: string;
  iata: string;
  icao?: string;
  alliance?: string;
  logoUrl?: string;
  allianceLogoUrl?: string;
  primaryColor?: string;
}
