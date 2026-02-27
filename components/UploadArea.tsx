"use client";

import { useState, useCallback, useRef } from "react";

interface UploadAreaProps {
  onRecognized: (data: unknown) => void;
  apiKey: string;
}

type InputMode = "image" | "text";

export default function UploadArea({ onRecognized, apiKey }: UploadAreaProps) {
  const [mode, setMode] = useState<InputMode>("image");
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

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      let response: Response;

      if (mode === "image" && imageFile) {
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
          mode === "image" ? "Please upload an image" : "Please enter text"
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Recognition failed");
      }

      const data = await response.json();
      onRecognized(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recognition failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Mode Switcher */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setMode("image")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "image"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Upload Screenshot
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Paste Text
        </button>
      </div>

      {/* Image Upload */}
      {mode === "image" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
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
                className="max-h-[300px] rounded-lg object-contain"
              />
              <p className="mt-2 text-center text-sm text-gray-500">
                Click or drag to replace
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-8">
              <svg
                className="h-10 w-10 text-gray-400"
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
      )}

      {/* Text Input */}
      {mode === "text" && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your flight note here..."
          className="min-h-[200px] w-full rounded-xl border border-gray-300 p-4 text-sm font-mono text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || (mode === "image" ? !imageFile : !text.trim())}
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
  );
}
