import { FlightData, FlightTrackData } from "./types";

const DRAFT_KEY = "flight-log-draft";
const TRACK_KEY = "flight-track-data";

export function saveDraft(data: FlightData): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function loadDraft(): FlightData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlightData;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

interface StoredTrack {
  flightNumber: string;
  date: string;
  data: FlightTrackData;
}

export function saveTrackData(data: FlightTrackData, flightNumber: string, date: string): void {
  try {
    const stored: StoredTrack = { flightNumber, date, data };
    localStorage.setItem(TRACK_KEY, JSON.stringify(stored));
  } catch {
    // localStorage might be full
  }
}

export function loadTrackData(flightNumber?: string, date?: string): FlightTrackData | null {
  try {
    const raw = localStorage.getItem(TRACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === "object" && "flightNumber" in parsed && "data" in parsed) {
      const stored = parsed as StoredTrack;
      if (flightNumber && date) {
        if (stored.flightNumber !== flightNumber || stored.date !== date) {
          return null;
        }
      }
      return stored.data;
    }

    return parsed as FlightTrackData;
  } catch {
    return null;
  }
}

export function clearTrackData(): void {
  try {
    localStorage.removeItem(TRACK_KEY);
  } catch {
    // ignore
  }
}
