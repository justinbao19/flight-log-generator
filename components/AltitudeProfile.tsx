"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { FlightTrackData, MatchedFix } from "@/lib/types";

interface AltitudeProfileProps {
  trackData: FlightTrackData;
  width?: number;
  height?: number;
}

const PADDING = { top: 28, right: 20, bottom: 36, left: 56 };

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

function formatAlt(meters: number): string {
  const ft = metersToFeet(meters);
  if (ft >= 1000) return `FL${Math.round(ft / 100)}`;
  return `${ft}ft`;
}

function formatTime(ts: number, startTs: number): string {
  const elapsed = ts - startTs;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h${m > 0 ? `${String(m).padStart(2, "0")}m` : ""}`;
}

function detectPhases(
  path: { time: number; altitude: number; onGround: boolean }[]
): { label: string; startIdx: number; endIdx: number }[] {
  if (path.length < 3) return [];

  const phases: { label: string; startIdx: number; endIdx: number }[] = [];
  let currentPhase = "Ground";
  let phaseStart = 0;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    let phase: string;

    if (curr.onGround) {
      phase = "Ground";
    } else {
      const altDiff = curr.altitude - prev.altitude;
      const timeDiff = curr.time - prev.time;
      const rate = timeDiff > 0 ? altDiff / timeDiff : 0;

      if (rate > 2) phase = "Climb";
      else if (rate < -2) phase = "Descent";
      else phase = "Cruise";
    }

    if (phase !== currentPhase) {
      if (phaseStart < i - 1) {
        phases.push({ label: currentPhase, startIdx: phaseStart, endIdx: i - 1 });
      }
      currentPhase = phase;
      phaseStart = i;
    }
  }

  phases.push({
    label: currentPhase,
    startIdx: phaseStart,
    endIdx: path.length - 1,
  });

  return phases.filter((p) => p.label !== "Ground" && p.endIdx - p.startIdx > 1);
}

export default function AltitudeProfile({
  trackData,
  width = 800,
  height = 200,
}: AltitudeProfileProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { path, matchedFixes } = trackData;

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const { maxAlt, timeRange, xScale, yScale } = useMemo(() => {
    const alts = path.map((p) => p.altitude);
    const maxA = Math.max(...alts, 1000);
    const ceilAlt = Math.ceil(maxA / 1000) * 1000;

    const tStart = path[0]?.time ?? 0;
    const tEnd = path[path.length - 1]?.time ?? 1;
    const tRange = tEnd - tStart || 1;

    return {
      maxAlt: ceilAlt,
      timeRange: tRange,
      xScale: (t: number) => ((t - tStart) / tRange) * chartW,
      yScale: (alt: number) => chartH - (alt / ceilAlt) * chartH,
    };
  }, [path, chartW, chartH]);

  const pathD = useMemo(() => {
    if (path.length === 0) return "";
    const startT = path[0].time;
    const points = path.map(
      (p) => `${PADDING.left + xScale(p.time)},${PADDING.top + yScale(p.altitude)}`
    );
    return `M${points.join("L")}`;
  }, [path, xScale, yScale]);

  const areaD = useMemo(() => {
    if (!pathD) return "";
    const bottom = PADDING.top + chartH;
    const firstX = PADDING.left + xScale(path[0].time);
    const lastX = PADDING.left + xScale(path[path.length - 1].time);
    return `${pathD}L${lastX},${bottom}L${firstX},${bottom}Z`;
  }, [pathD, path, xScale, chartH]);

  const phases = useMemo(() => detectPhases(path), [path]);

  const yTicks = useMemo(() => {
    const step = maxAlt <= 5000 ? 1000 : maxAlt <= 15000 ? 3000 : 5000;
    const ticks: number[] = [];
    for (let a = 0; a <= maxAlt; a += step) ticks.push(a);
    return ticks;
  }, [maxAlt]);

  const xTicks = useMemo(() => {
    const tStart = path[0]?.time ?? 0;
    const tEnd = path[path.length - 1]?.time ?? 1;
    const count = Math.min(6, Math.max(3, Math.floor(chartW / 120)));
    const step = (tEnd - tStart) / count;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) ticks.push(tStart + step * i);
    return ticks;
  }, [path, chartW]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || path.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left - PADDING.left;
      const ratio = mx / chartW;
      const idx = Math.round(ratio * (path.length - 1));
      setHoverIdx(Math.max(0, Math.min(path.length - 1, idx)));
    },
    [path, chartW]
  );

  const hoverPoint = hoverIdx !== null ? path[hoverIdx] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Y-axis grid + labels */}
      {yTicks.map((alt) => {
        const y = PADDING.top + yScale(alt);
        return (
          <g key={`y-${alt}`}>
            <line
              x1={PADDING.left}
              y1={y}
              x2={width - PADDING.right}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={0.5}
              strokeDasharray={alt === 0 ? "none" : "4,3"}
            />
            <text
              x={PADDING.left - 8}
              y={y + 3}
              textAnchor="end"
              style={{ fontSize: 9, fill: "#94a3b8", fontFamily: "var(--font-b612-mono), monospace" }}
            >
              {formatAlt(alt)}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {xTicks.map((t, i) => {
        const x = PADDING.left + xScale(t);
        return (
          <text
            key={`x-${i}`}
            x={x}
            y={height - 8}
            textAnchor="middle"
            style={{ fontSize: 9, fill: "#94a3b8", fontFamily: "var(--font-b612-mono), monospace" }}
          >
            {formatTime(t, path[0]?.time ?? 0)}
          </text>
        );
      })}

      {/* Area fill */}
      {areaD && <path d={areaD} fill="url(#altGradient)" />}

      {/* Altitude line */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Phase labels */}
      {phases
        .filter((p) => p.label === "Climb" || p.label === "Cruise" || p.label === "Descent")
        .map((phase, i) => {
          const midIdx = Math.floor((phase.startIdx + phase.endIdx) / 2);
          const midPt = path[midIdx];
          if (!midPt) return null;
          const x = PADDING.left + xScale(midPt.time);
          const y = PADDING.top + yScale(midPt.altitude) - 14;
          return (
            <text
              key={`phase-${i}`}
              x={x}
              y={Math.max(PADDING.top + 4, y)}
              textAnchor="middle"
              style={{
                fontSize: 8,
                fill: "#64748b",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {phase.label}
            </text>
          );
        })}

      {/* Waypoint markers on the profile */}
      {matchedFixes.map((fix) => {
        const pt = path[fix.trackIndex];
        if (!pt) return null;
        const x = PADDING.left + xScale(pt.time);
        const y = PADDING.top + yScale(pt.altitude);
        return (
          <g key={`fix-${fix.name}-${fix.trackIndex}`}>
            <line
              x1={x}
              y1={y}
              x2={x}
              y2={PADDING.top + chartH}
              stroke="#0ea5e9"
              strokeWidth={0.5}
              strokeDasharray="2,2"
              opacity={0.4}
            />
            <circle cx={x} cy={y} r={2.5} fill="#0ea5e9" stroke="#fff" strokeWidth={1} />
            <text
              x={x}
              y={PADDING.top + chartH + 12}
              textAnchor="middle"
              style={{
                fontSize: 7,
                fill: "#64748b",
                fontFamily: "var(--font-b612-mono), monospace",
              }}
            >
              {fix.name}
            </text>
          </g>
        );
      })}

      {/* Hover crosshair + tooltip */}
      {hoverPoint && hoverIdx !== null && (
        <g>
          <line
            x1={PADDING.left + xScale(hoverPoint.time)}
            y1={PADDING.top}
            x2={PADDING.left + xScale(hoverPoint.time)}
            y2={PADDING.top + chartH}
            stroke="#475569"
            strokeWidth={0.5}
            strokeDasharray="3,2"
          />
          <circle
            cx={PADDING.left + xScale(hoverPoint.time)}
            cy={PADDING.top + yScale(hoverPoint.altitude)}
            r={4}
            fill="#0ea5e9"
            stroke="#fff"
            strokeWidth={2}
          />
          <rect
            x={PADDING.left + xScale(hoverPoint.time) - 48}
            y={PADDING.top - 24}
            width={96}
            height={20}
            rx={4}
            fill="#0f172a"
            opacity={0.9}
          />
          <text
            x={PADDING.left + xScale(hoverPoint.time)}
            y={PADDING.top - 10}
            textAnchor="middle"
            style={{ fontSize: 9, fill: "#fff", fontFamily: "var(--font-b612-mono), monospace" }}
          >
            {metersToFeet(hoverPoint.altitude).toLocaleString()}ft · {formatTime(hoverPoint.time, path[0].time)}
          </text>
        </g>
      )}
    </svg>
  );
}
