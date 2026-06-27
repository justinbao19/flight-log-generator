"use client";

import { FlightData, DisplayMode, AircraftPhoto } from "@/lib/types";
import { parsePkpass } from "@/lib/pkpassParser";
import { decodeMetar, DecodedMetar, normalizeMetarText } from "@/lib/metarDecode";
import { formatUtcOffset, resolveUtcOffset } from "@/lib/timezone";
import { lookupByIata, lookupByIcao } from "@/lib/airportLookup";
import AirportInput from "./AirportInput";
import { DatePicker, DurationPicker, TimePicker } from "./DateTimePicker";
import { useMemo, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plane, Hash, CloudSun, PlaneTakeoff, PlaneLanding, Radio, Tag, Timer, Hourglass, CircleParking, AlarmClock, ClockArrowDown, UserRound, MapPin, Satellite, Search, Camera, ExternalLink, CloudDownload, ClipboardPaste, Ticket, Upload, Loader2, Info, Check, ChevronDown } from "lucide-react";
import { RunwayIcon } from "./icons/RunwayIcon";
import { CabinClassIcon } from "./icons/CabinClassIcon";
import { AltitudeIcon } from "./icons/AltitudeIcon";
import { DistanceIcon } from "./icons/DistanceIcon";

interface TrackError {
  message: string;
  availableDates?: string[];
}

interface FieldEditorProps {
  data: FlightData;
  onChange: (data: FlightData) => void;
  displayMode: DisplayMode;
  onFetchTrack?: (overrideDate?: string) => void;
  trackLoading?: boolean;
  trackError?: TrackError | null;
  onFlightLookup?: () => void;
  flightLookupLoading?: boolean;
}

function InputField({
  label,
  value,
  onChange,
  className,
  readOnly,
  icon,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  readOnly?: boolean;
  icon?: ReactNode;
  type?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 sm:py-2 text-base sm:text-sm text-slate-900 transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] ${
            icon ? "pl-10 pr-3" : "px-3"
          } ${readOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
        />
      </div>
    </div>
  );
}

async function readClipboardImageFile(): Promise<File | null> {
  if (!navigator.clipboard?.read) {
    throw new Error("Clipboard image reading is not available in this browser.");
  }

  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (!imageType) continue;

    const blob = await item.getType(imageType);
    const extension = imageType.split("/")[1] || "png";
    return new File([blob], `pasted-image.${extension}`, { type: imageType });
  }

  return null;
}

async function readClipboardImageSource(): Promise<string | null> {
  if (!navigator.clipboard?.read) return null;

  const items = await navigator.clipboard.read();
  for (const item of items) {
    if (!item.types.includes("text/html")) continue;
    const htmlBlob = await item.getType("text/html");
    const html = await htmlBlob.text();
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match?.[1]) return match[1];
  }

  return null;
}

function MetarDecodedCard({ decoded }: { decoded: DecodedMetar }) {
  const categoryColor =
    decoded.flightCategory === "VFR"
      ? "text-green-700 bg-green-50"
      : decoded.flightCategory === "MVFR"
        ? "text-blue-700 bg-blue-50"
        : decoded.flightCategory === "IFR"
          ? "text-red-700 bg-red-50"
          : "text-purple-700 bg-purple-50";

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
        <div>
          <span className="text-slate-400">Wind</span>{" "}
          <span className="font-medium">{decoded.wind}</span>
        </div>
        <div>
          <span className="text-slate-400">Visibility</span>{" "}
          <span className="font-medium">{decoded.visibility}</span>
        </div>
        <div>
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${categoryColor}`}
          >
            {decoded.flightCategory}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Clouds</span>{" "}
          <span className="font-medium">{decoded.clouds}</span>
        </div>
        <div>
          <span className="text-slate-400">Temp</span>{" "}
          <span className="font-medium">{decoded.temperature}</span>
        </div>
        <div>
          <span className="text-slate-400">Dewpoint</span>{" "}
          <span className="font-medium">{decoded.dewpoint}</span>
        </div>
        <div>
          <span className="text-slate-400">QNH</span>{" "}
          <span className="font-medium">{decoded.pressure}</span>
        </div>
        <div>
          <span className="text-slate-400">Humidity</span>{" "}
          <span className="font-medium">{decoded.humidity}</span>
        </div>
        {decoded.weather !== "None" && (
          <div>
            <span className="text-slate-400">Weather</span>{" "}
            <span className="font-medium">{decoded.weather}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function UtcOffsetControl({
  offset,
  auto,
  onAdjust,
}: {
  offset: number;
  auto: boolean;
  onAdjust: (delta: number) => void;
}) {
  if (auto) {
    return (
      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400">
        {formatUtcOffset(offset)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center overflow-hidden rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-500 shadow-sm">
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        className="px-1.5 py-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
        aria-label="Decrease UTC offset"
      >
        -
      </button>
      <span className="min-w-12 px-1 text-center text-slate-500">
        {formatUtcOffset(offset)}
      </span>
      <button
        type="button"
        onClick={() => onAdjust(1)}
        className="px-1.5 py-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
        aria-label="Increase UTC offset"
      >
        +
      </button>
    </span>
  );
}

type UnitOption<T extends string> = {
  value: T;
  rawLabel: string;
  decodedLabel: string;
};

function parseNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  const text = String(value).replace(/,/g, "");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function formatNumber(value: number | null | undefined, maxFractionDigits = 2): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function unitLabel<T extends string>(
  unit: T,
  options: UnitOption<T>[],
  decoded: boolean
): string {
  const option = options.find((item) => item.value === unit);
  return decoded ? option?.decodedLabel ?? unit : option?.rawLabel ?? unit;
}

function UnitNumberField<T extends string>({
  label,
  value,
  onValueChange,
  unit,
  units,
  onUnitChange,
  decoded,
  icon,
  maxFractionDigits = 2,
}: {
  label: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  unit: T;
  units: UnitOption<T>[];
  onUnitChange: (unit: T) => void;
  decoded: boolean;
  icon?: ReactNode;
  maxFractionDigits?: number;
}) {
  const currentIndex = Math.max(0, units.findIndex((item) => item.value === unit));
  const currentLabel = unitLabel(unit, units, decoded);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={formatNumber(value, maxFractionDigits)}
          onChange={(e) => onValueChange(parseNumber(e.target.value))}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 sm:py-2 text-base sm:text-sm text-slate-900 transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] ${
            icon ? "pl-10" : "pl-3"
          } pr-28`}
        />
        <button
          type="button"
          onClick={() => onUnitChange(units[(currentIndex + 1) % units.length].value)}
          className="absolute right-2 max-w-24 truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          title="Click to switch unit"
        >
          {currentLabel}
        </button>
      </div>
    </div>
  );
}

const CABIN_CLASS_OPTIONS = ["First", "Business", "Premium Economy", "Economy"];

function CabinClassSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const displayValue = value || "Select...";

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
        Cabin Class
      </label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`relative flex w-full items-center rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-10 text-left text-base text-slate-900 transition-all sm:text-sm ${
          open
            ? "bg-white border-transparent shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
            : "hover:bg-white hover:border-slate-300"
        }`}
      >
        <span className="absolute left-3 flex items-center justify-center text-slate-400">
          <CabinClassIcon className="w-4 h-4" />
        </span>
        <span className={value ? "truncate" : "truncate text-slate-500"}>
          {displayValue}
        </span>
        <ChevronDown
          className={`absolute right-3 h-4 w-4 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-slate-500" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl bg-white p-1 shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_12px_30px_rgba(15,23,42,0.12)]"
            role="listbox"
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !value
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>Select...</span>
              {!value && <Check className="h-4 w-4" />}
            </button>
            {CABIN_CLASS_OPTIONS.map((option) => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span>{option}</span>
                  {selected && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type AgeUnit = "yrs" | "mon";
type AltitudeUnit = "ft" | "m";
type DistanceUnit = "nm" | "km" | "mi";

const AGE_UNITS: UnitOption<AgeUnit>[] = [
  { value: "yrs", rawLabel: "Yrs", decodedLabel: "Years" },
  { value: "mon", rawLabel: "Mon", decodedLabel: "Months" },
];

const ALTITUDE_UNITS: UnitOption<AltitudeUnit>[] = [
  { value: "ft", rawLabel: "ft", decodedLabel: "Feet" },
  { value: "m", rawLabel: "m", decodedLabel: "Meters" },
];

const DISTANCE_UNITS: UnitOption<DistanceUnit>[] = [
  { value: "nm", rawLabel: "nm", decodedLabel: "Nautical miles" },
  { value: "km", rawLabel: "km", decodedLabel: "Kilometers" },
  { value: "mi", rawLabel: "mi", decodedLabel: "Miles" },
];

function inferAgeUnit(value?: string): AgeUnit {
  return /\bmon(?:ths?)?\b/i.test(value || "") ? "mon" : "yrs";
}

function inferAltitudeUnit(value?: string): AltitudeUnit {
  return /\bm(?:eter|etre|eters|etres)?\b/i.test(value || "") ? "m" : "ft";
}

function altitudeToFeet(value?: string): number | null {
  const text = value || "";
  const fl = text.match(/\bFL\s*(\d{2,3})\b/i);
  if (fl) return Number(fl[1]) * 100;
  const num = parseNumber(text);
  if (num === null) return null;
  return inferAltitudeUnit(text) === "m" ? num / 0.3048 : num;
}

export default function FieldEditor({
  data,
  onChange,
  displayMode,
  onFetchTrack,
  trackLoading,
  trackError,
  onFlightLookup,
  flightLookupLoading,
}: FieldEditorProps) {
  const isPro = displayMode === "professional";
  const isDecoded = displayMode === "standard";
  const [ageUnit, setAgeUnit] = useState<AgeUnit>(() => inferAgeUnit(data.aircraftAge));
  const [altitudeUnit, setAltitudeUnit] = useState<AltitudeUnit>(() =>
    inferAltitudeUnit(data.cruisingAltitude)
  );
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(
    () => data.distanceUnit ?? (isPro ? "nm" : "km")
  );

  const [photoReg, setPhotoReg] = useState((data.registration || "").toUpperCase());
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoResults, setPhotoResults] = useState<AircraftPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const prevRegRef = useRef(data.registration);

  useEffect(() => {
    if (data.registration && data.registration !== prevRegRef.current) {
      setPhotoReg(data.registration.toUpperCase());
      setPhotoResults([]);
      setPhotoError(null);
    }
    prevRegRef.current = data.registration;
  }, [data.registration]);

  useEffect(() => {
    setAgeUnit(inferAgeUnit(data.aircraftAge));
  }, [data.aircraftAge]);

  useEffect(() => {
    setAltitudeUnit(inferAltitudeUnit(data.cruisingAltitude));
  }, [data.cruisingAltitude]);

  useEffect(() => {
    if (data.distanceUnit) setDistanceUnit(data.distanceUnit);
  }, [data.distanceUnit]);

  const handlePhotoSearch = useCallback(async () => {
    const reg = photoReg.trim().toUpperCase();
    if (!reg) return;
    setPhotoReg(reg);
    setPhotoLoading(true);
    setPhotoError(null);
    setPhotoResults([]);
    try {
      const res = await fetch(`/api/aircraft-photo?reg=${encodeURIComponent(reg)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      if (!data.photos?.length) {
        setPhotoError("No photos found for this registration");
      } else {
        setPhotoResults(data.photos);
      }
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to fetch photos");
    } finally {
      setPhotoLoading(false);
    }
  }, [photoReg]);

  const [selectingPhotoIdx, setSelectingPhotoIdx] = useState<number | null>(null);

  const handleSelectPhoto = useCallback(async (photo: AircraftPhoto, idx: number) => {
    if (data.selectedPhoto && data.selectedPhoto.link === photo.link) {
      onChange({ ...data, selectedPhoto: undefined });
      return;
    }
    setSelectingPhotoIdx(idx);
    try {
      const proxyTarget = photo.fullUrl || photo.url;
      const res = await fetch(`/api/aircraft-photo?proxy=${encodeURIComponent(proxyTarget)}`);
      if (!res.ok) throw new Error("Failed to load image");
      const { dataUrl } = await res.json();
      onChange({
        ...data,
        selectedPhoto: { dataUrl, photographer: photo.photographer, link: photo.link },
      });
    } catch {
      alert("Failed to load photo for PDF. Please try another one.");
    } finally {
      setSelectingPhotoIdx(null);
    }
  }, [data, onChange]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onChange({
        ...data,
        selectedPhoto: { dataUrl, photographer: "", link: "" },
      });
    };
    reader.readAsDataURL(file);
  }, [data, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleFileUpload(file);
        return;
      }
    }
    const html = e.clipboardData.getData("text/html");
    if (html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match?.[1]) {
        e.preventDefault();
        try {
          const res = await fetch(match[1]);
          const blob = await res.blob();
          if (blob.type.startsWith("image/")) {
            handleFileUpload(new File([blob], "pasted-image.jpg", { type: blob.type }));
          }
        } catch {
          // CORS blocked — try via proxy
          try {
            const res = await fetch(`/api/aircraft-photo?proxy=${encodeURIComponent(match[1])}`);
            if (res.ok) {
              const { dataUrl } = await res.json();
              onChange({ ...data, selectedPhoto: { dataUrl, photographer: "", link: "" } });
            }
          } catch { /* ignore */ }
        }
        return;
      }
    }
  }, [handleFileUpload, data, onChange]);

  const handlePasteClick = useCallback(async () => {
    try {
      const file = await readClipboardImageFile();
      if (file) {
        handleFileUpload(file);
        return;
      }

      const imageSrc = await readClipboardImageSource();
      if (imageSrc) {
        try {
          const res = await fetch(imageSrc);
          const blob = await res.blob();
          if (blob.type.startsWith("image/")) {
            handleFileUpload(new File([blob], "pasted-image.jpg", { type: blob.type }));
            return;
          }
        } catch {
          const res = await fetch(`/api/aircraft-photo?proxy=${encodeURIComponent(imageSrc)}`);
          if (res.ok) {
            const { dataUrl } = await res.json();
            onChange({ ...data, selectedPhoto: { dataUrl, photographer: "", link: "" } });
            return;
          }
        }
      }

      alert("No image was found in the clipboard.");
    } catch {
      alert("Clipboard access was blocked. Click the box and use Ctrl+V / Cmd+V instead.");
    }
  }, [handleFileUpload, data, onChange]);

  // --- Boarding Pass handlers ---
  const bpFileInputRef = useRef<HTMLInputElement>(null);
  const [bpLoading, setBpLoading] = useState(false);

  const handleBpFile = useCallback(async (file: File) => {
    if (file.name.endsWith(".pkpass") || file.type === "application/vnd.apple.pkpass") {
      setBpLoading(true);
      try {
        const result = await parsePkpass(file);
        onChange({
          ...data,
          boardingPass: { imageDataUrl: result.imageDataUrl, source: "pkpass", parsedData: result.parsedData },
        });
      } catch (err) {
        console.error("Failed to parse .pkpass:", err);
        alert("Failed to parse .pkpass file. The file may be corrupted.");
      } finally {
        setBpLoading(false);
      }
      return;
    }
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        ...data,
        boardingPass: { imageDataUrl: reader.result as string, source: "image" },
      });
    };
    reader.readAsDataURL(file);
  }, [data, onChange]);

  const handleBpDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleBpFile(file);
  }, [handleBpFile]);

  const handleBpPaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleBpFile(file);
        return;
      }
    }
  }, [handleBpFile]);

  const handleBpPasteClick = useCallback(async () => {
    try {
      const file = await readClipboardImageFile();
      if (file) {
        await handleBpFile(file);
        return;
      }
      alert("No image was found in the clipboard.");
    } catch {
      alert("Clipboard access was blocked. Click the box and use Ctrl+V / Cmd+V instead.");
    }
  }, [handleBpFile]);

  const [metarLoading, setMetarLoading] = useState<"departure" | "arrival" | null>(null);

  const handleFetchMetar = useCallback(async (which: "departure" | "arrival") => {
    const info = which === "departure" ? data.departure : data.arrival;
    const icao = info?.airport?.icao;
    if (!icao) return;

    setMetarLoading(which);
    try {
      const params = new URLSearchParams({ icao });
      if (data.date) params.set("date", data.date);
      const time = info?.actualTime || info?.scheduledTime;
      if (time) params.set("time", time);
      const utcOffset = resolveUtcOffset(info?.timeZone, data.date, time, info?.utcOffset);
      if (utcOffset !== undefined) params.set("utcOffset", String(utcOffset));

      const res = await fetch(`/api/metar?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const { metar } = await res.json();
      if (metar) {
        onChange({
          ...JSON.parse(JSON.stringify(data)),
          [which]: { ...JSON.parse(JSON.stringify(info)), metar: normalizeMetarText(metar) },
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to fetch METAR");
    } finally {
      setMetarLoading(null);
    }
  }, [data, onChange]);

  const setNestedValue = useCallback((
    obj: Record<string, unknown>,
    path: string,
    value: string
  ) => {
    const keys = path.split(".");
    let target = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]] as Record<string, unknown>;
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey === "km" || lastKey === "nm") {
      target[lastKey] = parseFloat(value) || 0;
    } else if (lastKey === "utcOffset") {
      const num = parseFloat(value);
      target[lastKey] = isNaN(num) ? undefined : num;
    } else if (lastKey === "timeZone") {
      target[lastKey] = value || undefined;
    } else {
      target[lastKey] = value;
    }
  }, []);

  const update = useCallback((path: string, value: string) => {
    const newData = JSON.parse(JSON.stringify(data)) as FlightData;
    setNestedValue(
      newData as unknown as Record<string, unknown>,
      path,
      value
    );
    onChange(newData);
  }, [data, onChange, setNestedValue]);

  const updateMultiple = useCallback((updates: [string, string][]) => {
    const newData = JSON.parse(JSON.stringify(data)) as FlightData;
    const obj = newData as unknown as Record<string, unknown>;
    for (const [path, value] of updates) {
      setNestedValue(obj, path, value);
    }
    onChange(newData);
  }, [data, onChange, setNestedValue]);

  const getAgeInYears = useCallback(() => {
    const value = parseNumber(data.aircraftAge);
    if (value === null) return null;
    return inferAgeUnit(data.aircraftAge) === "mon" ? value / 12 : value;
  }, [data.aircraftAge]);

  const ageValue = useMemo(() => {
    const years = getAgeInYears();
    if (years === null) return null;
    return ageUnit === "mon" ? years * 12 : years;
  }, [ageUnit, getAgeInYears]);

  const handleAgeChange = (value: number | null) => {
    if (value === null) {
      update("aircraftAge", "");
      return;
    }
    update("aircraftAge", `${formatNumber(value, ageUnit === "mon" ? 0 : 1)} ${unitLabel(ageUnit, AGE_UNITS, false)}`);
  };

  const handleAgeUnitChange = (nextUnit: AgeUnit) => {
    const years = getAgeInYears();
    setAgeUnit(nextUnit);
    if (years === null) return;
    const nextValue = nextUnit === "mon" ? Math.round(years * 12) : years;
    update("aircraftAge", `${formatNumber(nextValue, nextUnit === "mon" ? 0 : 1)} ${unitLabel(nextUnit, AGE_UNITS, false)}`);
  };

  const getAltitudeInFeet = useCallback(
    () => altitudeToFeet(data.cruisingAltitude),
    [data.cruisingAltitude]
  );

  const altitudeValue = useMemo(() => {
    const feet = getAltitudeInFeet();
    if (feet === null) return null;
    return altitudeUnit === "m" ? feet * 0.3048 : feet;
  }, [altitudeUnit, getAltitudeInFeet]);

  const handleAltitudeChange = (value: number | null) => {
    if (value === null) {
      update("cruisingAltitude", "");
      return;
    }
    update("cruisingAltitude", `${formatNumber(value, 0)} ${altitudeUnit}`);
  };

  const handleAltitudeUnitChange = (nextUnit: AltitudeUnit) => {
    const feet = getAltitudeInFeet();
    setAltitudeUnit(nextUnit);
    if (feet === null) return;
    const nextValue = nextUnit === "m" ? feet * 0.3048 : feet;
    update("cruisingAltitude", `${formatNumber(nextValue, 0)} ${nextUnit}`);
  };

  const distanceValue = useMemo(() => {
    const km = data.distance?.km || 0;
    const nm = data.distance?.nm || km / 1.852;
    if (distanceUnit === "km") return km || nm * 1.852 || null;
    if (distanceUnit === "mi") return (km || nm * 1.852) * 0.621371;
    return nm || km / 1.852 || null;
  }, [data.distance?.km, data.distance?.nm, distanceUnit]);

  const updateDistanceFromUnit = (value: number | null, unit: DistanceUnit) => {
    if (value === null) {
      updateMultiple([
        ["distance.km", ""],
        ["distance.nm", ""],
        ["distanceUnit", unit],
      ]);
      return;
    }

    const km =
      unit === "km" ? value : unit === "mi" ? value / 0.621371 : value * 1.852;
    const nm = km / 1.852;
    updateMultiple([
      ["distance.km", String(km)],
      ["distance.nm", String(nm)],
      ["distanceUnit", unit],
    ]);
  };

  const handleDistanceChange = (value: number | null) => {
    updateDistanceFromUnit(value, distanceUnit);
  };

  const handleDistanceUnitChange = (nextUnit: DistanceUnit) => {
    const km = data.distance?.km || (data.distance?.nm || 0) * 1.852;
    setDistanceUnit(nextUnit);
    update("distanceUnit", nextUnit);
    if (!km) return;
    const nextValue =
      nextUnit === "km" ? km : nextUnit === "mi" ? km * 0.621371 : km / 1.852;
    updateDistanceFromUnit(nextValue, nextUnit);
  };

  const handleAirportChange = (
    prefix: "departure" | "arrival",
    airport: {
      name: string;
      iata: string;
      icao: string;
      utcOffset?: number;
      timeZone?: string;
    }
  ) => {
    const info = data[prefix];
    const time = info?.actualTime || info?.scheduledTime;
    const utcOffset = resolveUtcOffset(
      airport.timeZone,
      data.date,
      time,
      airport.utcOffset
    );
    const updates: [string, string][] = [
      [`${prefix}.airport.name`, airport.name],
      [`${prefix}.airport.iata`, airport.iata],
      [`${prefix}.airport.icao`, airport.icao],
      [`${prefix}.timeZone`, airport.timeZone || ""],
    ];
    if (utcOffset !== undefined) {
      updates.push([`${prefix}.utcOffset`, String(utcOffset)]);
    }
    updateMultiple(updates);
  };

  const getUtcOffset = useCallback(
    (prefix: "departure" | "arrival", time?: string): number | undefined => {
      const info = data[prefix];
      return (
        resolveUtcOffset(info?.timeZone, data.date, time, info?.utcOffset) ??
        (info?.timeZone ? undefined : info?.utcOffset ?? 0)
      );
    },
    [data]
  );

  const adjustManualUtcOffset = useCallback(
    (prefix: "departure" | "arrival", delta: number) => {
      const current = data[prefix]?.utcOffset ?? 0;
      const next = Math.max(-12, Math.min(14, current + delta));
      update(`${prefix}.utcOffset`, String(next));
    },
    [data, update]
  );

  const renderUtcSuffix = (
    prefix: "departure" | "arrival",
    time?: string
  ) => (
    <UtcOffsetControl
      offset={getUtcOffset(prefix, time) ?? 0}
      auto={Boolean(data[prefix]?.timeZone)}
      onAdjust={(delta) => adjustManualUtcOffset(prefix, delta)}
    />
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveMissingAirportTimeZone(prefix: "departure" | "arrival") {
      const info = data[prefix];
      if (info?.timeZone || (!info?.airport?.iata && !info?.airport?.icao)) return;

      const airport =
        (info.airport.iata ? await lookupByIata(info.airport.iata) : null) ||
        (info.airport.icao ? await lookupByIcao(info.airport.icao) : null);

      if (cancelled || !airport?.timeZone) return;

      const offset = resolveUtcOffset(
        airport.timeZone,
        data.date,
        info.actualTime || info.scheduledTime,
        airport.utcOffset ?? info.utcOffset
      );
      const updates: [string, string][] = [[`${prefix}.timeZone`, airport.timeZone]];
      if (offset !== undefined) updates.push([`${prefix}.utcOffset`, String(offset)]);
      updateMultiple(updates);
    }

    void resolveMissingAirportTimeZone("departure");
    void resolveMissingAirportTimeZone("arrival");

    return () => {
      cancelled = true;
    };
  }, [
    data.departure?.airport?.iata,
    data.departure?.airport?.icao,
    data.departure?.timeZone,
    data.arrival?.airport?.iata,
    data.arrival?.airport?.icao,
    data.arrival?.timeZone,
    data.date,
    data.departure?.actualTime,
    data.departure?.scheduledTime,
    data.arrival?.actualTime,
    data.arrival?.scheduledTime,
    updateMultiple,
  ]);

  useEffect(() => {
    const updates: [string, string][] = [];
    (["departure", "arrival"] as const).forEach((prefix) => {
      const info = data[prefix];
      if (!info?.timeZone) return;
      const offset = resolveUtcOffset(
        info.timeZone,
        data.date,
        info.actualTime || info.scheduledTime,
        info.utcOffset
      );
      if (offset !== undefined && offset !== info.utcOffset) {
        updates.push([`${prefix}.utcOffset`, String(offset)]);
      }
    });
    if (updates.length > 0) updateMultiple(updates);
  }, [
    data.date,
    data.departure?.scheduledTime,
    data.departure?.actualTime,
    data.departure?.timeZone,
    data.departure?.utcOffset,
    data.arrival?.scheduledTime,
    data.arrival?.actualTime,
    data.arrival?.timeZone,
    data.arrival?.utcOffset,
    updateMultiple,
  ]);

  const computedDuration = useMemo(() => {
    const depTime = data.departure?.actualTime;
    const arrTime = data.arrival?.actualTime;
    if (!depTime || !arrTime) return null;

    const depOffset = getUtcOffset("departure", depTime);
    const arrOffset = getUtcOffset("arrival", arrTime);
    if (depOffset === undefined || arrOffset === undefined) return null;

    const [dh, dm] = depTime.split(":").map(Number);
    const [ah, am] = arrTime.split(":").map(Number);
    if ([dh, dm, ah, am].some((n) => isNaN(n))) return null;

    const depMinutesUtc = dh * 60 + dm - depOffset * 60;
    const arrMinutesUtc = ah * 60 + am - arrOffset * 60;

    let diff = arrMinutesUtc - depMinutesUtc;
    if (diff <= 0) diff += 24 * 60;

    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  }, [
    data.departure?.actualTime,
    data.arrival?.actualTime,
    data.departure?.utcOffset,
    data.arrival?.utcOffset,
    data.departure?.timeZone,
    data.arrival?.timeZone,
    data.date,
    getUtcOffset,
  ]);

  const prevDurationRef = useRef(computedDuration);
  useEffect(() => {
    if (computedDuration && computedDuration !== prevDurationRef.current) {
      prevDurationRef.current = computedDuration;
      if (data.flightDuration !== computedDuration) {
        update("flightDuration", computedDuration);
      }
    }
  }, [computedDuration, data.flightDuration, update]);

  const isDateTooOld = useMemo(() => {
    if (!data.date) return false;
    const diff = Date.now() - new Date(data.date + "T23:59:59").getTime();
    return diff > 14 * 24 * 60 * 60 * 1000;
  }, [data.date]);

  const depDecoded = useMemo(
    () => (data.departure?.metar ? decodeMetar(data.departure.metar) : null),
    [data.departure?.metar]
  );
  const arrDecoded = useMemo(
    () => (data.arrival?.metar ? decodeMetar(data.arrival.metar) : null),
    [data.arrival?.metar]
  );
  const showProviderActions = false;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* General Flight Info */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-500" />
            {isPro ? "General Flight Info" : "General Flight Information"}
          </h3>
          <div className="flex items-center gap-2">
            {showProviderActions && onFlightLookup && (
              <button
                onClick={onFlightLookup}
                disabled={!data.flightNumber || flightLookupLoading || isDateTooOld}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {flightLookupLoading ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Looking up...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Lookup
                  </>
                )}
              </button>
            )}
            {showProviderActions && onFetchTrack && (
              <button
                onClick={() => onFetchTrack()}
                disabled={!data.flightNumber || !data.date || trackLoading || isDateTooOld}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {trackLoading ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Fetching...
                  </>
                ) : (
                  <>
                    <Satellite className="w-3.5 h-3.5" />
                    Fetch Track
                  </>
                )}
              </button>
            )}
            {showProviderActions && (onFlightLookup || onFetchTrack) && (
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-sky-500 cursor-help transition-colors" />
                <div className="absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-50">
                  <div className="whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] text-white shadow-lg">
                    {isDateTooOld
                      ? "Date is older than 2 weeks — data no longer available"
                      : "Only flights within the last ~2 weeks are available"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {showProviderActions && trackError && !trackLoading && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                {trackError.availableDates?.length
                  ? "No track found for the selected date. Pick an available date below to retry:"
                  : trackError.message}
              </p>
              {trackError.availableDates && trackError.availableDates.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {trackError.availableDates.map((d) => (
                    <button
                      key={d}
                      onClick={() => onFetchTrack?.(d)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-all"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label={isPro ? "Flight No." : "Flight Number"}
            value={data.flightNumber}
            onChange={(v) => update("flightNumber", v.toUpperCase())}
            icon={<Hash className="w-4 h-4" />}
          />
          <InputField
            label="Call Sign"
            value={data.callSign || ""}
            onChange={(v) => update("callSign", v.toUpperCase())}
            icon={<Radio className="w-4 h-4" />}
          />
          <DatePicker
            label="Date"
            value={data.date}
            onChange={(v) => update("date", v)}
          />
          <InputField
            label={isPro ? "A/C Type" : "Aircraft Type"}
            value={data.aircraftType}
            onChange={(v) => update("aircraftType", v.toUpperCase())}
            icon={<Plane className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "Reg. No." : "Registration"}
            value={data.registration}
            onChange={(v) => update("registration", v.toUpperCase())}
            icon={<Tag className="w-4 h-4" />}
          />
          <DurationPicker
            label="Flight Duration"
            value={data.flightDuration}
            onChange={(v) => update("flightDuration", v)}
            readOnly={!!computedDuration}
            icon={<Timer className="w-4 h-4" />}
          />
          <UnitNumberField
            label={isPro ? "Age" : "Aircraft Age"}
            value={ageValue}
            onValueChange={handleAgeChange}
            unit={ageUnit}
            units={AGE_UNITS}
            onUnitChange={handleAgeUnitChange}
            decoded={isDecoded}
            icon={<Hourglass className="w-4 h-4" />}
            maxFractionDigits={ageUnit === "mon" ? 0 : 1}
          />
          <UnitNumberField
            label={isPro ? "CRZ ALT" : "Cruising Altitude"}
            value={altitudeValue}
            onValueChange={handleAltitudeChange}
            unit={altitudeUnit}
            units={ALTITUDE_UNITS}
            onUnitChange={handleAltitudeUnitChange}
            decoded={isDecoded}
            icon={<AltitudeIcon className="w-4 h-4" />}
            maxFractionDigits={0}
          />
          <UnitNumberField
            label={isPro ? "Distance" : "Distance"}
            value={distanceValue}
            onValueChange={handleDistanceChange}
            unit={distanceUnit}
            units={DISTANCE_UNITS}
            onUnitChange={handleDistanceUnitChange}
            decoded={isDecoded}
            icon={<DistanceIcon className="w-4 h-4" />}
          />
          <div className="col-span-1 sm:col-span-2">
            <InputField
              label={isPro ? "MJR WPTS" : "Major Waypoints"}
              value={data.majorWaypoints || ""}
              onChange={(v) => update("majorWaypoints", v)}
              icon={<MapPin className="w-4 h-4" />}
            />
          </div>
        </div>
      </section>

      {/* Departure Info */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 mt-2">
          <PlaneTakeoff className="w-4 h-4 text-sky-500" />
          {isPro ? "Departure Info" : "Departure Information"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AirportInput
            name={data.departure?.airport?.name || ""}
            iata={data.departure?.airport?.iata || ""}
            icao={data.departure?.airport?.icao || ""}
            onAirportChange={(airport) =>
              handleAirportChange("departure", airport)
            }
            labelPrefix={isPro ? "Airport" : "Departure Airport"}
          />
          <InputField
            label={isPro ? "P/Bay" : "Parking Bay"}
            value={data.departure?.parkingBay || ""}
            onChange={(v) => update("departure.parkingBay", v.toUpperCase())}
            icon={<CircleParking className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "T/O RWY" : "Takeoff Runway"}
            value={data.departure?.runway || ""}
            onChange={(v) => update("departure.runway", v.toUpperCase())}
            icon={<RunwayIcon className="w-4 h-4" />}
          />
          <TimePicker
            label={isPro ? "SKED DEP" : "Scheduled Departure"}
            value={data.departure?.scheduledTime || ""}
            onChange={(v) => update("departure.scheduledTime", v)}
            icon={<AlarmClock className="w-4 h-4" />}
            suffix={renderUtcSuffix("departure", data.departure?.scheduledTime)}
          />
          <TimePicker
            label={isPro ? "ACT DEP" : "Actual Departure"}
            value={data.departure?.actualTime || ""}
            onChange={(v) => update("departure.actualTime", v)}
            icon={<ClockArrowDown className="w-4 h-4" />}
            suffix={renderUtcSuffix("departure", data.departure?.actualTime)}
          />
          <TimePicker
            label={isPro ? "OFF-CHK" : "Off-Chocks Time"}
            value={data.departure?.offChocks || ""}
            onChange={(v) => update("departure.offChocks", v)}
            icon={<Timer className="w-4 h-4" />}
          />
          <div className="hidden sm:block" />
          <div className="col-span-1 sm:col-span-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <InputField
                  label={isPro ? "METAR" : "Weather (paste METAR)"}
                  value={data.departure?.metar || ""}
                  onChange={(v) => update("departure.metar", normalizeMetarText(v))}
                  icon={<CloudSun className="w-4 h-4" />}
                />
              </div>
              <button
                onClick={() => handleFetchMetar("departure")}
                disabled={!data.departure?.airport?.icao || metarLoading === "departure"}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0"
                title="Auto-fetch METAR from aviation weather"
              >
                {metarLoading === "departure" ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Fetching...
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-3.5 h-3.5" />
                    Fetch
                  </>
                )}
              </button>
            </div>
            {!isPro && depDecoded && <MetarDecodedCard decoded={depDecoded} />}
          </div>
        </div>
      </section>

      {/* Arrival Info */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 mt-2">
          <PlaneLanding className="w-4 h-4 text-sky-500" />
          {isPro ? "Arrival Info" : "Arrival Information"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AirportInput
            name={data.arrival?.airport?.name || ""}
            iata={data.arrival?.airport?.iata || ""}
            icao={data.arrival?.airport?.icao || ""}
            onAirportChange={(airport) =>
              handleAirportChange("arrival", airport)
            }
            labelPrefix={isPro ? "Airport" : "Arrival Airport"}
          />
          <InputField
            label={isPro ? "LDG RWY" : "Landing Runway"}
            value={data.arrival?.runway || ""}
            onChange={(v) => update("arrival.runway", v.toUpperCase())}
            icon={<RunwayIcon className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "P/Bay" : "Parking Bay"}
            value={data.arrival?.parkingBay || ""}
            onChange={(v) => update("arrival.parkingBay", v.toUpperCase())}
            icon={<CircleParking className="w-4 h-4" />}
          />
          <TimePicker
            label={isPro ? "SKED ARR" : "Scheduled Arrival"}
            value={data.arrival?.scheduledTime || ""}
            onChange={(v) => update("arrival.scheduledTime", v)}
            icon={<AlarmClock className="w-4 h-4" />}
            suffix={renderUtcSuffix("arrival", data.arrival?.scheduledTime)}
          />
          <TimePicker
            label={isPro ? "ACT ARR" : "Actual Arrival"}
            value={data.arrival?.actualTime || ""}
            onChange={(v) => update("arrival.actualTime", v)}
            icon={<ClockArrowDown className="w-4 h-4" />}
            suffix={renderUtcSuffix("arrival", data.arrival?.actualTime)}
          />
          <TimePicker
            label={isPro ? "ON-CHK" : "On-Chocks Time"}
            value={data.arrival?.onChocks || ""}
            onChange={(v) => update("arrival.onChocks", v)}
            icon={<Timer className="w-4 h-4" />}
          />
          <div className="hidden sm:block" />
          <div className="col-span-1 sm:col-span-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <InputField
                  label={isPro ? "METAR" : "Weather (paste METAR)"}
                  value={data.arrival?.metar || ""}
                  onChange={(v) => update("arrival.metar", normalizeMetarText(v))}
                  icon={<CloudSun className="w-4 h-4" />}
                />
              </div>
              <button
                onClick={() => handleFetchMetar("arrival")}
                disabled={!data.arrival?.airport?.icao || metarLoading === "arrival"}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0"
                title="Auto-fetch METAR from aviation weather"
              >
                {metarLoading === "arrival" ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Fetching...
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-3.5 h-3.5" />
                    Fetch
                  </>
                )}
              </button>
            </div>
            {!isPro && arrDecoded && <MetarDecodedCard decoded={arrDecoded} />}
          </div>
        </div>
      </section>

      {/* Passenger Info */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 mt-2">
          <UserRound className="w-4 h-4 text-sky-500" />
          {isPro ? "Passenger Info" : "Passenger Information"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label={isPro ? "Seat No." : "Seat Number"}
            value={data.seatNumber || ""}
            onChange={(v) => update("seatNumber", v.toUpperCase())}
            icon={<Hash className="w-4 h-4" />}
          />
          <CabinClassSelect
            value={data.cabinClass || ""}
            onChange={(value) => update("cabinClass", value)}
          />
        </div>
      </section>

      {/* Aircraft Photo */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 mt-2">
          <Camera className="w-4 h-4 text-sky-500" />
          {isPro ? "A/C Photo" : "Aircraft Photo"}
        </h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={photoReg}
                onChange={(e) => setPhotoReg(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") handlePhotoSearch(); }}
                placeholder="Enter registration (e.g. B-8579)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2 text-base sm:text-sm text-slate-900 transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
              />
            </div>
          </div>
          <button
            onClick={handlePhotoSearch}
            disabled={!photoReg.trim() || photoLoading}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              photoReg.trim()
                ? "bg-sky-500 text-white hover:bg-sky-400 shadow-[0_2px_8px_rgba(14,165,233,0.25)]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {photoLoading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching...
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                Search Photo
              </>
            )}
          </button>
        </div>

        {photoError && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
            {photoError}
          </div>
        )}

        {photoResults.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-2">Click a photo to use it in the PDF</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-200">
              {photoResults.slice(0, 6).map((photo, i) => {
                const isSelected = data.selectedPhoto?.link === photo.link;
                const isSelecting = selectingPhotoIdx === i;
                return (
                  <div
                    key={i}
                    className={`flex-none w-[200px] snap-start rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? "border-sky-500 ring-2 ring-sky-200 shadow-md"
                        : "border-slate-200 hover:border-slate-300"
                    } bg-slate-50/50`}
                    onClick={() => handleSelectPhoto(photo, i)}
                  >
                    <div className="relative aspect-[3/2]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`Aircraft ${photoReg}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-sky-500 text-white rounded-full p-0.5 shadow-lg">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {isSelecting && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <svg className="h-5 w-5 animate-spin text-sky-500" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 pt-4 pb-1">
                        <span className="text-[10px] text-white/90 truncate block">
                          {photo.photographer}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {photoReg.trim() && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <span>Can&apos;t find the right photo?</span>
            <a
              href={`https://www.jetphotos.com/registration/${encodeURIComponent(photoReg.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-500 hover:text-sky-600 font-medium transition-colors"
            >
              Search on JetPhotos
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Upload or selected preview */}
        <div className="mt-3">
          {data.selectedPhoto ? (
            <div className="rounded-xl border-2 border-sky-500 overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.selectedPhoto.dataUrl}
                alt="Selected aircraft"
                className="w-full h-auto object-contain max-h-[200px] bg-slate-50"
              />
              <button
                onClick={() => onChange({ ...data, selectedPhoto: undefined })}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {data.selectedPhoto.photographer && (
                <div className="px-3 py-1.5 text-xs text-slate-500 bg-sky-50 border-t border-sky-100">
                  Photo by <span className="font-medium text-slate-700">{data.selectedPhoto.photographer}</span>
                </div>
              )}
            </div>
          ) : (
            <div
              tabIndex={0}
              className="rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 bg-slate-50/50 hover:bg-sky-50/30 transition-all p-4 text-center outline-none"
              onClick={(e) => e.currentTarget.focus()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onPaste={handlePaste}
            >
              <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500">
                Drop,{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="font-medium text-sky-500 underline-offset-2 hover:text-sky-600 hover:underline"
                >
                  browse
                </button>
                , or{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handlePasteClick();
                  }}
                  className="inline-flex items-center gap-0.5 align-text-bottom font-medium text-sky-500 underline-offset-2 hover:text-sky-600 hover:underline"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  paste
                </button>{" "}
                an image
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Supports pasting photos copied from websites</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Boarding Pass */}
      <section>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 mt-2">
          <Ticket className="w-4 h-4 text-sky-500" />
          Boarding Pass
        </h3>
        {data.boardingPass ? (
          <div className="rounded-xl border-2 border-sky-500 overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.boardingPass.imageDataUrl}
              alt="Boarding pass"
              className="w-full h-auto object-contain max-h-[260px] bg-slate-50"
            />
            <button
              onClick={() => onChange({ ...data, boardingPass: undefined })}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {data.boardingPass.source === "pkpass" && data.boardingPass.parsedData && (
              <div className="px-3 py-2 text-xs bg-sky-50 border-t border-sky-100 space-y-0.5">
                {data.boardingPass.parsedData.passengerName && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">PAX:</span>{" "}
                    <span className="font-medium text-slate-700">{data.boardingPass.parsedData.passengerName}</span>
                  </div>
                )}
                <div className="flex gap-3 flex-wrap">
                  {data.boardingPass.parsedData.flightNumber && (
                    <span className="text-slate-600">
                      <span className="text-slate-400">FLT:</span> {data.boardingPass.parsedData.flightNumber}
                    </span>
                  )}
                  {data.boardingPass.parsedData.seatNumber && (
                    <span className="text-slate-600">
                      <span className="text-slate-400">SEAT:</span> {data.boardingPass.parsedData.seatNumber}
                    </span>
                  )}
                  {data.boardingPass.parsedData.gate && (
                    <span className="text-slate-600">
                      <span className="text-slate-400">GATE:</span> {data.boardingPass.parsedData.gate}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            tabIndex={0}
            className="rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 focus:border-sky-300 focus:ring-2 focus:ring-sky-100 bg-slate-50/50 hover:bg-sky-50/30 transition-all p-4 text-center outline-none"
            onClick={(e) => e.currentTarget.focus()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleBpDrop}
            onPaste={handleBpPaste}
          >
            {bpLoading ? (
              <>
                <Loader2 className="w-5 h-5 text-sky-400 mx-auto mb-1.5 animate-spin" />
                <p className="text-xs text-slate-500">Parsing boarding pass...</p>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500">
                  Drop,{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      bpFileInputRef.current?.click();
                    }}
                    className="font-medium text-sky-500 underline-offset-2 hover:text-sky-600 hover:underline"
                  >
                    browse
                  </button>
                  , or{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleBpPasteClick();
                    }}
                    className="inline-flex items-center gap-0.5 align-text-bottom font-medium text-sky-500 underline-offset-2 hover:text-sky-600 hover:underline"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    paste
                  </button>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supports images, screenshots, and Apple Wallet .pkpass files
                </p>
              </>
            )}
            <input
              ref={bpFileInputRef}
              type="file"
              accept="image/*,.pkpass"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBpFile(file);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
