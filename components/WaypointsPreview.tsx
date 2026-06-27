import { MapPin } from "lucide-react";

interface WaypointsPreviewProps {
  waypoints?: string;
}

function splitWaypoints(value: string): string[] {
  return value
    .split(/\s*(?:-|–|—|,|;|\n)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function WaypointsPreview({ waypoints }: WaypointsPreviewProps) {
  const waypointText = waypoints?.trim() || "";
  const items = splitWaypoints(waypointText);

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-950">Waypoints</h2>
          <p className="text-sm text-slate-500">Route points entered for this flight.</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 font-mono text-sm font-semibold text-sky-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No waypoint text is available.</p>
      )}
    </div>
  );
}
