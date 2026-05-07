#!/usr/bin/env node

const args = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(args["base-url"] || process.env.FLIGHT_LOG_BASE_URL || "http://localhost:3000");
const token = args.token || process.env.FLIGHT_LOG_AGENT_TOKEN || "";
const flightNumber = "CA8565";
const date = "2026-05-07";

const headers = {
  "content-type": "application/json",
  ...(token ? { "x-agent-token": token } : {}),
};

const failures = [];

const schema = await requestJson(`${baseUrl}/api/agent/flight-log/schema`);
assert(schema.fields?.length >= 40, "schema exposes at least 40 fillable fields");
assert(schema.requiredFields?.includes("flightNumber"), "schema includes flightNumber as required");
assert(schema.requiredFields?.includes("date"), "schema includes date as required");

await requestJson(`${baseUrl}/api/agent/flight-log/draft`, {
  method: "DELETE",
  headers,
});

const enriched = await requestJson(`${baseUrl}/api/agent/flight-log/enrich`, {
  method: "POST",
  headers,
  body: JSON.stringify({ flightNumber, date }),
});

assert(enriched.data?.flightNumber === flightNumber, "enrichment preserves CA8565");
assert(enriched.data?.date === date, "enrichment preserves 2026-05-07");
assert(enriched.data?.departure?.airport?.iata === "PVG", "baseline/enrichment resolves PVG");
assert(enriched.data?.arrival?.airport?.iata === "CAN", "baseline/enrichment resolves CAN");
assert(enriched.data?.departure?.scheduledTime === "20:30", "baseline schedule includes 20:30 departure");
assert(enriched.data?.arrival?.scheduledTime === "23:05", "baseline schedule includes 23:05 arrival");

await requestJson(`${baseUrl}/api/agent/flight-log/draft`, {
  method: "PUT",
  headers,
  body: JSON.stringify({
    source: "flight-log-agent-smoke-test",
    data: enriched.data,
    trackData: enriched.trackData,
  }),
});

await requestJson(`${baseUrl}/api/agent/flight-log/draft`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    source: "flight-log-agent-smoke-test",
    updates: [
      { path: "seatNumber", value: "31A" },
      { path: "cabinClass", value: "Economy" },
    ],
  }),
});

const draft = await requestJson(`${baseUrl}/api/agent/flight-log/draft`);
assert(draft.hasDraft === true, "draft can be read back");
assert(draft.draft?.data?.seatNumber === "31A", "PATCH writes seatNumber");
assert(draft.draft?.data?.departure?.airport?.icao === "ZSPD", "draft includes departure ICAO");
assert(draft.draft?.data?.arrival?.airport?.icao === "ZGGG", "draft includes arrival ICAO");

const sourceSummary = Object.fromEntries(
  Object.entries(enriched.status || {}).map(([key, value]) => [key, Boolean(value?.ok)])
);

const result = {
  ok: failures.length === 0,
  flightNumber,
  date,
  baseUrl,
  editorUrl: `${baseUrl}/app`,
  sourceSummary,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

function assert(condition, label) {
  if (!condition) failures.push(label);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      i++;
    }
  }
  return parsed;
}

function normalizeBaseUrl(url) {
  return String(url).replace(/\/+$/, "");
}

async function requestJson(url, init) {
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  let body;
  if (contentType.includes("application/json") && text) {
    body = JSON.parse(text);
  } else {
    body = { error: text.slice(0, 300) };
  }

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${body.error || text}`);
  }

  return body;
}
