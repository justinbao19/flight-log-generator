export function formatUtcOffset(offset: number | undefined): string {
  if (offset === undefined || offset === null || Number.isNaN(offset)) return "";
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hours = Math.trunc(abs);
  const minutes = Math.round((abs - hours) * 60);
  const minutePart = minutes ? `:${String(minutes).padStart(2, "0")}` : "";
  return `UTC${sign}${hours}${minutePart}`;
}

function parseShortOffset(value: string): number | null {
  const match = value.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    if (/^(?:GMT|UTC)$/i.test(value)) return 0;
    return null;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || "0");
  return sign * (hours + minutes / 60);
}

function offsetAtInstant(timeZone: string, instant: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    }).formatToParts(instant);
    const timeZoneName = parts.find((part) => part.type === "timeZoneName")?.value;
    return timeZoneName ? parseShortOffset(timeZoneName) : null;
  } catch {
    return null;
  }
}

export function resolveUtcOffset(
  timeZone: string | undefined,
  date: string | undefined,
  time: string | undefined,
  fallback?: number
): number | undefined {
  if (!timeZone || !date) return fallback;

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return fallback;

  const [hour = 12, minute = 0] = time ? time.split(":").map(Number) : [];
  if (Number.isNaN(hour) || Number.isNaN(minute)) return fallback;

  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = offsetAtInstant(timeZone, new Date(localAsUtc));
  if (firstOffset === null) return fallback;

  const correctedInstant = new Date(localAsUtc - firstOffset * 60 * 60 * 1000);
  return offsetAtInstant(timeZone, correctedInstant) ?? firstOffset;
}

