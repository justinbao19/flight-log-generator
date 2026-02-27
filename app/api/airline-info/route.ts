import { NextRequest, NextResponse } from "next/server";
import { getAirlineInfo } from "@/lib/airlineService";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing airline code" }, { status: 400 });
  }

  try {
    const info = await getAirlineInfo(code.toUpperCase());
    return NextResponse.json(info);
  } catch {
    return NextResponse.json(
      { error: "Failed to get airline info" },
      { status: 500 }
    );
  }
}
