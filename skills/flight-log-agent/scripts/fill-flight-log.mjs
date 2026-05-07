#!/usr/bin/env node

const args = parseArgs(process.argv.slice(2));
const baseUrl = normalizeBaseUrl(args["base-url"] || process.env.FLIGHT_LOG_BASE_URL || "http://localhost:3000");
const flightNumber = String(args.flight || args.flightNumber || "CA8565").toUpperCase();
const date = String(args.date || "2026-05-07");
const token = args.token || process.env.FLIGHT_LOG_AGENT_TOKEN || "";

const headers = {
  "content-type": "application/json",
  ...(token ? { "x-agent-token": token } : {}),
};

const schema = await requestJson(`${baseUrl}/api/agent/flight-log/schema`);
if (!Array.isArray(schema.fields) || schema.fields.length < 30) {
  throw new Error("Schema did not return the expected field registry.");
}

const enriched = await requestJson(`${baseUrl}/api/agent/flight-log/enrich`, {
  method: "POST",
  headers,
  body: JSON.stringify({ flightNumber, date }),
});

const draftPayload = {
  source: "flight-log-agent",
  notes: `Draft generated for ${flightNumber} / ${date}.`,
  data: enriched.data,
  trackData: enriched.trackData,
};

const written = await requestJson(`${baseUrl}/api/agent/flight-log/draft`, {
  method: "PUT",
  headers,
  body: JSON.stringify(draftPayload),
});

const statusRows = Object.entries(enriched.status || {}).map(([name, status]) => ({
  source: name,
  ok: Boolean(status?.ok),
  detail: status?.detail || "",
}));

const result = {
  ok: true,
  flightNumber,
  date,
  editorUrl: `${baseUrl}/app`,
  requiredFields: schema.requiredFields,
  draftUpdatedAt: written.draft?.metadata?.updatedAt,
  sources: statusRows,
};

console.log(JSON.stringify(result, null, 2));

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
