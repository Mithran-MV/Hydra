import type {
  AXLMessage,
  DeathCause,
  HeadId,
  HeadState,
  StrategyKind,
} from "../../shared/types";
import type { Identity } from "./identity";
import type { AXLClient } from "./axl/client";
import type { Mesh } from "./axl/mesh";
import { generateEd25519Pem } from "./runtime/keys";
import {
  writeAxlConfig,
  nextFreeHeadIndex,
  portsForHead,
} from "./runtime/configs";
import {
  spawnAxlSidecar,
  spawnHeadProcess,
} from "./runtime/spawner";
import { publicKeyHexFromPemFile } from "./identity";
import { readStateSnapshot } from "./memory/og-kv";
import { emitEvent } from "./events";
import { log } from "./util/log";

export interface ResurrectionCtx {
  identity: Identity;
  axl: AXLClient;
  mesh: Mesh;
  state: HeadState;
}

export interface ResurrectionResult {
  childIds: HeadId[];
  childIndices: number[];
}

export interface ResurrectionController {
  resurrect(deadHead: HeadId, cause: DeathCause): Promise<ResurrectionResult>;
}

export function bindResurrectionHandler(
  ctx: ResurrectionCtx,
): ResurrectionController {
  async function spawnOneChild(
    childIndex: number,
    deadHead: HeadId,
    strategy: StrategyKind,
  ): Promise<HeadId> {
    const pemPath = `keys/h${childIndex}.pem`;
    log.info(`👶 spawning child h${childIndex} (parent ${deadHead.slice(0, 10)}…)`);

    await generateEd25519Pem(pemPath);
    const peerId = await publicKeyHexFromPemFile(pemPath);

    const configPath = await writeAxlConfig(childIndex);
    const { apiPort } = portsForHead(childIndex);

    await spawnAxlSidecar(configPath, apiPort);
    await spawnHeadProcess(childIndex, deadHead, strategy);

    ctx.mesh.registerDynamic(peerId, childIndex);

    await emitEvent(ctx.identity.id, "resurrection.child", {
      childIndex,
      childPeerId: peerId,
      deadHead,
      strategy,
    });

    return peerId;
  }

  async function resurrect(
    deadHead: HeadId,
    cause: DeathCause,
  ): Promise<ResurrectionResult> {
    log.err(`🔥 RESURRECTING ${deadHead.slice(0, 10)}…  cause=${cause}`);
    await emitEvent(ctx.identity.id, "resurrection.start", {
      deadHead,
      cause,
    });

    let strategy: StrategyKind = "aave_deposit";
    try {
      const deadState = await readStateSnapshot(deadHead);
      if (deadState?.strategy) strategy = deadState.strategy;
    } catch {
      log.warn("could not read dead head's state — using default strategy");
    }

    const idx1 = await nextFreeHeadIndex();
    const idx2 = await nextFreeHeadIndex(idx1 + 1);
    const indices = [idx1, idx2];

    const childIds: HeadId[] = [];
    for (const idx of indices) {
      const peerId = await spawnOneChild(idx, deadHead, strategy);
      childIds.push(peerId);
    }

    const msg: AXLMessage = {
      type: "resurrect",
      from: ctx.identity.id,
      leader: ctx.identity.id,
      target: deadHead,
      childIds,
      round: 0,
    };
    await Promise.all(
      ctx.mesh.livePeers().map((p) => ctx.axl.send(p.id, msg)),
    );

    log.info(
      `✨ resurrection complete: 2 children spawned (h${idx1}, h${idx2})`,
    );
    await emitEvent(ctx.identity.id, "resurrection.complete", {
      deadHead,
      cause,
      childIds,
      childIndices: indices,
    });

    return { childIds, childIndices: indices };
  }

  return { resurrect };
}
