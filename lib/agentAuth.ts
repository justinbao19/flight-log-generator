import { NextRequest, NextResponse } from "next/server";

export function requireAgentWriteAccess(request: NextRequest): NextResponse | null {
  const expectedToken = process.env.FLIGHT_LOG_AGENT_TOKEN;
  if (!expectedToken) return null;

  const suppliedToken = request.headers.get("x-agent-token");
  if (suppliedToken === expectedToken) return null;

  return NextResponse.json(
    {
      error: "Unauthorized agent write request",
      detail: "Set the x-agent-token header to the configured FLIGHT_LOG_AGENT_TOKEN value.",
    },
    { status: 401 }
  );
}
