"use client";

import { FlightData } from "@/lib/types";
import AirportInput from "./AirportInput";

interface FieldEditorProps {
  data: FlightData;
  onChange: (data: FlightData) => void;
}

function InputField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}

export default function FieldEditor({ data, onChange }: FieldEditorProps) {
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

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* General Flight Info */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
          General Flight Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Flight No."
            value={data.flightNumber}
            onChange={(v) => update("flightNumber", v)}
          />
          <InputField
            label="Call Sign"
            value={data.callSign || ""}
            onChange={(v) => update("callSign", v)}
          />
          <InputField
            label="Date"
            value={data.date}
            onChange={(v) => update("date", v)}
          />
          <InputField
            label="A/C Type"
            value={data.aircraftType}
            onChange={(v) => update("aircraftType", v)}
          />
          <InputField
            label="Reg. No."
            value={data.registration}
            onChange={(v) => update("registration", v)}
          />
          <InputField
            label="Flight Duration"
            value={data.flightDuration}
            onChange={(v) => update("flightDuration", v)}
          />
          <InputField
            label="Age"
            value={data.aircraftAge || ""}
            onChange={(v) => update("aircraftAge", v)}
          />
          <InputField
            label="Cruising Alt."
            value={data.cruisingAltitude}
            onChange={(v) => update("cruisingAltitude", v)}
          />
          <InputField
            label="Distance (km)"
            value={String(data.distance?.km || "")}
            onChange={(v) => update("distance.km", v)}
          />
          <InputField
            label="Distance (nm)"
            value={String(data.distance?.nm || "")}
            onChange={(v) => update("distance.nm", v)}
          />
        </div>
      </section>

      {/* Departure Info */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
          Departure Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AirportInput
            name={data.departure?.airport?.name || ""}
            iata={data.departure?.airport?.iata || ""}
            icao={data.departure?.airport?.icao || ""}
            onAirportChange={(airport) => {
              updateMultiple([
                ["departure.airport.name", airport.name],
                ["departure.airport.iata", airport.iata],
                ["departure.airport.icao", airport.icao],
              ]);
            }}
          />
          <InputField
            label="Parking Bay"
            value={data.departure?.parkingBay || ""}
            onChange={(v) => update("departure.parkingBay", v)}
          />
          <InputField
            label="T/O Runway"
            value={data.departure?.runway || ""}
            onChange={(v) => update("departure.runway", v)}
          />
          <InputField
            label="Sched. Dept."
            value={data.departure?.scheduledTime || ""}
            onChange={(v) => update("departure.scheduledTime", v)}
          />
          <InputField
            label="Actual Dept."
            value={data.departure?.actualTime || ""}
            onChange={(v) => update("departure.actualTime", v)}
          />
          <InputField
            label="Off-Chocks"
            value={data.departure?.offChocks || ""}
            onChange={(v) => update("departure.offChocks", v)}
          />
          <div className="hidden sm:block" />
          <InputField
            label="METAR"
            value={data.departure?.metar || ""}
            onChange={(v) => update("departure.metar", v)}
            className="col-span-1 sm:col-span-2"
          />
        </div>
      </section>

      {/* Arrival Info */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
          Arrival Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AirportInput
            name={data.arrival?.airport?.name || ""}
            iata={data.arrival?.airport?.iata || ""}
            icao={data.arrival?.airport?.icao || ""}
            onAirportChange={(airport) => {
              updateMultiple([
                ["arrival.airport.name", airport.name],
                ["arrival.airport.iata", airport.iata],
                ["arrival.airport.icao", airport.icao],
              ]);
            }}
          />
          <InputField
            label="Landing Runway"
            value={data.arrival?.runway || ""}
            onChange={(v) => update("arrival.runway", v)}
          />
          <InputField
            label="Parking Bay"
            value={data.arrival?.parkingBay || ""}
            onChange={(v) => update("arrival.parkingBay", v)}
          />
          <InputField
            label="Sched. Arrival"
            value={data.arrival?.scheduledTime || ""}
            onChange={(v) => update("arrival.scheduledTime", v)}
          />
          <InputField
            label="Actual Arrival"
            value={data.arrival?.actualTime || ""}
            onChange={(v) => update("arrival.actualTime", v)}
          />
          <InputField
            label="On-Chocks"
            value={data.arrival?.onChocks || ""}
            onChange={(v) => update("arrival.onChocks", v)}
          />
          <div className="hidden sm:block" />
          <InputField
            label="METAR"
            value={data.arrival?.metar || ""}
            onChange={(v) => update("arrival.metar", v)}
            className="col-span-1 sm:col-span-2"
          />
        </div>
      </section>

      {/* Optional Fields */}
      <section>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 mb-3">
          Passenger Info
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Seat No."
            value={data.seatNumber || ""}
            onChange={(v) => update("seatNumber", v)}
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Cabin Class
            </label>
            <select
              value={data.cabinClass || ""}
              onChange={(e) => update("cabinClass", e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-black bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="First">First</option>
              <option value="Business">Business</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Economy">Economy</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
