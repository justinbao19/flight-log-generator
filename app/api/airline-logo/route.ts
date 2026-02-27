import { NextRequest, NextResponse } from "next/server";
import { getAirline } from "soaring-symbols";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ASSETS_DIR = join(
  process.cwd(),
  "node_modules",
  "soaring-symbols",
  "dist",
  "assets"
);

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const variant = request.nextUrl.searchParams.get("variant") || "logo";

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const airline = getAirline(code);
    if (!airline?.slug) {
      return NextResponse.json({ error: "Airline not found" }, { status: 404 });
    }

    const svgPath = join(ASSETS_DIR, airline.slug, `${variant}.svg`);
    if (!existsSync(svgPath)) {
      const fallback = join(ASSETS_DIR, airline.slug, "icon.svg");
      if (!existsSync(fallback)) {
        return NextResponse.json({ error: "Logo not found" }, { status: 404 });
      }
      const svg = readFileSync(fallback, "utf-8");
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const svg = readFileSync(svgPath, "utf-8");
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }
}
