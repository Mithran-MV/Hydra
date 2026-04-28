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
import { notifyHeartbeatStale } from "./execution/keeperhub";
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

    // Only count peers we've actually heard from recently. Mesh.livePeers
    // returns every non-dead peer — including ones loaded from keys/*.pem
    // at boot with lastSeen=0 (never heartbeated). Including those ghost
    // peers inflates the quorum threshold so a single witness can never
    // confirm a death even though the absent ghosts are themselves silent.
    const now = Date.now();
    const live = ctx.mesh.livePeers().filter(
      (p) =>
        p.id !== target &&
        p.lastSeen > 0 &&
        now - p.lastSeen <= SUSPECTED_AFTER_MS,
    );
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
    // First panic wins so a user-injected cause from kill.sh isn't
    // overwritten by the SIGTERM handler's default `process_killed`.
    // But a stale entry from a prior incident on the same head must
    // not block a fresh panic — otherwise repeat attacks on the same
    // target carry the wrong cause forever (within process lifetime).
    const existing = recentPanics.get(msg.from);
    const isStale = existing && Date.now() - existing.ts >= 30_000;
    if (!existing || isStale) {
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
        // KH workflow #2 — heartbeat-stale audit (independent of consensus)
        void notifyHeartbeatStale(
          {
            peerId: peer.id,
            headIndex: peer.headIndex,
            lastHeartbeatAt: peer.lastSeen,
            staleByMs: since,
            ts: now,
          },
          ctx.identity.id,
        );
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
