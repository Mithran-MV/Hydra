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

function EvidenceCard({
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

function Placeholder({ note }: { note: string }) {
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
                  {a.deathTx ? (
                    <a
                      href={CHAINSCAN_TX + a.deathTx}
                      target="_blank"
                      rel="noreferrer"
                      className="text-venom-300 hover:text-venom-200 underline-offset-4 hover:underline"
                    >
                      {shortenTx(a.deathTx)}
                    </a>
                  ) : (
                    <span
                      className="text-ember-400/80"
                      title={a.note ?? "death tx not on chain"}
                    >
                      nonce raced
                    </span>
                  )}
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
  workflowId: string;
  workflowLabel: string;
  ok: boolean;
  executionId: string | null;
  status: string | null;
  error: string | null;
  inputSummary: Record<string, unknown>;
}

interface KhSnapshot {
  refreshedAt: number;
  totalRuns: number;
  workflows: Array<{ id: string; label: string; runs: number }>;
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
      source={{ href: "https://app.keeperhub.com/workflows", text: "app.keeperhub.com" }}
    >
      {snap ? (
        <div>
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-3 flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              {snap.workflows.map((w) => (
                <span
                  key={w.id}
                  className="font-mono text-[0.65rem] tracking-[0.15em] uppercase border border-ink-700 rounded px-2 py-1 text-neutral-300"
                >
                  {w.label}: <span className="text-venom-300">{w.runs}</span>
                </span>
              ))}
            </div>
            <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500">
              {snap.totalRuns} total
            </div>
          </div>
          {snap.runs.length === 0 ? (
            <Placeholder note="no KeeperHub calls observed yet — fires on every confirmed death, treasury redistribute, and scar mint" />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs font-mono">
                <thead className="text-left text-[0.6rem] tracking-[0.2em] uppercase text-neutral-500 border-b border-ink-700/60">
                  <tr>
                    <th className="px-2 py-2 font-normal">When</th>
                    <th className="px-2 py-2 font-normal">Workflow</th>
                    <th className="px-2 py-2 font-normal">Status</th>
                    <th className="px-2 py-2 font-normal">Execution</th>
                    <th className="px-2 py-2 font-normal">Input summary</th>
                  </tr>
                </thead>
                <tbody>
                  {snap.runs.map((r, i) => {
                    const execHref =
                      r.executionId
                        ? `https://app.keeperhub.com/workflows/${r.workflowId}/executions/${r.executionId}`
                        : null;
                    return (
                      <tr
                        key={`${r.ts}-${i}`}
                        className="border-b border-ink-800/60 last:border-0"
                      >
                        <td className="px-2 py-2 text-neutral-400 whitespace-nowrap">
                          {timeAgo(r.ts)}
                        </td>
                        <td className="px-2 py-2 text-neutral-200 whitespace-nowrap">
                          {r.workflowLabel}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {r.ok ? (
                            <span className="text-venom-300">
                              {r.status ?? "ok"}
                            </span>
                          ) : (
                            <span className="text-blood-400">fail</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {execHref ? (
                            <a
                              href={execHref}
                              target="_blank"
                              rel="noreferrer"
                              className="text-venom-300 hover:text-venom-200 underline-offset-4 hover:underline"
                            >
                              {r.executionId!.slice(0, 10)}…
                            </a>
                          ) : (
                            <span className="text-blood-400 text-[0.65rem]">
                              {r.error ?? "no execution"}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-neutral-400 max-w-[260px] truncate">
                          {summarise(r.inputSummary)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500 font-mono leading-relaxed">
            agent-side log of every KH call HYDRA has made via MCP HTTP
            (logs/keeperhub-runs.jsonl). Cross-verify by clicking an execution
            id; the KH dashboard is per-org permissioned.
          </p>
        </div>
      ) : error ? (
        <Placeholder note={`fetch failed: ${error}`} />
      ) : (
        <Placeholder note="reading from logs/keeperhub-runs.jsonl…" />
      )}
    </EvidenceCard>
  );
}

function summarise(input: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(input)) {
    if (k === "kind") continue;
    parts.push(`${k}=${typeof v === "string" ? v.slice(0, 16) : JSON.stringify(v)}`);
    if (parts.length >= 3) break;
  }
  return parts.join(" · ") || "—";
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
      title="Head state (KV mirror)"
      source={{
        href: "https://docs.0g.ai",
        text: "0g docs",
      }}
    >
      <p
        className="text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500 font-mono mb-3 leading-relaxed"
        title="Locally mirrored from 0G Storage SDK writes. Scars persist directly on 0G Storage via uploadJsonToOG — see Section 1 for storage tx hashes."
      >
        Locally mirrored. Scars upload directly to 0G Storage via
        uploadJsonToOG (see Section 1 for tx hashes). Live KV-on-0G
        migration scheduled D7.
      </p>
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
            <div className="text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500 font-mono pt-2 leading-relaxed">
              {snap.count} alive · refreshed {timeAgo(snap.refreshedAt)} ·
              live KV-on-0G migration scheduled D7
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

interface CommitSummary {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  date: string;
  htmlUrl: string;
}

interface CommitsSnapshot {
  refreshedAt: number;
  repo: string;
  totalCommits: number | null;
  recent: CommitSummary[];
}

const QUICK_LINKS: Array<{ label: string; path: string; live: boolean }> = [
  { label: "KEEPERHUB_FEEDBACK.md", path: "KEEPERHUB_FEEDBACK.md", live: true },
  { label: "docs/ADVERSARIAL_TESTING.md", path: "docs/ADVERSARIAL_TESTING.md", live: true },
  { label: "AI_USAGE.md", path: "AI_USAGE.md", live: true },
  { label: "SPONSORS.md", path: "SPONSORS.md", live: true },
  { label: "docs/AXL_PROTOCOL.md (D7)", path: "docs/AXL_PROTOCOL.md", live: false },
];

function RepositoryCard() {
  const [snap, setSnap] = useState<CommitsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const r = await fetch("/api/github-commits", { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const data = (await r.json()) as CommitsSnapshot;
        if (!cancelled) {
          setSnap(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    void fetchOnce();
    const i = setInterval(() => void fetchOnce(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  return (
    <EvidenceCard
      label="Codex vi · Provenance"
      title="Repository & build"
      source={{ href: "https://github.com/Mithran-MV/Hydra", text: "github" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-neutral-400">
          repo:{" "}
          <a
            href={`https://github.com/${snap?.repo ?? "Mithran-MV/Hydra"}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-venom-300 hover:text-venom-200 underline-offset-4 hover:underline"
          >
            {snap?.repo ?? "Mithran-MV/Hydra"}
          </a>
        </div>
        <div className="text-[0.65rem] tracking-[0.2em] uppercase text-neutral-500 font-mono">
          {snap?.totalCommits != null
            ? `${snap.totalCommits} commits`
            : "loading…"}
        </div>
      </div>

      {snap ? (
        snap.recent.length === 0 ? (
          <Placeholder note="GitHub API returned no commits — rate-limited?" />
        ) : (
          <div className="rounded border border-ink-700/60 bg-ink-950/40 divide-y divide-ink-800/60">
            {snap.recent.map((c) => (
              <a
                key={c.sha}
                href={c.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-2 text-xs hover:bg-ink-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-venom-300">{c.shortSha}</span>
                  <span className="font-mono text-[0.65rem] text-neutral-500 whitespace-nowrap">
                    {new Date(c.date).toISOString().slice(0, 10)}
                  </span>
                  <span className="text-neutral-300 truncate">{c.subject}</span>
                </div>
              </a>
            ))}
          </div>
        )
      ) : error ? (
        <Placeholder note={`fetch failed: ${error}`} />
      ) : (
        <Placeholder note="reading from api.github.com…" />
      )}

      <div className="mt-4">
        <div className="text-[0.6rem] tracking-[0.3em] uppercase text-neutral-500 font-mono mb-2">
          Qualification documents
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((q) => (
            <a
              key={q.path}
              href={
                q.live
                  ? `https://github.com/Mithran-MV/Hydra/blob/main/${q.path}`
                  : `https://github.com/Mithran-MV/Hydra/blob/main/${q.path}`
              }
              target="_blank"
              rel="noreferrer"
              className={`px-2 py-1 rounded font-mono text-[0.65rem] tracking-[0.15em] uppercase border transition-colors ${
                q.live
                  ? "border-ink-700 text-neutral-400 hover:border-venom-400 hover:text-venom-300"
                  : "border-ink-700/60 text-neutral-600 hover:text-neutral-400"
              }`}
            >
              {q.label}
            </a>
          ))}
        </div>
      </div>
    </EvidenceCard>
  );
}
