import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { keccak_256 } from "@noble/hashes/sha3";
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

function streamPrefix(label: string): string {
  return Buffer.from(keccak_256(`hydra-v1:${label}`))
    .toString("hex")
    .slice(0, 16);
}

const SCARS_PREFIX = streamPrefix("scars:global");

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
  if (!existsSync(KV_DIR)) return [];
  const files = await readdir(KV_DIR);
  const scarFiles = files.filter(
    (f) => f.startsWith(`${SCARS_PREFIX}__`) && !f.endsWith("__current.json"),
  );
  const scars: Scar[] = [];
  for (const f of scarFiles) {
    try {
      const raw = await readFile(join(KV_DIR, f), "utf8");
      scars.push(JSON.parse(raw));
    } catch {
      // skip
    }
  }
  return scars.sort((a, b) => b.learnedAt - a.learnedAt);
}

async function countAttacksSurvived(): Promise<number> {
  if (!existsSync(EVENTS_FILE)) return 0;
  try {
    const raw = await readFile(EVENTS_FILE, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    let count = 0;
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (e?.type === "resurrection.complete") count++;
      } catch {
        // skip
      }
    }
    return count;
  } catch {
    return 0;
  }
}

async function buildSnapshot(): Promise<SwarmSnapshot> {
  const allStates = await readHeadStates();
  const scars = await readScars();
  const attacks = await countAttacksSurvived();

  // Live = anything not status==="dead"
  const liveHeads = allStates.filter((h) => h.status !== "dead");
  const generation = Math.max(0, ...liveHeads.map((h) => h.generation));
  const aum = liveHeads
    .reduce((sum, h) => sum + Number(h.balance ?? 0), 0)
    .toString();

  return {
    generation,
    heads: liveHeads,
    scars,
    attacksSurvived: attacks,
    aum,
    lastEventAt: Date.now(),
  };
}

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send(await buildSnapshot());

      const tick = async () => {
        if (closed) return;
        try {
          send(await buildSnapshot());
        } catch {
          // tolerate transient FS errors
        }
      };

      const interval = setInterval(() => void tick(), 1_000);
      const cleanup = () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
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

// stat used for change detection in future versions
void stat;
