import type { HeadState } from "../../../../shared/types";
import { emitEvent } from "../../events";
import { log } from "../../util/log";

/**
 * Scheduled payroll strategy. v1: emits intent. Real implementation reads
 * a beneficiary address + cadence from on-chain config, then issues
 * HydraTreasury.withdraw(headId, payee, amount) on schedule.
 */
export async function tickPayroll(state: HeadState): Promise<void> {
  await emitEvent(state.id, "strategy.payroll.tick", {
    generation: state.generation,
    note: "would call HydraTreasury.withdraw(headId, payee, amount)",
  });
  log.debug("payroll · would issue scheduled transfer");
}
