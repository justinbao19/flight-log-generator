"use client";

import { useState, useCallback, useRef } from "react";
import { FlightData, DisplayMode } from "@/lib/types";
import FieldEditor from "./FieldEditor";
import { motion } from "framer-motion";

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
      <div className="relative flex rounded-xl bg-gray-100/80 p-1 backdrop-blur-sm">
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
            className={`relative flex-1 rounded-lg py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors z-10 ${
              mode === tab.key ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {mode === tab.key && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                style={{ zIndex: -1 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Screenshot / Text panels — stacked in same grid cell for stable height */}
      {(mode === "screenshot" || mode === "text") && (
        <div className="grid">
          {/* Screenshot Upload */}
          <div className={`col-start-1 row-start-1 flex flex-col gap-3 sm:gap-4 transition-opacity duration-300 ${mode !== "screenshot" ? "opacity-0 pointer-events-none z-0" : "opacity-100 z-10"}`}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex h-[180px] sm:h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed overflow-hidden transition-all ${
                dragOver
                  ? "border-blue-400 bg-blue-50/50 scale-[0.98]"
                  : imagePreview
                    ? "border-transparent bg-gray-50/50 shadow-inner"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
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
                <div className="relative w-full h-full p-4 flex flex-col items-center justify-center group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-full rounded-xl object-contain shadow-sm"
                  />
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-full shadow-sm">
                      Click to replace
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-4 sm:p-8">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <svg
                      className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Drop screenshot here or click
                    </p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleRecognize}
              disabled={loading || !imageFile}
              className="relative w-full overflow-hidden rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-gray-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse">
                    AI Analyzing...
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                </div>
              ) : (
                "Extract Data with AI"
              )}
            </button>
          </div>

          {/* Text Input */}
          <div className={`col-start-1 row-start-1 flex flex-col gap-3 sm:gap-4 transition-opacity duration-300 ${mode !== "text" ? "opacity-0 pointer-events-none z-0" : "opacity-100 z-10"}`}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your flight note or raw text here..."
              className="block h-[180px] sm:h-[220px] w-full rounded-2xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 text-base sm:text-sm font-mono text-gray-700 resize-none transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
            />

            <button
              onClick={handleRecognize}
              disabled={loading || !text.trim()}
              className="relative w-full overflow-hidden rounded-xl bg-gray-900 py-3.5 text-sm font-semibold text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-gray-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse">
                    AI Analyzing...
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                </div>
              ) : (
                "Extract Data with AI"
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
