import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { HeadId, HeadState } from "../../../shared/types";
import type { Identity } from "../identity";
import { streams } from "./streams";
import { log } from "../util/log";

// 0G integration mode: "live" hits 0G testnet; "local" mirrors to disk only.
// Default to "local" while integration matures; flip to "live" once SDK confirmed.
const MODE = (process.env.OG_KV_MODE ?? "local") as "live" | "local";
const LOCAL_DIR = process.env.OG_KV_LOCAL_DIR ?? "logs/og-kv";

function localPath(streamId: Uint8Array, key: string): string {
  const sid = Buffer.from(streamId).toString("hex").slice(0, 16);
  return join(LOCAL_DIR, `${sid}__${encodeURIComponent(key)}.json`);
}

async function localSet(
  streamId: Uint8Array,
  key: string,
  value: unknown,
): Promise<void> {
  const path = localPath(streamId, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

async function localGet(
  streamId: Uint8Array,
  key: string,
): Promise<unknown | null> {
  const path = localPath(streamId, key);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

// Live 0G writes will be wired Day 2 once we confirm Indexer node availability.
// The interface stays identical so the swap is one-line.
async function liveSet(
  _streamId: Uint8Array,
  _key: string,
  _value: unknown,
): Promise<void> {
  log.warn("liveSet not yet implemented — falling back to local mirror");
  return localSet(_streamId, _key, _value);
}

async function liveGet(
  _streamId: Uint8Array,
  _key: string,
): Promise<unknown | null> {
  log.warn("liveGet not yet implemented — falling back to local mirror");
  return localGet(_streamId, _key);
}

async function kvSet(
  streamId: Uint8Array,
  key: string,
  value: unknown,
): Promise<void> {
  if (MODE === "live") return liveSet(streamId, key, value);
  return localSet(streamId, key, value);
}

async function kvGet(
  streamId: Uint8Array,
  key: string,
): Promise<unknown | null> {
  if (MODE === "live") return liveGet(streamId, key);
  return localGet(streamId, key);
}

export async function writeStateSnapshot(state: HeadState): Promise<void> {
  await kvSet(streams.state(state.id), "current", state);
  log.debug("state snapshot persisted");
}

export async function readStateSnapshot(
  headId: HeadId,
): Promise<HeadState | null> {
  return (await kvGet(streams.state(headId), "current")) as HeadState | null;
}

export async function bootstrapFromMemory(
  parentId: HeadId,
  identity: Identity,
): Promise<HeadState> {
  const parentState = await readStateSnapshot(parentId);
  const now = Date.now();
  if (!parentState) {
    log.warn(`no parent state in memory for ${parentId.slice(0, 10)}…`);
    return {
      id: identity.id,
      generation: 1,
      parent: parentId,
      status: "newborn",
      strategy: "aave_deposit",
      wallet: identity.wallet,
      balance: "0",
      position: null,
      lastHeartbeatAt: now,
      inheritedScars: [],
      bornAt: now,
      deathCause: null,
    };
  }
  log.info(`inherited state from parent ${parentId.slice(0, 10)}…`);
  return {
    ...parentState,
    id: identity.id,
    parent: parentId,
    generation: parentState.generation + 1,
    status: "newborn",
    wallet: identity.wallet,
    bornAt: now,
    lastHeartbeatAt: now,
    deathCause: null,
  };
}
