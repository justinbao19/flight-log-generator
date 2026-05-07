# Flight Log Agent API

Base URL defaults to `http://localhost:3000`.

## Auth

Write endpoints require `x-agent-token` only when the app server has `FLIGHT_LOG_AGENT_TOKEN` configured.
Read-only schema does not require a token.

## Endpoints

### `GET /api/agent/flight-log/schema`

Returns field definitions, required fields, and endpoint names.

### `GET /api/agent/flight-log/draft`

Returns `{ hasDraft, draft }`.

### `PUT /api/agent/flight-log/draft`

Replace or merge the current agent draft.

```json
{
  "source": "openclaw",
  "notes": "Collected from public sources.",
  "merge": false,
  "data": {
    "flightNumber": "CA8565",
    "date": "2026-05-07"
  },
  "trackData": null
}
```

### `PATCH /api/agent/flight-log/draft`

Apply field-path updates.

```json
{
  "source": "openclaw",
  "updates": [
    { "path": "departure.airport.iata", "value": "PVG" },
    { "path": "arrival.airport.iata", "value": "CAN" },
    { "path": "seatNumber", "value": "31A" }
  ]
}
```

### `POST /api/agent/flight-log/enrich`

Enrich a seed flight. It does not write the draft by itself.

```json
{
  "flightNumber": "CA8565",
  "date": "2026-05-07",
  "include": {
    "baseline": true,
    "lookup": true,
    "airports": true,
    "metar": true,
    "track": true,
    "photo": true
  }
}
```

The response includes `data`, optional `trackData`, a per-source `status`, and a ready-to-send draft request.

## Important Field Paths

Minimum required fields:

- `flightNumber`
- `date`

Common route and schedule fields:

- `departure.airport.name`
- `departure.airport.iata`
- `departure.airport.icao`
- `departure.scheduledTime`
- `departure.actualTime`
- `departure.offChocks`
- `departure.metar`
- `departure.utcOffset`
- `arrival.airport.name`
- `arrival.airport.iata`
- `arrival.airport.icao`
- `arrival.scheduledTime`
- `arrival.actualTime`
- `arrival.onChocks`
- `arrival.metar`
- `arrival.utcOffset`

Common aircraft and passenger fields:

- `callSign`
- `aircraftType`
- `registration`
- `flightDuration`
- `aircraftAge`
- `distance.km`
- `distance.nm`
- `cruisingAltitude`
- `majorWaypoints`
- `seatNumber`
- `cabinClass`
- `bagTag`

Media fields:

- `selectedPhoto.dataUrl`
- `selectedPhoto.photographer`
- `selectedPhoto.link`
- `boardingPass.imageDataUrl`
- `boardingPass.source`
- `boardingPass.parsedData.passengerName`
- `boardingPass.parsedData.flightNumber`
- `boardingPass.parsedData.seatNumber`
- `boardingPass.parsedData.gate`
- `boardingPass.parsedData.boardingTime`
- `boardingPass.parsedData.departureAirport`
- `boardingPass.parsedData.arrivalAirport`

Use `GET /api/agent/flight-log/schema` for the authoritative complete list.
