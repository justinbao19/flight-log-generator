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

export interface AirlineInfo {
  name: string;
  iata: string;
  icao?: string;
  alliance?: string;
  logoUrl?: string;
  allianceLogoUrl?: string;
  primaryColor?: string;
}
