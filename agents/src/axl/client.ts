import { request } from "undici";
import type { AXLMessage, AxlEnvelope } from "../../../shared/types";
import { emitEvent } from "../events";
import { log } from "../util/log";

const POLL_INTERVAL_MS = 250;
const SEND_TIMEOUT_MS = 5_000;

export class AXLClient {
  private apiBase: string;
  private peerId: string | null = null;
  private stopped = false;

  constructor(headIndex: number) {
    const port = 9002 + (headIndex - 1) * 10;
    this.apiBase = process.env.AXL_API_BASE ?? `http://127.0.0.1:${port}`;
  }

  async getMyPeerId(): Promise<string> {
    if (this.peerId) return this.peerId;
    for (let i = 0; i < 60; i++) {
      try {
        const r = await request(`${this.apiBase}/topology`, {
          headersTimeout: 2_000,
          bodyTimeout: 2_000,
        });
        if (r.statusCode !== 200) throw new Error(`status ${r.statusCode}`);
        const j = (await r.body.json()) as { our_public_key?: string };
        if (j.our_public_key) {
          this.peerId = j.our_public_key;
          return this.peerId;
        }
      } catch (err) {
        log.debug(`topology poll ${i}:`, (err as Error).message);
      }
      await sleep(500);
    }
    throw new Error(`AXL node did not become ready at ${this.apiBase}`);
  }

  async waitForPeers(minCount: number): Promise<void> {
    const start = Date.now();
    while (!this.stopped && Date.now() - start < 60_000) {
      try {
        const r = await request(`${this.apiBase}/topology`);
        const j = (await r.body.json()) as {
          peers?: unknown[];
          neighbours?: unknown[];
        };
        const count = (j.peers ?? j.neighbours ?? []).length;
        if (count >= minCount) return;
      } catch (err) {
        log.debug("waitForPeers err:", (err as Error).message);
      }
      await sleep(500);
    }
    log.warn(`waitForPeers timed out (wanted ${minCount}); proceeding anyway`);
  }

  async send(toPeerId: string, message: AXLMessage): Promise<void> {
    const body = JSON.stringify(message);
    void emitEvent(this.peerId ?? "unknown", "axl.send", {
      type: message.type,
      to: toPeerId.slice(0, 16) + "…",
      sigPresent: "sig" in message && typeof message.sig === "string",
      bytes: body.length,
    });
    try {
      const r = await request(`${this.apiBase}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Destination-Peer-Id": toPeerId,
        },
        body,
        headersTimeout: SEND_TIMEOUT_MS,
        bodyTimeout: SEND_TIMEOUT_MS,
      });
      if (r.statusCode >= 400) {
        const txt = await r.body.text();
        throw new Error(`status ${r.statusCode}: ${txt}`);
      }
      r.body.dump();
    } catch (err) {
      log.warn(`send to ${toPeerId.slice(0, 10)}…: ${(err as Error).message}`);
    }
  }

  /** Async generator polling /recv. Yields decoded envelopes. */
  async *recvStream(): AsyncGenerator<AxlEnvelope> {
    while (!this.stopped) {
      try {
        const r = await request(`${this.apiBase}/recv`, {
          headersTimeout: 5_000,
          bodyTimeout: 5_000,
        });
        if (r.statusCode === 204 || r.statusCode === 408) {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }
        if (r.statusCode !== 200) {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }
        const fromPeerId = String(r.headers["x-from-peer-id"] ?? "");
        const text = await r.body.text();
        if (!text) {
          await sleep(POLL_INTERVAL_MS);
          continue;
        }
        try {
          const body = JSON.parse(text) as AXLMessage;
          yield { fromPeerId, body };
        } catch {
          log.warn(`bad json from ${fromPeerId.slice(0, 10)}…`);
        }
      } catch (err) {
        log.debug("recv poll error:", (err as Error).message);
        await sleep(POLL_INTERVAL_MS * 2);
      }
    }
  }

  stop(): void {
    this.stopped = true;
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));
