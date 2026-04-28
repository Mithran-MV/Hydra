import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REPO_ROOT = resolve(process.cwd(), "..");
const KV_DIR = process.env.OG_KV_LOCAL_DIR
  ? resolve(process.env.OG_KV_LOCAL_DIR)
  : join(REPO_ROOT, "logs", "og-kv");

interface HeadStateEntry {
  id: string;
  headIndex: number | null;
  status: string;
  generation: number;
  state: unknown;
}

interface OgStorageSnapshot {
  refreshedAt: number;
  kvBackend: string;
  count: number;
  heads: HeadStateEntry[];
}

export async function GET(req: Request) {
  const refreshedAt = Date.now();
  const url = new URL(req.url);
  const headFilter = url.searchParams.get("head");

  const heads: HeadStateEntry[] = [];

  if (existsSync(KV_DIR)) {
    try {
      const files = await readdir(KV_DIR);
      const stateFiles = files.filter((f) => f.endsWith("__current.json"));
      for (const f of stateFiles) {
        try {
          const raw = await readFile(join(KV_DIR, f), "utf8");
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          // Only return entries that look like a HeadState (have id + status)
          if (typeof parsed.id !== "string" || typeof parsed.status !== "string") {
            continue;
          }
          if (parsed.status === "dead") continue;
          if (headFilter && !String(parsed.id).startsWith(headFilter)) continue;
          heads.push({
            id: String(parsed.id),
            headIndex:
              typeof parsed.headIndex === "number" ? parsed.headIndex : null,
            status: String(parsed.status),
            generation:
              typeof parsed.generation === "number" ? parsed.generation : 0,
            state: parsed,
          });
        } catch {}
      }
    } catch {}
  }

  // Order by generation asc then id, so originals (gen 0) sort first
  heads.sort((a, b) => a.generation - b.generation || a.id.localeCompare(b.id));

  const snapshot: OgStorageSnapshot = {
    refreshedAt,
    kvBackend:
      "logs/og-kv (local mirror; production writes via 0G Storage SDK in agents/src/memory/og-kv.ts)",
    count: heads.length,
    heads,
  };

  return Response.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
