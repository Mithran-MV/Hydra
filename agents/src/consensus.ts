import { SUSPECTED_AFTER_MS } from "../../shared/constants";
import type {
  AXLMessage,
  AxlEnvelope,
  DeathCause,
  HeadId,
  HeadState,
} from "../../shared/types";
import type { Identity } from "./identity";
import type { AXLClient } from "./axl/client";
import type { Mesh } from "./axl/mesh";
import { emitEvent } from "./events";
import { log } from "./util/log";

const SCAN_INTERVAL_MS = 1_000;

export interface ConsensusCtx {
  identity: Identity;
  axl: AXLClient;
  mesh: Mesh;
  state: HeadState;
}

export interface ConsensusOpts {
  onConfirmedDeath?: (target: HeadId, cause: DeathCause) => void;
}

export interface ConsensusController {
  handleMessage(env: AxlEnvelope): void;
  stop(): void;
}

interface SuspectRecord {
  suspecters: Set<HeadId>;
  firstSeen: number;
}

interface ConfirmedRecord {
  cause: DeathCause;
  ts: number;
}

function quorum(liveCount: number): number {
  return Math.floor(liveCount / 2) + 1;
}

function leaderOf(self: HeadId, livePeers: HeadId[], dead: HeadId): HeadId {
  return [self, ...livePeers].filter((id) => id !== dead).sort()[0];
}

export function startConsensus(
  ctx: ConsensusCtx,
  opts: ConsensusOpts = {},
): ConsensusController {
  const suspects = new Map<HeadId, SuspectRecord>();
  const confirmed = new Map<HeadId, ConfirmedRecord>();
  const recentPanics = new Map<HeadId, { cause: DeathCause; ts: number }>();

  function broadcast(msg: AXLMessage): void {
    void Promise.all(
      ctx.mesh.livePeers().map((p) => ctx.axl.send(p.id, msg)),
    );
  }

  function broadcastSuspect(target: HeadId): void {
    log.warn(`👁️  suspect: ${target.slice(0, 10)}…`);
    void emitEvent(ctx.identity.id, "consensus.suspect", { target });
    broadcast({
      type: "suspect",
      from: ctx.identity.id,
      target,
      ts: Date.now(),
    });
  }

  function inferCause(target: HeadId): DeathCause {
    const recent = recentPanics.get(target);
    if (recent && Date.now() - recent.ts < 30_000) {
      return recent.cause;
    }
    return "process_killed";
  }

  function markConfirmed(target: HeadId, cause: DeathCause): void {
    if (confirmed.has(target)) return;
    confirmed.set(target, { cause, ts: Date.now() });
    ctx.mesh.markStatus(target, "dead");

    log.err(`☠️  CONFIRMED dead: ${target.slice(0, 10)}…  cause=${cause}`);
    void emitEvent(ctx.identity.id, "consensus.confirmed", { target, cause });

    broadcast({
      type: "confirmed",
      from: ctx.identity.id,
      target,
      cause,
      ts: Date.now(),
    });

    const livePeerIds = ctx.mesh.livePeers().map((p) => p.id);
    const leader = leaderOf(ctx.identity.id, livePeerIds, target);
    if (leader === ctx.identity.id) {
      log.info(`👑 leader for resurrection of ${target.slice(0, 10)}…`);
      opts.onConfirmedDeath?.(target, cause);
    }
  }

  function evaluateQuorum(target: HeadId): void {
    if (confirmed.has(target)) return;
    const rec = suspects.get(target);
    if (!rec) return;

    const live = ctx.mesh.livePeers().filter((p) => p.id !== target);
    const total = live.length + 1;
    const required = quorum(total);

    if (rec.suspecters.size >= required) {
      const leader = leaderOf(
        ctx.identity.id,
        live.map((p) => p.id),
        target,
      );
      if (leader === ctx.identity.id) {
        markConfirmed(target, inferCause(target));
      }
    }
  }

  function handleSuspect(msg: Extract<AXLMessage, { type: "suspect" }>): void {
    let rec = suspects.get(msg.target);
    if (!rec) {
      rec = { suspecters: new Set(), firstSeen: msg.ts };
      suspects.set(msg.target, rec);
    }
    rec.suspecters.add(msg.from);
    evaluateQuorum(msg.target);
  }

  function handleConfirmed(
    msg: Extract<AXLMessage, { type: "confirmed" }>,
  ): void {
    if (confirmed.has(msg.target)) return;
    markConfirmed(msg.target, msg.cause);
  }

  function handlePanic(msg: Extract<AXLMessage, { type: "panic" }>): void {
    // First panic wins: a user-injected cause (kill.sh) should not be
    // overwritten by the SIGTERM handler's default `process_killed`.
    if (!recentPanics.has(msg.from)) {
      recentPanics.set(msg.from, {
        cause: msg.reason as DeathCause,
        ts: msg.ts,
      });
    }
    log.warn(`PANIC from ${msg.from.slice(0, 10)}…: ${msg.reason}`);
  }

  const scanner = setInterval(() => {
    const now = Date.now();
    for (const peer of ctx.mesh.allPeers()) {
      if (peer.status === "dead") continue;
      if (peer.lastSeen === 0) continue;
      const since = now - peer.lastSeen;
      if (since <= SUSPECTED_AFTER_MS) continue;

      let rec = suspects.get(peer.id);
      if (!rec) {
        rec = { suspecters: new Set(), firstSeen: now };
        suspects.set(peer.id, rec);
      }
      if (!rec.suspecters.has(ctx.identity.id)) {
        rec.suspecters.add(ctx.identity.id);
        ctx.mesh.markStatus(peer.id, "suspected");
        // Always broadcast our own suspect — peers add us to their suspecters set.
        broadcastSuspect(peer.id);
        evaluateQuorum(peer.id);
      }
    }
  }, SCAN_INTERVAL_MS);

  function handleMessage(env: AxlEnvelope): void {
    const msg = env.body;
    switch (msg.type) {
      case "suspect":
        handleSuspect(msg);
        break;
      case "confirmed":
        handleConfirmed(msg);
        break;
      case "panic":
        handlePanic(msg);
        break;
      default:
        break;
    }
  }

  log.info("consensus started");
  return {
    handleMessage,
    stop: () => clearInterval(scanner),
  };
}
