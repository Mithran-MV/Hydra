import { HEARTBEAT_INTERVAL_MS } from "../../shared/constants";
import type { HeadState, AXLMessage } from "../../shared/types";
import type { Identity } from "./identity";
import type { AXLClient } from "./axl/client";
import type { Mesh } from "./axl/mesh";
import { emitEvent } from "./events";
import { log } from "./util/log";

export interface HeartbeatCtx {
  identity: Identity;
  axl: AXLClient;
  mesh: Mesh;
  state: HeadState;
}

export function startHeartbeat({
  identity,
  axl,
  mesh,
  state,
}: HeartbeatCtx): { stop: () => void } {
  const tick = async () => {
    const now = Date.now();
    const payload = `${identity.id}:${state.generation}:${now}`;
    const sigBytes = identity.sign(payload);
    const sig = Buffer.from(sigBytes).toString("hex");

    const msg: AXLMessage = {
      type: "heartbeat",
      from: identity.id,
      gen: state.generation,
      ts: now,
      sig,
    };

    state.lastHeartbeatAt = now;

    const peers = mesh.livePeers();
    if (peers.length === 0) {
      log.debug("no peers yet, skipping heartbeat broadcast");
      return;
    }

    await Promise.all(peers.map((p) => axl.send(p.id, msg)));
    await emitEvent(identity.id, "heartbeat.sent", {
      gen: state.generation,
      to: peers.map((p) => p.headIndex),
    });
    log.debug(`💓 → ${peers.length} peers · gen ${state.generation}`);
  };

  void tick();
  const handle = setInterval(() => void tick(), HEARTBEAT_INTERVAL_MS);
  return { stop: () => clearInterval(handle) };
}
