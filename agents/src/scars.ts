import { DEATH_CAUSE_TO_SCAR } from "../../shared/constants";
import type {
  AXLMessage,
  DeathCause,
  HeadId,
  Scar,
} from "../../shared/types";
import type { Identity } from "./identity";
import type { AXLClient } from "./axl/client";
import type { Mesh } from "./axl/mesh";
import { streams } from "./memory/streams";
import { kvSet, kvList } from "./memory/og-kv";
import { uploadJsonToOG } from "./memory/og-storage";
import { emitEvent } from "./events";
import { log } from "./util/log";

export function buildScar(
  cause: DeathCause,
  learnedFrom: HeadId,
  generation: number,
): Scar {
  const def = DEATH_CAUSE_TO_SCAR[cause];
  return {
    id: `scar_${cause}_${Date.now()}`,
    cause,
    rule: def.rule,
    learnedAt: Date.now(),
    learnedFrom,
    generation,
  };
}

export async function persistGlobalScar(scar: Scar): Promise<void> {
  // 1. Always write to local KV mirror (instant, reliable)
  await kvSet(streams.scarsGlobal(), scar.cause, scar);
  log.info(`scar persisted: ${scar.cause} → ${scar.rule.mitigation}`);
  // 2. Best-effort upload to live 0G Storage so the scar has a verifiable
  //    tx hash on chainscan-galileo (proof that memory lives on 0G).
  if (process.env.OG_STORAGE_LIVE === "1") {
    void uploadJsonToOG(`scar:${scar.cause}`, scar).catch((err) =>
      log.warn(`0G Storage upload failed: ${(err as Error).message}`),
    );
  }
}

export async function readGlobalScars(): Promise<Scar[]> {
  const entries = await kvList(streams.scarsGlobal());
  return entries.map((e) => e.value as Scar);
}

export async function broadcastScar(
  identity: Identity,
  axl: AXLClient,
  mesh: Mesh,
  scar: Scar,
): Promise<void> {
  const msg: AXLMessage = { type: "scar", from: identity.id, scar };
  await Promise.all(mesh.livePeers().map((p) => axl.send(p.id, msg)));
  await emitEvent(identity.id, "scar.broadcast", {
    cause: scar.cause,
    to: mesh.livePeers().length,
  });
}

export class ScarRegistry {
  private byCause = new Map<DeathCause, Scar>();

  constructor(initial: Scar[] = []) {
    for (const s of initial) this.byCause.set(s.cause, s);
  }

  add(scar: Scar): void {
    const existing = this.byCause.get(scar.cause);
    if (!existing || existing.learnedAt < scar.learnedAt) {
      this.byCause.set(scar.cause, scar);
    }
  }

  all(): Scar[] {
    return [...this.byCause.values()];
  }

  has(cause: DeathCause): boolean {
    return this.byCause.has(cause);
  }
}
