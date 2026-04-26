// Day 2 — strategy router lands here (Aave / UniswapV4 / payroll).
// Day 1 stub: just logs the intended strategy on tick.
import type { HeadState } from "../../../../shared/types";
import type { AXLClient } from "../../axl/client";
import { STRATEGY_TICK_MS } from "../../../../shared/constants";
import { log } from "../../util/log";
import { emitEvent } from "../../events";

export function runStrategy(state: HeadState, _axl: AXLClient): { stop: () => void } {
  const tick = async () => {
    log.debug(`strategy tick: ${state.strategy}`);
    await emitEvent(state.id, "strategy.tick", {
      strategy: state.strategy,
      generation: state.generation,
    });
  };
  void tick();
  const handle = setInterval(() => void tick(), STRATEGY_TICK_MS);
  return { stop: () => clearInterval(handle) };
}
