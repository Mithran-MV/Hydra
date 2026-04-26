import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { EventLogEntry, HeadId } from "../../shared/types";

const EVENTS_PATH = process.env.EVENTS_PATH ?? "logs/events.jsonl";

let initialised = false;

async function ensureDir() {
  if (initialised) return;
  await mkdir(dirname(EVENTS_PATH), { recursive: true });
  initialised = true;
}

export async function emitEvent(
  headId: HeadId,
  type: string,
  payload: unknown,
): Promise<void> {
  await ensureDir();
  const entry: EventLogEntry = {
    ts: Date.now(),
    headId,
    type,
    payload,
  };
  await appendFile(EVENTS_PATH, JSON.stringify(entry) + "\n", "utf8");
}
