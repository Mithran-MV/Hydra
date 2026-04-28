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

function KeeperHubCard() {
  return (
    <EvidenceCard
      label="Codex iii · Audit"
      title="KeeperHub workflow runs"
      source={{ href: "https://app.keeperhub.com", text: "app.keeperhub.com" }}
    >
      <Placeholder note="instrumenting on next attack — agent-side KH call log to land in section commit" />
    </EvidenceCard>
  );
}

function AxlStreamCard() {
  return (
    <EvidenceCard
      label="Codex iv · Mesh"
      title="AXL message stream (live)"
      source={{
        href: "https://github.com/gensyn-ai/axl",
        text: "gensyn-ai/axl",
      }}
    >
      <Placeholder note="instrumenting on next attack — recent AXL recv events to land in section commit" />
    </EvidenceCard>
  );
}

function OgStorageCard() {
  return (
    <EvidenceCard
      label="Codex v · Memory"
      title="0G Storage state per head"
      source={{ href: "https://docs.0g.ai", text: "0g docs" }}
    >
      <Placeholder note="instrumenting on next attack — head-state KV reads to land in section commit" />
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
