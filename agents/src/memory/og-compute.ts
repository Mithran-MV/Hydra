import { JsonRpcProvider, Wallet } from "ethers";
// Using `any` for the broker types because the SDK's exposed types are loose
// and we only need a small surface here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedBroker: any | null = null;
import { log } from "../util/log";

const RPC_URL = process.env.OG_CHAIN_RPC ?? "https://evmrpc-testnet.0g.ai";

async function getBroker() {
  if (cachedBroker) return cachedBroker;
  const pk = process.env.OG_CHAIN_PK;
  if (!pk) throw new Error("OG_CHAIN_PK missing");
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(pk, provider);
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const sdk = await import("@0glabs/0g-serving-broker");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factory = (sdk as any).createZGComputeNetworkBroker;
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
 * catch and log + degrade rather than abort the whole swarm.
 */
export async function ask(prompt: string): Promise<InferenceResult> {
  const start = Date.now();
  const broker = await getBroker();
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
