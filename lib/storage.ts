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

export function saveTrackData(data: FlightTrackData): void {
  try {
    localStorage.setItem(TRACK_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full
  }
}

export function loadTrackData(): FlightTrackData | null {
  try {
    const raw = localStorage.getItem(TRACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlightTrackData;
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
