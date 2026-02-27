"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import UploadArea from "@/components/UploadArea";
import PDFTemplate from "@/components/PDFTemplate";
import { FlightData, AirlineInfo, createEmptyFlightData } from "@/lib/types";
import { generatePDF, generateFilename } from "@/lib/pdfGenerator";
import { saveDraft, loadDraft, clearDraft } from "@/lib/storage";

type Step = "input" | "preview";

export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [flightData, setFlightData] = useState<FlightData>(
    createEmptyFlightData()
  );
  const [airline, setAirline] = useState<AirlineInfo | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"saved" | "unsaved" | "idle">(
    "idle"
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.flightNumber) {
      setFlightData(draft);
      setDraftStatus("saved");
    }
    initialLoadDone.current = true;
  }, []);

  // Auto-save draft on flightData change (debounced 1s)
  useEffect(() => {
    if (!initialLoadDone.current) return;

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

  const handleNewFlight = () => {
    setFlightData(createEmptyFlightData());
    setAirline(null);
    clearDraft();
    setDraftStatus("idle");
    setStep("input");
  };

  const handleGeneratePDF = async () => {
    if (!flightData) return;
    setGenerating(true);
    try {
      const filename = generateFilename(
        flightData.flightNumber,
        flightData.date
      );
      await generatePDF("pdf-content", filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="h-7 w-7 text-blue-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <h1 className="text-lg font-bold text-gray-900">
              Flight Log Generator
            </h1>
          </div>
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            API Settings
          </button>
        </div>
        {showApiKeyInput && (
          <div className="border-t bg-gray-50 px-4 py-3">
            <div className="mx-auto max-w-7xl">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Anthropic API Key (optional if set in .env.local)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </header>

      {/* Step Indicator */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="flex items-center gap-2 text-sm mb-6">
          {(["input", "preview"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <svg
                  className="h-4 w-4 text-gray-300"
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
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : flightData.flightNumber || s === "input"
                      ? "text-gray-500 hover:text-gray-700 cursor-pointer"
                      : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    step === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
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

      <main className="mx-auto max-w-7xl px-4 pb-12">
        {/* Step 1: Input */}
        {step === "input" && (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Flight Data
                  </h2>
                  <p className="text-sm text-gray-500">
                    Use AI recognition or fill in manually
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
                apiKey={apiKey}
                draftStatus={draftStatus}
                onSaveDraft={handleSaveDraft}
              />
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && flightData && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("input")}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleNewFlight}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  New Flight
                </button>
              </div>
              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
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
                    Generating...
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
                    Download PDF
                  </>
                )}
              </button>
            </div>

            {/* PDF Preview Container */}
            <div className="flex justify-center">
              <div className="shadow-2xl border border-gray-200 bg-white overflow-auto">
                <PDFTemplate data={flightData} airline={airline} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
