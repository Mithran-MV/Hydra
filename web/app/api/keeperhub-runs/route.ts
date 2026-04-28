import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPO_ROOT = resolve(process.cwd(), "..");
const KH_LOG = process.env.KEEPERHUB_RUNS_PATH
  ? resolve(process.env.KEEPERHUB_RUNS_PATH)
  : join(REPO_ROOT, "logs", "keeperhub-runs.jsonl");

interface KhRunRecord {
  ts: number;
  workflowId: string;
  workflowLabel: string;
  ok: boolean;
  executionId: string | null;
  status: string | null;
  error: string | null;
  inputSummary: Record<string, unknown>;
}

interface KhSnapshot {
  refreshedAt: number;
  totalRuns: number;
  workflows: Array<{ id: string; label: string; runs: number }>;
  runs: KhRunRecord[];
}

const MAX_RUNS = 50;

export async function GET() {
  const refreshedAt = Date.now();
  const runs: KhRunRecord[] = [];

  if (existsSync(KH_LOG)) {
    try {
      const raw = await readFile(KH_LOG, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          runs.push(JSON.parse(line) as KhRunRecord);
        } catch {}
      }
    } catch {}
  }

  // newest first
  runs.sort((a, b) => b.ts - a.ts);

  const byWorkflow = new Map<string, { id: string; label: string; runs: number }>();
  for (const r of runs) {
    const existing = byWorkflow.get(r.workflowId);
    if (existing) existing.runs += 1;
    else byWorkflow.set(r.workflowId, { id: r.workflowId, label: r.workflowLabel, runs: 1 });
  }

  const snap: KhSnapshot = {
    refreshedAt,
    totalRuns: runs.length,
    workflows: [...byWorkflow.values()],
    runs: runs.slice(0, MAX_RUNS),
  };

  return Response.json(snap, {
    headers: { "Cache-Control": "no-store" },
  });
}
