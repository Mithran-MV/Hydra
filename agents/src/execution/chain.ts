import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseEther,
  toBytes,
  pad,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { HexAddress, HeadId, DeathCause } from "../../../shared/types";
import { log } from "../util/log";

const RPC_URL = process.env.OG_CHAIN_RPC ?? "https://evmrpc-testnet.0g.ai";
const CHAIN_ID = Number(process.env.OG_CHAIN_CHAIN_ID ?? 16602);

export const ogGalileo = defineChain({
  id: CHAIN_ID,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "OG", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const REGISTRY_ABI = [
  {
    type: "function",
    name: "recordHeartbeat",
    inputs: [
      { name: "peerId", type: "bytes32" },
      { name: "generation", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "recordDeath",
    inputs: [
      { name: "peerId", type: "bytes32" },
      { name: "cause", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "recordBorn",
    inputs: [
      { name: "peer", type: "bytes32" },
      { name: "parent", type: "bytes32" },
      { name: "generation", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "recordScar",
    inputs: [
      { name: "cause", type: "bytes32" },
      { name: "rule", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const SCARS_ABI = [
  {
    type: "function",
    name: "mintScar",
    inputs: [
      { name: "cause", type: "bytes32" },
      { name: "rule", type: "string" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const TREASURY_ABI = [
  {
    type: "function",
    name: "balances",
    inputs: [{ type: "bytes32" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export interface ChainCtx {
  publicClient: ReturnType<typeof createPublicClient>;
  wallet: ReturnType<typeof createWalletClient>;
  account: ReturnType<typeof privateKeyToAccount>;
  registryAddress: HexAddress;
  treasuryAddress: HexAddress;
  executorAddress: HexAddress;
  scarsAddress: HexAddress;
}

let cached: ChainCtx | null = null;

export function getChain(): ChainCtx {
  if (cached) return cached;
  const pk = process.env.OG_CHAIN_PK as HexAddress | undefined;
  if (!pk) throw new Error("OG_CHAIN_PK not set");
  const account = privateKeyToAccount(pk);
  cached = {
    publicClient: createPublicClient({ chain: ogGalileo, transport: http(RPC_URL) }),
    wallet: createWalletClient({ account, chain: ogGalileo, transport: http(RPC_URL) }),
    account,
    registryAddress: requireEnv("HYDRA_REGISTRY"),
    treasuryAddress: requireEnv("HYDRA_TREASURY"),
    executorAddress: requireEnv("HYDRA_EXECUTOR"),
    scarsAddress: requireEnv("HYDRA_SCARS"),
  };
  return cached;
}

function requireEnv(name: string): HexAddress {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v as HexAddress;
}

/** Convert a 32-byte hex peer-id (no 0x) to a bytes32. */
function peerIdToBytes32(peerId: HeadId): `0x${string}` {
  const clean = peerId.startsWith("0x") ? peerId.slice(2) : peerId;
  if (clean.length === 64) return ("0x" + clean) as `0x${string}`;
  return pad(toHex(toBytes(clean), { size: 32 }), { size: 32 });
}

function causeToBytes32(cause: DeathCause): `0x${string}` {
  // Pad the cause name (e.g. "key_revoked") into bytes32 (UTF-8, right-padded)
  const bytes = new TextEncoder().encode(cause);
  const padded = new Uint8Array(32);
  padded.set(bytes.slice(0, 32));
  return toHex(padded);
}

export async function recordHeartbeatOnChain(
  peerId: HeadId,
  generation: number,
): Promise<`0x${string}`> {
  const c = getChain();
  const hash = await c.wallet.writeContract({
    address: c.registryAddress,
    abi: REGISTRY_ABI,
    functionName: "recordHeartbeat",
    args: [peerIdToBytes32(peerId), BigInt(generation)],
    account: c.account,
    chain: ogGalileo,
  });
  log.info(`📜 chain heartbeat recorded: ${hash}`);
  return hash;
}

export async function recordDeathOnChain(
  peerId: HeadId,
  cause: DeathCause,
): Promise<`0x${string}`> {
  const c = getChain();
  const hash = await c.wallet.writeContract({
    address: c.registryAddress,
    abi: REGISTRY_ABI,
    functionName: "recordDeath",
    args: [peerIdToBytes32(peerId), causeToBytes32(cause)],
    account: c.account,
    chain: ogGalileo,
  });
  log.info(`📜 chain death recorded: ${cause} → ${hash}`);
  return hash;
}

export async function recordBornOnChain(
  peer: HeadId,
  parent: HeadId,
  generation: number,
): Promise<`0x${string}`> {
  const c = getChain();
  const hash = await c.wallet.writeContract({
    address: c.registryAddress,
    abi: REGISTRY_ABI,
    functionName: "recordBorn",
    args: [
      peerIdToBytes32(peer),
      peerIdToBytes32(parent),
      BigInt(generation),
    ],
    account: c.account,
    chain: ogGalileo,
  });
  log.info(`📜 chain born recorded: ${hash}`);
  return hash;
}

export async function recordScarOnChain(
  cause: DeathCause,
  rule: string,
): Promise<`0x${string}`> {
  const c = getChain();
  const hash = await c.wallet.writeContract({
    address: c.registryAddress,
    abi: REGISTRY_ABI,
    functionName: "recordScar",
    args: [causeToBytes32(cause), rule],
    account: c.account,
    chain: ogGalileo,
  });
  log.info(`📜 chain scar recorded: ${cause} → ${hash}`);
  return hash;
}

export async function mintScarINFT(
  cause: DeathCause,
  rule: string,
  to: HexAddress,
): Promise<`0x${string}`> {
  const c = getChain();
  const hash = await c.wallet.writeContract({
    address: c.scarsAddress,
    abi: SCARS_ABI,
    functionName: "mintScar",
    args: [causeToBytes32(cause), rule, to],
    account: c.account,
    chain: ogGalileo,
  });
  log.info(`🎴 iNFT scar minted: ${cause} → ${hash}`);
  return hash;
}

export async function getTotalScarsMinted(): Promise<bigint> {
  const c = getChain();
  return (await c.publicClient.readContract({
    address: c.scarsAddress,
    abi: SCARS_ABI,
    functionName: "totalSupply",
  })) as bigint;
}

export async function getTreasuryBalance(headId: HeadId): Promise<bigint> {
  const c = getChain();
  return (await c.publicClient.readContract({
    address: c.treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "balances",
    args: [peerIdToBytes32(headId)],
  })) as bigint;
}

void parseEther; // exported for strategies' future use
