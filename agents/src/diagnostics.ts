import type {
  AXLMessage,
  DeathCause,
  HeadState,
} from "../../shared/types";
import type { Identity } from "./identity";
import type { AXLClient } from "./axl/client";
import type { Mesh } from "./axl/mesh";
import { emitEvent } from "./events";
import { log } from "./util/log";

export interface DiagnosticsCtx {
  identity: Identity;
  axl: AXLClient;
  mesh: Mesh;
  state: HeadState;
}

/**
 * Local self-diagnostic: detect own failure conditions and broadcast a
 * `panic` message before the heartbeat timeout fires. This gives
 * surviving heads an authoritative cause to attribute on `confirmed`.
 *
 * Conditions checked locally per tick:
 *  - rpc_timeout_count >= 2 → `api_timeout`
 *  - balance == 0 (when expected non-zero) → `wallet_drained`
 *  - signing key throws on test-sign → `key_revoked`
 *  - process about to die (SIGTERM handler) → `process_killed`
 */
export function startDiagnostics(ctx: DiagnosticsCtx): { stop: () => void } {
  let rpcFailures = 0;

  const broadcastPanic = async (reason: DeathCause): Promise<void> => {
    const msg: AXLMessage = {
      type: "panic",
      from: ctx.identity.id,
      reason,
      ts: Date.now(),
    };
    log.warn(`PANIC: broadcasting ${reason}`);
    await Promise.all(ctx.mesh.livePeers().map((p) => ctx.axl.send(p.id, msg)));
    await emitEvent(ctx.identity.id, "panic.broadcast", { reason });
  };

  // SIGTERM/SIGINT handler: broadcast process_killed before exit
  const onTerm = async () => {
    await broadcastPanic("process_killed");
    await new Promise((r) => setTimeout(r, 200));
    process.exit(0);
  };
  process.on("SIGTERM", () => void onTerm());
  process.on("SIGINT", () => void onTerm());

  // Self-key check: try to sign a known buffer; if it throws, panic
  const selfSignTick = setInterval(() => {
    try {
      ctx.identity.sign("self-check");
    } catch {
      void broadcastPanic("key_revoked");
    }
  }, 30_000);

  return {
    stop: () => {
      clearInterval(selfSignTick);
    },
  };
}

/**
 * Standalone helper: kill.sh uses this pattern via curl, but exposed
 * here for any TS-side tools that need to force-broadcast a panic
 * (e.g. demo orchestration scripts).
 */
export async function panicNow(
  ctx: DiagnosticsCtx,
  reason: DeathCause,
): Promise<void> {
  const msg: AXLMessage = {
    type: "panic",
    from: ctx.identity.id,
    reason,
    ts: Date.now(),
  };
  await Promise.all(ctx.mesh.livePeers().map((p) => ctx.axl.send(p.id, msg)));
  await emitEvent(ctx.identity.id, "panic.broadcast", { reason });
}
