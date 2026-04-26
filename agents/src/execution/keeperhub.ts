import { request } from "undici";
import type { DeathCause, HeadId } from "../../../shared/types";
import { emitEvent } from "../events";
import { log } from "../util/log";

/**
 * KeeperHub integration: in the hybrid architecture (0G doesn't appear in KH's
 * native chain list, see planning/06-feedback-md-draft.md), the KH MCP-managed
 * workflow does NOT call the 0G contract directly. Instead:
 *
 *   1. Agent (leader) POSTs a webhook trigger to KH on confirmed-death.
 *   2. KH workflow runs: simulate (read), Discord audit, optional Slack/email.
 *   3. Agent (in parallel) makes the actual on-chain call via execution/chain.ts
 *      to 0G's HydraExecutor / HydraTreasury.
 *
 * This satisfies all three KH judging criteria — webhook trigger, depth, audit
 * trail — while keeping execution on 0G Chain for the 0G prize.
 */

const KH_BASE = process.env.KEEPERHUB_BASE ?? "https://app.keeperhub.com";
const REDISTRIBUTE_WEBHOOK = process.env.KEEPERHUB_REDISTRIBUTE_WEBHOOK;

export interface RedistributePayload {
  deadHead: HeadId;
  cause: DeathCause;
  childHeads: HeadId[];
  childIndices: number[];
  ts: number;
  authorityPeerId: HeadId; // leader's peer-id
}

export async function notifyRedistribute(
  payload: RedistributePayload,
): Promise<{ ok: boolean; status?: number; runId?: string }> {
  if (!REDISTRIBUTE_WEBHOOK) {
    log.warn(
      "KEEPERHUB_REDISTRIBUTE_WEBHOOK not set — skipping KH webhook (workflow not yet wired)",
    );
    await emitEvent(payload.authorityPeerId, "keeperhub.skip", {
      reason: "no webhook url",
      ...payload,
    });
    return { ok: false };
  }

  try {
    const r = await request(REDISTRIBUTE_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      `🔔 KH webhook fired: status=${r.statusCode}${runId ? ` runId=${runId}` : ""}`,
    );
    await emitEvent(payload.authorityPeerId, "keeperhub.notify", {
      status: r.statusCode,
      runId,
      ...payload,
    });
    return { ok: r.statusCode < 400, status: r.statusCode, runId };
  } catch (err) {
    log.warn(`KH webhook error: ${(err as Error).message}`);
    return { ok: false };
  }
}

export function keeperhubBaseUrl(): string {
  return KH_BASE;
}
