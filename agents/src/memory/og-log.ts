import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { HeadId } from "../../../shared/types";
import { log } from "../util/log";

const MODE = (process.env.OG_LOG_MODE ?? "local") as "live" | "local";
const LOCAL_DIR = process.env.OG_LOG_LOCAL_DIR ?? "logs/og-log";

function localPath(headId: HeadId): string {
  return join(LOCAL_DIR, `${headId.slice(0, 16)}.jsonl`);
}

let localInit = false;
async function ensureLocal() {
  if (localInit) return;
  await mkdir(LOCAL_DIR, { recursive: true });
  localInit = true;
}

export async function appendLog(
  headId: HeadId,
  entry: { type: string; payload: unknown },
): Promise<void> {
  const line =
    JSON.stringify({ ts: Date.now(), headId, ...entry }) + "\n";
  if (MODE === "live") {
    log.debug("og-log live mode pending Day 2 SDK wire-up");
  }
  await ensureLocal();
  await appendFile(localPath(headId), line, "utf8");
}
