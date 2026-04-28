"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ATTACKS, CHAINSCAN_TX, shortenTx } from "@/lib/attacks";

interface ContractsSnapshot {
  refreshedAt: number;
  chainId: number;
  contracts: Array<{
    label: string;
    address: string;
    chainscan: string;
    liveValue: { name: string; value: string } | null;
    error: string | null;
  }>;
}

export default function EvidencePage() {
  return (
    <main className="min-h-screen bg-ink-950 text-ink-50">
      <Header />

      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-10 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <OnChainCard />
        <LiveAttacksCard />
        <KeeperHubCard />
        <AxlStreamCard />
        <OgStorageCard />
        <RepositoryCard />
      </div>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-ink-700/60 bg-ink-950/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-5 flex items-center justify-between gap-6">
        <div>
          <Link
            href="/"
            className="font-display text-xs tracking-[0.4em] text-venom-400 hover:text-venom-300"
          >
            ← HYDRA
          </Link>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-neutral-50 mt-2">
            Evidence
          </h1>
          <p className="text-sm md:text-base text-neutral-400 mt-1 max-w-2xl">
            Every claim HYDRA makes, traceable to on-chain or live-system
            evidence in under 60 seconds.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-mono tracking-[0.25em] uppercase text-neutral-400 hover:text-venom-300"
          >
            Dashboard →
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-700/60 bg-ink-950/80 mt-12">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-6 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] font-mono tracking-[0.25em] uppercase text-neutral-500">
        <Link href="/" className="hover:text-venom-300">
          ← Landing
        </Link>
        <span>HYDRA · ETH Global Open Agents 2026</span>
        <Link href="/dashboard" className="hover:text-venom-300">
          Dashboard →
        </Link>
      </div>
    </footer>
  );
}

export function EvidenceCard({
  label,
  title,
  source,
  children,
}: {
  label: string;
  title: string;
  source?: { href: string; text: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-ink-700 bg-ink-900/40 overflow-hidden">
      <div className="px-5 py-4 border-b border-ink-700/60 flex items-start justify-between gap-4">
        <div>
          <div className="text-[0.65rem] font-mono tracking-[0.3em] uppercase text-venom-300/70">
            {label}
          </div>
          <h2 className="font-display text-xl text-neutral-50 mt-1">{title}</h2>
        </div>
        {source ? (
          <a
            href={source.href}
            target="_blank"
            rel="noreferrer"
            className="text-[0.65rem] font-mono tracking-[0.25em] uppercase text-neutral-400 hover:text-venom-300 whitespace-nowrap mt-1"
          >
            {source.text} →
          </a>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Placeholder({ note }: { note: string }) {
  return (
    <div className="text-sm text-neutral-500 font-mono italic">
      <span className="inline-block h-1 w-1 rounded-full bg-ember-400 mr-2 align-middle" />
      {note}
    </div>
  );
}

function OnChainCard() {
  const [snap, setSnap] = useState<ContractsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch("/api/contracts", { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = (await r.json()) as ContractsSnapshot;
        if (!cancelled) {
          setSnap(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void fetchOnce();
    const i = setInterval(() => void fetchOnce(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  return (
    <EvidenceCard
      label="Codex i · On-chain"
      title="Contracts on 0G Galileo (chain 16602)"
      source={{
        href: "https://chainscan-galileo.0g.ai",
        text: "chainscan-galileo",
      }}
    >
      {snap ? (
        <div className="space-y-3">
          {snap.contracts.map((c) => (
            <ContractRow key={c.address} entry={c} />
          ))}
          <div className="text-[0.65rem] font-mono tracking-[0.2em] uppercase text-neutral-500 pt-2">
            chain id {snap.chainId} · refreshed {timeAgo(snap.refreshedAt)}
          </div>
        </div>
      ) : error ? (
        <Placeholder note={`fetch failed: ${error}`} />
      ) : (
        <Placeholder note="reading from https://evmrpc-testnet.0g.ai" />
      )}
    </EvidenceCard>
  );
}

function ContractRow({ entry }: { entry: ContractsSnapshot["contracts"][number] }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    void navigator.clipboard.writeText(entry.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="rounded-lg border border-ink-700/60 bg-ink-950/40 p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-neutral-400">{entry.label}</div>
          <div className="font-mono text-sm text-venom-300 break-all mt-0.5">
            {shortenAddr(entry.address)}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[0.65rem] font-mono uppercase tracking-[0.25em]">
          <button
            type="button"
            onClick={onCopy}
            className="px-2 py-1 rounded border border-ink-700 hover:border-venom-400 hover:text-venom-300 text-neutral-400"
            aria-label={"copy " + entry.address}
          >
            {copied ? "copied" : "copy"}
          </button>
          <a
            href={entry.chainscan}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded border border-ink-700 hover:border-venom-400 hover:text-venom-300 text-neutral-400"
          >
            chainscan →
          </a>
        </div>
      </div>
      {entry.liveValue ? (
        <div className="mt-2 text-xs text-neutral-300">
          <span className="text-neutral-500">{entry.liveValue.name}:</span>{" "}
          <span className="font-mono">{entry.liveValue.value}</span>
        </div>
      ) : entry.error ? (
        <div className="mt-2 text-xs text-blood-400 font-mono">
          read failed: {entry.error}
        </div>
      ) : null}
    </div>
  );
}

function shortenAddr(a: string): string {
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function timeAgo(ts: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return sec + "s ago";
  return Math.floor(sec / 60) + "m ago";
}

function LiveAttacksCard() {
  return (
    <EvidenceCard
      label="Codex ii · Receipts"
      title="Live attacks captured"
      source={{
        href: "https://github.com/Mithran-MV/Hydra/blob/main/docs/planning/DAILY_ATTACK_CADENCE.md",
        text: "cadence plan",
      }}
    >
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs font-mono">
          <thead className="text-left text-[0.6rem] tracking-[0.2em] uppercase text-neutral-500 border-b border-ink-700/60">
            <tr>
              <th className="px-2 py-2 font-normal">#</th>
              <th className="px-2 py-2 font-normal">UTC</th>
              <th className="px-2 py-2 font-normal">Cause</th>
              <th className="px-2 py-2 font-normal">Target</th>
              <th className="px-2 py-2 font-normal">Outcome</th>
              <th className="px-2 py-2 font-normal">Death</th>
              <th className="px-2 py-2 font-normal">iNFT</th>
              <th className="px-2 py-2 font-normal">Born</th>
            </tr>
          </thead>
          <tbody>
            {ATTACKS.map((a) => (
              <tr key={a.num} className="border-b border-ink-800/60 last:border-0">
                <td className="px-2 py-2 text-neutral-500">{a.num}</td>
                <td className="px-2 py-2 text-neutral-300 whitespace-nowrap">
                  {a.utc}
                </td>
                <td className="px-2 py-2 text-blood-400">{a.cause}</td>
                <td className="px-2 py-2 text-neutral-200">{a.target}</td>
                <td className="px-2 py-2">
                  {a.outcome === "resurrected" ? (
                    <span className="text-venom-300">resurrected</span>
                  ) : (
                    <span className="text-venom-200">defended</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <a
                    href={CHAINSCAN_TX + a.deathTx}
                    target="_blank"
                    rel="noreferrer"
                    className="text-venom-300 hover:text-venom-200 underline-offset-4 hover:underline"
                  >
                    {shortenTx(a.deathTx)}
                  </a>
                </td>
                <td className="px-2 py-2">
                  <a
                    href={CHAINSCAN_TX + a.inftMintTx}
                    target="_blank"
                    rel="noreferrer"
                    className="text-venom-300 hover:text-venom-200 underline-offset-4 hover:underline"
                  >
                    {shortenTx(a.inftMintTx)}
                  </a>
                </td>
                <td className="px-2 py-2 space-x-2">
                  {a.bornTxs.map((tx, i) => (
                    <a
                      key={tx}
                      href={CHAINSCAN_TX + tx}
                      target="_blank"
                      rel="noreferrer"
                      className="text-venom-300 hover:text-venom-200 underline-offset-4 hover:underline"
                    >
                      {i === 0 ? "h-a" : "h-b"}
                    </a>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500 font-mono">
        outcome = &ldquo;defended&rdquo; when scar-enforced defense ships (D7)
        and a re-attempt of an existing-scar cause is mechanically blocked
      </p>
    </EvidenceCard>
  );
}

interface KhRun {
  ts: number;
  kind: "notify" | "skip";
  workflow: string;
  cause: string;
  status: number | null;
  ok: boolean | null;
  runId: string | null;
  reason: string | null;
}

interface KhSnapshot {
  refreshedAt: number;
  workflowId: string;
  totalRuns: number;
  runs: KhRun[];
}

function KeeperHubCard() {
  const [snap, setSnap] = useState<KhSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch("/api/keeperhub-runs", { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = (await r.json()) as KhSnapshot;
        if (!cancelled) {
          setSnap(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void fetchOnce();
    const i = setInterval(() => void fetchOnce(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  return (
    <EvidenceCard
      label="Codex iii · Audit"
      title="KeeperHub workflow runs"
      source={{ href: "https://app.keeperhub.com", text: "app.keeperhub.com" }}
    >
      {snap ? (
        <div>
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
            <div>
              workflow id:{" "}
              <span className="font-mono text-venom-300">{snap.workflowId}</span>
            </div>
            <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500">
              {snap.totalRuns} total
            </div>
          </div>
          {snap.runs.length === 0 ? (
            <Placeholder note="no KeeperHub calls observed yet — fires on every confirmed death" />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs font-mono">
                <thead className="text-left text-[0.6rem] tracking-[0.2em] uppercase text-neutral-500 border-b border-ink-700/60">
                  <tr>
                    <th className="px-2 py-2 font-normal">When</th>
                    <th className="px-2 py-2 font-normal">Workflow</th>
                    <th className="px-2 py-2 font-normal">Cause</th>
                    <th className="px-2 py-2 font-normal">Status</th>
                    <th className="px-2 py-2 font-normal">Run / reason</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.runs.map((r, i) => (
                    <tr
                      key={`${r.ts}-${i}`}
                      className="border-b border-ink-800/60 last:border-0"
                    >
                      <td className="px-2 py-2 text-neutral-400 whitespace-nowrap">
                        {timeAgo(r.ts)}
                      </td>
                      <td className="px-2 py-2 text-neutral-200">{r.workflow}</td>
                      <td className="px-2 py-2 text-blood-400">{r.cause}</td>
                      <td className="px-2 py-2">
                        {r.kind === "skip" ? (
                          <span className="text-ember-400">skipped</span>
                        ) : r.ok ? (
                          <span className="text-venom-300">
                            {r.status} ok
                          </span>
                        ) : (
                          <span className="text-blood-400">
                            {r.status ?? "—"} fail
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-neutral-300 max-w-[200px] truncate">
                        {r.runId ?? r.reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500 font-mono leading-relaxed">
            KH dashboard at app.keeperhub.com is permissioned per-org; data
            shown here is the agent-side audit log of every KH call HYDRA has
            made (read from logs/events.jsonl on the live host).
          </p>
        </div>
      ) : error ? (
        <Placeholder note={`fetch failed: ${error}`} />
      ) : (
        <Placeholder note="reading from logs/events.jsonl…" />
      )}
    </EvidenceCard>
  );
}

interface AxlEvent {
  ts: number;
  headId: string;
  msgType: string;
  from: string;
}

interface AxlSnapshot {
  refreshedAt: number;
  lastMinuteCount: number;
  events: AxlEvent[];
}

const AXL_FILTER_TYPES = [
  "heartbeat",
  "suspect",
  "confirmed",
  "resurrect",
  "born",
  "scar",
  "panic",
] as const;

function AxlStreamCard() {
  const [snap, setSnap] = useState<AxlSnapshot | null>(null);
  const [active, setActive] = useState<Set<string>>(new Set(AXL_FILTER_TYPES));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch("/api/axl-recent", { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = (await r.json()) as AxlSnapshot;
        if (!cancelled) {
          setSnap(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void fetchOnce();
    const i = setInterval(() => void fetchOnce(), 4_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  const toggleFilter = (t: string) => {
    setActive((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  };

  const filtered = snap
    ? snap.events.filter((e) => active.has(e.msgType))
    : [];

  return (
    <EvidenceCard
      label="Codex iv · Mesh"
      title="AXL message stream (live)"
      source={{
        href: "https://github.com/gensyn-ai/axl",
        text: "gensyn-ai/axl",
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {AXL_FILTER_TYPES.map((t) => {
          const on = active.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleFilter(t)}
              className={`px-2 py-1 rounded font-mono text-[0.65rem] tracking-[0.2em] uppercase border transition-colors ${
                on
                  ? "border-venom-400/60 text-venom-300 bg-venom-500/10"
                  : "border-ink-700 text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t}
            </button>
          );
        })}
        <span className="ml-auto text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500 font-mono">
          {snap ? `${snap.lastMinuteCount} msgs in 60s` : "—"}
        </span>
      </div>
      {snap ? (
        filtered.length === 0 ? (
          <Placeholder note="no AXL messages match the active filter — toggle a chip" />
        ) : (
          <div className="max-h-72 overflow-y-auto rounded border border-ink-700/60 bg-ink-950/40">
            <table className="w-full text-xs font-mono">
              <tbody>
                {filtered.map((e, i) => (
                  <tr
                    key={`${e.ts}-${i}`}
                    className="border-b border-ink-800/40 last:border-0"
                  >
                    <td className="px-2 py-1.5 text-neutral-500 whitespace-nowrap w-20">
                      {timeAgo(e.ts)}
                    </td>
                    <td className="px-2 py-1.5 w-24">
                      <span className="text-venom-300">{e.msgType}</span>
                    </td>
                    <td className="px-2 py-1.5 text-neutral-400">
                      {e.headId}…
                    </td>
                    <td className="px-2 py-1.5 text-neutral-500">←</td>
                    <td className="px-2 py-1.5 text-neutral-300">{e.from}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : error ? (
        <Placeholder note={`fetch failed: ${error}`} />
      ) : (
        <Placeholder note="reading from logs/events.jsonl…" />
      )}
    </EvidenceCard>
  );
}

interface HeadStateEntry {
  id: string;
  headIndex: number | null;
  status: string;
  generation: number;
  state: unknown;
}

interface OgStorageSnapshot {
  refreshedAt: number;
  kvBackend: string;
  count: number;
  heads: HeadStateEntry[];
}

function OgStorageCard() {
  const [snap, setSnap] = useState<OgStorageSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch("/api/og-storage/state", { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = (await r.json()) as OgStorageSnapshot;
        if (!cancelled) {
          setSnap(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void fetchOnce();
    const i = setInterval(() => void fetchOnce(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  return (
    <EvidenceCard
      label="Codex v · Memory"
      title="0G Storage state per head"
      source={{
        href: "https://docs.0g.ai",
        text: "0g docs",
      }}
    >
      {snap ? (
        snap.heads.length === 0 ? (
          <Placeholder note="no head state files in KV mirror — has the swarm booted?" />
        ) : (
          <div className="space-y-2">
            {snap.heads.map((h) => {
              const isOpen = openId === h.id;
              return (
                <div
                  key={h.id}
                  className="rounded-lg border border-ink-700/60 bg-ink-950/40"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : h.id)}
                    className="w-full text-left px-3 py-2 flex items-center justify-between gap-3 hover:bg-ink-900/50 transition-colors"
                  >
                    <div>
                      <div className="font-mono text-xs text-venom-300">
                        {h.id.slice(0, 16)}…
                      </div>
                      <div className="text-[0.65rem] text-neutral-500 font-mono mt-0.5">
                        gen {h.generation} · status {h.status}
                      </div>
                    </div>
                    <span className="text-[0.65rem] tracking-[0.2em] uppercase text-neutral-400">
                      {isOpen ? "hide json" : "show json"}
                    </span>
                  </button>
                  {isOpen ? (
                    <pre className="px-3 pb-3 text-[0.7rem] font-mono text-neutral-300 overflow-x-auto leading-snug">
                      {JSON.stringify(h.state, null, 2)}
                    </pre>
                  ) : null}
                </div>
              );
            })}
            <div className="text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500 font-mono pt-2">
              {snap.count} alive · refreshed {timeAgo(snap.refreshedAt)} ·{" "}
              {snap.kvBackend.replace(/.*\(/, "(")}
            </div>
          </div>
        )
      ) : error ? (
        <Placeholder note={`fetch failed: ${error}`} />
      ) : (
        <Placeholder note="reading from logs/og-kv…" />
      )}
    </EvidenceCard>
  );
}

function RepositoryCard() {
  return (
    <EvidenceCard
      label="Codex vi · Provenance"
      title="Repository & build"
      source={{ href: "https://github.com/Mithran-MV/Hydra", text: "github" }}
    >
      <Placeholder note="instrumenting on next deploy — recent commits + qualification doc links to land in section commit" />
    </EvidenceCard>
  );
}
