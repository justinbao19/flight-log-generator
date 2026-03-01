"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { FlightTrackData } from "@/lib/types";

interface AltitudeProfileProps {
  trackData: FlightTrackData;
  width?: number;
  height?: number;
}

const PADDING = { top: 32, right: 64, bottom: 42, left: 64 };

const ALT_COLOR = "#0ea5e9";
const SPD_COLOR = "#f59e0b";

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

  const hasSpeed = useMemo(() => path.some((p) => p.speed > 0), [path]);

  const { maxAlt, maxSpd, xScale, yScaleAlt, yScaleSpd } = useMemo(() => {
    const alts = path.map((p) => p.altitude);
    const maxA = Math.max(...alts, 1000);
    const ceilAlt = Math.ceil(maxA / 1000) * 1000;

    const speeds = path.map((p) => p.speed ?? 0);
    const maxS = Math.max(...speeds, 100);
    const ceilSpd = Math.ceil(maxS / 100) * 100;

    const tStart = path[0]?.time ?? 0;
    const tEnd = path[path.length - 1]?.time ?? 1;
    const tRange = tEnd - tStart || 1;

    return {
      maxAlt: ceilAlt,
      maxSpd: ceilSpd,
      xScale: (t: number) => ((t - tStart) / tRange) * chartW,
      yScaleAlt: (alt: number) => chartH - (alt / ceilAlt) * chartH,
      yScaleSpd: (spd: number) => chartH - (spd / ceilSpd) * chartH,
    };
  }, [path, chartW, chartH]);

  const altPathD = useMemo(() => {
    if (path.length === 0) return "";
    const points = path.map(
      (p) => `${PADDING.left + xScale(p.time)},${PADDING.top + yScaleAlt(p.altitude)}`
    );
    return `M${points.join("L")}`;
  }, [path, xScale, yScaleAlt]);

  const altAreaD = useMemo(() => {
    if (!altPathD) return "";
    const bottom = PADDING.top + chartH;
    const firstX = PADDING.left + xScale(path[0].time);
    const lastX = PADDING.left + xScale(path[path.length - 1].time);
    return `${altPathD}L${lastX},${bottom}L${firstX},${bottom}Z`;
  }, [altPathD, path, xScale, chartH]);

  const spdPathD = useMemo(() => {
    if (!hasSpeed || path.length === 0) return "";
    const points = path.map(
      (p) => `${PADDING.left + xScale(p.time)},${PADDING.top + yScaleSpd(p.speed ?? 0)}`
    );
    return `M${points.join("L")}`;
  }, [path, xScale, yScaleSpd, hasSpeed]);

  const spdAreaD = useMemo(() => {
    if (!spdPathD) return "";
    const bottom = PADDING.top + chartH;
    const firstX = PADDING.left + xScale(path[0].time);
    const lastX = PADDING.left + xScale(path[path.length - 1].time);
    return `${spdPathD}L${lastX},${bottom}L${firstX},${bottom}Z`;
  }, [spdPathD, path, xScale, chartH]);

  const phases = useMemo(() => detectPhases(path), [path]);

  const altTicks = useMemo(() => {
    const step = maxAlt <= 5000 ? 1000 : maxAlt <= 15000 ? 3000 : 5000;
    const ticks: number[] = [];
    for (let a = 0; a <= maxAlt; a += step) ticks.push(a);
    return ticks;
  }, [maxAlt]);

  const spdTicks = useMemo(() => {
    if (!hasSpeed) return [];
    const step = maxSpd <= 400 ? 100 : 200;
    const ticks: number[] = [];
    for (let s = 0; s <= maxSpd; s += step) ticks.push(s);
    return ticks;
  }, [maxSpd, hasSpeed]);

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

  return (
    <div>
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
          <stop offset="0%" stopColor={ALT_COLOR} stopOpacity={0.2} />
          <stop offset="100%" stopColor={ALT_COLOR} stopOpacity={0.02} />
        </linearGradient>
        {hasSpeed && (
          <linearGradient id="spdGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SPD_COLOR} stopOpacity={0.12} />
            <stop offset="100%" stopColor={SPD_COLOR} stopOpacity={0.01} />
          </linearGradient>
        )}
      </defs>

      {/* Left Y-axis (altitude) grid + labels */}
      {altTicks.map((alt) => {
        const y = PADDING.top + yScaleAlt(alt);
        return (
          <g key={`y-alt-${alt}`}>
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
              style={{ fontSize: 11, fill: ALT_COLOR, fontFamily: "var(--font-b612-mono), monospace" }}
            >
              {formatAlt(alt)}
            </text>
          </g>
        );
      })}

      {/* Right Y-axis (speed) labels */}
      {spdTicks.map((spd) => {
        const y = PADDING.top + yScaleSpd(spd);
        return (
          <text
            key={`y-spd-${spd}`}
            x={width - PADDING.right + 10}
            y={y + 4}
            textAnchor="start"
            style={{ fontSize: 11, fill: SPD_COLOR, fontFamily: "var(--font-b612-mono), monospace" }}
          >
            {spd}
          </text>
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

      {/* Speed area fill */}
      {spdAreaD && <path d={spdAreaD} fill="url(#spdGradient)" />}

      {/* Altitude area fill */}
      {altAreaD && <path d={altAreaD} fill="url(#altGradient)" />}

      {/* Speed line */}
      {spdPathD && (
        <path
          d={spdPathD}
          fill="none"
          stroke={SPD_COLOR}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.8}
        />
      )}

      {/* Altitude line */}
      {altPathD && (
        <path
          d={altPathD}
          fill="none"
          stroke={ALT_COLOR}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Legend */}
      <g transform={`translate(${PADDING.left + 4}, ${PADDING.top - 20})`}>
        <line x1={0} y1={0} x2={14} y2={0} stroke={ALT_COLOR} strokeWidth={2.5} strokeLinecap="round" />
        <text x={18} y={4} style={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }}>ALT</text>
        {hasSpeed && (
          <>
            <line x1={46} y1={0} x2={60} y2={0} stroke={SPD_COLOR} strokeWidth={1.5} strokeLinecap="round" />
            <text x={64} y={4} style={{ fontSize: 9, fill: "#64748b", fontWeight: 600 }}>GS</text>
          </>
        )}
      </g>

      {/* Axis unit labels */}
      <text
        x={PADDING.left - 10}
        y={PADDING.top - 6}
        textAnchor="end"
        style={{ fontSize: 9, fill: ALT_COLOR, fontWeight: 600 }}
      >
        ft
      </text>
      {hasSpeed && (
        <text
          x={width - PADDING.right + 10}
          y={PADDING.top - 6}
          textAnchor="start"
          style={{ fontSize: 9, fill: SPD_COLOR, fontWeight: 600 }}
        >
          kts
        </text>
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
              y: Math.max(PADDING.top + 6, PADDING.top + yScaleAlt(midPt.altitude) - 16),
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
          const y = PADDING.top + yScaleAlt(pt.altitude);
          const showLabel = x - lastLabelX >= minLabelGap;
          if (showLabel) lastLabelX = x;
          return (
            <g key={`fix-${fix.name}-${fix.trackIndex}`}>
              <line
                x1={x}
                y1={y}
                x2={x}
                y2={PADDING.top + chartH}
                stroke={ALT_COLOR}
                strokeWidth={0.5}
                strokeDasharray="2,2"
                opacity={0.4}
              />
              <circle cx={x} cy={y} r={3} fill={ALT_COLOR} stroke="#fff" strokeWidth={1.5} />
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

      {/* Hover crosshair + dots */}
      {hoverPoint && hoverIdx !== null && (() => {
        const hx = PADDING.left + xScale(hoverPoint.time);
        const hyAlt = PADDING.top + yScaleAlt(hoverPoint.altitude);

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
            {/* Altitude dot */}
            <circle
              cx={hx}
              cy={hyAlt}
              r={5}
              fill={ALT_COLOR}
              stroke="#fff"
              strokeWidth={2.5}
            />
            {/* Speed dot */}
            {hasSpeed && (
              <circle
                cx={hx}
                cy={PADDING.top + yScaleSpd(hoverPoint.speed ?? 0)}
                r={4}
                fill={SPD_COLOR}
                stroke="#fff"
                strokeWidth={2}
              />
            )}
            {/* Inline altitude label */}
            <text
              x={hx + 8}
              y={hyAlt - 8}
              textAnchor="start"
              style={{ fontSize: 10, fill: ALT_COLOR, fontWeight: 700, fontFamily: "var(--font-b612-mono), monospace" }}
            >
              {metersToFeet(hoverPoint.altitude).toLocaleString()}ft
            </text>
          </g>
        );
      })()}
    </svg>

    {/* Data readout panel below chart */}
    {hoverPoint ? (
      <div
        className="flex items-center justify-center gap-4 sm:gap-6 mt-2 px-2 py-2 rounded-xl bg-slate-50 border border-slate-100 transition-opacity"
        style={{ fontFamily: "var(--font-b612-mono), monospace" }}
      >
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Time</div>
          <div className="text-sm font-bold text-slate-700">{formatTime(hoverPoint.time, path[0].time)}</div>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: ALT_COLOR }}>Altitude</div>
          <div className="text-sm font-bold text-slate-900">{metersToFeet(hoverPoint.altitude).toLocaleString()} ft</div>
        </div>
        {hasSpeed && (
          <>
            <div className="w-px h-6 bg-slate-200" />
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: SPD_COLOR }}>Speed</div>
              <div className="text-sm font-bold text-slate-900">{Math.round(hoverPoint.speed ?? 0)} kts</div>
            </div>
          </>
        )}
      </div>
    ) : (
      <div className="flex items-center justify-center mt-2 px-2 py-2 rounded-xl bg-slate-50/50 border border-slate-100/50">
        <span className="text-[10px] text-slate-400 font-medium">
          {typeof window !== "undefined" && "ontouchstart" in window
            ? "Drag on chart to inspect"
            : "Hover on chart to inspect"}
        </span>
      </div>
    )}
    </div>
  );
}
