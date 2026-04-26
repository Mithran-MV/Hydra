import type { HeadState } from "../../../../shared/types";
import { emitEvent } from "../../events";
import { log } from "../../util/log";

/**
 * UniswapV4 LP strategy. v1: declares intent. Real implementation calls
 * HydraExecutor.execute(UniV4PoolManager.modifyLiquidity(...)) once a
 * V4 pool is reachable on 0G testnet (or via the hybrid Base Sepolia mirror).
 */
export async function tickUniswap(state: HeadState): Promise<void> {
  await emitEvent(state.id, "strategy.uniswap.tick", {
    generation: state.generation,
    note: "would call HydraExecutor.execute(UniV4PoolManager.modifyLiquidity)",
  });
  log.debug("univ4_lp · would add LP to ETH/USDC pool");
}
