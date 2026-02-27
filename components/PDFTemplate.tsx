"use client";

import { FlightData, AirlineInfo, DisplayMode } from "@/lib/types";
import { decodeMetarSummary } from "@/lib/metarDecode";
import AirlineLogo from "./AirlineLogo";

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

function formatUtc(offset: number | undefined): string {
  if (offset === undefined || offset === null) return "";
  const sign = offset >= 0 ? "+" : "";
  return `UTC ( ${sign}${offset} )`;
}

export default function PDFTemplate({
  data,
  airline,
  displayMode,
}: PDFTemplateProps) {
  const isPro = displayMode === "professional";

  const distanceDisplay = isPro
    ? data.distance
      ? `${data.distance.nm} nm`
      : "N/A"
    : data.distance
      ? `${data.distance.km} km`
      : "N/A";

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
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "10pt",
        lineHeight: "1.4",
      }}
    >
      {/* Header - Seat / Bag Tag */}
      <div
        className="flex justify-between items-start mb-4"
        style={{ fontSize: "9pt" }}
      >
        <span>
          <strong>{isPro ? "SEAT NO./CABIN CL." : "SEAT NUMBER / CABIN CLASS"}</strong>{" "}
          {data.seatNumber || "N/A"} / {data.cabinClass || "N/A"}
        </span>
        <div
          className="border border-dashed border-gray-400 rounded px-4 py-2 text-center"
          style={{ minWidth: "100px" }}
        >
          <span className="text-[7pt] text-gray-400 uppercase tracking-wider">
            BAG TAG
          </span>
        </div>
      </div>

      {/* Airline Logo Section */}
      <div className="flex items-center justify-center gap-6 my-6">
        {airline && (
          <AirlineLogo
            airlineCode={airline.iata}
            airlineName={airline.name}
            logoUrl={airline.logoUrl}
            size="lg"
          />
        )}
        <div className="text-center">
          <div className="text-lg font-bold tracking-wide">
            {airline?.name?.toUpperCase() || "AIRLINE"}
          </div>
          <div className="text-xs text-black mt-0.5">(FLT LOG)</div>
        </div>
        {airline?.alliance && (
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-black">
              {airline.alliance}
            </span>
          </div>
        )}
      </div>

      <hr className="border-gray-300 my-4" />

      {/* General Flight Info */}
      <section className="mb-5">
        <h3 className="text-xs font-bold tracking-widest mb-3 border-b border-black pb-1">
          {isPro ? "GENERAL FLT INFO" : "GENERAL FLIGHT INFORMATION"}
        </h3>
        <div
          className="grid grid-cols-3 gap-y-1.5"
          style={{ fontSize: "9.5pt" }}
        >
          <div className="col-span-1">
            <strong>{isPro ? "FLT NO.:" : "FLIGHT NO.:"}</strong>{" "}
            {data.flightNumber || "N/A"}
          </div>
          <div className="col-span-1">
            <strong>{isPro ? "C/S:" : "CALL SIGN:"}</strong>{" "}
            {data.callSign || "N/A"}
          </div>
          <div className="col-span-1">
            <strong>{isPro ? "DT:" : "DATE:"}</strong> {formatDate(data.date)}
          </div>
          <div>
            <strong>{isPro ? "A/C TYPE:" : "AIRCRAFT TYPE:"}</strong>{" "}
            {data.aircraftType || "N/A"}
          </div>
          <div>
            <strong>{isPro ? "REG NO.:" : "REGISTRATION:"}</strong>{" "}
            {data.registration || "N/A"}
          </div>
          <div>
            <strong>{isPro ? "FLT DUR:" : "FLIGHT DURATION:"}</strong>{" "}
            {data.flightDuration || "N/A"}
          </div>
          <div>
            <strong>{isPro ? "AGE:" : "AIRCRAFT AGE:"}</strong>{" "}
            {data.aircraftAge || "N/A"}
          </div>
          <div className="col-span-2">
            <strong>{isPro ? "DIST:" : "DISTANCE:"}</strong> {distanceDisplay}
          </div>
          <div className="col-span-3">
            <strong>{isPro ? "CRZ ALT:" : "CRUISING ALTITUDE:"}</strong>{" "}
            {data.cruisingAltitude || "N/A"}
          </div>
        </div>
      </section>

      {/* Departure Info */}
      <section className="mb-5">
        <h3 className="text-xs font-bold tracking-widest mb-3 border-b border-black pb-1">
          {isPro ? "DEP INFO" : "DEPARTURE INFORMATION"}
        </h3>
        <div className="space-y-1.5" style={{ fontSize: "9.5pt" }}>
          <div>
            <strong>{isPro ? "DEP ARPT:" : "DEPARTURE AIRPORT:"}</strong>{" "}
            {data.departure?.airport?.name || "N/A"}
            <span className="ml-4">
              <strong>ICAO:</strong>{" "}
              {data.departure?.airport?.icao || "N/A"}
            </span>
            <span className="ml-4">
              <strong>IATA:</strong>{" "}
              {data.departure?.airport?.iata || "N/A"}
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "P/BAY:" : "PARKING BAY:"}</strong>{" "}
              {data.departure?.parkingBay || "N/A"}
            </span>
            <span>
              <strong>{isPro ? "T/O RWY:" : "TAKEOFF RUNWAY:"}</strong>{" "}
              {data.departure?.runway || "N/A"}
            </span>
            <span>
              <strong>{isPro ? "SKED DEP:" : "SCHEDULED DEP:"}</strong>{" "}
              {data.departure?.scheduledTime || "N/A"}
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "ACT DEP:" : "ACTUAL DEP:"}</strong>{" "}
              {data.departure?.actualTime || "N/A"}
            </span>
            <span>
              <strong>{isPro ? "OFF-CHK:" : "OFF-CHOCKS:"}</strong>{" "}
              {data.departure?.offChocks || "N/A"}
            </span>
            {data.departure?.utcOffset !== undefined && (
              <span>{formatUtc(data.departure.utcOffset)}</span>
            )}
          </div>
          {depMetarDisplay && (
            <div className="text-[8.5pt] mt-1">
              <strong>{isPro ? "METAR:" : "WEATHER:"}</strong>{" "}
              {depMetarDisplay}
            </div>
          )}
        </div>
      </section>

      {/* Arrival Info */}
      <section className="mb-5">
        <h3 className="text-xs font-bold tracking-widest mb-3 border-b border-black pb-1">
          {isPro ? "ARR INFO" : "ARRIVAL INFORMATION"}
        </h3>
        <div className="space-y-1.5" style={{ fontSize: "9.5pt" }}>
          <div>
            <strong>{isPro ? "DEST ARPT:" : "DESTINATION AIRPORT:"}</strong>{" "}
            {data.arrival?.airport?.name || "N/A"}
            <span className="ml-4">
              <strong>ICAO:</strong>{" "}
              {data.arrival?.airport?.icao || "N/A"}
            </span>
            <span className="ml-4">
              <strong>IATA:</strong>{" "}
              {data.arrival?.airport?.iata || "N/A"}
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "LDG RWY:" : "LANDING RUNWAY:"}</strong>{" "}
              {data.arrival?.runway || "N/A"}
            </span>
            <span>
              <strong>{isPro ? "SKED ARR:" : "SCHEDULED ARR:"}</strong>{" "}
              {data.arrival?.scheduledTime || "N/A"}
            </span>
            <span>
              <strong>{isPro ? "ACT ARR:" : "ACTUAL ARR:"}</strong>{" "}
              {data.arrival?.actualTime || "N/A"}
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "ON-CHK:" : "ON-CHOCKS:"}</strong>{" "}
              {data.arrival?.onChocks || "N/A"}
            </span>
            {data.arrival?.utcOffset !== undefined && (
              <span>{formatUtc(data.arrival.utcOffset)}</span>
            )}
            <span>
              <strong>{isPro ? "P/BAY:" : "PARKING BAY:"}</strong>{" "}
              {data.arrival?.parkingBay || "N/A"}
            </span>
          </div>
          {arrMetarDisplay && (
            <div className="text-[8.5pt] mt-1">
              <strong>{isPro ? "METAR:" : "WEATHER:"}</strong>{" "}
              {arrMetarDisplay}
            </div>
          )}
        </div>
      </section>

      <hr className="border-gray-300 my-4" />

      {/* Photos / Remarks */}
      <section>
        <div className="flex gap-8">
          <div className="flex-1">
            <h3 className="text-xs font-bold tracking-widest mb-2">
              {isPro ? "A/C PHOTOS / RMKS:" : "AIRCRAFT PHOTOS / REMARKS:"}
            </h3>
            <div className="border border-dashed border-gray-300 rounded h-[100mm] flex items-center justify-center text-gray-400 text-sm">
              Aircraft photo area
            </div>
          </div>
          <div className="w-[70mm]">
            <h3 className="text-xs font-bold tracking-widest mb-2">
              {isPro ? "B/Pass:" : "Boarding Pass:"}
            </h3>
            <div className="border border-dashed border-gray-300 rounded h-[100mm] flex items-center justify-center text-gray-400 text-sm">
              Boarding pass area
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
