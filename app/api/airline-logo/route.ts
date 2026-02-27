import { NextRequest, NextResponse } from "next/server";
import { getAssets } from "soaring-symbols";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const type = (request.nextUrl.searchParams.get("type") || "logo") as
    | "logo"
    | "icon"
    | "tail";

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const assets = getAssets(code);
    const assetPath = assets?.[type]?.color;

    if (!assetPath) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }

    const fullPath = join(
      process.cwd(),
      "node_modules",
      "soaring-symbols",
      "dist",
      assetPath
    );
    const svg = readFileSync(fullPath, "utf-8");

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
