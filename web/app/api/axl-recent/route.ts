import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPO_ROOT = resolve(process.cwd(), "..");
const EVENTS_FILE = process.env.EVENTS_PATH
  ? resolve(process.env.EVENTS_PATH)
  : join(REPO_ROOT, "logs", "events.jsonl");

interface AxlEvent {
  ts: number;
  headId: string;
  msgType: string;
  from: string;
}

interface AxlSnapshot {
  refreshedAt: number;
  lastMinuteCount: number;
  events: AxlEvent[];
}

const MAX = 50;

export async function GET() {
  const refreshedAt = Date.now();
  const events: AxlEvent[] = [];

  if (existsSync(EVENTS_FILE)) {
    try {
      const raw = await readFile(EVENTS_FILE, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      // Walk backwards so we don't allocate a huge array for the whole log
      for (let i = lines.length - 1; i >= 0 && events.length < MAX * 4; i--) {
        let e: {
          ts: number;
          headId: string;
          type: string;
          payload: Record<string, unknown>;
        };
        try {
          e = JSON.parse(lines[i]);
        } catch {
          continue;
        }
        if (e.type !== "axl.recv") continue;
        events.push({
          ts: e.ts,
          headId: e.headId.slice(0, 10),
          msgType: String(e.payload.type ?? "?"),
          from: String(e.payload.from ?? "?"),
        });
      }
    } catch {}
  }

  // newest first already (we walked backwards), trim to MAX
  const trimmed = events.slice(0, MAX);
  const cutoff = refreshedAt - 60_000;
  const lastMinuteCount = events.filter((e) => e.ts > cutoff).length;

  const snap: AxlSnapshot = {
    refreshedAt,
    lastMinuteCount,
    events: trimmed,
  };

  return Response.json(snap, {
    headers: { "Cache-Control": "no-store" },
  });
}
