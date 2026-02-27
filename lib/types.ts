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
  departure: AirportInfo;
  arrival: AirportInfo;
  seatNumber?: string;
  cabinClass?: string;
  bagTag?: string;
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
    date: "2026-02-15",
    aircraftType: "A320-251N",
    registration: "B-30EX",
    flightDuration: "2h 15min",
    aircraftAge: "3.5 years",
    distance: { km: 1075, nm: 580 },
    cruisingAltitude: "FL370",
    departure: {
      airport: {
        iata: "PVG",
        icao: "ZSPD",
        name: "Shanghai Pudong International Airport",
      },
      parkingBay: "D68",
      runway: "35L",
      scheduledTime: "08:00",
      actualTime: "08:12",
      offChocks: "07:55",
      metar: "METAR ZSPD 150000Z 34006KT 9999 FEW040 08/02 Q1024 NOSIG",
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
      scheduledTime: "10:30",
      actualTime: "10:25",
      onChocks: "10:32",
      metar: "METAR ZBAD 150200Z 02008KT CAVOK 03/M08 Q1031 NOSIG",
      utcOffset: 8,
    },
    seatNumber: "31A",
    cabinClass: "Economy",
    bagTag: "MU 782156",
  };
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
