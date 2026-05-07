import { NextRequest, NextResponse } from "next/server";
import { requireAgentWriteAccess } from "@/lib/agentAuth";
import {
  clearAgentDraft,
  patchAgentDraft,
  readAgentDraft,
  writeAgentDraft,
} from "@/lib/agentDraftStorage";
import { FlightLogFieldUpdate, isFlightLogFieldPath } from "@/lib/flightLogFields";
import { FlightData, FlightTrackData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const draft = await readAgentDraft();
  if (!draft) {
    return NextResponse.json({ draft: null, hasDraft: false });
  }

  return NextResponse.json({ draft, hasDraft: true });
}

export async function PUT(request: NextRequest) {
  const authError = requireAgentWriteAccess(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const draft = await writeAgentDraft(body.data as Partial<FlightData>, {
      source: body.source,
      notes: body.notes,
      merge: body.merge === true,
      trackData: body.trackData as FlightTrackData | undefined,
    });
    return NextResponse.json({ draft, hasDraft: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to write draft";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAgentWriteAccess(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const updates = body.updates as FlightLogFieldUpdate[] | undefined;
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "PATCH requires a non-empty updates array" },
        { status: 400 }
      );
    }

    const invalid = updates.filter((update) => !isFlightLogFieldPath(update.path));
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: "Unknown field path",
          invalidPaths: invalid.map((update) => update.path),
        },
        { status: 400 }
      );
    }

    const draft = await patchAgentDraft(updates, {
      source: body.source,
      notes: body.notes,
    });
    return NextResponse.json({ draft, hasDraft: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to patch draft";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAgentWriteAccess(request);
  if (authError) return authError;

  await clearAgentDraft();
  return NextResponse.json({ draft: null, hasDraft: false });
}
