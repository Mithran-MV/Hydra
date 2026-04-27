import { createRequire } from "node:module";
import { JsonRpcProvider, Wallet } from "ethers";
import { log } from "../util/log";

// The published @0glabs/0g-serving-broker ESM bundle has a Vite-hashed
// internal module that fails dynamic ESM resolution under tsx. Loading the
// CJS build via createRequire bypasses the broken import resolution while
// keeping the same factory + API surface.
const cjsRequire = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedBroker: any | null = null;

const RPC_URL = process.env.OG_CHAIN_RPC ?? "https://evmrpc-testnet.0g.ai";

async function getBroker() {
  if (cachedBroker) return cachedBroker;
  const pk = process.env.OG_CHAIN_PK;
  if (!pk) throw new Error("OG_CHAIN_PK missing");
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(pk, provider);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sdk = cjsRequire("@0glabs/0g-serving-broker") as any;
  const factory = sdk.createZGComputeNetworkBroker;
  if (!factory) throw new Error("0G serving-broker SDK missing factory");
  cachedBroker = await factory(wallet);
  return cachedBroker;
}

export interface InferenceResult {
  answer: string;
  verified: boolean;
  providerAddress: string;
  model: string;
  durationMs: number;
}

/**
 * Run a TEE-verifiable inference on 0G Compute. Tries the first available
 * chatbot service. Returns answer + whether the response was verified via
 * `processResponse` (TeeML / TeeTLS attestation).
 *
 * Throws on hard failures (no providers, network down). Callers should
 * catch and degrade gracefully rather than abort the swarm.
 */
export async function ask(prompt: string): Promise<InferenceResult> {
  const start = Date.now();
  const broker = await getBroker();

  // The broker requires a one-time ledger top-up before first inference.
  // We do it lazily and idempotently — call deposit only if the ledger is
  // missing/zero. The SDK's `addLedger` returns a tx; absent docs say to
  // call once per wallet. Do it best-effort and keep going.
  try {
    if (broker.ledger?.getLedger) {
      const ledger = await broker.ledger.getLedger().catch(() => null);
      if (!ledger || ledger.totalBalance === 0n) {
        log.debug("ledger empty, attempting addLedger(0.001)");
        await broker.ledger.addLedger(0.001).catch((err: Error) => {
          log.debug(`addLedger skipped: ${err.message}`);
        });
      }
    }
  } catch (err) {
    log.debug(`ledger check skipped: ${(err as Error).message}`);
  }

  const services = await broker.inference.listService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatbots = services.filter((s: any) => s.serviceType === "chatbot");
  if (chatbots.length === 0) {
    throw new Error("0G Compute: no chatbot providers currently available");
  }
  const provider = chatbots[0];
  const meta = await broker.inference.getServiceMetadata(provider.address);
  const headers = await broker.inference.getRequestHeaders(provider.address);

  const r = await fetch(`${meta.endpoint}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      model: meta.model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`0G Compute http ${r.status}: ${text.slice(0, 200)}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await r.json();
  const answer = data?.choices?.[0]?.message?.content ?? "";
  const chatID = r.headers.get("ZG-Res-Key") || data.id;

  let verified = false;
  if (chatID) {
    try {
      verified = Boolean(
        await broker.inference.processResponse(provider.address, chatID),
      );
    } catch {
      verified = false;
    }
  }

  const durationMs = Date.now() - start;
  log.info(
    `🧠 0G Compute ${verified ? "TEE-verified ✓" : "unverified"} from ${provider.address.slice(0, 10)}… (${durationMs}ms)`,
  );
  return {
    answer,
    verified,
    providerAddress: provider.address,
    model: meta.model,
    durationMs,
  };
}
