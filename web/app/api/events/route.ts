import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { HeadState, Scar, SwarmSnapshot } from "@shared/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPO_ROOT = resolve(process.cwd(), "..");
const KV_DIR = process.env.OG_KV_LOCAL_DIR
  ? resolve(process.env.OG_KV_LOCAL_DIR)
  : join(REPO_ROOT, "logs", "og-kv");
const EVENTS_FILE = process.env.EVENTS_PATH
  ? resolve(process.env.EVENTS_PATH)
  : join(REPO_ROOT, "logs", "events.jsonl");

async function readHeadStates(): Promise<HeadState[]> {
  if (!existsSync(KV_DIR)) return [];
  const files = await readdir(KV_DIR);
  const stateFiles = files.filter((f) => f.endsWith("__current.json"));
  const states: HeadState[] = [];
  for (const f of stateFiles) {
    try {
      const raw = await readFile(join(KV_DIR, f), "utf8");
      states.push(JSON.parse(raw));
    } catch {
      // skip unreadable
    }
  }
  return states;
}

async function readScars(): Promise<Scar[]> {
  // Day 2 — read from logs/og-kv with scars stream prefix.
  return [];
}

async function buildSnapshot(): Promise<SwarmSnapshot> {
  const heads = await readHeadStates();
  const scars = await readScars();
  const now = Date.now();
  const generation = Math.max(0, ...heads.map((h) => h.generation));
  const aum = heads
    .reduce((sum, h) => sum + Number(h.balance ?? 0), 0)
    .toString();
  return {
    generation,
    heads,
    scars,
    attacksSurvived: 0,
    aum,
    lastEventAt: now,
  };
}

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastEventsSize = 0;
      let closed = false;

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Initial snapshot
      send(await buildSnapshot());

      const tick = async () => {
        if (closed) return;
        try {
          const snapshot = await buildSnapshot();
          send(snapshot);

          if (existsSync(EVENTS_FILE)) {
            const stats = await stat(EVENTS_FILE);
            if (stats.size !== lastEventsSize) {
              lastEventsSize = stats.size;
            }
          }
        } catch {
          // tolerate transient FS errors
        }
      };

      const interval = setInterval(() => void tick(), 1_000);

      // Cleanup on close
      const cleanup = () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Auto-close after 10 minutes to avoid runaway connections
      setTimeout(cleanup, 10 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
