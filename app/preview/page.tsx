"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import PDFTemplate from "@/components/PDFTemplate";
import FlightTrackView from "@/components/FlightTrackView";
import {
  FlightData,
  FlightTrackData,
  AirlineInfo,
  DisplayMode,
  createEmptyFlightData,
} from "@/lib/types";
import { loadDraft, loadTrackData } from "@/lib/storage";

const A4_WIDTH_PX = 794;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;

type PreviewTab = "pdf" | "track";

export default function PreviewPage() {
  const router = useRouter();
  const [flightData, setFlightData] = useState<FlightData>(
    createEmptyFlightData()
  );
  const [airline, setAirline] = useState<AirlineInfo | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("professional");
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>("pdf");
  const [trackData, setTrackData] = useState<FlightTrackData | null>(null);

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

    const savedTrack = loadTrackData();
    if (savedTrack) setTrackData(savedTrack);

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
        <div className="animate-spin h-8 w-8 border-4 border-sky-500 border-t-transparent rounded-full" />
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
          onClick={() => router.push("/app")}
          className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
        >
          Go to Editor
        </button>
      </div>
    );
  }

  const scalePercent = Math.round(scale * 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col touch-none">
      {/* Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 sm:sticky sm:top-0 z-50 bg-white/80 backdrop-blur-xl border-t sm:border-t-0 sm:border-b border-gray-200 shadow-[0_-8px_30px_-4px_rgba(0,0,0,0.05)] sm:shadow-sm pb-safe">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/app")}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to Editor</span>
          </button>

          {/* Tab switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            <button
              onClick={() => setActiveTab("pdf")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "pdf"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              PDF Preview
            </button>
            <button
              onClick={() => setActiveTab("track")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "track"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Flight Track
              {trackData && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {activeTab === "pdf" && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={scale <= MIN_SCALE}
                  className="p-2.5 rounded-xl hover:bg-gray-100/80 text-gray-700 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                  aria-label="Zoom out"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </button>

                <button
                  onClick={handleFit}
                  className="min-w-[4rem] px-2 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100/80 rounded-xl transition-colors tabular-nums"
                >
                  {scalePercent}%
                </button>

                <button
                  onClick={handleZoomIn}
                  disabled={scale >= MAX_SCALE}
                  className="p-2.5 rounded-xl hover:bg-gray-100/80 text-gray-700 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                  aria-label="Zoom in"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

                <button
                  onClick={handleFit}
                  className="p-2.5 rounded-xl hover:bg-gray-100/80 text-gray-700 transition-colors hidden sm:block"
                  aria-label="Fit to screen"
                  title="Fit to screen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </button>
              </>
            )}

            <button
              onClick={() =>
                setDisplayMode((m) =>
                  m === "professional" ? "standard" : "professional"
                )
              }
              className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              {displayMode === "professional" ? "PRO" : "STD"}
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      {activeTab === "pdf" ? (
        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <div className="flex justify-center py-6 sm:py-8 px-4 min-h-full pb-28 sm:pb-8">
            <div
              ref={contentRef}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
              }}
            >
              <div className="shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] border border-gray-100 bg-white rounded-lg overflow-hidden">
                <PDFTemplate
                  data={flightData}
                  airline={airline}
                  displayMode={displayMode}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="py-6 sm:py-8 px-4 pb-28 sm:pb-8">
            {trackData ? (
              <FlightTrackView trackData={trackData} />
            ) : (
              <div className="max-w-lg mx-auto text-center py-20">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  No Flight Track Data
                </h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Go back to the editor and click &quot;Fetch Track&quot; to load
                  flight track data. Track data is available for flights within
                  the past 30 days.
                </p>
                <button
                  onClick={() => router.push("/app")}
                  className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition-colors shadow-[0_4px_14px_0_rgba(14,165,233,0.25)]"
                >
                  Go to Editor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 pb-4 sm:pb-2">
        Built with ❤️ by{" "}
        <a href="https://x.com/JustinBao_" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-700 font-medium transition-colors">Justin</a>
      </div>
    </div>
  );
}
