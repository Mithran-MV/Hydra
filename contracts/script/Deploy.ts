import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  const [walletClient] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const deployer = walletClient.account.address;
  const balance = await publicClient.getBalance({ address: deployer });

  console.log("=== HYDRA contracts deploy ===");
  console.log("network    :", hre.network.name);
  console.log("chainId    :", hre.network.config.chainId);
  console.log("deployer   :", deployer);
  console.log("balance    :", formatEther(balance), "OG/ETH");

  if (balance === 0n) {
    throw new Error("deployer has zero balance — fund it from the faucet");
  }

  console.log("\n--- deploying HydraRegistry ---");
  const registry = await hre.viem.deployContract("HydraRegistry");
  console.log("✓ HydraRegistry:", registry.address);

  console.log("\n--- deploying HydraTreasury ---");
  const treasury = await hre.viem.deployContract("HydraTreasury");
  console.log("✓ HydraTreasury:", treasury.address);

  console.log("\n--- deploying HydraExecutor ---");
  const executor = await hre.viem.deployContract("HydraExecutor");
  console.log("✓ HydraExecutor:", executor.address);

  console.log("\n--- deploying HydraScars ---");
  const scars = await hre.viem.deployContract("HydraScars");
  console.log("✓ HydraScars:", scars.address);

  console.log("\n--- wiring permissions ---");
  const setExec = await treasury.write.setExecutor([executor.address]);
  console.log("treasury.setExecutor:", setExec);
  const setReg = await scars.write.setRegistry([registry.address]);
  console.log("scars.setRegistry:", setReg);

  console.log("\n=== addresses (paste into .env) ===");
  console.log(`HYDRA_REGISTRY=${registry.address}`);
  console.log(`HYDRA_TREASURY=${treasury.address}`);
  console.log(`HYDRA_EXECUTOR=${executor.address}`);
  console.log(`HYDRA_SCARS=${scars.address}`);

  const finalBal = await publicClient.getBalance({ address: deployer });
  console.log("\ngas spent  :", formatEther(balance - finalBal), "OG");
  console.log("balance now:", formatEther(finalBal), "OG");
}

main().catch((err) => {
  console.error("DEPLOY FAILED:", err);
  process.exit(1);
});
