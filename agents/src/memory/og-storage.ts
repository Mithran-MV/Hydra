import { JsonRpcProvider, Wallet } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { log } from "../util/log";

/**
 * Opportunistic upload of a JSON value to 0G Storage as an in-memory blob.
 *
 * Unlike the local KV mirror (synchronous, always works), this function makes
 * a real on-chain tx — useful for proving "memory lives on 0G" in the demo.
 * Returns the root hash + tx hash on success; throws on failure.
 *
 * Use sparingly: state snapshots are too frequent (every 10s × N heads); only
 * call from scar broadcasts and resurrection events.
 */
export interface OgUploadReceipt {
  rootHash: string;
  txHash: string;
  bytes: number;
}

const RPC_URL = process.env.OG_CHAIN_RPC ?? "https://evmrpc-testnet.0g.ai";
const INDEXER_URL =
  process.env.OG_INDEXER_RPC ??
  "https://indexer-storage-testnet-turbo.0g.ai";

let cachedIndexer: Indexer | null = null;
let cachedSigner: Wallet | null = null;

function getIndexer(): Indexer {
  if (!cachedIndexer) cachedIndexer = new Indexer(INDEXER_URL);
  return cachedIndexer;
}

function getSigner(): Wallet {
  if (cachedSigner) return cachedSigner;
  const pk = process.env.OG_CHAIN_PK;
  if (!pk) throw new Error("OG_CHAIN_PK missing");
  const provider = new JsonRpcProvider(RPC_URL);
  cachedSigner = new Wallet(pk, provider);
  return cachedSigner;
}

export async function uploadJsonToOG(
  label: string,
  value: unknown,
): Promise<OgUploadReceipt> {
  const indexer = getIndexer();
  const signer = getSigner();
  const json = JSON.stringify(value);
  const data = new TextEncoder().encode(json);
  const memData = new MemData(data);
  const [, treeErr] = await memData.merkleTree();
  if (treeErr) throw treeErr;
  const [tx, err] = await indexer.upload(memData, RPC_URL, signer as never);
  if (err) throw err;
  // Single-blob upload returns scalar fields; fragmented returns arrays.
  const rootHash = "rootHash" in tx ? tx.rootHash : tx.rootHashes[0];
  const txHash = "txHash" in tx ? tx.txHash : tx.txHashes[0];
  log.info(
    `🛰️  0G Storage upload [${label}] root=${rootHash.slice(0, 16)}… tx=${txHash.slice(0, 10)}…`,
  );
  return { rootHash, txHash, bytes: data.length };
}
