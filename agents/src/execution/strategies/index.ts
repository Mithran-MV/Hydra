import { STRATEGY_TICK_MS } from "../../../../shared/constants";
import type { HeadState, StrategyKind } from "../../../../shared/types";
import type { AXLClient } from "../../axl/client";
import { tickAave } from "./aave";
import { tickUniswap } from "./uniswap";
import { tickPayroll } from "./payroll";
import { log } from "../../util/log";

const TICKERS: Record<StrategyKind, (s: HeadState) => Promise<void>> = {
  aave_deposit: tickAave,
  univ4_lp: tickUniswap,
  payroll: tickPayroll,
};

export function runStrategy(
  state: HeadState,
  _axl: AXLClient,
): { stop: () => void } {
  const ticker = TICKERS[state.strategy];
  if (!ticker) {
    log.warn(`no ticker for strategy ${state.strategy}`);
    return { stop: () => undefined };
  }
  const tick = () => {
    void ticker(state).catch((err) =>
      log.warn(`strategy tick error: ${(err as Error).message}`),
    );
  };
  tick();
  const handle = setInterval(tick, STRATEGY_TICK_MS);
  return { stop: () => clearInterval(handle) };
}
