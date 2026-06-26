"use client";

import { FlightData, AirlineInfo, DisplayMode } from "@/lib/types";
import { decodeMetarSummary } from "@/lib/metarDecode";
import { formatUtcOffset, resolveUtcOffset } from "@/lib/timezone";
import AirlineLogo from "./AirlineLogo";
import {
  Camera,
  Info,
  Luggage,
  PlaneLanding,
  PlaneTakeoff,
  Ticket,
} from "lucide-react";

interface PDFTemplateProps {
  data: FlightData;
  airline: AirlineInfo | null;
  displayMode: DisplayMode;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  } catch {
    return dateStr;
  }
}

const mono: React.CSSProperties = {
  fontFamily: "var(--font-b612-mono), 'B612 Mono', 'Courier New', monospace",
};

function formatNumber(value: number | undefined, maxFractionDigits = 2): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function formatTimeWithUtc(
  time: string | undefined,
  date: string,
  timeZone: string | undefined,
  fallbackOffset: number | undefined
): string {
  if (!time) return "N/A";
  const offset = resolveUtcOffset(timeZone, date, time, fallbackOffset);
  const utc = formatUtcOffset(offset);
  return utc ? `${time} (${utc})` : time;
}

function formatDistance(
  data: FlightData,
  isPro: boolean
): string {
  const unit = data.distanceUnit ?? (isPro ? "nm" : "km");
  const km = data.distance?.km || 0;
  const nm = data.distance?.nm || km / 1.852;

  if (unit === "mi") {
    const miles = (km || nm * 1.852) * 0.621371;
    return `${formatNumber(miles)} ${isPro ? "mi" : "miles"}`;
  }
  if (unit === "km") {
    const value = km || nm * 1.852;
    return `${formatNumber(value)} ${isPro ? "km" : "kilometers"}`;
  }
  const value = nm || km / 1.852;
  return `${formatNumber(value)} ${isPro ? "nm" : "nautical miles"}`;
}

export default function PDFTemplate({
  data,
  airline,
  displayMode,
}: PDFTemplateProps) {
  const isPro = displayMode === "professional";
  const shouldRenderAllianceLogo = Boolean(airline?.allianceLogoUrl);

  const distanceDisplay = data.distance ? formatDistance(data, isPro) : "N/A";

  const depMetarDisplay = data.departure?.metar
    ? isPro
      ? data.departure.metar
      : decodeMetarSummary(data.departure.metar)
    : null;

  const arrMetarDisplay = data.arrival?.metar
    ? isPro
      ? data.arrival.metar
      : decodeMetarSummary(data.arrival.metar)
    : null;

  return (
    <div
      id="pdf-content"
      className="bg-white text-black"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "12mm 15mm",
        fontFamily: "var(--font-b612), 'B612', Arial, Helvetica, sans-serif",
        fontSize: "10pt",
        lineHeight: "1.4",
      }}
    >
      {/* Header - Seat / Cabin / Bag Tag */}
      <div
        className="flex items-center justify-between mb-4"
        style={{ fontSize: "9pt" }}
      >
        <div className="flex gap-8">
          <span>
            <strong>{isPro ? "SEAT NO." : "SEAT NUMBER"}</strong>{" "}
            <span style={mono}>{data.seatNumber || "N/A"}</span>
          </span>
          <span>
            <strong>{isPro ? "CABIN CL." : "CABIN CLASS"}</strong>{" "}
            <span style={mono}>{data.cabinClass || "N/A"}</span>
          </span>
        </div>
        <div
          className="flex items-center justify-center gap-2 rounded border border-dashed border-gray-400 px-5 py-2.5 text-gray-400"
          style={{ minWidth: "118px", fontSize: "9pt" }}
        >
          <Luggage className="h-4 w-4" strokeWidth={2} />
          <span className="uppercase tracking-wider">
            BAG TAG
          </span>
        </div>
      </div>

      {/* Airline Logo Section */}
      <div className="flex flex-col items-center my-6">
        {airline && shouldRenderAllianceLogo ? (
          <div className="flex items-center justify-center gap-5">
            <AirlineLogo
              airlineCode={airline.iata}
              airlineName={airline.name}
              logoUrl={airline.logoUrl}
              size="lg"
            />
            <div className="h-14 w-px bg-gray-300" />
            <span className="flex h-16 w-16 shrink-0 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={airline.allianceLogoUrl}
                alt={airline.alliance || ""}
                className="max-h-full max-w-full object-contain"
              />
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {airline ? (
              <AirlineLogo
                airlineCode={airline.iata}
                airlineName={airline.name}
                logoUrl={airline.logoUrl}
                size="lg"
              />
            ) : (
              <div className="h-20" />
            )}
          </div>
        )}
        <div className="text-xs text-black mt-1.5 tracking-widest font-semibold" style={mono}>
          FLT-LOG
        </div>
      </div>

      <div className="my-4" />

      {/* General Flight Info */}
      <section className="mb-5">
        <h3 className="mb-3 flex items-center gap-1.5 border-b border-black pb-1 text-xs font-bold tracking-widest">
          <Info className="h-3.5 w-3.5" strokeWidth={2.2} />
          {isPro ? "GENERAL FLT INFO" : "GENERAL FLIGHT INFORMATION"}
        </h3>
        <div
          className="grid grid-cols-3 gap-y-1.5"
          style={{ fontSize: "9.5pt" }}
        >
          <div className="col-span-1">
            <strong>{isPro ? "FLT NO.:" : "FLIGHT NO.:"}</strong>{" "}
            <span style={mono}>{data.flightNumber || "N/A"}</span>
          </div>
          <div className="col-span-1">
            <strong>{isPro ? "C/S:" : "CALL SIGN:"}</strong>{" "}
            <span style={mono}>{data.callSign || "N/A"}</span>
          </div>
          <div className="col-span-1">
            <strong>{isPro ? "DT:" : "DATE:"}</strong>{" "}
            <span style={mono}>{formatDate(data.date)}</span>
          </div>
          <div>
            <strong>{isPro ? "A/C TYPE:" : "AIRCRAFT TYPE:"}</strong>{" "}
            <span style={mono}>{data.aircraftType || "N/A"}</span>
          </div>
          <div>
            <strong>{isPro ? "REG NO.:" : "REGISTRATION:"}</strong>{" "}
            <span style={mono}>{data.registration || "N/A"}</span>
          </div>
          <div>
            <strong>{isPro ? "FLT DUR:" : "FLIGHT DURATION:"}</strong>{" "}
            <span style={mono}>{data.flightDuration || "N/A"}</span>
          </div>
          <div>
            <strong>{isPro ? "AGE:" : "AIRCRAFT AGE:"}</strong>{" "}
            <span style={mono}>{data.aircraftAge || "N/A"}</span>
          </div>
          <div className="col-span-2">
            <strong>{isPro ? "DIST:" : "DISTANCE:"}</strong>{" "}
            <span style={mono}>{distanceDisplay}</span>
          </div>
          <div className="col-span-3">
            <strong>{isPro ? "CRZ ALT:" : "CRUISING ALTITUDE:"}</strong>{" "}
            <span style={mono}>{data.cruisingAltitude || "N/A"}</span>
          </div>
          {data.majorWaypoints && (
            <div className="col-span-3 mt-0.5">
              <strong>{isPro ? "MJR WPTS:" : "MAJOR WAYPOINTS:"}</strong>{" "}
              <span style={mono}>{data.majorWaypoints}</span>
            </div>
          )}
        </div>
      </section>

      {/* Departure Info */}
      <section className="mb-5">
        <h3 className="mb-3 flex items-center gap-1.5 border-b border-black pb-1 text-xs font-bold tracking-widest">
          <PlaneTakeoff className="h-3.5 w-3.5" strokeWidth={2.2} />
          {isPro ? "DEP INFO" : "DEPARTURE INFORMATION"}
        </h3>
        <div className="space-y-1.5" style={{ fontSize: "9.5pt" }}>
          <div>
            <strong>{isPro ? "DEP ARPT:" : "DEPARTURE AIRPORT:"}</strong>{" "}
            <span style={mono}>{data.departure?.airport?.name || "N/A"}</span>
            <span className="ml-4">
              <strong>ICAO:</strong>{" "}
              <span style={mono}>{data.departure?.airport?.icao || "N/A"}</span>
            </span>
            <span className="ml-4">
              <strong>IATA:</strong>{" "}
              <span style={mono}>{data.departure?.airport?.iata || "N/A"}</span>
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "P/BAY:" : "PARKING BAY:"}</strong>{" "}
              <span style={mono}>{data.departure?.parkingBay || "N/A"}</span>
            </span>
            <span>
              <strong>{isPro ? "T/O RWY:" : "TAKEOFF RUNWAY:"}</strong>{" "}
              <span style={mono}>{data.departure?.runway || "N/A"}</span>
            </span>
            <span>
              <strong>{isPro ? "SKED DEP:" : "SCHEDULED DEP:"}</strong>{" "}
              <span style={mono}>
                {formatTimeWithUtc(
                  data.departure?.scheduledTime,
                  data.date,
                  data.departure?.timeZone,
                  data.departure?.utcOffset
                )}
              </span>
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "ACT DEP:" : "ACTUAL DEP:"}</strong>{" "}
              <span style={mono}>
                {formatTimeWithUtc(
                  data.departure?.actualTime,
                  data.date,
                  data.departure?.timeZone,
                  data.departure?.utcOffset
                )}
              </span>
            </span>
            <span>
              <strong>{isPro ? "OFF-CHK:" : "OFF-CHOCKS:"}</strong>{" "}
              <span style={mono}>{data.departure?.offChocks || "N/A"}</span>
            </span>
          </div>
          {depMetarDisplay && (
            <div className="text-[8.5pt] mt-1">
              <strong>{isPro ? "METAR:" : "WEATHER:"}</strong>{" "}
              <span style={mono}>{depMetarDisplay}</span>
            </div>
          )}
        </div>
      </section>

      {/* Arrival Info */}
      <section className="mb-5">
        <h3 className="mb-3 flex items-center gap-1.5 border-b border-black pb-1 text-xs font-bold tracking-widest">
          <PlaneLanding className="h-3.5 w-3.5" strokeWidth={2.2} />
          {isPro ? "ARR INFO" : "ARRIVAL INFORMATION"}
        </h3>
        <div className="space-y-1.5" style={{ fontSize: "9.5pt" }}>
          <div>
            <strong>{isPro ? "DEST ARPT:" : "DESTINATION AIRPORT:"}</strong>{" "}
            <span style={mono}>{data.arrival?.airport?.name || "N/A"}</span>
            <span className="ml-4">
              <strong>ICAO:</strong>{" "}
              <span style={mono}>{data.arrival?.airport?.icao || "N/A"}</span>
            </span>
            <span className="ml-4">
              <strong>IATA:</strong>{" "}
              <span style={mono}>{data.arrival?.airport?.iata || "N/A"}</span>
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "LDG RWY:" : "LANDING RUNWAY:"}</strong>{" "}
              <span style={mono}>{data.arrival?.runway || "N/A"}</span>
            </span>
            <span>
              <strong>{isPro ? "SKED ARR:" : "SCHEDULED ARR:"}</strong>{" "}
              <span style={mono}>
                {formatTimeWithUtc(
                  data.arrival?.scheduledTime,
                  data.date,
                  data.arrival?.timeZone,
                  data.arrival?.utcOffset
                )}
              </span>
            </span>
            <span>
              <strong>{isPro ? "ACT ARR:" : "ACTUAL ARR:"}</strong>{" "}
              <span style={mono}>
                {formatTimeWithUtc(
                  data.arrival?.actualTime,
                  data.date,
                  data.arrival?.timeZone,
                  data.arrival?.utcOffset
                )}
              </span>
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "ON-CHK:" : "ON-CHOCKS:"}</strong>{" "}
              <span style={mono}>{data.arrival?.onChocks || "N/A"}</span>
            </span>
            <span>
              <strong>{isPro ? "P/BAY:" : "PARKING BAY:"}</strong>{" "}
              <span style={mono}>{data.arrival?.parkingBay || "N/A"}</span>
            </span>
          </div>
          {arrMetarDisplay && (
            <div className="text-[8.5pt] mt-1">
              <strong>{isPro ? "METAR:" : "WEATHER:"}</strong>{" "}
              <span style={mono}>{arrMetarDisplay}</span>
            </div>
          )}
        </div>
      </section>

      <div className="my-4" />

      {/* Photos / Remarks */}
      <section>
        <div className="flex gap-8">
          <div className="flex-1">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest">
              <Camera className="h-3.5 w-3.5" strokeWidth={2.2} />
              {isPro ? "A/C PHOTOS:" : "AIRCRAFT PHOTOS:"}
            </h3>
            {data.selectedPhoto ? (
              <div
                style={{ height: "100mm" }}
                className="flex flex-col items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.selectedPhoto.dataUrl}
                  alt="Aircraft"
                  style={{
                    maxWidth: "100%",
                    maxHeight: data.selectedPhoto.photographer ? "95mm" : "100mm",
                    objectFit: "contain",
                    display: "block",
                  }}
                  crossOrigin="anonymous"
                />
                {data.selectedPhoto.photographer && (
                  <div
                    style={{
                      marginTop: "1.5mm",
                      fontSize: "6.5pt",
                      color: "#94a3b8",
                      fontFamily: "var(--font-b612-mono), monospace",
                    }}
                  >
                    Photo: {data.selectedPhoto.photographer}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[100mm] items-center justify-center gap-2 rounded border border-dashed border-gray-300 text-sm text-gray-400">
                <Camera className="h-4 w-4" strokeWidth={2} />
                Aircraft Photo
              </div>
            )}
          </div>
          <div className="w-[70mm]">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-widest">
              <Ticket className="h-3.5 w-3.5" strokeWidth={2.2} />
              {isPro ? "B/Pass:" : "Boarding Pass:"}
            </h3>
            {data.boardingPass?.imageDataUrl ? (
              <div className="rounded overflow-hidden h-[100mm] flex items-center justify-center bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.boardingPass.imageDataUrl}
                  alt="Boarding pass"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-[100mm] items-center justify-center gap-2 rounded border border-dashed border-gray-300 text-sm text-gray-400">
                <Ticket className="h-4 w-4" strokeWidth={2} />
                Boarding Pass
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
