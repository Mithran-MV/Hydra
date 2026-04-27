export type HeadId = string;
export type HexAddress = `0x${string}`;

export type HeadStatus =
  | "booting"
  | "healthy"
  | "suspected"
  | "dead"
  | "resurrecting"
  | "newborn";

export type StrategyKind = "aave_deposit" | "univ4_lp" | "payroll";

export type DeathCause =
  | "key_revoked"
  | "process_killed"
  | "api_timeout"
  | "wallet_drained";

export interface HeadState {
  id: HeadId;
  generation: number;
  parent: HeadId | null;
  status: HeadStatus;
  strategy: StrategyKind;
  wallet: HexAddress;
  balance: string;
  position: { token: string; amount: string; venue: string } | null;
  lastHeartbeatAt: number;
  inheritedScars: string[];
  bornAt: number;
  deathCause: DeathCause | null;
}

export interface Scar {
  id: string;
  cause: DeathCause;
  rule: {
    trigger: string;
    check: string;
    mitigation: string;
  };
  learnedAt: number;
  learnedFrom: HeadId;
  generation: number;
}

export type AXLMessage =
  | { type: "heartbeat"; from: HeadId; gen: number; ts: number; sig: string }
  | { type: "suspect"; from: HeadId; target: HeadId; ts: number }
  | {
      type: "confirmed";
      from: HeadId;
      target: HeadId;
      cause: DeathCause;
      ts: number;
    }
  | {
      type: "resurrect";
      from: HeadId;
      leader: HeadId;
      target: HeadId;
      childIds: HeadId[];
      round: number;
    }
  | { type: "born"; from: HeadId; parent: HeadId; gen: number; scar: Scar | null }
  | { type: "scar"; from: HeadId; scar: Scar }
  | { type: "panic"; from: HeadId; reason: string; ts: number };

export interface AxlEnvelope {
  fromPeerId: string;
  body: AXLMessage;
}

export interface EventLogEntry {
  ts: number;
  headId: HeadId;
  type: string;
  payload: unknown;
}

export interface InferenceTrace {
  decision: string;
  verified: boolean;
  provider: string;
  model: string;
  ms: number;
  ts: number;
  by: HeadId;
}

export interface KeeperHubRun {
  status: number;
  runId: string | null;
  cause: string;
  ts: number;
  ok: boolean;
}

export interface SwarmSnapshot {
  generation: number;
  heads: HeadState[];
  scars: Scar[];
  attacksSurvived: number;
  aum: string;
  lastEventAt: number;
  inference: InferenceTrace | null;
  keeperhub: KeeperHubRun | null;
}
