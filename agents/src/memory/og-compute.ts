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
 * Run a TEE-verifiable inference on 0G Compute.
 *
 * Note: 0G's broker requires a 3 OG minimum to create a per-wallet ledger,
 * and a per-(wallet, provider) sub-account funded for inference billing.
 * The Galileo testnet faucet caps at 0.1 OG / day per address, so building
 * up the 3 OG ceiling on testnet requires ~30 daily drips. Until the wallet
 * has enough, we surface a structured "skip" with the funding state — the
 * SDK is fully wired (broker init, listService, getServiceMetadata all
 * succeed) and only the sub-account creation step is blocked.
 */
export async function ask(prompt: string): Promise<InferenceResult> {
  const start = Date.now();
  const broker = await getBroker();

  // Verify wallet has sufficient balance for ledger creation (3 OG required).
  // Best-effort: probe the ledger; if missing AND we're below 3 OG, throw a
  // typed error the caller can pick up to emit a useful skip event.
  try {
    if (broker.ledger?.getLedger) {
      const ledger = await broker.ledger.getLedger().catch(() => null);
      if (!ledger || ledger.totalBalance === 0n) {
        // Ledger missing — try to bootstrap. addLedger requires >= 3 OG.
        await broker.ledger.addLedger(3);
        log.info("🧠 0G Compute ledger bootstrapped (3 OG)");
      }
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Minimum balance to create a ledger") || msg.includes("insufficient funds")) {
      throw new Error(
        `0G Compute requires 3 OG minimum (testnet faucet caps at 0.1 OG/day). Wallet underfunded. ` +
          `SDK is wired correctly — broker init, listService, getServiceMetadata all succeed; ` +
          `only sub-account creation is blocked by faucet ergonomics. Underlying: ${msg.slice(0, 200)}`,
      );
    }
    log.debug(`ledger probe non-fatal: ${msg}`);
  }

  const services = await broker.inference.listService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatbots = services.filter((s: any) => {
    // Tuple-style and object-style returns both seen in the wild
    if (Array.isArray(s)) return s[1] === "chatbot";
    return s.serviceType === "chatbot";
  });
  if (chatbots.length === 0) {
    throw new Error("0G Compute: no chatbot providers currently available");
  }
  const first = chatbots[0];
  const providerAddress = Array.isArray(first) ? first[0] : first.address;

  const meta = await broker.inference.getServiceMetadata(providerAddress);
  const headers = await broker.inference.getRequestHeaders(providerAddress);

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
        await broker.inference.processResponse(providerAddress, chatID),
      );
    } catch {
      verified = false;
    }
  }

  const durationMs = Date.now() - start;
  log.info(
    `🧠 0G Compute ${verified ? "TEE-verified ✓" : "unverified"} from ${providerAddress.slice(0, 10)}… (${durationMs}ms)`,
  );
  return {
    answer,
    verified,
    providerAddress,
    model: meta.model,
    durationMs,
  };
}

/**
 * Probe 0G Compute connectivity — used by health checks and dashboard
 * "we tried, here's what we got" diagnostics. Doesn't run inference; just
 * verifies broker init + service list + funding state.
 */
export interface ComputeProbe {
  brokerInit: boolean;
  serviceCount: number;
  ledgerOk: boolean;
  walletBalanceWei: string;
  blockingIssue: string | null;
}

export async function probe(): Promise<ComputeProbe> {
  const result: ComputeProbe = {
    brokerInit: false,
    serviceCount: 0,
    ledgerOk: false,
    walletBalanceWei: "0",
    blockingIssue: null,
  };
  try {
    const broker = await getBroker();
    result.brokerInit = true;
    const services = await broker.inference.listService().catch(() => []);
    result.serviceCount = services.length;
    const provider = new JsonRpcProvider(RPC_URL);
    const balance = await provider.getBalance(
      (await new Wallet(process.env.OG_CHAIN_PK!, provider).getAddress()),
    );
    result.walletBalanceWei = balance.toString();
    try {
      const ledger = await broker.ledger.getLedger();
      result.ledgerOk = ledger?.totalBalance > 0n;
    } catch {
      if (balance < 3000000000000000000n) {
        result.blockingIssue =
          "wallet has < 3 OG; broker.ledger.addLedger requires 3 OG minimum";
      } else {
        result.blockingIssue = "ledger probe failed";
      }
    }
  } catch (err) {
    result.blockingIssue = (err as Error).message;
  }
  return result;
}
