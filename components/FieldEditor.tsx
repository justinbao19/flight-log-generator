"use client";

import { FlightData, DisplayMode, AircraftPhoto } from "@/lib/types";
import { decodeMetar, DecodedMetar } from "@/lib/metarDecode";
import AirportInput from "./AirportInput";
import { DatePicker, TimePicker } from "./DateTimePicker";
import { useMemo, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { Plane, Hash, Clock, CloudSun, PlaneTakeoff, PlaneLanding, Radio, Tag, Timer, Hourglass, Globe, CircleParking, AlarmClock, ClockArrowDown, UserRound, MapPin, Satellite, Search, Camera, ExternalLink, CloudDownload, Info } from "lucide-react";
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

function formatUtcOffset(offset: number | undefined): string {
  if (offset === undefined || offset === null) return "";
  const sign = offset >= 0 ? "+" : "";
  return `UTC${sign}${offset}`;
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

  const [photoReg, setPhotoReg] = useState(data.registration || "");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoResults, setPhotoResults] = useState<AircraftPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const prevRegRef = useRef(data.registration);

  useEffect(() => {
    if (data.registration && data.registration !== prevRegRef.current) {
      setPhotoReg(data.registration);
      setPhotoResults([]);
      setPhotoError(null);
    }
    prevRegRef.current = data.registration;
  }, [data.registration]);

  const handlePhotoSearch = useCallback(async () => {
    const reg = photoReg.trim();
    if (!reg) return;
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
      if (info?.utcOffset !== undefined) params.set("utcOffset", String(info.utcOffset));

      const res = await fetch(`/api/metar?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const { metar } = await res.json();
      if (metar) {
        onChange({
          ...JSON.parse(JSON.stringify(data)),
          [which]: { ...JSON.parse(JSON.stringify(info)), metar },
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to fetch METAR");
    } finally {
      setMetarLoading(null);
    }
  }, [data, onChange]);

  const setNestedValue = (
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
    } else {
      target[lastKey] = value;
    }
  };

  const update = (path: string, value: string) => {
    const newData = JSON.parse(JSON.stringify(data)) as FlightData;
    setNestedValue(
      newData as unknown as Record<string, unknown>,
      path,
      value
    );
    onChange(newData);
  };

  const updateMultiple = (updates: [string, string][]) => {
    const newData = JSON.parse(JSON.stringify(data)) as FlightData;
    const obj = newData as unknown as Record<string, unknown>;
    for (const [path, value] of updates) {
      setNestedValue(obj, path, value);
    }
    onChange(newData);
  };

  const handleDistanceChange = (value: string) => {
    const num = parseFloat(value) || 0;
    if (isPro) {
      const km = Math.round(num * 1.852);
      updateMultiple([
        ["distance.nm", String(num)],
        ["distance.km", String(km)],
      ]);
    } else {
      const nm = Math.round(num / 1.852);
      updateMultiple([
        ["distance.km", String(num)],
        ["distance.nm", String(nm)],
      ]);
    }
  };

  const handleAirportChange = (
    prefix: "departure" | "arrival",
    airport: {
      name: string;
      iata: string;
      icao: string;
      utcOffset?: number;
    }
  ) => {
    const updates: [string, string][] = [
      [`${prefix}.airport.name`, airport.name],
      [`${prefix}.airport.iata`, airport.iata],
      [`${prefix}.airport.icao`, airport.icao],
    ];
    if (airport.utcOffset !== undefined) {
      updates.push([`${prefix}.utcOffset`, String(airport.utcOffset)]);
    }
    updateMultiple(updates);
  };

  const computedDuration = useMemo(() => {
    const depTime = data.departure?.actualTime;
    const arrTime = data.arrival?.actualTime;
    if (!depTime || !arrTime) return null;

    const depOffset = data.departure?.utcOffset;
    const arrOffset = data.arrival?.utcOffset;
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
  ]);

  const prevDurationRef = useRef(computedDuration);
  useEffect(() => {
    if (computedDuration && computedDuration !== prevDurationRef.current) {
      prevDurationRef.current = computedDuration;
      if (data.flightDuration !== computedDuration) {
        update("flightDuration", computedDuration);
      }
    }
  }, [computedDuration]);

  const isDateTooOld = useMemo(() => {
    if (!data.date) return false;
    const diff = Date.now() - new Date(data.date + "T23:59:59Z").getTime();
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
            {onFlightLookup && (
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
            {onFetchTrack && (
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
            {(onFlightLookup || onFetchTrack) && (
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

          {trackError && !trackLoading && (
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
            onChange={(v) => update("flightNumber", v)}
            icon={<Hash className="w-4 h-4" />}
          />
          <InputField
            label="Call Sign"
            value={data.callSign || ""}
            onChange={(v) => update("callSign", v)}
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
            onChange={(v) => update("aircraftType", v)}
            icon={<Plane className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "Reg. No." : "Registration"}
            value={data.registration}
            onChange={(v) => update("registration", v)}
            icon={<Tag className="w-4 h-4" />}
          />
          <InputField
            label="Flight Duration"
            value={data.flightDuration}
            onChange={(v) => update("flightDuration", v)}
            readOnly={!!computedDuration}
            icon={<Timer className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "Age" : "Aircraft Age"}
            value={data.aircraftAge || ""}
            onChange={(v) => update("aircraftAge", v)}
            icon={<Hourglass className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "CRZ ALT" : "Cruising Altitude"}
            value={data.cruisingAltitude}
            onChange={(v) => update("cruisingAltitude", v)}
            icon={<AltitudeIcon className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "Distance (nm)" : "Distance (km)"}
            value={String(
              isPro ? data.distance?.nm || "" : data.distance?.km || ""
            )}
            onChange={handleDistanceChange}
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
          {data.departure?.utcOffset !== undefined && (
            <InputField
              label={isPro ? "UTC" : "UTC Timezone"}
              value={formatUtcOffset(data.departure.utcOffset)}
              onChange={() => {}}
              readOnly
              icon={<Globe className="w-4 h-4" />}
            />
          )}
          <InputField
            label={isPro ? "P/Bay" : "Parking Bay"}
            value={data.departure?.parkingBay || ""}
            onChange={(v) => update("departure.parkingBay", v)}
            icon={<CircleParking className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "T/O RWY" : "Takeoff Runway"}
            value={data.departure?.runway || ""}
            onChange={(v) => update("departure.runway", v)}
            icon={<RunwayIcon className="w-4 h-4" />}
          />
          <TimePicker
            label={isPro ? "SKED DEP" : "Scheduled Departure"}
            value={data.departure?.scheduledTime || ""}
            onChange={(v) => update("departure.scheduledTime", v)}
            icon={<AlarmClock className="w-4 h-4" />}
          />
          <TimePicker
            label={isPro ? "ACT DEP" : "Actual Departure"}
            value={data.departure?.actualTime || ""}
            onChange={(v) => update("departure.actualTime", v)}
            icon={<ClockArrowDown className="w-4 h-4" />}
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
                  onChange={(v) => update("departure.metar", v)}
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
          {data.arrival?.utcOffset !== undefined && (
            <InputField
              label={isPro ? "UTC" : "UTC Timezone"}
              value={formatUtcOffset(data.arrival.utcOffset)}
              onChange={() => {}}
              readOnly
              icon={<Globe className="w-4 h-4" />}
            />
          )}
          <InputField
            label={isPro ? "LDG RWY" : "Landing Runway"}
            value={data.arrival?.runway || ""}
            onChange={(v) => update("arrival.runway", v)}
            icon={<RunwayIcon className="w-4 h-4" />}
          />
          <InputField
            label={isPro ? "P/Bay" : "Parking Bay"}
            value={data.arrival?.parkingBay || ""}
            onChange={(v) => update("arrival.parkingBay", v)}
            icon={<CircleParking className="w-4 h-4" />}
          />
          <TimePicker
            label={isPro ? "SKED ARR" : "Scheduled Arrival"}
            value={data.arrival?.scheduledTime || ""}
            onChange={(v) => update("arrival.scheduledTime", v)}
            icon={<AlarmClock className="w-4 h-4" />}
          />
          <TimePicker
            label={isPro ? "ACT ARR" : "Actual Arrival"}
            value={data.arrival?.actualTime || ""}
            onChange={(v) => update("arrival.actualTime", v)}
            icon={<ClockArrowDown className="w-4 h-4" />}
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
                  onChange={(v) => update("arrival.metar", v)}
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
            onChange={(v) => update("seatNumber", v)}
            icon={<Hash className="w-4 h-4" />}
          />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5 capitalize">
              Cabin Class
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
                <CabinClassIcon className="w-4 h-4" />
              </div>
              <select
                value={data.cabinClass || ""}
                onChange={(e) => update("cabinClass", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2 sm:py-2 text-base sm:text-sm text-slate-900 appearance-none transition-all focus:bg-white focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                }}
              >
                <option value="">Select...</option>
                <option value="First">First</option>
                <option value="Business">Business</option>
                <option value="Premium Economy">Premium Economy</option>
                <option value="Economy">Economy</option>
              </select>
            </div>
          </div>
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
                onChange={(e) => setPhotoReg(e.target.value)}
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
              className="rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-300 bg-slate-50/50 hover:bg-sky-50/30 transition-all cursor-pointer p-4 text-center"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500">
                Drop an image here or <span className="text-sky-500 font-medium">browse</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Upload your own aircraft photo</p>
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
    </div>
  );
}
