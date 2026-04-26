import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { publicKeyHexFromPemFile } from "../identity";
import { log } from "../util/log";
import type { HeadId } from "../../../shared/types";

export interface PeerEntry {
  id: HeadId;
  headIndex: number;
  lastSeen: number;
  generation: number;
  status: "alive" | "suspected" | "dead";
}

export class Mesh {
  private peers = new Map<HeadId, PeerEntry>();
  private selfId: HeadId;

  constructor(selfId: HeadId) {
    this.selfId = selfId;
  }

  /** Pre-register all known peers from local PEM files (for known starting heads).
   * `activeMax` caps which head indices count as currently-running peers.
   * Peers above `activeMax` are loaded as inactive (won't receive heartbeats until born). */
  async registerKnownPeersFromKeysDir(
    keysDir = "keys",
    activeMax = Number(process.env.ACTIVE_HEADS ?? 3),
  ): Promise<void> {
    let entries: string[] = [];
    try {
      entries = await readdir(keysDir);
    } catch {
      log.warn(`keys dir ${keysDir} not found`);
      return;
    }
    for (const fname of entries) {
      if (!fname.match(/^h(\d+)\.pem$/)) continue;
      const headIndex = Number(fname.match(/^h(\d+)\.pem$/)![1]);
      if (headIndex > activeMax) continue;
      try {
        const peerId = await publicKeyHexFromPemFile(join(keysDir, fname));
        if (peerId === this.selfId) continue;
        this.peers.set(peerId, {
          id: peerId,
          headIndex,
          lastSeen: 0,
          generation: 0,
          status: "alive",
        });
        log.debug(`registered peer head-${headIndex}: ${peerId.slice(0, 10)}…`);
      } catch (err) {
        log.warn(`failed to load ${fname}: ${(err as Error).message}`);
      }
    }
  }

  /** Add a peer learned dynamically (e.g. via a "born" message). */
  registerDynamic(id: HeadId, headIndex: number): void {
    if (this.peers.has(id) || id === this.selfId) return;
    this.peers.set(id, {
      id,
      headIndex,
      lastSeen: Date.now(),
      generation: 0,
      status: "alive",
    });
  }

  markSeen(id: HeadId, generation: number): void {
    const p = this.peers.get(id);
    if (!p) return;
    p.lastSeen = Date.now();
    p.generation = Math.max(p.generation, generation);
    if (p.status !== "dead") p.status = "alive";
  }

  markStatus(id: HeadId, status: PeerEntry["status"]): void {
    const p = this.peers.get(id);
    if (p) p.status = status;
  }

  livePeers(): PeerEntry[] {
    return [...this.peers.values()].filter((p) => p.status !== "dead");
  }

  allPeers(): PeerEntry[] {
    return [...this.peers.values()];
  }

  has(id: HeadId): boolean {
    return this.peers.has(id);
  }

  selfPeerId(): HeadId {
    return this.selfId;
  }
}
