import type { HeadState } from "../../../../shared/types";
import { emitEvent } from "../../events";
import { log } from "../../util/log";

/**
 * Aave-deposit strategy. v1: declares intent + emits event. The actual
 * Aave contract call would go through HydraExecutor.execute (whitelist-gated)
 * once an Aave-on-0G testnet pool exists. For the demo we treat the strategy
 * as a black box that "supplied X to Aave" and write that as state.
 */
export async function tickAave(state: HeadState): Promise<void> {
  await emitEvent(state.id, "strategy.aave.tick", {
    generation: state.generation,
    note: "would call HydraExecutor.execute(Aave.supply(USDC, treasury, X))",
  });
  log.debug("aave_deposit · would supply USDC to Aave v3 pool");
}
