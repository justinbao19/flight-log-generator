"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import PDFTemplate from "@/components/PDFTemplate";
import {
  FlightData,
  AirlineInfo,
  DisplayMode,
  createEmptyFlightData,
} from "@/lib/types";
import { loadDraft } from "@/lib/storage";

const A4_WIDTH_PX = 794;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;

export default function PreviewPage() {
  const router = useRouter();
  const [flightData, setFlightData] = useState<FlightData>(
    createEmptyFlightData()
  );
  const [airline, setAirline] = useState<AirlineInfo | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("professional");
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef({ startDist: 0, startScale: 1 });

  const fitToScreen = useCallback(() => {
    const padding = 32;
    const availableWidth = window.innerWidth - padding;
    const fitScale = Math.min(availableWidth / A4_WIDTH_PX, 1);
    setScale(Math.max(fitScale, MIN_SCALE));
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.flightNumber) {
      setFlightData(draft);
    }

    const savedMode = localStorage.getItem("flight-log-display-mode");
    if (savedMode === "standard" || savedMode === "professional") {
      setDisplayMode(savedMode);
    }

    fitToScreen();
    setLoaded(true);
  }, [fitToScreen]);

  useEffect(() => {
    if (!flightData?.flightNumber) return;
    const code = flightData.flightNumber
      .match(/^([A-Z0-9]{2})/i)?.[1]
      ?.toUpperCase();
    if (!code) return;

    fetch(`/api/airline-info?code=${code}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((info) => {
        if (info) setAirline(info);
      })
      .catch(() => {
        setAirline({
          name: `Airline ${code}`,
          iata: code,
          logoUrl: `https://pics.avs.io/200/70/${code}.png`,
        });
      });
  }, [flightData?.flightNumber]);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const handleZoomIn = () => setScale((s) => clampScale(s + SCALE_STEP));
  const handleZoomOut = () => setScale((s) => clampScale(s - SCALE_STEP));
  const handleFit = () => fitToScreen();

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
        setScale((s) => clampScale(s + delta));
      }
    },
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const getTouchDist = (t0: React.Touch, t1: React.Touch) => {
    const dx = t0.clientX - t1.clientX;
    const dy = t0.clientY - t1.clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          startDist: getTouchDist(e.touches[0], e.touches[1]),
          startScale: scale,
        };
      }
    },
    [scale]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const ratio = dist / pinchRef.current.startDist;
        setScale(clampScale(pinchRef.current.startScale * ratio));
      }
    },
    []
  );

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!flightData.flightNumber) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-gray-500 text-center">
          No flight data found. Please create a flight log first.
        </p>
        <button
          onClick={() => router.push("/")}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Go to Editor
        </button>
      </div>
    );
  }

  const scalePercent = Math.round(scale * 100);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col touch-none">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={handleZoomOut}
              disabled={scale <= MIN_SCALE}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
              aria-label="Zoom out"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>

            <button
              onClick={handleFit}
              className="min-w-[4rem] px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors tabular-nums"
            >
              {scalePercent}%
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= MAX_SCALE}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
              aria-label="Zoom in"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

            <button
              onClick={handleFit}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors hidden sm:block"
              aria-label="Fit to screen"
              title="Fit to screen"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setDisplayMode((m) =>
                  m === "professional" ? "standard" : "professional"
                )
              }
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {displayMode === "professional" ? "PRO" : "STD"}
            </button>
          </div>
        </div>
      </div>

      {/* Zoomable content area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="flex justify-center py-6 sm:py-8 px-4 min-h-full">
          <div
            ref={contentRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
          >
            <div className="shadow-2xl border border-gray-200 bg-white">
              <PDFTemplate
                data={flightData}
                airline={airline}
                displayMode={displayMode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
