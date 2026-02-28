"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import type { FlightTrackData } from "@/lib/types";
import FlightTrackMap from "./FlightTrackMap";
import AltitudeProfile from "./AltitudeProfile";
import { Plane, Clock, ArrowRight } from "lucide-react";
import { AltitudeIcon } from "./icons/AltitudeIcon";
import { DistanceIcon } from "./icons/DistanceIcon";

interface FlightTrackViewProps {
  trackData: FlightTrackData;
}

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function FlightTrackView({ trackData }: FlightTrackViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const stats = useMemo(() => {
    const duration = trackData.endTime - trackData.startTime;
    const maxAlt = Math.max(...trackData.path.map((p) => p.altitude));

    let totalDist = 0;
    for (let i = 1; i < trackData.path.length; i++) {
      const p1 = trackData.path[i - 1];
      const p2 = trackData.path[i];
      totalDist += haversineKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    }

    return {
      duration: formatDuration(duration),
      maxAlt: `FL${Math.round(metersToFeet(maxAlt) / 100)}`,
      distance: `${Math.round(totalDist)} km`,
      waypoints: trackData.matchedFixes.length,
    };
  }, [trackData]);

  return (
    <div ref={containerRef} className="flex flex-col gap-0 w-full max-w-5xl mx-auto">
      {/* Route header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900" style={{ fontFamily: "var(--font-b612-mono), monospace" }}>
              <span>{trackData.departure.iata}</span>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{trackData.arrival.iata}</span>
            </div>
            <span className="text-sm text-slate-500 font-medium" style={{ fontFamily: "var(--font-b612-mono), monospace" }}>
              {trackData.callsign}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {stats.duration}
            </span>
            <span className="flex items-center gap-1.5">
              <AltitudeIcon className="w-3.5 h-3.5" />
              {stats.maxAlt}
            </span>
            <span className="flex items-center gap-1.5">
              <DistanceIcon className="w-3.5 h-3.5" />
              {stats.distance}
            </span>
            <span className="flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5" />
              {stats.waypoints} fixes
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mt-3">
        <div className="bg-slate-50/50">
          <FlightTrackMap
            trackData={trackData}
            width={Math.min(containerWidth, 960)}
            height={Math.min(Math.round(containerWidth * 0.55), 520)}
          />
        </div>
      </div>

      {/* Altitude profile */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 mt-3">
        <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-3 flex items-center gap-2">
          <AltitudeIcon className="w-3.5 h-3.5 text-sky-500" />
          Altitude Profile
        </h4>
        <AltitudeProfile
          trackData={trackData}
          width={Math.min(containerWidth - 32, 928)}
          height={180}
        />
      </div>

      {/* Waypoints list */}
      {trackData.matchedFixes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 mt-3">
          <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-3 flex items-center gap-2">
            <Plane className="w-3.5 h-3.5 text-sky-500" />
            Major Waypoints
          </h4>
          <div className="flex flex-wrap items-center gap-1.5">
            {trackData.matchedFixes.map((fix, i) => (
              <span key={`${fix.name}-${i}`} className="flex items-center gap-1.5">
                <span
                  className="inline-block px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-xs font-bold tracking-wide"
                  style={{ fontFamily: "var(--font-b612-mono), monospace" }}
                >
                  {fix.name}
                </span>
                {i < trackData.matchedFixes.length - 1 && (
                  <span className="text-slate-300 text-xs">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
