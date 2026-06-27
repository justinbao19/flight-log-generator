"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronDown, Download, Edit3, FileText, Map, Maximize2, Plus } from "lucide-react";
import UploadArea from "@/components/UploadArea";
import PDFTemplate from "@/components/PDFTemplate";
import FlightTrackView from "@/components/FlightTrackView";
import WaypointsPreview from "@/components/WaypointsPreview";
import {
  FlightData,
  FlightTrackData,
  FlightLookupResult,
  AirlineInfo,
  DisplayMode,
  createEmptyFlightData,
  createSampleFlightData,
} from "@/lib/types";
import {
  generatePDF,
  generatePNG,
  generateFilename,
  ExportFormat,
} from "@/lib/pdfGenerator";
import {
  clearActiveDraft,
  clearDraft,
  clearTrackData,
  hasDraftContent,
  loadActiveDraft,
  loadDraft,
  loadTrackData,
  saveActiveDraft,
  saveDraft,
  saveTrackData,
} from "@/lib/storage";

type Step = "input" | "preview";
type PreviewTab = "pdf" | "track";

const A4_WIDTH_PX = 794;

function PDFPreviewWrapper({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pdfScale, setPdfScale] = useState(1);

  useEffect(() => {
    const calcScale = () => {
      if (!wrapperRef.current) return;
      const padding = 24;
      const availableWidth = wrapperRef.current.offsetWidth - padding;
      setPdfScale(Math.min(availableWidth / A4_WIDTH_PX, 1));
    };
    calcScale();
    window.addEventListener("resize", calcScale);
    return () => window.removeEventListener("resize", calcScale);
  }, []);

  return (
    <div ref={wrapperRef} className="flex justify-center pb-8 px-2 sm:px-0">
      <div
        style={{
          transform: `scale(${pdfScale})`,
          transformOrigin: "top center",
          height: pdfScale < 1 ? `calc(${pdfScale * 100}% + 1px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DisplayModeSwitch({
  displayMode,
  onChange,
}: {
  displayMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  return (
    <div
      className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold shadow-inner"
      role="group"
      aria-label="Display mode"
    >
      <button
        type="button"
        onClick={() => onChange("standard")}
        className={`h-8 w-20 rounded-lg px-2 transition-colors ${
          displayMode === "standard"
            ? "bg-white text-sky-700 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Decoded
      </button>
      <button
        type="button"
        onClick={() => onChange("professional")}
        className={`h-8 w-20 rounded-lg px-2 transition-colors ${
          displayMode === "professional"
            ? "bg-white text-sky-700 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Raw
      </button>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("pdf");
  const [flightData, setFlightData] = useState<FlightData>(
    createEmptyFlightData()
  );
  const [airline, setAirline] = useState<AirlineInfo | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("professional");
  const [generating, setGenerating] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackData, setTrackData] = useState<FlightTrackData | null>(null);
  const [trackError, setTrackError] = useState<{ message: string; availableDates?: string[] } | null>(null);
  const [flightLookupLoading, setFlightLookupLoading] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"saved" | "unsaved" | "idle">(
    "idle"
  );
  const [savedDraft, setSavedDraft] = useState<FlightData | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSave = useRef(true);

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isReload = navigationEntry?.type === "reload";
    if (isReload) clearActiveDraft();

    const activeDraft = isReload ? null : loadActiveDraft();
    const savedManualDraft = loadDraft();
    let resumeDraftTimer: ReturnType<typeof setTimeout> | null = null;

    if (hasDraftContent(activeDraft)) {
      resumeDraftTimer = setTimeout(() => {
        skipNextAutoSave.current = true;
        setFlightData(activeDraft);
        setSavedDraft(savedManualDraft ?? activeDraft);
        setDraftStatus("saved");
      }, 0);
    } else {
      if (hasDraftContent(savedManualDraft)) {
        resumeDraftTimer = setTimeout(() => setSavedDraft(savedManualDraft), 0);
      }
      skipNextAutoSave.current = false;
    }

    return () => {
      if (resumeDraftTimer) clearTimeout(resumeDraftTimer);
    };
  }, []);

  useEffect(() => {
    let trackTimer: ReturnType<typeof setTimeout> | null = null;

    if (flightData.flightNumber && flightData.date) {
      trackTimer = setTimeout(() => {
        const saved = loadTrackData(flightData.flightNumber, flightData.date);
        setTrackData(saved ?? null);
      }, 0);
    } else {
      trackTimer = setTimeout(() => setTrackData(null), 0);
    }

    return () => {
      if (trackTimer) clearTimeout(trackTimer);
    };
  }, [flightData.flightNumber, flightData.date]);

  useEffect(() => {
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }

    setDraftStatus("unsaved");
    saveActiveDraft(flightData);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (hasDraftContent(flightData)) {
        setSavedDraft(flightData);
        setDraftStatus("saved");
      } else {
        setSavedDraft(null);
        setDraftStatus("idle");
      }
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [flightData]);

  useEffect(() => {
    const persistActiveDraft = () => saveActiveDraft(flightData);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistActiveDraft();
    };

    window.addEventListener("pagehide", persistActiveDraft);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", persistActiveDraft);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flightData]);

  const fetchAirlineInfo = useCallback(async (flightNumber: string) => {
    const code = flightNumber.match(/^([A-Z0-9]{2})/i)?.[1]?.toUpperCase();
    if (!code) return;

    try {
      const res = await fetch(`/api/airline-info?code=${code}`);
      if (res.ok) {
        const info = await res.json();
        setAirline(info);
      }
    } catch {
      setAirline({
        name: `Airline ${code}`,
        iata: code,
        logoUrl: `https://pics.avs.io/200/70/${code}.png`,
      });
    }
  }, []);

  useEffect(() => {
    const airlineTimer = setTimeout(() => {
      if (flightData?.flightNumber) {
        fetchAirlineInfo(flightData.flightNumber);
      } else {
        setAirline(null);
      }
    }, 0);

    return () => clearTimeout(airlineTimer);
  }, [flightData?.flightNumber, fetchAirlineInfo]);

  const handleSaveDraft = () => {
    saveActiveDraft(flightData);
    saveDraft(flightData);
    setSavedDraft(flightData);
    setDraftStatus("saved");
  };

  const handleResumeDraft = () => {
    if (!savedDraft) return;
    skipNextAutoSave.current = true;
    setFlightData(savedDraft);
    setDraftStatus("saved");
  };

  const handleOpenFullPreview = () => {
    if (hasDraftContent(flightData)) {
      saveActiveDraft(flightData);
      setDraftStatus("saved");
    }
  };

  useEffect(() => {
    localStorage.setItem("flight-log-display-mode", displayMode);
  }, [displayMode]);

  const handleLoadSample = async () => {
    const sampleData = createSampleFlightData();

    try {
      const [photoRes, trackRes] = await Promise.all([
        fetch("/data/sample-photo.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch("/data/sample-track.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (photoRes?.dataUrl) {
        sampleData.selectedPhoto = {
          dataUrl: photoRes.dataUrl,
          photographer: photoRes.photographer ?? "",
          link: photoRes.link ?? "",
        };
      }

      if (trackRes) {
        setTrackData(trackRes as FlightTrackData);
        saveTrackData(trackRes as FlightTrackData, sampleData.flightNumber, sampleData.date);
      }
    } catch {
      // proceed without supplementary data
    }

    setFlightData(sampleData);
    setStep("preview");
  };

  const handleNewFlight = () => {
    skipNextAutoSave.current = true;
    setFlightData(createEmptyFlightData());
    setAirline(null);
    clearActiveDraft();
    clearDraft();
    setSavedDraft(null);
    setDraftStatus("idle");
    setStep("input");
    setPreviewTab("pdf");
    clearTrackData();
    setTrackData(null);
  };

  const fetchFlightTrack = useCallback(async (overrideDate?: string) => {
    if (!flightData.flightNumber || (!flightData.date && !overrideDate)) return;
    const dateToUse = overrideDate || flightData.date;
    setTrackLoading(true);
    setTrackError(null);
    try {
      const res = await fetch(
        `/api/flight-track?flight=${encodeURIComponent(flightData.flightNumber)}&date=${dateToUse}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        setTrackError({
          message: body.error || "Failed to fetch flight track",
          availableDates: body.availableDates,
        });
        return;
      }
      const track: FlightTrackData = await res.json();
      saveTrackData(track, flightData.flightNumber, dateToUse);
      setTrackData(track);
      setTrackError(null);

      if (track.matchedFixes?.length > 0) {
        const wpStr = track.matchedFixes
          .map((f) => f.name)
          .join(" - ");
        setFlightData((prev) => ({ ...prev, majorWaypoints: wpStr }));
      }
    } catch (err) {
      console.error("Track fetch failed:", err);
      setTrackError({ message: "Network error. Please try again." });
    } finally {
      setTrackLoading(false);
    }
  }, [flightData.flightNumber, flightData.date]);

  const fetchFlightLookup = useCallback(async () => {
    if (!flightData.flightNumber) return;
    setFlightLookupLoading(true);
    try {
      let url = `/api/flight-lookup?flight=${encodeURIComponent(flightData.flightNumber)}`;
      if (flightData.date) {
        url += `&date=${flightData.date}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        alert(body.error || "Failed to lookup flight");
        return;
      }
      const result: FlightLookupResult = await res.json();

      setFlightData((prev) => {
        const next = { ...prev };
        if (result.registration && !prev.registration) {
          next.registration = result.registration;
        }
        if (result.aircraftType && !prev.aircraftType) {
          next.aircraftType = result.aircraftType;
        }
        if (result.callSign && !prev.callSign) {
          next.callSign = result.callSign;
        }
        if (result.origin?.iata && !prev.departure?.airport?.iata) {
          next.departure = {
            ...prev.departure,
            airport: {
              iata: result.origin.iata,
              icao: (result.origin as { icao?: string }).icao || "",
              name: result.origin.name || "",
            },
          };
        }
        if (result.destination?.iata && !prev.arrival?.airport?.iata) {
          next.arrival = {
            ...prev.arrival,
            airport: {
              iata: result.destination.iata,
              icao: (result.destination as { icao?: string }).icao || "",
              name: result.destination.name || "",
            },
          };
        }
        return next;
      });
    } catch (err) {
      console.error("Flight lookup failed:", err);
      alert("Failed to lookup flight info. Please try again.");
    } finally {
      setFlightLookupLoading(false);
    }
  }, [flightData.flightNumber, flightData.date]);

  const handleExport = async (format: ExportFormat) => {
    if (!flightData) return;
    setShowExportMenu(false);
    setGenerating(true);
    try {
      const filename = generateFilename(
        flightData.flightNumber,
        flightData.date,
        format
      );
      if (format === "png") {
        await generatePNG("pdf-content", filename);
      } else {
        await generatePDF("pdf-content", filename);
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  const hasFlightDataContent = hasDraftContent(flightData);
  const hasWaypointText = Boolean(flightData.majorWaypoints?.trim());
  const hasTrackView = Boolean(trackData) || hasWaypointText;
  const effectivePreviewTab: PreviewTab = hasTrackView ? previewTab : "pdf";
  const trackTabLabel = trackData ? "Flight Track" : "Waypoints";
  const downloadDisabled = generating || effectivePreviewTab !== "pdf";

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <svg
              className="h-6 w-6 sm:h-7 sm:w-7 text-sky-500 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              Flight Log Generator
            </h1>
          </div>

          {step === "preview" && (
            <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setStep("input")}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:px-3"
              >
                <Edit3 className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={handleNewFlight}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:px-3"
                title="New Flight"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden lg:inline">New Flight</span>
              </button>
              <a
                href="/preview"
                onClick={handleOpenFullPreview}
                className="group relative hidden h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
                title="Full Preview"
                aria-label="Open full preview"
              >
                <Maximize2 className="h-4 w-4" />
                <span className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg group-hover:block">
                  Full Preview
                </span>
              </a>
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  disabled={downloadDisabled}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_0_rgba(14,165,233,0.25)] transition-all hover:bg-sky-400 hover:shadow-[0_6px_20px_rgba(14,165,233,0.3)] disabled:cursor-not-allowed disabled:opacity-45 sm:px-3"
                >
                  {generating ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="hidden sm:inline">Exporting...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span className="hidden md:inline">Download</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-2xl border border-slate-100 bg-white/95 py-1.5 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl">
                    <button onClick={() => handleExport("pdf")} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                      <FileText className="h-4 w-4 text-red-500" />
                      Export PDF
                    </button>
                    <button onClick={() => handleExport("png")} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                      <Download className="h-4 w-4 text-emerald-500" />
                      Export PNG
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Step Indicator */}
      {step === "input" && (
        <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-4 sm:pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm sm:mb-6">
            <button className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-xs text-white">
                1
              </span>
              Input
            </button>
            <svg
              className="h-4 w-4 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <button
              onClick={() => {
                if (flightData.flightNumber && flightData.date) setStep("preview");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                flightData.flightNumber && flightData.date
                  ? "text-slate-500 hover:text-slate-700"
                  : "cursor-not-allowed text-slate-300"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-500">
                2
              </span>
              Preview
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 sm:pb-12">
        {/* Step 1: Input */}
        {step === "input" && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200/80">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">
                    Flight Data
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-slate-500">
                    <span>
                      {hasFlightDataContent
                        ? "Review and refine the recognized flight details."
                        : "Import with AI or fill in the details manually."}
                    </span>
                    {savedDraft && !flightData.flightNumber && !flightData.date && (
                      <>
                        <span className="text-slate-300">·</span>
                        <button
                          onClick={handleResumeDraft}
                          className="font-medium text-sky-600 transition-colors hover:text-sky-700"
                        >
                          Resume Draft
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {airline && (
                    <div className="hidden h-8 w-36 items-center justify-end overflow-hidden lg:flex">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={airline.logoUrl}
                        alt={airline.name}
                        className="h-auto max-h-6 max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <button
                    onClick={handleLoadSample}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-sky-600 shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <FileText className="h-4 w-4" />
                    Try Sample
                  </button>
                  <DisplayModeSwitch
                    displayMode={displayMode}
                    onChange={setDisplayMode}
                  />
                </div>
              </div>
              <UploadArea
                flightData={flightData}
                onFlightDataChange={setFlightData}
                onPreview={() => setStep("preview")}
                apiKey=""
                draftStatus={draftStatus}
                onSaveDraft={handleSaveDraft}
                displayMode={displayMode}
                onFetchTrack={fetchFlightTrack}
                trackLoading={trackLoading}
                trackError={trackError}
                onFlightLookup={fetchFlightLookup}
                flightLookupLoading={flightLookupLoading}
              />
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && flightData && (
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2 sm:mb-6">
              {hasTrackView && (
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs font-semibold shadow-inner">
                  <button
                    onClick={() => setPreviewTab("pdf")}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 transition-all sm:px-4 ${
                      effectivePreviewTab === "pdf"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    PDF Preview
                  </button>
                  <button
                    onClick={() => setPreviewTab("track")}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 transition-all sm:px-4 ${
                      effectivePreviewTab === "track"
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
              <DisplayModeSwitch
                displayMode={displayMode}
                onChange={setDisplayMode}
              />
            </div>

            {/* Content area */}
            {effectivePreviewTab === "pdf" ? (
              <PDFPreviewWrapper>
                <div className="shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] border border-slate-200/80 bg-white overflow-hidden max-w-full mb-2 rounded-xl">
                  <PDFTemplate
                    data={flightData}
                    airline={airline}
                    displayMode={displayMode}
                  />
                </div>
              </PDFPreviewWrapper>
            ) : (
              <div className="pb-24 sm:pb-8">
                {trackData ? (
                  <FlightTrackView trackData={trackData} />
                ) : (
                  <WaypointsPreview waypoints={flightData.majorWaypoints} />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-3 pb-4 sm:px-4 text-center text-xs text-slate-400">
        Built with ❤️ by{" "}
        <a href="https://x.com/JustinBao_" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-700 font-medium transition-colors">Justin</a>
        <span className="mx-1.5 text-slate-300">·</span>
        <Link href="/guide" className="font-medium text-slate-500 transition-colors hover:text-slate-700">
          Agent Guide
        </Link>
      </footer>
    </div>
  );
}
