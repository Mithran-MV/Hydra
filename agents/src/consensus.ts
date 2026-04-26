// Day 2 — full consensus protocol lands here.
// Day 1 stub: register placeholder so head.ts compiles.
import type { HeadState } from "../../shared/types";
import type { Identity } from "./identity";
import type { AXLClient } from "./axl/client";
import type { Mesh } from "./axl/mesh";

export interface ConsensusCtx {
  identity: Identity;
  axl: AXLClient;
  mesh: Mesh;
  state: HeadState;
}

export function startConsensus(_ctx: ConsensusCtx): { stop: () => void } {
  // intentionally empty until Day 2
  return { stop: () => undefined };
}
