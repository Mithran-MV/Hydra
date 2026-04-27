import { request } from "undici";
import type { DeathCause, HeadId, Scar } from "../../../shared/types";
import { emitEvent } from "../events";
import { log } from "../util/log";

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
