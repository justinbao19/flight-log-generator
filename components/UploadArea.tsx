"use client";

import { useState, useCallback, useRef } from "react";
import { FlightData, DisplayMode } from "@/lib/types";
import FieldEditor from "./FieldEditor";

interface UploadAreaProps {
  flightData: FlightData;
  onFlightDataChange: (data: FlightData) => void;
  onPreview: () => void;
  apiKey: string;
  draftStatus: "saved" | "unsaved" | "idle";
  onSaveDraft: () => void;
  displayMode: DisplayMode;
}

type InputMode = "screenshot" | "text" | "manual";

export default function UploadArea({
  flightData,
  onFlightDataChange,
  onPreview,
  apiKey,
  draftStatus,
  onSaveDraft,
  displayMode,
}: UploadAreaProps) {
  const [mode, setMode] = useState<InputMode>("manual");
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG/PNG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRecognize = async () => {
    setLoading(true);
    setError(null);

    try {
      let response: Response;

      if (mode === "screenshot" && imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        response = await fetch("/api/recognize", {
          method: "POST",
          headers: apiKey ? { "x-api-key": apiKey } : {},
          body: formData,
        });
      } else if (mode === "text" && text.trim()) {
        response = await fetch("/api/recognize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "x-api-key": apiKey } : {}),
          },
          body: JSON.stringify({ text }),
        });
      } else {
        setError(
          mode === "screenshot"
            ? "Please upload an image"
            : "Please enter text"
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Recognition failed");
      }

      const data = await response.json();
      onFlightDataChange(data as FlightData);
      setMode("manual");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recognition failed");
    } finally {
      setLoading(false);
    }
  };

  const hasRequiredFields =
    flightData.flightNumber.trim() !== "" && flightData.date.trim() !== "";

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Three-tab Switcher */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        {(
          [
            { key: "screenshot", label: "Screenshot" },
            { key: "text", label: "Paste Text" },
            { key: "manual", label: "Manual" },
          ] as { key: InputMode; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex-1 rounded-md py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
              mode === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Screenshot / Text panels — stacked in same grid cell for stable height */}
      {(mode === "screenshot" || mode === "text") && (
        <div className="grid">
          {/* Screenshot Upload */}
          <div className={`col-start-1 row-start-1 space-y-3 sm:space-y-4 ${mode !== "screenshot" ? "invisible" : ""}`}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex h-[180px] sm:h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed overflow-auto transition-colors ${
                dragOver
                  ? "border-blue-500 bg-blue-50"
                  : imagePreview
                    ? "border-gray-300 bg-gray-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {imagePreview ? (
                <div className="p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-[140px] sm:max-h-[180px] rounded-lg object-contain"
                  />
                  <p className="mt-2 text-center text-sm text-gray-500">
                    Click or drag to replace
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 p-4 sm:p-8">
                  <svg
                    className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">
                    Drop screenshot here or click to upload
                  </p>
                  <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                </div>
              )}
            </div>

            <button
              onClick={handleRecognize}
              disabled={loading || !imageFile}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
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
                  Recognizing...
                </span>
              ) : (
                "Recognize Flight Data"
              )}
            </button>
          </div>

          {/* Text Input */}
          <div className={`col-start-1 row-start-1 space-y-3 sm:space-y-4 ${mode !== "text" ? "invisible" : ""}`}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your flight note here..."
              className="h-[180px] sm:h-[220px] w-full rounded-xl border border-gray-300 p-3 sm:p-4 text-base sm:text-sm font-mono text-black resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <button
              onClick={handleRecognize}
              disabled={loading || !text.trim()}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
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
                  Recognizing...
                </span>
              ) : (
                "Recognize Flight Data"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual Form */}
      {mode === "manual" && (
        <>
          {/* Draft status bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {draftStatus === "saved" && "Draft saved"}
              {draftStatus === "unsaved" && "Unsaved changes"}
            </span>
            <button
              onClick={onSaveDraft}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Save Draft
            </button>
          </div>

          <FieldEditor data={flightData} onChange={onFlightDataChange} displayMode={displayMode} />

          <button
            onClick={onPreview}
            disabled={!hasRequiredFields}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Preview
          </button>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
