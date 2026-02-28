import { NextRequest, NextResponse } from "next/server";
import { getFlightTrack } from "@/lib/flightTrackService";

export async function GET(request: NextRequest) {
  const flight = request.nextUrl.searchParams.get("flight");
  const date = request.nextUrl.searchParams.get("date");

  if (!flight || !date) {
    return NextResponse.json(
      { error: "Missing required parameters: flight, date" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  try {
    const trackData = await getFlightTrack(flight, date);
    return NextResponse.json(trackData);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch flight track";

    const status = message.includes("not configured")
      ? 503
      : message.includes("not yet available") || message.includes("No flight found")
        ? 404
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
