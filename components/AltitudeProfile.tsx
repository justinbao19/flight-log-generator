"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { FlightTrackData } from "@/lib/types";

interface AltitudeProfileProps {
  trackData: FlightTrackData;
  width?: number;
  height?: number;
}

const PADDING = { top: 32, right: 24, bottom: 42, left: 64 };

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
  height = 220,
}: AltitudeProfileProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { path, matchedFixes } = trackData;

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const { maxAlt, xScale, yScale } = useMemo(() => {
    const alts = path.map((p) => p.altitude);
    const maxA = Math.max(...alts, 1000);
    const ceilAlt = Math.ceil(maxA / 1000) * 1000;

    const tStart = path[0]?.time ?? 0;
    const tEnd = path[path.length - 1]?.time ?? 1;
    const tRange = tEnd - tStart || 1;

    return {
      maxAlt: ceilAlt,
      xScale: (t: number) => ((t - tStart) / tRange) * chartW,
      yScale: (alt: number) => chartH - (alt / ceilAlt) * chartH,
    };
  }, [path, chartW, chartH]);

  const pathD = useMemo(() => {
    if (path.length === 0) return "";
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

  const resolveIdx = useCallback(
    (clientX: number) => {
      if (!svgRef.current || path.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mx = clientX - rect.left;
      const scaledX = (mx / rect.width) * width - PADDING.left;
      const ratio = scaledX / chartW;
      const idx = Math.round(ratio * (path.length - 1));
      setHoverIdx(Math.max(0, Math.min(path.length - 1, idx)));
    },
    [path, chartW, width]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => resolveIdx(e.clientX),
    [resolveIdx]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      e.preventDefault();
      resolveIdx(e.touches[0].clientX);
    },
    [resolveIdx]
  );

  const hoverPoint = hoverIdx !== null ? path[hoverIdx] : null;

  const tooltipW = 120;
  const tooltipH = 44;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full select-none"
      style={{ maxHeight: height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
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
              x={PADDING.left - 10}
              y={y + 4}
              textAnchor="end"
              style={{ fontSize: 11, fill: "#94a3b8", fontFamily: "var(--font-b612-mono), monospace" }}
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
            y={height - 10}
            textAnchor="middle"
            style={{ fontSize: 11, fill: "#94a3b8", fontFamily: "var(--font-b612-mono), monospace" }}
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
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Phase labels — deduplicated and spaced to avoid overlap */}
      {(() => {
        const candidates = phases
          .filter((p) => p.label === "Climb" || p.label === "Cruise" || p.label === "Descent")
          .map((phase) => {
            const midIdx = Math.floor((phase.startIdx + phase.endIdx) / 2);
            const midPt = path[midIdx];
            if (!midPt) return null;
            return {
              label: phase.label,
              x: PADDING.left + xScale(midPt.time),
              y: Math.max(PADDING.top + 6, PADDING.top + yScale(midPt.altitude) - 16),
            };
          })
          .filter(Boolean) as { label: string; x: number; y: number }[];

        const minGap = 60;
        const placed: { label: string; x: number; y: number }[] = [];
        for (const c of candidates) {
          if (placed.some((p) => Math.abs(p.x - c.x) < minGap)) continue;
          placed.push(c);
        }

        return placed.map((p, i) => (
          <text
            key={`phase-${i}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            style={{
              fontSize: 10,
              fill: "#64748b",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {p.label}
          </text>
        ));
      })()}

      {/* Waypoint markers on the profile — spaced to avoid label overlap */}
      {(() => {
        const minLabelGap = 40;
        let lastLabelX = -Infinity;
        return matchedFixes.map((fix) => {
          const pt = path[fix.trackIndex];
          if (!pt) return null;
          const x = PADDING.left + xScale(pt.time);
          const y = PADDING.top + yScale(pt.altitude);
          const showLabel = x - lastLabelX >= minLabelGap;
          if (showLabel) lastLabelX = x;
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
              <circle cx={x} cy={y} r={3} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
              {showLabel && (
                <text
                  x={x}
                  y={PADDING.top + chartH + 14}
                  textAnchor="middle"
                  style={{
                    fontSize: 10,
                    fill: "#64748b",
                    fontWeight: 500,
                    fontFamily: "var(--font-b612-mono), monospace",
                  }}
                >
                  {fix.name}
                </text>
              )}
            </g>
          );
        });
      })()}

      {/* Hover crosshair + tooltip */}
      {hoverPoint && hoverIdx !== null && (() => {
        const hx = PADDING.left + xScale(hoverPoint.time);
        const hy = PADDING.top + yScale(hoverPoint.altitude);
        let tooltipX = hx - tooltipW / 2;
        if (tooltipX < PADDING.left) tooltipX = PADDING.left;
        if (tooltipX + tooltipW > width - PADDING.right) tooltipX = width - PADDING.right - tooltipW;
        const tooltipY = PADDING.top - tooltipH - 6;

        return (
          <g>
            <line
              x1={hx}
              y1={PADDING.top}
              x2={hx}
              y2={PADDING.top + chartH}
              stroke="#475569"
              strokeWidth={0.5}
              strokeDasharray="3,2"
            />
            <circle
              cx={hx}
              cy={hy}
              r={5}
              fill="#0ea5e9"
              stroke="#fff"
              strokeWidth={2.5}
            />
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipW}
              height={tooltipH}
              rx={8}
              fill="#0f172a"
              opacity={0.92}
            />
            <text
              x={tooltipX + tooltipW / 2}
              y={tooltipY + 17}
              textAnchor="middle"
              style={{ fontSize: 12, fill: "#fff", fontWeight: 700, fontFamily: "var(--font-b612-mono), monospace" }}
            >
              {metersToFeet(hoverPoint.altitude).toLocaleString()} ft
            </text>
            <text
              x={tooltipX + tooltipW / 2}
              y={tooltipY + 34}
              textAnchor="middle"
              style={{ fontSize: 10, fill: "#94a3b8", fontFamily: "var(--font-b612-mono), monospace" }}
            >
              {formatTime(hoverPoint.time, path[0].time)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
