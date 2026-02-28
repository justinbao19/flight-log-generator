import { MatchedFix } from "./types";

interface Fix {
  n: string;
  la: number;
  lo: number;
}

let fixesCache: Fix[] | null = null;

export async function loadFixes(): Promise<Fix[]> {
  if (fixesCache) return fixesCache;
  const data = await import("@/data/fixes.json");
  fixesCache = data.default as Fix[];
  return fixesCache;
}

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_NM = 3440.065;

function haversineNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

const MATCH_THRESHOLD_NM = 5;
const MIN_FIX_SEPARATION_NM = 10;

export async function matchWaypoints(
  path: { latitude: number; longitude: number }[],
  trackIndices?: number[]
): Promise<MatchedFix[]> {
  const fixes = await loadFixes();
  const matched: MatchedFix[] = [];
  let lastMatchedLat = -999;
  let lastMatchedLon = -999;

  const latMin = Math.min(...path.map((p) => p.latitude)) - 1;
  const latMax = Math.max(...path.map((p) => p.latitude)) + 1;
  const lonMin = Math.min(...path.map((p) => p.longitude)) - 1;
  const lonMax = Math.max(...path.map((p) => p.longitude)) + 1;

  const regionFixes = fixes.filter(
    (f) => f.la >= latMin && f.la <= latMax && f.lo >= lonMin && f.lo <= lonMax
  );

  for (let i = 0; i < path.length; i++) {
    const pt = path[i];
    if (!pt.latitude || !pt.longitude) continue;

    let bestDist = Infinity;
    let bestFix: Fix | null = null;

    for (const fix of regionFixes) {
      const dist = haversineNm(pt.latitude, pt.longitude, fix.la, fix.lo);
      if (dist < bestDist) {
        bestDist = dist;
        bestFix = fix;
      }
    }

    if (bestFix && bestDist < MATCH_THRESHOLD_NM) {
      const sepFromLast = haversineNm(
        lastMatchedLat,
        lastMatchedLon,
        bestFix.la,
        bestFix.lo
      );
      const isDuplicate =
        matched.length > 0 && matched[matched.length - 1].name === bestFix.n;

      if (!isDuplicate && sepFromLast > MIN_FIX_SEPARATION_NM) {
        matched.push({
          name: bestFix.n,
          lat: bestFix.la,
          lon: bestFix.lo,
          trackIndex: trackIndices ? trackIndices[i] : i,
        });
        lastMatchedLat = bestFix.la;
        lastMatchedLon = bestFix.lo;
      }
    }
  }

  return matched;
}
