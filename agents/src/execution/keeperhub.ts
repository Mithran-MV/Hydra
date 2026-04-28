import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
 * KeeperHub integration. HYDRA fires three KH workflows, one per
 * load-bearing event — every confirmed-death + child-spawn cycle posts
 * to all three. A fourth workflow audits stale-heartbeat watchdog hits
 * from the consensus scanner, independent of confirmed quorum:
 *
 *   - HYDRA-death-event             (lcyuk85gh46defy5xaq8b)
 *   - HYDRA-treasury-redistribute   (uybkmq5v2mpvgji7933ji)
 *   - HYDRA-scar-mint               (up22dre1y0frp1pskrbuj)
 *   - HYDRA-heartbeat-stale         (6sdbtvyee2n0uihywyim3)
 *
 * Workflow ids are overridable via HYDRA_KH_*_WORKFLOW_ID env vars at the
 * call sites; all calls go through executeWorkflow above which uses the
 * MCP HTTP transport so the org-scoped kh_ key in KEEPERHUB_KEY just works
 * (no separate webhook user-key plumbing needed).
 *
 * Architectural note: 0G chain id 16602 isn't in KH's native chain list,
 * so the on-chain writes (HydraRegistry events, HydraScars mints) happen
 * in the agent itself via viem. KH's role here is the audit + watchdog
 * layer sitting above whatever chain the agent decides to use.
 */
