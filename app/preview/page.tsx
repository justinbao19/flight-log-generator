"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Map, Maximize2, Minus, Plus } from "lucide-react";
import PDFTemplate from "@/components/PDFTemplate";
import FlightTrackView from "@/components/FlightTrackView";
import WaypointsPreview from "@/components/WaypointsPreview";
import {
  FlightData,
  FlightTrackData,
  AirlineInfo,
  DisplayMode,
  createEmptyFlightData,
} from "@/lib/types";
import {
  clearActiveDraft,
  hasDraftContent,
  loadActiveDraft,
  loadDraft,
  loadTrackData,
  saveActiveDraft,
} from "@/lib/storage";

const A4_WIDTH_PX = 794;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;

type PreviewTab = "pdf" | "track";

function DisplayModeSwitch({
  displayMode,
  onChange,
}: {
  displayMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-gray-200/80 bg-white/60 p-0.5 text-xs font-semibold shadow-sm"
      role="group"
      aria-label="Display mode"
    >
      <button
        type="button"
        onClick={() => onChange("standard")}
        className={`h-7 rounded-full px-3 transition-colors ${
          displayMode === "standard"
            ? "bg-sky-50 text-sky-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Decoded
      </button>
      <button
        type="button"
        onClick={() => onChange("professional")}
        className={`h-7 rounded-full px-3 transition-colors ${
          displayMode === "professional"
            ? "bg-sky-50 text-sky-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Raw
      </button>
    </div>
  );
}

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
    const padding = 16;
    const availableWidth = window.innerWidth - padding;
    const fitScale = Math.min(availableWidth / A4_WIDTH_PX, 1);
    setScale(Math.max(fitScale, MIN_SCALE));
  }, []);

  useEffect(() => {
    const loadSavedState = window.setTimeout(() => {
      const navigationEntry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isReload = navigationEntry?.type === "reload";
      if (isReload) clearActiveDraft();

      const draft = isReload ? null : loadActiveDraft();
      const fallbackDraft = isReload ? null : loadDraft();
      const nextDraft = hasDraftContent(draft) ? draft : fallbackDraft;
      if (hasDraftContent(nextDraft)) {
        setFlightData(nextDraft);
      }

      const savedMode = localStorage.getItem("flight-log-display-mode");
      if (savedMode === "standard" || savedMode === "professional") {
        setDisplayMode(savedMode);
      }

      const savedTrack =
        nextDraft?.flightNumber && nextDraft?.date
          ? loadTrackData(nextDraft.flightNumber, nextDraft.date)
          : null;
      if (savedTrack) setTrackData(savedTrack);

      fitToScreen();
      setLoaded(true);
    }, 0);

    window.addEventListener("resize", fitToScreen);
    return () => {
      window.clearTimeout(loadSavedState);
      window.removeEventListener("resize", fitToScreen);
    };
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

  const handleBackToEditor = () => {
    saveActiveDraft(flightData);
    router.push("/app");
  };

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
          onClick={handleBackToEditor}
          className="rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
        >
          Go to Editor
        </button>
      </div>
    );
  }

  const scalePercent = Math.round(scale * 100);
  const hasWaypointText = Boolean(flightData.majorWaypoints?.trim());
  const hasTrackView = Boolean(trackData) || hasWaypointText;
  const effectiveActiveTab: PreviewTab = hasTrackView ? activeTab : "pdf";
  const trackTabLabel = trackData ? "Flight Track" : "Waypoints";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col touch-none">
      {/* Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/85 shadow-[0_-8px_30px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl pb-safe sm:sticky sm:top-0 sm:bottom-auto sm:left-auto sm:right-auto sm:border-t-0 sm:border-b sm:shadow-sm">
        <div className="flex flex-wrap justify-center gap-3 px-4 py-3 sm:hidden">
          {hasTrackView && (
            <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-semibold shadow-inner">
              <button
                onClick={() => setActiveTab("pdf")}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 transition-all ${
                  effectiveActiveTab === "pdf"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                PDF Preview
              </button>
              <button
                onClick={() => setActiveTab("track")}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 transition-all ${
                  effectiveActiveTab === "track"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                <Map className="h-3.5 w-3.5" />
                {trackTabLabel}
                {trackData && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
              </button>
            </div>
          )}
          <DisplayModeSwitch
            displayMode={displayMode}
            onChange={setDisplayMode}
          />
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3">
          <button
            onClick={handleBackToEditor}
            className="inline-flex h-9 w-fit items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 sm:px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Editor</span>
          </button>

          <div className="hidden min-w-0 items-center justify-center sm:flex">
            {hasTrackView && (
              <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-semibold shadow-inner">
                <button
                  onClick={() => setActiveTab("pdf")}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 transition-all ${
                    effectiveActiveTab === "pdf"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  PDF Preview
                </button>
                <button
                  onClick={() => setActiveTab("track")}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 transition-all ${
                    effectiveActiveTab === "track"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Map className="h-3.5 w-3.5" />
                  {trackTabLabel}
                  {trackData && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                </button>
              </div>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
            <div className="mr-1 hidden sm:block">
              <DisplayModeSwitch
                displayMode={displayMode}
                onChange={setDisplayMode}
              />
            </div>
            {effectiveActiveTab === "pdf" && (
              <>
                <button
                  onClick={handleZoomOut}
                  disabled={scale <= MIN_SCALE}
                  className="rounded-xl p-2 text-gray-700 transition-colors hover:bg-gray-100/80 disabled:text-gray-300 disabled:hover:bg-transparent"
                  aria-label="Zoom out"
                >
                  <Minus className="h-[18px] w-[18px]" />
                </button>

                <button
                  onClick={handleFit}
                  className="min-w-12 rounded-xl px-2 py-1.5 text-sm font-semibold tabular-nums text-gray-700 transition-colors hover:bg-gray-100/80 sm:min-w-14"
                >
                  {scalePercent}%
                </button>

                <button
                  onClick={handleZoomIn}
                  disabled={scale >= MAX_SCALE}
                  className="rounded-xl p-2 text-gray-700 transition-colors hover:bg-gray-100/80 disabled:text-gray-300 disabled:hover:bg-transparent"
                  aria-label="Zoom in"
                >
                  <Plus className="h-[18px] w-[18px]" />
                </button>

                <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

                <button
                  onClick={handleFit}
                  className="hidden rounded-xl p-2 text-gray-700 transition-colors hover:bg-gray-100/80 sm:block"
                  aria-label="Fit to screen"
                  title="Fit to screen"
                >
                  <Maximize2 className="h-[18px] w-[18px]" />
                </button>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Content area */}
      {effectiveActiveTab === "pdf" ? (
        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <div className="flex justify-center py-4 sm:py-8 px-2 sm:px-4 min-h-full pb-28 sm:pb-8">
            <div
              ref={contentRef}
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
                height: scale < 1 ? `calc(${scale * 100}% + 1px)` : undefined,
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
              <WaypointsPreview waypoints={flightData.majorWaypoints} />
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
