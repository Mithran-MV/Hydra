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
  earliestTs: number | null;
  /** Total messages observed of each kind across the entire events.jsonl,
   *  not just within the returned slice. Lets the UI label sub-sections
   *  with cumulative counts even when only a window of 50 is rendered. */
  totals: {
    lifecycle: number;
    heartbeat: number;
  };
  events: AxlEvent[];
}

const LIFECYCLE_TYPES = new Set([
  "suspect",
  "confirmed",
  "resurrect",
  "born",
  "scar",
  "panic",
]);
const HEARTBEAT_TYPES = new Set(["heartbeat"]);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function pickFilter(types: string | null): Set<string> | null {
  if (types === "lifecycle") return LIFECYCLE_TYPES;
  if (types === "heartbeat") return HEARTBEAT_TYPES;
  return null; // "all" or omitted — no filter
}

export async function GET(req: Request) {
  const refreshedAt = Date.now();
  const url = new URL(req.url);
  const filter = pickFilter(url.searchParams.get("types"));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)),
  );

  const events: AxlEvent[] = [];
  let lifecycleTotal = 0;
  let heartbeatTotal = 0;

  if (existsSync(EVENTS_FILE)) {
    try {
      const raw = await readFile(EVENTS_FILE, "utf8");
      const lines = raw.split("\n");
      // Walk backwards so events come out newest-first.
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line) continue;
        let e: {
          ts: number;
          headId: string;
          type: string;
          payload: Record<string, unknown>;
        };
        try {
          e = JSON.parse(line);
        } catch {
          continue;
        }
        if (e.type !== "axl.recv") continue;
        const inner = String(e.payload.type ?? "?");
        if (LIFECYCLE_TYPES.has(inner)) lifecycleTotal++;
        if (HEARTBEAT_TYPES.has(inner)) heartbeatTotal++;
        if (filter && !filter.has(inner)) continue;
        if (events.length < limit) {
          events.push({
            ts: e.ts,
            headId: e.headId.slice(0, 10),
            msgType: inner,
            from: String(e.payload.from ?? "?"),
          });
        }
      }
    } catch {}
  }

  const cutoff = refreshedAt - 60_000;
  const lastMinuteCount = events.filter((e) => e.ts > cutoff).length;
  const earliestTs = events.length > 0 ? events[events.length - 1].ts : null;

  const snap: AxlSnapshot = {
    refreshedAt,
    lastMinuteCount,
    earliestTs,
    totals: {
      lifecycle: lifecycleTotal,
      heartbeat: heartbeatTotal,
    },
    events,
  };

  return Response.json(snap, {
    headers: { "Cache-Control": "no-store" },
  });
}
