"use client";

import { FlightData, AirlineInfo } from "@/lib/types";
import AirlineLogo from "./AirlineLogo";

interface PDFTemplateProps {
  data: FlightData;
  airline: AirlineInfo | null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).toUpperCase();
  } catch {
    return dateStr;
  }
}

export default function PDFTemplate({ data, airline }: PDFTemplateProps) {
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
      <div className="flex justify-between items-start mb-4" style={{ fontSize: "9pt" }}>
        <span>
          <strong>SEAT NO./CABIN CL.</strong>{" "}
          {data.seatNumber || "N/A"} / {data.cabinClass || "N/A"}
        </span>
        <span>
          <strong>BAG TAG</strong> {data.bagTag || "N/A"}
        </span>
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
          GENERAL FLT INFO
        </h3>
        <div className="grid grid-cols-3 gap-y-1.5" style={{ fontSize: "9.5pt" }}>
          <div className="col-span-1">
            <strong>FLT NO.:</strong> {data.flightNumber || "N/A"}
          </div>
          <div className="col-span-1">
            <strong>C/S:</strong> {data.callSign || "N/A"}
          </div>
          <div className="col-span-1">
            <strong>DT:</strong> {formatDate(data.date)}
          </div>
          <div>
            <strong>A/C TYPE:</strong> {data.aircraftType || "N/A"}
          </div>
          <div>
            <strong>REG NO.:</strong> {data.registration || "N/A"}
          </div>
          <div>
            <strong>FLT DUR:</strong> {data.flightDuration || "N/A"}
          </div>
          <div>
            <strong>AGE:</strong> {data.aircraftAge || "N/A"}
          </div>
          <div className="col-span-2">
            <strong>DIST:</strong>{" "}
            {data.distance
              ? `${data.distance.km}km / ${data.distance.nm}nm`
              : "N/A"}
          </div>
          <div className="col-span-3">
            <strong>CRZ ALT:</strong> {data.cruisingAltitude || "N/A"}
          </div>
        </div>
      </section>

      {/* Departure Info */}
      <section className="mb-5">
        <h3 className="text-xs font-bold tracking-widest mb-3 border-b border-black pb-1">
          DEP INFO
        </h3>
        <div className="space-y-1.5" style={{ fontSize: "9.5pt" }}>
          <div>
            <strong>DEP ARPT:</strong>{" "}
            {data.departure?.airport?.name || "N/A"}
            <span className="ml-4">
              <strong>ICAO:</strong> {data.departure?.airport?.icao || "N/A"}
            </span>
            <span className="ml-4">
              <strong>IATA:</strong> {data.departure?.airport?.iata || "N/A"}
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>P/BAY:</strong> {data.departure?.parkingBay || "N/A"}
            </span>
            <span>
              <strong>T/O RWY:</strong> {data.departure?.runway || "N/A"}
            </span>
            <span>
              <strong>SKED DEP:</strong>{" "}
              {data.departure?.scheduledTime || "N/A"}
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>ACT DEP:</strong> {data.departure?.actualTime || "N/A"}
            </span>
            <span>
              <strong>OFF-CHK:</strong> {data.departure?.offChocks || "N/A"}
            </span>
            <span>UTC ( +8 )</span>
          </div>
          {data.departure?.metar && (
            <div className="text-[8.5pt] mt-1">
              <strong>METAR:</strong> {data.departure.metar}
            </div>
          )}
        </div>
      </section>

      {/* Arrival Info */}
      <section className="mb-5">
        <h3 className="text-xs font-bold tracking-widest mb-3 border-b border-black pb-1">
          ARR INFO
        </h3>
        <div className="space-y-1.5" style={{ fontSize: "9.5pt" }}>
          <div>
            <strong>DEST ARPT:</strong>{" "}
            {data.arrival?.airport?.name || "N/A"}
            <span className="ml-4">
              <strong>ICAO:</strong> {data.arrival?.airport?.icao || "N/A"}
            </span>
            <span className="ml-4">
              <strong>IATA:</strong> {data.arrival?.airport?.iata || "N/A"}
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>LDG RWY:</strong> {data.arrival?.runway || "N/A"}
            </span>
            <span>
              <strong>SKED ARR:</strong>{" "}
              {data.arrival?.scheduledTime || "N/A"}
            </span>
            <span>
              <strong>ACT ARR:</strong> {data.arrival?.actualTime || "N/A"}
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>ON-CHK:</strong> {data.arrival?.onChocks || "N/A"}
            </span>
            <span>UTC ( +8 )</span>
            <span>
              <strong>P/BAY:</strong> {data.arrival?.parkingBay || "N/A"}
            </span>
          </div>
          {data.arrival?.metar && (
            <div className="text-[8.5pt] mt-1">
              <strong>METAR:</strong> {data.arrival.metar}
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
              A/C PHOTOS / RMKS:
            </h3>
            <div className="border border-dashed border-gray-300 rounded h-[100mm] flex items-center justify-center text-gray-400 text-sm">
              Aircraft photo area
            </div>
          </div>
          <div className="w-[70mm]">
            <h3 className="text-xs font-bold tracking-widest mb-2">B/Pass:</h3>
            <div className="border border-dashed border-gray-300 rounded h-[100mm] flex items-center justify-center text-gray-400 text-sm">
              Boarding pass area
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
