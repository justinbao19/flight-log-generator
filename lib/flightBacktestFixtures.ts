import { FlightData } from "./types";

export const CA8565_2026_05_07_BASELINE: Partial<FlightData> = {
  flightNumber: "CA8565",
  callSign: "CCA8565",
  date: "2026-05-07",
  aircraftType: "",
  registration: "",
  flightDuration: "2h 35min",
  distance: {
    km: 1203,
    nm: 650,
  },
  cruisingAltitude: "",
  departure: {
    airport: {
      iata: "PVG",
      icao: "ZSPD",
      name: "Shanghai Pudong International Airport",
    },
    parkingBay: "",
    runway: "",
    scheduledTime: "20:30",
    actualTime: "",
    offChocks: "",
    metar: "",
    utcOffset: 8,
  },
  arrival: {
    airport: {
      iata: "CAN",
      icao: "ZGGG",
      name: "Guangzhou Baiyun International Airport",
    },
    parkingBay: "",
    runway: "",
    scheduledTime: "23:05",
    actualTime: "",
    onChocks: "",
    metar: "",
    utcOffset: 8,
  },
  seatNumber: "",
  cabinClass: "Economy",
  bagTag: "",
};

export function getBacktestBaseline(
  flightNumber?: string,
  date?: string
): Partial<FlightData> | null {
  if (flightNumber?.toUpperCase() === "CA8565" && date === "2026-05-07") {
    return CA8565_2026_05_07_BASELINE;
  }
  return null;
}
