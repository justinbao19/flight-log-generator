"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import UploadArea from "@/components/UploadArea";
import PDFTemplate from "@/components/PDFTemplate";
import {
  FlightData,
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
import { saveDraft, loadDraft, clearDraft, saveTrackData, clearTrackData } from "@/lib/storage";

type Step = "input" | "preview";

export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [flightData, setFlightData] = useState<FlightData>(
    createEmptyFlightData()
  );
  const [airline, setAirline] = useState<AirlineInfo | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("professional");
  const [generating, setGenerating] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"saved" | "unsaved" | "idle">(
    "idle"
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSave = useRef(true);

  useEffect(() => {
    skipNextAutoSave.current = false;
  }, []);

  useEffect(() => {
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }

    setDraftStatus("unsaved");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (flightData.flightNumber || flightData.date) {
        saveDraft(flightData);
        setDraftStatus("saved");
      }
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
    if (flightData?.flightNumber) {
      fetchAirlineInfo(flightData.flightNumber);
    } else {
      setAirline(null);
    }
  }, [flightData?.flightNumber, fetchAirlineInfo]);

  const handleSaveDraft = () => {
    saveDraft(flightData);
    setDraftStatus("saved");
  };

  useEffect(() => {
    localStorage.setItem("flight-log-display-mode", displayMode);
  }, [displayMode]);

  const handleLoadSample = () => {
    setFlightData(createSampleFlightData());
    setStep("preview");
  };

  const handleNewFlight = () => {
    setFlightData(createEmptyFlightData());
    setAirline(null);
    clearDraft();
    setDraftStatus("idle");
    setStep("input");
    clearTrackData();
  };

  const fetchFlightTrack = useCallback(async () => {
    if (!flightData.flightNumber || !flightData.date) return;
    setTrackLoading(true);
    try {
      const res = await fetch(
        `/api/flight-track?flight=${encodeURIComponent(flightData.flightNumber)}&date=${flightData.date}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        alert(body.error || "Failed to fetch flight track");
        return;
      }
      const trackData = await res.json();
      saveTrackData(trackData);

      if (trackData.matchedFixes?.length > 0) {
        const wpStr = trackData.matchedFixes
          .map((f: { name: string }) => f.name)
          .join(" - ");
        setFlightData((prev) => ({ ...prev, majorWaypoints: wpStr }));
      }
    } catch (err) {
      console.error("Track fetch failed:", err);
      alert("Failed to fetch flight track. Please try again.");
    } finally {
      setTrackLoading(false);
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

  return (
    <div className="min-h-screen bg-sky-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 flex items-center justify-between gap-2">
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

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-medium transition-colors ${
                displayMode === "standard"
                  ? "text-sky-600"
                  : "text-slate-400"
              }`}
            >
              STD
            </span>
            <button
              onClick={() =>
                setDisplayMode((m) =>
                  m === "professional" ? "standard" : "professional"
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                displayMode === "professional"
                  ? "bg-sky-500"
                  : "bg-slate-300"
              }`}
              role="switch"
              aria-checked={displayMode === "professional"}
              aria-label="Toggle display mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  displayMode === "professional"
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-xs font-medium transition-colors ${
                displayMode === "professional"
                  ? "text-sky-600"
                  : "text-slate-400"
              }`}
            >
              PRO
            </span>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-4 sm:pt-6">
        <div className="flex flex-wrap items-center gap-2 text-sm mb-4 sm:mb-6">
          {(["input", "preview"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
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
              )}
              <button
                onClick={() => {
                  if (s === "input") setStep("input");
                  else if (
                    s === "preview" &&
                    flightData.flightNumber &&
                    flightData.date
                  )
                    setStep("preview");
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                  step === s
                    ? "bg-sky-100 text-sky-700 font-medium"
                    : flightData.flightNumber || s === "input"
                      ? "text-slate-500 hover:text-slate-700 cursor-pointer"
                      : "text-slate-300 cursor-not-allowed"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    step === s
                      ? "bg-sky-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>
                {s === "input" ? "Input" : "Preview"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 sm:pb-12">
        {/* Step 1: Input */}
        {step === "input" && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Flight Data
                  </h2>
                  <p className="text-sm text-slate-500">
                    Use AI recognition or fill in manually
                    <span className="mx-1.5 text-slate-300">·</span>
                    <button
                      onClick={handleLoadSample}
                      className="inline-flex items-center gap-1 text-sky-500 hover:text-sky-700 font-medium transition-colors"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Try Sample
                    </button>
                  </p>
                </div>
                {airline && (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={airline.logoUrl}
                      alt={airline.name}
                      className="h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
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
              />
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && flightData && (
          <div>
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-slate-200/80 p-4 pb-safe sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-none sm:p-0 flex flex-row items-center justify-between gap-3 sm:mb-6 shadow-[0_-8px_30px_-4px_rgba(0,0,0,0.05)] sm:shadow-none">
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setStep("input")}
                  className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-4 py-3 sm:py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  Edit
                </button>
                <button
                  onClick={handleNewFlight}
                  className="hidden sm:block rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                  New Flight
                </button>
                <a
                  href="/preview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-4 py-3 sm:py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm inline-flex items-center justify-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  <span className="hidden sm:inline">Full View</span>
                </a>
              </div>
              <div className="relative flex-1 sm:flex-none" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  disabled={generating}
                  className="w-full rounded-xl bg-sky-500 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-80 transition-all shadow-[0_4px_14px_0_rgba(14,165,233,0.25)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download
                      <svg
                        className="h-3 w-3 ml-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </>
                  )}
                </button>

                {showExportMenu && (
                  <div className="absolute bottom-full right-0 mb-2 sm:top-full sm:bottom-auto sm:mt-1.5 w-40 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] border border-slate-100 py-1.5 z-50 transform transition-all">
                    <button
                      onClick={() => handleExport("pdf")}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <svg
                        className="h-4 w-4 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1v.5c0 .55-.45 1-1 1h-.5v1H8v-3.5h.5zm3 0h1c.55 0 1 .45 1 1v1.5c0 .55-.45 1-1 1h-1V13zm3 0H16v.75h-1v.75h.75v.75H15V17h-.75v-4h.25z" />
                      </svg>
                      Export PDF
                    </button>
                    <button
                      onClick={() => handleExport("png")}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <svg
                        className="h-4 w-4 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                      Export PNG
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* PDF Preview Container */}
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex sm:justify-center pb-24 sm:pb-8">
              <div className="shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] border border-slate-200/80 bg-white overflow-auto max-w-full mb-2 rounded-xl">
                <PDFTemplate
                  data={flightData}
                  airline={airline}
                  displayMode={displayMode}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-3 pb-4 sm:px-4 text-center text-xs text-slate-400">
        Built with ❤️ by{" "}
        <a href="https://x.com/JustinBao_" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-700 font-medium transition-colors">Justin</a>
      </footer>
    </div>
  );
}
