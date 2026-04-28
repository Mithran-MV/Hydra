import { request } from "undici";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { DeathCause, HeadId, Scar } from "../../../shared/types";
import { emitEvent } from "../events";
import { log } from "../util/log";

const KH_MCP_ENDPOINT = "https://app.keeperhub.com/mcp";

const KH_RUNS_LOG = resolve(process.cwd(), "logs", "keeperhub-runs.jsonl");

interface KhRunRecord {
  ts: number;
  workflowId: string;
  workflowLabel: string;
  ok: boolean;
  executionId: string | null;
  status: string | null;
  error: string | null;
  inputSummary: Record<string, unknown>;
}

async function appendKhRun(record: KhRunRecord): Promise<void> {
  try {
    await mkdir(dirname(KH_RUNS_LOG), { recursive: true });
    await appendFile(KH_RUNS_LOG, JSON.stringify(record) + "\n", "utf8");
  } catch (err) {
    log.warn(`KH run log append failed: ${(err as Error).message}`);
  }
}

let cachedSession: { id: string; expMs: number } | null = null;

async function getMcpSession(apiKey: string): Promise<string> {
  if (cachedSession && cachedSession.expMs > Date.now() + 60_000) {
    return cachedSession.id;
  }
  const r = await fetch(KH_MCP_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "hydra-agent", version: "1.0" },
      },
    }),
  });
  if (!r.ok) {
    throw new Error(`KH initialize failed: HTTP ${r.status}`);
  }
  const sessionId = r.headers.get("mcp-session-id");
  if (!sessionId) {
    throw new Error("KH initialize did not return mcp-session-id");
  }
  // The session JWT carries `exp` in seconds; default to 23h if parse fails.
  let expMs = Date.now() + 23 * 60 * 60 * 1000;
  try {
    const payload = JSON.parse(
      Buffer.from(sessionId.split(".")[1], "base64").toString(),
    );
    if (typeof payload.exp === "number") expMs = payload.exp * 1000;
  } catch {}
  cachedSession = { id: sessionId, expMs };
  return sessionId;
}

export interface ExecuteResult {
  ok: boolean;
  executionId: string | null;
  status: string | null;
  error: string | null;
}

/**
 * Trigger a manual execution of a KeeperHub workflow over MCP HTTP.
 *
 * The agent's `KEEPERHUB_KEY` (org-scoped `kh_...`) authenticates the call.
 * This bypasses the public webhook endpoint (which requires a `wfb_` user
 * key per Luca's update — see KEEPERHUB_FEEDBACK.md) and lands a real
 * run in the KH dashboard with the full input payload visible.
 */
export async function executeWorkflow(
  workflowId: string,
  input: object,
  workflowLabel = "unspecified",
): Promise<ExecuteResult> {
  const apiKey = process.env.KEEPERHUB_KEY;
  const inputSummary = summariseInput(input);

  const finish = async (result: ExecuteResult): Promise<ExecuteResult> => {
    await appendKhRun({
      ts: Date.now(),
      workflowId,
      workflowLabel,
      ok: result.ok,
      executionId: result.executionId,
      status: result.status,
      error: result.error,
      inputSummary,
    });
    return result;
  };

  if (!apiKey || apiKey === "..." || apiKey.trim().length === 0) {
    return finish({
      ok: false,
      executionId: null,
      status: null,
      error: "KEEPERHUB_KEY not set",
    });
  }
  try {
    const sessionId = await getMcpSession(apiKey);
    const r = await fetch(KH_MCP_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "mcp-session-id": sessionId,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "execute_workflow",
          arguments: { workflowId, input },
        },
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return finish({
        ok: false,
        executionId: null,
        status: null,
        error: `HTTP ${r.status}: ${body.slice(0, 200)}`,
      });
    }
    const j = (await r.json()) as {
      result?: { content?: Array<{ text?: string }> };
      error?: { message?: string };
    };
    if (j.error) {
      return finish({
        ok: false,
        executionId: null,
        status: null,
        error: j.error.message ?? "unknown jsonrpc error",
      });
    }
    const text = j.result?.content?.[0]?.text;
    if (!text) {
      return finish({
        ok: false,
        executionId: null,
        status: null,
        error: "no content in tool result",
      });
    }
    const parsed = JSON.parse(text) as {
      executionId?: string;
      status?: string;
    };
    log.info(
      `🔔 KH ${workflowLabel}: executionId=${parsed.executionId ?? "?"} status=${parsed.status ?? "?"}`,
    );
    return finish({
      ok: true,
      executionId: parsed.executionId ?? null,
      status: parsed.status ?? null,
      error: null,
    });
  } catch (err) {
    return finish({
      ok: false,
      executionId: null,
      status: null,
      error: (err as Error).message,
    });
  }
}

function summariseInput(input: object): Record<string, unknown> {
  // Keep the agent-side log compact: top-level scalars + array lengths only.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === null || v === undefined) {
      out[k] = v;
    } else if (typeof v === "object") {
      if (Array.isArray(v)) out[k] = `[${v.length} items]`;
      else out[k] = "[object]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * KeeperHub integration. HYDRA wires three distinct KH workflow types,
 * one per trigger style, so the platform's full surface gets exercised:
 *
 *   1. Webhook trigger      — leader fires on confirmed-death.        (notifyRedistribute)
 *   2. Scheduled trigger    — KH polls each minute and fires back if   (notifyHeartbeatStale)
 *                             a head's heartbeat is stale, giving us
 *                             KH-as-watchdog independent of our mesh.
 *   3. Event trigger        — every new scar fires this, for live      (notifyScarLearned)
 *                             external audit (Discord/Slack).
 *
 * Each workflow has its own webhook URL. Set the URLs via env vars:
 *   KEEPERHUB_REDISTRIBUTE_WEBHOOK   (workflow 1)
 *   KEEPERHUB_HEARTBEAT_WEBHOOK      (workflow 2 — agent-side trigger of scheduled flow)
 *   KEEPERHUB_SCAR_WEBHOOK           (workflow 3)
 *
 * Auth: KH workflow trigger endpoints expect Bearer <KEEPERHUB_KEY>. See
 * KEEPERHUB_FEEDBACK.md for the API-key-format gap we documented.
 *
 * Architectural note: 0G chain id 16602 isn't in KH's native chain list, so
 * the on-chain writes (HydraRegistry events, HydraScars mints) happen in
 * the agent itself via viem. KH's role here is the audit + watchdog layer
 * sitting above whatever chain the agent decides to use.
 */

const KH_BASE = process.env.KEEPERHUB_BASE ?? "https://app.keeperhub.com";

export interface RedistributePayload {
  deadHead: HeadId;
  cause: DeathCause;
  childHeads: HeadId[];
  childIndices: number[];
  ts: number;
  authorityPeerId: HeadId;
}

export interface HeartbeatStalePayload {
  peerId: HeadId;
  headIndex: number;
  lastHeartbeatAt: number;
  staleByMs: number;
  ts: number;
}

export interface ScarLearnedPayload {
  cause: DeathCause;
  rule: Scar["rule"];
  learnedFrom: HeadId;
  generation: number;
  ts: number;
}

interface PostResult {
  ok: boolean;
  status?: number;
  runId?: string;
}

async function postToWorkflow(
  url: string | undefined,
  payload: object,
  context: { name: string; authorityPeerId: HeadId },
): Promise<PostResult> {
  if (!url) {
    log.debug(`${context.name}: webhook url not set, skipping`);
    await emitEvent(context.authorityPeerId, `keeperhub.${context.name}.skip`, {
      reason: "no webhook url",
    });
    return { ok: false };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = process.env.KEEPERHUB_KEY;
  if (apiKey && apiKey !== "..." && apiKey.trim().length > 0) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const r = await request(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      headersTimeout: 10_000,
      bodyTimeout: 10_000,
    });
    let runId: string | undefined;
    try {
      const j = (await r.body.json()) as { run_id?: string; runId?: string };
      runId = j.run_id ?? j.runId;
    } catch {
      await r.body.text().catch(() => "");
    }
    log.info(
      `🔔 KH ${context.name}: status=${r.statusCode}${runId ? ` runId=${runId}` : ""}`,
    );
    await emitEvent(context.authorityPeerId, `keeperhub.notify`, {
      workflow: context.name,
      status: r.statusCode,
      runId,
      ...payload,
    });
    return { ok: r.statusCode < 400, status: r.statusCode, runId };
  } catch (err) {
    log.warn(`KH ${context.name} error: ${(err as Error).message}`);
    return { ok: false };
  }
}

/** Workflow 1 — webhook-triggered, fires on confirmed death. */
export async function notifyRedistribute(
  payload: RedistributePayload,
): Promise<PostResult> {
  return postToWorkflow(
    process.env.KEEPERHUB_REDISTRIBUTE_WEBHOOK,
    payload,
    { name: "redistribute", authorityPeerId: payload.authorityPeerId },
  );
}

/** Workflow 2 — agent posts when its own watchdog detects stale heartbeat
 *  in another head, so KH's run history shows the lag too (defense in depth). */
export async function notifyHeartbeatStale(
  payload: HeartbeatStalePayload,
  by: HeadId,
): Promise<PostResult> {
  return postToWorkflow(
    process.env.KEEPERHUB_HEARTBEAT_WEBHOOK,
    payload,
    { name: "heartbeat-stale", authorityPeerId: by },
  );
}

/** Workflow 3 — fires on every new scar so KH audits the swarm's learning. */
export async function notifyScarLearned(
  payload: ScarLearnedPayload,
  by: HeadId,
): Promise<PostResult> {
  return postToWorkflow(
    process.env.KEEPERHUB_SCAR_WEBHOOK,
    payload,
    { name: "scar-learned", authorityPeerId: by },
  );
}

export function keeperhubBaseUrl(): string {
  return KH_BASE;
}
