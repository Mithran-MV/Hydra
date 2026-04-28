import { createPublicClient, http } from "viem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RPC = "https://evmrpc-testnet.0g.ai";

const ADDR = {
  scars: "0x838083ff1334ccc68400d1576f59282d32320dbe",
  treasury: "0xda181fdfd86965e83cddb9193734ed3e7c879171",
  executor: "0x1d5059499088ae2dcf77652562dd08f468a46a39",
} as const;

const SCARS_ABI = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const client = createPublicClient({ transport: http(RPC) });

interface ContractsSnapshot {
  refreshedAt: number;
  chainId: number;
  contracts: Array<{
    label: string;
    address: string;
    chainscan: string;
    liveValue: { name: string; value: string } | null;
    error: string | null;
  }>;
}

export async function GET() {
  const refreshedAt = Date.now();

  const [chainIdRes, scarsSupply, treasuryBal] = await Promise.allSettled([
    client.getChainId(),
    client.readContract({
      address: ADDR.scars,
      abi: SCARS_ABI,
      functionName: "totalSupply",
    }),
    client.getBalance({ address: ADDR.treasury }),
  ]);

  const chainId =
    chainIdRes.status === "fulfilled" ? Number(chainIdRes.value) : 0;

  const snapshot: ContractsSnapshot = {
    refreshedAt,
    chainId,
    contracts: [
      {
        label: "HydraScars v2 (iNFT, ERC-721)",
        address: ADDR.scars,
        chainscan: `https://chainscan-galileo.0g.ai/token/${ADDR.scars}`,
        liveValue:
          scarsSupply.status === "fulfilled"
            ? {
                name: "totalSupply",
                value: scarsSupply.value.toString() + " scars",
              }
            : null,
        error:
          scarsSupply.status === "rejected"
            ? (scarsSupply.reason as Error).message
            : null,
      },
      {
        label: "HydraTreasury",
        address: ADDR.treasury,
        chainscan: `https://chainscan-galileo.0g.ai/address/${ADDR.treasury}`,
        liveValue:
          treasuryBal.status === "fulfilled"
            ? {
                name: "balance",
                value:
                  (Number(treasuryBal.value) / 1e18).toFixed(6) + " OG",
              }
            : null,
        error:
          treasuryBal.status === "rejected"
            ? (treasuryBal.reason as Error).message
            : null,
      },
      {
        label: "HydraExecutor",
        address: ADDR.executor,
        chainscan: `https://chainscan-galileo.0g.ai/address/${ADDR.executor}`,
        liveValue: null,
        error: null,
      },
    ],
  };

  return Response.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
