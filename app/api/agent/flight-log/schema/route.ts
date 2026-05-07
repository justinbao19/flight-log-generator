import { NextResponse } from "next/server";
import { FLIGHT_LOG_FIELDS } from "@/lib/flightLogFields";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    name: "flight-log-agent-schema",
    version: 1,
    requiredFields: FLIGHT_LOG_FIELDS.filter((field) => field.required).map(
      (field) => field.path
    ),
    fields: FLIGHT_LOG_FIELDS,
    writeEndpoints: {
      replaceDraft: "PUT /api/agent/flight-log/draft",
      patchDraft: "PATCH /api/agent/flight-log/draft",
      enrich: "POST /api/agent/flight-log/enrich",
    },
    auth: {
      writeHeader: "x-agent-token",
      requiredWhenConfigured: "FLIGHT_LOG_AGENT_TOKEN",
    },
  });
}
