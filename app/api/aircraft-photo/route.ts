import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ALLOWED_HOSTS = ["t.plnspttrs.net", "cdn.planespotters.net"];

export async function GET(request: NextRequest) {
  const proxyUrl = request.nextUrl.searchParams.get("proxy");
  if (proxyUrl) {
    return proxyImage(proxyUrl);
  }

  const reg = request.nextUrl.searchParams.get("reg");

  if (!reg) {
    return NextResponse.json(
      { error: "Missing required parameter: reg" },
      { status: 400 }
    );
  }

  try {
    const url = `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Planespotters API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawPhotos: Array<{
      thumbnail_large?: { src?: string };
      thumbnail?: { src?: string };
      photographer?: string;
      link?: string;
    }> = data?.photos ?? [];

    const photos = rawPhotos
      .filter((p) => p.thumbnail_large?.src || p.thumbnail?.src)
      .map((p) => ({
        url: p.thumbnail_large?.src ?? p.thumbnail?.src ?? "",
        thumbnailUrl: p.thumbnail?.src ?? p.thumbnail_large?.src ?? "",
        photographer: p.photographer ?? "Unknown",
        link: p.link ?? "",
      }));

    return NextResponse.json({ photos });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch aircraft photo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function proxyImage(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    }

    const res = await fetch(imageUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Image fetch returned ${res.status}` },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to proxy image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
