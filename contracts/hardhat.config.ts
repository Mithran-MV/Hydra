import "@nomicfoundation/hardhat-toolbox-viem";
import type { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    og: {
      url: process.env.OG_CHAIN_RPC ?? "https://evmrpc-testnet.0g.ai",
      accounts: process.env.OG_CHAIN_PK ? [process.env.OG_CHAIN_PK] : [],
      chainId: Number(process.env.OG_CHAIN_CHAIN_ID ?? 16602),
    },
  },
};

export default config;
