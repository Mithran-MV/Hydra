"use client";

import Link from "next/link";

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
  return (
    <EvidenceCard
      label="Codex i · On-chain"
      title="Contracts on 0G Galileo (chain 16602)"
      source={{
        href: "https://chainscan-galileo.0g.ai",
        text: "chainscan-galileo",
      }}
    >
      <Placeholder note="instrumenting on next deploy: live totalSupply + balance via viem" />
    </EvidenceCard>
  );
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
      <Placeholder note="instrumenting on next attack — table will land in section commit" />
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
