"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import type { FlightTrackData } from "@/lib/types";
import AltitudeProfile from "./AltitudeProfile";
import { Plane, Clock, ArrowRight } from "lucide-react";
import { AltitudeIcon } from "./icons/AltitudeIcon";

const FlightTrackMap = dynamic(() => import("./FlightTrackMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full flex items-center justify-center bg-slate-50 rounded-xl" style={{ height: 480 }}>
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm font-medium">Loading map...</span>
      </div>
    </div>
  ),
});

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

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
    const maxAltFt = metersToFeet(maxAlt);

    let totalDist = 0;
    for (let i = 1; i < trackData.path.length; i++) {
      const p1 = trackData.path[i - 1];
      const p2 = trackData.path[i];
      totalDist += haversineKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    }

    const maxSpd = Math.max(...trackData.path.map((p) => p.speed ?? 0));

    return {
      duration: formatDuration(duration),
      durationSeconds: duration,
      maxAltFL: `FL${Math.round(maxAltFt / 100)}`,
      maxAltFt: maxAltFt.toLocaleString(),
      distanceKm: Math.round(totalDist),
      distanceNm: Math.round(totalDist * 0.539957),
      waypoints: trackData.matchedFixes.length,
      date: formatDate(trackData.startTime),
      maxSpeed: Math.round(maxSpd),
      maxSpeedKmh: Math.round(maxSpd * 1.852),
    };
  }, [trackData]);

  const mapHeight = useMemo(() => {
    if (containerWidth < 640) return 280;
    return Math.min(Math.round(containerWidth * 0.5), 520);
  }, [containerWidth]);

  return (
    <div ref={containerRef} className="flex flex-col gap-3 w-full max-w-5xl mx-auto">
      {/* Route header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5">
          {/* Row 1: Route codes + callsign + date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-slate-900"
                style={{ fontFamily: "var(--font-b612-mono), monospace" }}
              >
                <span>{trackData.departure.iata}</span>
                <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
                <span>{trackData.arrival.iata}</span>
              </div>
              <span
                className="text-[10px] sm:text-xs text-slate-400 font-semibold px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100"
                style={{ fontFamily: "var(--font-b612-mono), monospace" }}
              >
                {trackData.callsign}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 font-medium shrink-0">
              <Clock className="w-3 h-3" />
              {stats.date}
            </div>
          </div>
          {/* Row 2: Full airport names */}
          <div className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
            {trackData.departure.name || trackData.departure.iata}
            {" → "}
            {trackData.arrival.name || trackData.arrival.iata}
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="flex items-stretch border-t border-slate-100 bg-slate-50/40 overflow-x-auto"
          style={{ fontFamily: "var(--font-b612-mono), monospace" }}
        >
          {[
            { label: "Duration", value: stats.duration },
            { label: "Alt", value: stats.maxAltFL },
            ...(stats.maxSpeed > 0 ? [{ label: "GS", value: `${stats.maxSpeed}kt` }] : []),
            { label: "Dist", value: `${stats.distanceNm}nm` },
            { label: "Fixes", value: String(stats.waypoints) },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`flex-1 min-w-0 px-2 py-2 sm:px-4 sm:py-2.5 text-center ${i > 0 ? "border-l border-slate-100" : ""}`}
            >
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider leading-none">{item.label}</div>
              <div className="text-sm sm:text-base font-bold text-slate-900 mt-1 whitespace-nowrap">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <FlightTrackMap
          trackData={trackData}
          height={mapHeight}
        />
      </div>

      {/* Altitude profile */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
        <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
          <AltitudeIcon className="w-3.5 h-3.5 text-sky-500" />
          Altitude &amp; Speed Profile
        </h4>
        <AltitudeProfile
          trackData={trackData}
          width={Math.min(containerWidth - 40, 928)}
          height={containerWidth < 640 ? 180 : 220}
        />
      </div>

      {/* Waypoints list */}
      {trackData.matchedFixes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
          <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
            <Plane className="w-3.5 h-3.5 text-sky-500" />
            Major Waypoints
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {trackData.matchedFixes.map((fix, i) => (
              <span key={`${fix.name}-${i}`} className="flex items-center gap-2">
                <span
                  className="group relative inline-block px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-sm font-bold tracking-wide border border-sky-100 hover:bg-sky-100 transition-colors cursor-default"
                  style={{ fontFamily: "var(--font-b612-mono), monospace" }}
                  title={`${fix.lat.toFixed(3)}°, ${fix.lon.toFixed(3)}°`}
                >
                  {fix.name}
                </span>
                {i < trackData.matchedFixes.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
