import { promises as fs } from "fs";
import { join } from "path";
import { FlightData, FlightTrackData, createEmptyFlightData } from "./types";
import {
  FlightLogFieldUpdate,
  applyFlightLogUpdates,
  createFlightDataFromPartial,
  mergeFlightData,
} from "./flightLogFields";

export interface AgentDraftMetadata {
  source?: string;
  notes?: string;
  importedAt?: string;
  updatedAt: string;
  updateCount: number;
}

export interface AgentDraft {
  data: FlightData;
  trackData?: FlightTrackData;
  metadata: AgentDraftMetadata;
}

const AGENT_DIR = join(process.cwd(), ".flight-log-agent");
const DRAFT_PATH = join(AGENT_DIR, "draft.json");

let memoryDraft: AgentDraft | null = null;

export async function readAgentDraft(): Promise<AgentDraft | null> {
  if (memoryDraft) return memoryDraft;

  try {
    const raw = await fs.readFile(DRAFT_PATH, "utf8");
    const parsed = JSON.parse(raw) as AgentDraft;
    memoryDraft = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeAgentDraft(
  data: Partial<FlightData>,
  options: {
    source?: string;
    notes?: string;
    trackData?: FlightTrackData;
    merge?: boolean;
  } = {}
): Promise<AgentDraft> {
  const existing = options.merge ? await readAgentDraft() : null;
  const base = existing?.data ?? createEmptyFlightData();
  const nextData = options.merge
    ? mergeFlightData(base, data, { overwrite: true })
    : createFlightDataFromPartial(data);

  const draft: AgentDraft = {
    data: nextData,
    trackData: options.trackData ?? existing?.trackData,
    metadata: {
      source: options.source ?? existing?.metadata.source,
      notes: options.notes ?? existing?.metadata.notes,
      importedAt: existing?.metadata.importedAt,
      updatedAt: new Date().toISOString(),
      updateCount: (existing?.metadata.updateCount ?? 0) + 1,
    },
  };

  await persistDraft(draft);
  return draft;
}

export async function patchAgentDraft(
  updates: FlightLogFieldUpdate[],
  options: { source?: string; notes?: string } = {}
): Promise<AgentDraft> {
  const existing = await readAgentDraft();
  const data = applyFlightLogUpdates(existing?.data ?? createEmptyFlightData(), updates);
  const draft: AgentDraft = {
    data,
    trackData: existing?.trackData,
    metadata: {
      source: options.source ?? existing?.metadata.source,
      notes: options.notes ?? existing?.metadata.notes,
      importedAt: existing?.metadata.importedAt,
      updatedAt: new Date().toISOString(),
      updateCount: (existing?.metadata.updateCount ?? 0) + updates.length,
    },
  };

  await persistDraft(draft);
  return draft;
}

export async function clearAgentDraft(): Promise<void> {
  memoryDraft = null;
  try {
    await fs.unlink(DRAFT_PATH);
  } catch {
    // Already absent or not writable.
  }
}

async function persistDraft(draft: AgentDraft): Promise<void> {
  memoryDraft = draft;

  try {
    await fs.mkdir(AGENT_DIR, { recursive: true });
    await fs.writeFile(DRAFT_PATH, JSON.stringify(draft, null, 2) + "\n", "utf8");
  } catch {
    // Keep the in-memory draft usable even when the filesystem is unavailable.
  }
}
