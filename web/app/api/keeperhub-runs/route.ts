import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPO_ROOT = resolve(process.cwd(), "..");
const EVENTS_FILE = process.env.EVENTS_PATH
  ? resolve(process.env.EVENTS_PATH)
  : join(REPO_ROOT, "logs", "events.jsonl");

interface KhRun {
  ts: number;
  kind: "notify" | "skip";
  workflow: string;
  cause: string;
  status: number | null;
  ok: boolean | null;
  runId: string | null;
  reason: string | null;
}

interface KhSnapshot {
  refreshedAt: number;
  workflowId: string;
  totalRuns: number;
  runs: KhRun[];
}

const WORKFLOW_ID = "lcyuk85gh46defy5xaq8b";

export async function GET() {
  const refreshedAt = Date.now();
  const runs: KhRun[] = [];

  if (existsSync(EVENTS_FILE)) {
    try {
      const raw = await readFile(EVENTS_FILE, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      for (const line of lines) {
        let e: {
          ts: number;
          type: string;
          payload: Record<string, unknown>;
        };
        try {
          e = JSON.parse(line);
        } catch {
          continue;
        }
        if (!e.type.startsWith("keeperhub.")) continue;
        if (e.type === "keeperhub.notify") {
          const status = Number(e.payload.status ?? 0);
          runs.push({
            ts: e.ts,
            kind: "notify",
            workflow: deriveWorkflow(e.type, e.payload),
            cause: String(e.payload.cause ?? "—"),
            status,
            ok: status > 0 && status < 400,
            runId: (e.payload.runId as string) ?? null,
            reason: null,
          });
        } else if (
          e.type === "keeperhub.heartbeat-stale.skip" ||
          e.type === "keeperhub.scar-learned.skip" ||
          e.type === "keeperhub.skip"
        ) {
          runs.push({
            ts: e.ts,
            kind: "skip",
            workflow: deriveWorkflow(e.type, e.payload),
            cause: String(e.payload.cause ?? "—"),
            status: null,
            ok: null,
            runId: null,
            reason: String(e.payload.reason ?? "configuration not set"),
          });
        }
      }
    } catch {}
  }

  // newest first, cap at 50
  runs.sort((a, b) => b.ts - a.ts);
  const trimmed = runs.slice(0, 50);

  const snapshot: KhSnapshot = {
    refreshedAt,
    workflowId: WORKFLOW_ID,
    totalRuns: runs.length,
    runs: trimmed,
  };

  return Response.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}

function deriveWorkflow(type: string, _payload: Record<string, unknown>): string {
  if (type.includes("heartbeat")) return "heartbeat-stale";
  if (type.includes("scar")) return "scar-learned";
  return "redistribute";
}
