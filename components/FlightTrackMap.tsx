"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import type { FlightTrackData } from "@/lib/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FlightTrackMapProps {
  trackData: FlightTrackData;
  height?: number;
}

function createAirportIcon(label: string, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <div style="
          font-family:var(--font-b612-mono),monospace;
          font-size:13px;font-weight:700;color:#0f172a;
          background:white;padding:2px 8px;border-radius:8px;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);
          white-space:nowrap;margin-bottom:4px;
          border:2px solid ${color};
        ">${label}</div>
        <div style="
          width:14px;height:14px;border-radius:50%;
          background:${color};border:2.5px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.2);
        "></div>
      </div>
    `,
  });
}

function createWaypointIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <div style="
          font-family:var(--font-b612-mono),monospace;
          font-size:11px;font-weight:600;color:#475569;
          background:white;padding:1px 6px;border-radius:6px;
          box-shadow:0 1px 4px rgba(0,0,0,0.1);
          white-space:nowrap;margin-bottom:3px;
          border:1px solid #e2e8f0;
        ">${label}</div>
        <div style="
          width:8px;height:8px;
          background:#0ea5e9;border:2px solid white;
          box-shadow:0 1px 3px rgba(0,0,0,0.15);
          transform:rotate(45deg);
        "></div>
      </div>
    `,
  });
}

export default function FlightTrackMap({
  trackData,
  height = 500,
}: FlightTrackMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapUnlocked, setMapUnlocked] = useState(false);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const trackCoords = useMemo<L.LatLngTuple[]>(
    () => trackData.path.map((p) => [p.latitude, p.longitude]),
    [trackData.path]
  );

  const bounds = useMemo(() => {
    const lats = trackData.path.map((p) => p.latitude);
    const lons = trackData.path.map((p) => p.longitude);
    lats.push(trackData.departure.lat, trackData.arrival.lat);
    lons.push(trackData.departure.lon, trackData.arrival.lon);
    const sw: L.LatLngTuple = [Math.min(...lats), Math.min(...lons)];
    const ne: L.LatLngTuple = [Math.max(...lats), Math.max(...lons)];
    return L.latLngBounds(sw, ne);
  }, [trackData]);

  const unlockMap = useCallback(() => {
    if (!mapRef.current || mapUnlocked) return;
    mapRef.current.dragging.enable();
    mapRef.current.touchZoom.enable();
    setMapUnlocked(true);
  }, [mapUnlocked]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: !isMobile,
      doubleClickZoom: true,
      touchZoom: !isMobile,
      dragging: !isMobile,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    L.control.attribution({ position: "bottomright", prefix: false })
      .addAttribution('&copy; <a href="https://carto.com/">CARTO</a>')
      .addTo(map);

    map.fitBounds(bounds, { padding: [40, 40] });

    L.polyline(trackCoords, {
      color: "#0ea5e9",
      weight: 3,
      opacity: 0.9,
      smoothFactor: 1,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    // On mobile, show fewer waypoints to avoid label overlap
    const fixes = trackData.matchedFixes;
    const maxWaypoints = isMobile ? 6 : fixes.length;
    const step = fixes.length > maxWaypoints ? Math.ceil(fixes.length / maxWaypoints) : 1;
    fixes.forEach((fix, i) => {
      if (i % step !== 0 && i !== fixes.length - 1) return;
      L.marker([fix.lat, fix.lon], {
        icon: createWaypointIcon(fix.name),
        interactive: false,
      }).addTo(map);
    });

    L.marker([trackData.departure.lat, trackData.departure.lon], {
      icon: createAirportIcon(trackData.departure.iata, "#22c55e"),
      zIndexOffset: 1000,
    }).addTo(map);

    L.marker([trackData.arrival.lat, trackData.arrival.lon], {
      icon: createAirportIcon(trackData.arrival.iata, "#ef4444"),
      zIndexOffset: 1000,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [trackData, trackCoords, bounds]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.invalidateSize();
  }, [height]);

  const handleRecenter = useCallback(() => {
    mapRef.current?.fitBounds(bounds, { padding: [40, 40], animate: true });
  }, [bounds]);

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="w-full rounded-xl"
        style={{ height, minHeight: 260 }}
      />
      {/* Mobile: overlay to unlock map interaction */}
      {isMobile && !mapUnlocked && (
        <button
          onClick={unlockMap}
          className="absolute inset-0 z-[999] flex items-end justify-center pb-4"
        >
          <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
            Tap to interact with map
          </span>
        </button>
      )}
      <button
        onClick={handleRecenter}
        title="Fit to track"
        className="absolute top-2 right-2 sm:top-[84px] sm:right-[10px] z-[1000] flex h-8 w-8 sm:h-[30px] sm:w-[30px] items-center justify-center rounded-lg sm:rounded-sm border-2 border-[rgba(0,0,0,0.2)] bg-white text-slate-600 hover:bg-slate-50 hover:text-sky-600 transition-colors shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>
    </div>
  );
}
