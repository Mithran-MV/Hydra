import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { keccak_256 } from "@noble/hashes/sha3";
import type {
  HeadState,
  InferenceTrace,
  KeeperHubRun,
  Scar,
  SwarmSnapshot,
} from "@shared/types";

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
    } catch {}
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
    } catch {}
  }
  return scars.sort((a, b) => b.learnedAt - a.learnedAt);
}

interface ScannedEvents {
  attacks: number;
  inference: InferenceTrace | null;
  keeperhub: KeeperHubRun | null;
}

async function scanEvents(): Promise<ScannedEvents> {
  if (!existsSync(EVENTS_FILE)) {
    return { attacks: 0, inference: null, keeperhub: null };
  }
  let attacks = 0;
  let inference: InferenceTrace | null = null;
  let keeperhub: KeeperHubRun | null = null;
  try {
    const raw = await readFile(EVENTS_FILE, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    for (const line of lines) {
      let e: { ts: number; headId: string; type: string; payload: Record<string, unknown> };
      try {
        e = JSON.parse(line);
      } catch {
        continue;
      }
      if (e.type === "resurrection.complete") attacks++;
      if (e.type === "compute.inference") {
        inference = {
          decision: String(e.payload.decision ?? ""),
          verified: Boolean(e.payload.verified),
          provider: String(e.payload.provider ?? ""),
          model: String(e.payload.model ?? ""),
          ms: Number(e.payload.ms ?? 0),
          ts: e.ts,
          by: e.headId,
        };
      }
      if (e.type === "keeperhub.notify") {
        const status = Number(e.payload.status ?? 0);
        keeperhub = {
          status,
          runId: (e.payload.runId as string) ?? null,
          cause: String(e.payload.cause ?? ""),
          ts: e.ts,
          ok: status > 0 && status < 400,
        };
      }
    }
  } catch {}
  return { attacks, inference, keeperhub };
}

async function buildSnapshot(): Promise<SwarmSnapshot> {
  const allStates = await readHeadStates();
  const scars = await readScars();
  const { attacks, inference, keeperhub } = await scanEvents();

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
    inference,
    keeperhub,
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
        } catch {}
      };
      const interval = setInterval(() => void tick(), 1_000);
      const cleanup = () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
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

void stat;
