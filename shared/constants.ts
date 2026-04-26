export const HEARTBEAT_INTERVAL_MS = 3_000;
export const SUSPECTED_AFTER_MS = 15_000;
export const CONFIRM_QUORUM_WINDOW_MS = 10_000;
export const STATE_SNAPSHOT_INTERVAL_MS = 10_000;
export const STRATEGY_TICK_MS = 30_000;

export const DEFAULT_AXL_PORT_BASE = 9002;
export const DEFAULT_WEB_PORT = 3000;
export const DEFAULT_SSE_BROKER_PORT = 4000;

export const DEATH_CAUSE_TO_SCAR = {
  key_revoked: {
    rule: {
      trigger: "on key revocation signal",
      check: "every 60s verify signer is still whitelisted",
      mitigation: "rotate to backup signer and re-register with registry",
    },
  },
  process_killed: {
    rule: {
      trigger: "on unclean process exit",
      check: "checkpoint state to 0G on every heartbeat instead of every 10s",
      mitigation: "shorter checkpoint interval + supervisord respawn",
    },
  },
  api_timeout: {
    rule: {
      trigger: "on RPC/API call timeout",
      check: "health-check primary endpoint every 15s",
      mitigation: "fall back to secondary RPC after 2 consecutive failures",
    },
  },
  wallet_drained: {
    rule: {
      trigger: "on balance delta exceeding threshold",
      check: "monitor wallet for outflows > 10% of AUM",
      mitigation: "halt strategy + require multi-sig approval for next action",
    },
  },
} as const;

export const STRATEGY_LABELS = {
  aave_deposit: "Aave deposit",
  univ4_lp: "Uniswap V4 LP",
  payroll: "Scheduled payroll",
} as const;

export const HEAD_COLORS = {
  booting: "#6b7280",
  healthy: "#22c55e",
  suspected: "#eab308",
  dead: "#ef4444",
  resurrecting: "#3b82f6",
  newborn: "#a855f7",
} as const;
