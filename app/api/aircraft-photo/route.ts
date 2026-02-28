import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ALLOWED_HOSTS = [
  "t.plnspttrs.net",
  "cdn.planespotters.net",
  "image.airport-data.com",
  "airport-data.com",
];

interface PhotoResult {
  url: string;
  fullUrl: string;
  thumbnailUrl: string;
  photographer: string;
  link: string;
  source: "planespotters" | "airport-data";
}

async function fetchPlanespotters(reg: string): Promise<PhotoResult[]> {
  try {
    const url = `https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const rawPhotos: Array<{
      thumbnail_large?: { src?: string };
      thumbnail?: { src?: string };
      photographer?: string;
      link?: string;
    }> = data?.photos ?? [];

    return rawPhotos
      .filter((p) => p.thumbnail_large?.src || p.thumbnail?.src)
      .map((p) => ({
        url: p.thumbnail_large?.src ?? p.thumbnail?.src ?? "",
        fullUrl: p.thumbnail_large?.src ?? p.thumbnail?.src ?? "",
        thumbnailUrl: p.thumbnail?.src ?? p.thumbnail_large?.src ?? "",
        photographer: p.photographer ?? "Unknown",
        link: p.link ?? "",
        source: "planespotters" as const,
      }));
  } catch {
    return [];
  }
}

async function fetchAirportData(reg: string): Promise<PhotoResult[]> {
  try {
    const url = `https://airport-data.com/api/ac_thumb.json?r=${encodeURIComponent(reg)}&n=6`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (data.status !== 200 || !data.data) return [];

    const items: Array<{
      image?: string;
      link?: string;
      photographer?: string;
    }> = data.data;

    return items
      .filter((p) => p.image)
      .map((p) => {
        const thumbUrl = p.image ?? "";
        const idMatch = thumbUrl.match(/(\d{9})/);
        const fullUrl = idMatch
          ? `https://image.airport-data.com/aircraft/${idMatch[1]}.jpg`
          : thumbUrl;

        return {
          url: thumbUrl,
          fullUrl,
          thumbnailUrl: thumbUrl,
          photographer: p.photographer ?? "Unknown",
          link: p.link ?? "",
          source: "airport-data" as const,
        };
      });
  } catch {
    return [];
  }
}

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

  const [psPhotos, adPhotos] = await Promise.all([
    fetchPlanespotters(reg),
    fetchAirportData(reg),
  ]);

  const photos = [...adPhotos, ...psPhotos].slice(0, 8);

  if (photos.length === 0) {
    return NextResponse.json({ photos: [] });
  }

  return NextResponse.json({ photos });
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
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Image fetch returned ${res.status}` },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to proxy image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
