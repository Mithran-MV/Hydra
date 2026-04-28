/**
 * One-off deploy of the refactored HydraScars (full ERC-721 + ERC-165).
 * The previous contract (0x03210f64072ceb1040dbdd37b32e7b0caeeae320)
 * stays put as a historical artifact for tokens #1-5 minted under the
 * loose-721 surface. After this deploy, the agent's HYDRA_SCARS env
 * var must be repointed to the new address so future scar mints land
 * on the ERC-721-compliant collection.
 *
 * After deploy, the script also re-mints the two production scars
 * (process_killed from attack #1, wallet_drained from attack #2) so the
 * new collection's history matches the README's "Live attacks captured"
 * table. The mint goes to the same wallet that minted the original
 * scar on the old contract (head-1 wallet for #1, head-3 wallet for #2).
 *
 * Run from the contracts/ workspace:
 *   npx hardhat run script/DeployScarsV2.ts --network og
 */
import hre from "hardhat";
import { formatEther } from "viem";

const PROD_MINTS = [
  {
    label: "attack #1 - process_killed on h2",
    cause: "process_killed",
    rule: "shorter checkpoint interval + supervisord respawn",
    to: "0xA1C4c8cB31458D58a2606eF700380871AFc3EB6D" as const, // head-1 wallet
  },
  {
    label: "attack #2 - wallet_drained on h1",
    cause: "wallet_drained",
    rule: "halt strategy + require multi-sig approval for next action",
    to: "0x1Cd5F3aE9dc0cDBf19AA95A5Fb6Bb55c47c4Fd36" as const, // head-3 wallet
  },
];

const REGISTRY_ADDR = process.env.HYDRA_REGISTRY as `0x${string}` | undefined;

function causeToBytes32(cause: string): `0x${string}` {
  const bytes = new TextEncoder().encode(cause);
  const padded = new Uint8Array(32);
  padded.set(bytes.slice(0, 32));
  return ("0x" +
    Array.from(padded)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")) as `0x${string}`;
}

async function main() {
  const [walletClient] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const deployer = walletClient.account.address;
  const balance = await publicClient.getBalance({ address: deployer });

  console.log("=== HydraScars v2 deploy ===");
  console.log("network    :", hre.network.name);
  console.log("chainId    :", hre.network.config.chainId);
  console.log("deployer   :", deployer);
  console.log("balance    :", formatEther(balance), "OG");
  if (balance === 0n) throw new Error("deployer has zero balance");

  console.log("\n--- deploying HydraScars (ERC-721) ---");
  const scars = await hre.viem.deployContract("HydraScars");
  console.log("HydraScars (v2) :", scars.address);

  if (REGISTRY_ADDR) {
    console.log("\n--- wiring registry ---");
    const tx = await scars.write.setRegistry([REGISTRY_ADDR]);
    console.log("setRegistry tx :", tx);
  } else {
    console.log("\nHYDRA_REGISTRY env not set - skipping setRegistry wiring");
  }

  console.log("\n--- re-minting production scars ---");
  const minted: Array<{ label: string; tokenId: number; tx: string }> = [];
  for (const m of PROD_MINTS) {
    const tx = await scars.write.mintScar([
      causeToBytes32(m.cause),
      m.rule,
      m.to,
    ]);
    console.log(`${m.label}: tx=${tx}`);
    // best-effort: read totalSupply after settlement
    const supply = await publicClient.readContract({
      address: scars.address,
      abi: [
        {
          type: "function",
          name: "totalSupply",
          stateMutability: "view",
          inputs: [],
          outputs: [{ type: "uint256" }],
        },
      ],
      functionName: "totalSupply",
    });
    minted.push({ label: m.label, tokenId: Number(supply), tx });
  }

  console.log("\n=== summary ===");
  console.log(`HYDRA_SCARS=${scars.address}    # paste into .env`);
  for (const m of minted) {
    console.log(`token #${m.tokenId} (${m.label}): ${m.tx}`);
  }

  const finalBal = await publicClient.getBalance({ address: deployer });
  console.log("\ngas spent  :", formatEther(balance - finalBal), "OG");
}

main().catch((err) => {
  console.error("DEPLOY FAILED:", err);
  process.exit(1);
});
