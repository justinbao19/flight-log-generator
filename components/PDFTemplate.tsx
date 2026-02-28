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

const mono: React.CSSProperties = {
  fontFamily: "var(--font-b612-mono), 'B612 Mono', 'Courier New', monospace",
};

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
        fontFamily: "var(--font-b612), 'B612', Arial, Helvetica, sans-serif",
        fontSize: "10pt",
        lineHeight: "1.4",
      }}
    >
      {/* Header - Seat / Cabin / Bag Tag */}
      <div
        className="flex justify-between items-start mb-4"
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
          className="border border-dashed border-gray-400 rounded px-4 py-2 text-center"
          style={{ minWidth: "100px" }}
        >
          <span className="text-[7pt] text-gray-400 uppercase tracking-wider">
            BAG TAG
          </span>
        </div>
      </div>

      {/* Airline Logo Section */}
      <div className="flex flex-col items-center my-6">
        <div className="flex items-center gap-3">
          {airline && (
            <AirlineLogo
              airlineCode={airline.iata}
              airlineName={airline.name}
              logoUrl={airline.logoUrl}
              size="lg"
            />
          )}
          {airline?.allianceLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={airline.allianceLogoUrl}
              alt={airline.alliance || ""}
              className="h-12 object-contain"
            />
          )}
        </div>
        <div className="text-xs text-black mt-1.5 tracking-widest font-semibold" style={mono}>
          FLT-LOG
        </div>
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
        <h3 className="text-xs font-bold tracking-widest mb-3 border-b border-black pb-1">
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
              <span style={mono}>{data.departure?.scheduledTime || "N/A"}</span>
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "ACT DEP:" : "ACTUAL DEP:"}</strong>{" "}
              <span style={mono}>{data.departure?.actualTime || "N/A"}</span>
            </span>
            <span>
              <strong>{isPro ? "OFF-CHK:" : "OFF-CHOCKS:"}</strong>{" "}
              <span style={mono}>{data.departure?.offChocks || "N/A"}</span>
            </span>
            {data.departure?.utcOffset !== undefined && (
              <span style={mono}>{formatUtc(data.departure.utcOffset)}</span>
            )}
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
        <h3 className="text-xs font-bold tracking-widest mb-3 border-b border-black pb-1">
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
              <span style={mono}>{data.arrival?.scheduledTime || "N/A"}</span>
            </span>
            <span>
              <strong>{isPro ? "ACT ARR:" : "ACTUAL ARR:"}</strong>{" "}
              <span style={mono}>{data.arrival?.actualTime || "N/A"}</span>
            </span>
          </div>
          <div className="flex gap-8">
            <span>
              <strong>{isPro ? "ON-CHK:" : "ON-CHOCKS:"}</strong>{" "}
              <span style={mono}>{data.arrival?.onChocks || "N/A"}</span>
            </span>
            {data.arrival?.utcOffset !== undefined && (
              <span style={mono}>{formatUtc(data.arrival.utcOffset)}</span>
            )}
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
