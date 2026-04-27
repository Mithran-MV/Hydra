import type { HeadState, Scar, SwarmSnapshot } from "@shared/types";

export function mockSnapshot(): SwarmSnapshot {
  const now = Date.now();
  const heads: HeadState[] = [
    {
      id: "0xa11c3_head_1",
      generation: 0,
      parent: null,
      status: "healthy",
      strategy: "aave_deposit",
      wallet: "0x1111111111111111111111111111111111111111",
      balance: "34280000000000000000",
      position: { token: "USDC", amount: "34280", venue: "Aave v3" },
      lastHeartbeatAt: now - 1200,
      inheritedScars: [],
      bornAt: now - 600_000,
      deathCause: null,
    },
    {
      id: "0xb22d4_head_3",
      generation: 1,
      parent: "0xdead_head_2",
      status: "newborn",
      strategy: "univ4_lp",
      wallet: "0x2222222222222222222222222222222222222222",
      balance: "16500000000000000000",
      position: { token: "ETH/USDC", amount: "16.5k", venue: "Uniswap v4" },
      lastHeartbeatAt: now - 600,
      inheritedScars: ["scar_1"],
      bornAt: now - 120_000,
      deathCause: null,
    },
    {
      id: "0xc33e5_head_4",
      generation: 1,
      parent: "0xdead_head_2",
      status: "healthy",
      strategy: "univ4_lp",
      wallet: "0x3333333333333333333333333333333333333333",
      balance: "16500000000000000000",
      position: { token: "ETH/USDC", amount: "16.5k", venue: "Uniswap v4" },
      lastHeartbeatAt: now - 900,
      inheritedScars: ["scar_1"],
      bornAt: now - 119_000,
      deathCause: null,
    },
    {
      id: "0xd44f6_head_5",
      generation: 0,
      parent: null,
      status: "healthy",
      strategy: "payroll",
      wallet: "0x4444444444444444444444444444444444444444",
      balance: "8200000000000000000",
      position: null,
      lastHeartbeatAt: now - 400,
      inheritedScars: ["scar_1"],
      bornAt: now - 600_000,
      deathCause: null,
    },
  ];

  const scars: Scar[] = [
    {
      id: "scar_1",
      cause: "key_revoked",
      rule: {
        trigger: "signer_403",
        check: "verify whitelist every 60s",
        mitigation: "rotate-to-backup-signer",
      },
      learnedAt: now - 120_000,
      learnedFrom: "0xdead_head_2",
      generation: 0,
    },
  ];

  return {
    generation: 1,
    heads,
    scars,
    attacksSurvived: 1,
    aum: "75480",
    valueProtectedWei: "0",
    valueDepositedWei: "0",
    lastEventAt: now,
    inference: null,
    keeperhub: null,
  };
}
