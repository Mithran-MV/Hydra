// Day 2 — full resurrection (child spawn, key gen, mesh re-join) lands here.
// Day 1 stub.
import type { HeadState } from "../../shared/types";
import type { Identity } from "./identity";
import type { AXLClient } from "./axl/client";
import type { Mesh } from "./axl/mesh";

export interface ResurrectionCtx {
  identity: Identity;
  axl: AXLClient;
  mesh: Mesh;
  state: HeadState;
}

export function bindResurrectionHandler(_ctx: ResurrectionCtx): void {
  // intentionally empty until Day 2
}
