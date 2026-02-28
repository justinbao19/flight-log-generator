"use client";

import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from "react-simple-maps";
import type { FlightTrackData } from "@/lib/types";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

interface FlightTrackMapProps {
  trackData: FlightTrackData;
  width?: number;
  height?: number;
}

function computeProjectionConfig(trackData: FlightTrackData) {
  const lats = trackData.path.map((p) => p.latitude);
  const lons = trackData.path.map((p) => p.longitude);

  lats.push(trackData.departure.lat, trackData.arrival.lat);
  lons.push(trackData.departure.lon, trackData.arrival.lon);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  const span = Math.max(latSpan, lonSpan * 0.6);

  const scale = Math.min(2400, Math.max(200, 180 / Math.max(span, 2)));

  return {
    center: [centerLon, centerLat] as [number, number],
    scale,
  };
}

export default function FlightTrackMap({
  trackData,
  width = 800,
  height = 500,
}: FlightTrackMapProps) {
  const projConfig = useMemo(() => computeProjectionConfig(trackData), [trackData]);

  const trackCoords: [number, number][] = useMemo(
    () => trackData.path.map((p) => [p.longitude, p.latitude]),
    [trackData.path]
  );

  return (
    <div className="relative" style={{ width, height }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          center: projConfig.center,
          scale: projConfig.scale,
        }}
        width={width}
        height={height}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rpiKey || geo.properties?.name || Math.random()}
                geography={geo}
                fill="#e2e8f0"
                stroke="#cbd5e1"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { outline: "none" },
                  pressed: { outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {/* Flight track line */}
        <Line
          coordinates={trackCoords}
          stroke="#0ea5e9"
          strokeWidth={2.5}
          strokeLinecap="round"
          fill="none"
        />

        {/* Matched waypoint markers */}
        {trackData.matchedFixes.map((fix) => (
          <Marker key={`${fix.name}-${fix.trackIndex}`} coordinates={[fix.lon, fix.lat]}>
            <g transform="translate(0, -2)">
              <polygon
                points="0,-5 4,0 0,5 -4,0"
                fill="#0ea5e9"
                stroke="#fff"
                strokeWidth={1}
                opacity={0.8}
              />
              <text
                textAnchor="middle"
                y={-10}
                style={{
                  fontFamily: "var(--font-b612-mono), monospace",
                  fontSize: 9,
                  fill: "#475569",
                  fontWeight: 600,
                }}
              >
                {fix.name}
              </text>
            </g>
          </Marker>
        ))}

        {/* Departure airport */}
        <Marker coordinates={[trackData.departure.lon, trackData.departure.lat]}>
          <circle r={6} fill="#22c55e" stroke="#fff" strokeWidth={2} />
          <text
            textAnchor="middle"
            y={-14}
            style={{
              fontFamily: "var(--font-b612), sans-serif",
              fontSize: 12,
              fill: "#0f172a",
              fontWeight: 700,
            }}
          >
            {trackData.departure.iata}
          </text>
        </Marker>

        {/* Arrival airport */}
        <Marker coordinates={[trackData.arrival.lon, trackData.arrival.lat]}>
          <circle r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
          <text
            textAnchor="middle"
            y={-14}
            style={{
              fontFamily: "var(--font-b612), sans-serif",
              fontSize: 12,
              fill: "#0f172a",
              fontWeight: 700,
            }}
          >
            {trackData.arrival.iata}
          </text>
        </Marker>
      </ComposableMap>
    </div>
  );
}
