import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { request } from "undici";
import { portsForHead } from "./configs";
import { log } from "../util/log";

const BOOT_WAIT_MS = 4_000;
const POLL_INTERVAL_MS = 250;

/**
 * Launch the AXL Go sidecar for a head and wait for /topology to respond.
 * Returns the spawned PID.
 */
export async function spawnAxlSidecar(
  configPath: string,
  apiPort: number,
): Promise<number> {
  await mkdir("logs", { recursive: true });
  const out = `logs/axl-${configPath.replace(/[^0-9]/g, "")}.log`;
  const proc = spawn("./axl/bin/axl-node", ["-config", configPath], {
    detached: true,
    stdio: [
      "ignore",
      // pipe to file via shell would be cleaner but spawn doesn't have built-in.
      // Instead inherit + we'll grep child logs via the parent's stdout — for
      // simplicity, just ignore stdout/stderr (children's events flow through 0G/SSE).
      "ignore",
      "ignore",
    ],
    cwd: process.cwd(),
  });
  void out; // reserved for future log piping
  proc.unref();

  // Wait for AXL HTTP API to come up
  const deadline = Date.now() + BOOT_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const r = await request(`http://127.0.0.1:${apiPort}/topology`);
      if (r.statusCode === 200) {
        await r.body.text();
        return proc.pid ?? -1;
      }
    } catch {
      // not ready yet
    }
    await sleep(POLL_INTERVAL_MS);
  }
  log.warn(`AXL sidecar at :${apiPort} did not become ready in ${BOOT_WAIT_MS}ms`);
  return proc.pid ?? -1;
}

/**
 * Spawn a child Node head process with parent inheritance.
 * Returns the spawned PID.
 */
export async function spawnHeadProcess(
  headIndex: number,
  parentId: string,
  strategy: string,
): Promise<number> {
  await mkdir("logs", { recursive: true });
  const proc = spawn("npx", ["tsx", "agents/src/head.ts"], {
    env: {
      ...process.env,
      HEAD_INDEX: String(headIndex),
      HEAD_STRATEGY: strategy,
      PARENT_ID: parentId,
      ACTIVE_HEADS: String(Math.max(headIndex, Number(process.env.ACTIVE_HEADS ?? 3))),
    },
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
    cwd: process.cwd(),
  });
  proc.unref();
  return proc.pid ?? -1;
}

/**
 * Helper: redirect child stdio to a file. Useful for debugging spawned heads.
 * Currently unused — children's logs come via 0G/SSE.
 */
export async function ensureLogFile(path: string): Promise<void> {
  await mkdir("logs", { recursive: true });
  await writeFile(path, "", { flag: "a" });
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
