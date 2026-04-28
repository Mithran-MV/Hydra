"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mockSnapshot } from "@/lib/mock-swarm";
import { SwarmGraph } from "@/components/dashboard/SwarmGraph";
import { TEEBadge } from "@/components/dashboard/TEEBadge";
import { KeeperHubRunCard } from "@/components/dashboard/KeeperHubRunCard";
import type { HeadState, Scar, SwarmSnapshot } from "@shared/types";

const STRATEGY_LABEL: Record<string, string> = {
  aave_deposit: "Aave deposit",
  univ4_lp: "UniV4 LP",
  payroll: "Payroll",
};

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<SwarmSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const attachSSE = () => {
      try {
        const source = new EventSource("/api/events");
        source.onmessage = (e) => {
          try {
            if (!cancelled) setSnapshot(JSON.parse(e.data));
          } catch {}
        };
        source.onerror = () => {
          source.close();
          if (!cancelled) setSnapshot(mockSnapshot());
        };
        return source;
      } catch {
        if (!cancelled) setSnapshot(mockSnapshot());
        return null;
      }
    };
    const source = attachSSE();
    const fallback = setTimeout(() => {
      if (!cancelled && !snapshot) setSnapshot(mockSnapshot());
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      source?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!snapshot) {
    return (
      <main className="flex h-screen items-center justify-center bg-ink-950 text-ink-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-2 w-40 overflow-hidden rounded-full bg-ink-800">
            <div className="h-full w-1/2 bg-venom-500 animate-pulse" />
          </div>
          <p className="font-mono text-sm text-neutral-500">
            connecting to swarm…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink-950 text-ink-50 p-6 grid grid-rows-[auto_auto_auto_1fr_auto] gap-6">
      <nav className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/"
          className="font-display text-sm tracking-[0.4em] text-venom-400 hover:text-venom-300 transition-colors"
        >
          ← HYDRA
        </Link>
        <div className="flex items-center gap-6 font-mono text-[0.7rem] tracking-[0.25em] uppercase">
          <Link
            href="/chronicle"
            className="text-neutral-400 hover:text-venom-300 transition-colors"
          >
            Chronicle
          </Link>
          <span className="text-venom-300 border-b border-venom-400/60 pb-0.5">
            Dashboard
          </span>
        </div>
        <div className="font-mono text-xs text-neutral-500">
          swarm.live · 0G galileo testnet
        </div>
      </nav>

      <header className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
        <Stat label="Generation" value={snapshot.generation.toString()} />
        <Stat label="Heads alive" value={snapshot.heads.length.toString()} />
        <Stat label="Scars learned" value={snapshot.scars.length.toString()} />
        <Stat
          label="Attacks survived"
          value={snapshot.attacksSurvived.toString()}
        />
        <Stat label="AUM" value={shortenWei(snapshot.aum)} />
        <Stat
          label="Value protected"
          value={shortenWei(snapshot.valueProtectedWei ?? "0")}
        />
      </header>

      <section>
        <SectionHeader>Active heads</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {snapshot.heads.length === 0 ? (
            <div className="text-neutral-600 text-sm font-mono col-span-full">
              No active heads. Boot the swarm: <code>npm run dev:agents</code>
            </div>
          ) : (
            snapshot.heads.map((h) => <HeadCard key={h.id} head={h} />)
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-xl border border-ink-700 bg-ink-900/50 relative overflow-hidden min-h-[420px]">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="relative w-full h-[420px]">
            <SwarmGraph
              heads={snapshot.heads}
              scarsCount={snapshot.scars.length}
            />
          </div>
        </div>
        <div className="grid grid-rows-2 gap-4">
          <TEEBadge inference={snapshot.inference} />
          <KeeperHubRunCard run={snapshot.keeperhub} />
        </div>
      </section>

      <footer className="rounded-xl border border-ink-700 bg-ink-900/50 p-4 overflow-x-auto">
        <SectionHeader inline>Scars learned</SectionHeader>
        {snapshot.scars.length === 0 ? (
          <div className="text-neutral-600 text-sm font-mono mt-2">
            No scars yet. Attack the swarm: <code>./demo/kill.sh 2 --cause key_revoked</code>
          </div>
        ) : (
          <div className="flex gap-3 pb-1 mt-3">
            {snapshot.scars.map((scar) => (
              <ScarCard key={scar.id} scar={scar} />
            ))}
          </div>
        )}
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-4">
      <div className="text-xs uppercase tracking-widest text-neutral-500">
        {label}
      </div>
      <div className="text-2xl font-display mt-1 tabular-nums text-venom-300">
        {value}
      </div>
    </div>
  );
}

function HeadCard({ head }: { head: HeadState }) {
  const colorByStatus: Record<string, string> = {
    healthy: "bg-venom-400",
    booting: "bg-neutral-400",
    suspected: "bg-ember-400",
    resurrecting: "bg-blue-400",
    newborn: "bg-purple-400",
    dead: "bg-blood-500",
  };
  const dot = colorByStatus[head.status] ?? "bg-neutral-500";
  const isYoung = head.generation > 0 && Date.now() - head.bornAt < 30_000;
  const isDying = head.status === "suspected" || head.status === "dead";
  return (
    <div
      className={[
        "rounded-xl border border-ink-700 bg-ink-900/50 p-4 font-mono text-xs",
        isYoung ? "head-spawn" : "",
        isDying ? "death-pulse" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dot} animate-pulse`} />
          <span className="text-neutral-400 uppercase tracking-widest">
            {head.status}
          </span>
        </div>
        <span className="text-neutral-600">gen {head.generation}</span>
      </div>
      <div className="text-venom-300 truncate">
        {head.id.slice(0, 16)}…
      </div>
      <div className="text-neutral-500 mt-1">
        {STRATEGY_LABEL[head.strategy] ?? head.strategy}
      </div>
      <div className="text-neutral-600 mt-2 truncate">
        wallet {head.wallet.slice(0, 10)}…{head.wallet.slice(-4)}
      </div>
      {head.parent && (
        <div className="text-blood-400 mt-1 truncate text-[0.65rem]">
          ↳ inherited from {head.parent.slice(0, 10)}…
        </div>
      )}
      {head.deathCause && (
        <div className="text-blood-500 mt-1 text-[0.65rem]">
          cause: {head.deathCause}
        </div>
      )}
    </div>
  );
}

function ScarCard({ scar }: { scar: Scar }) {
  const isFresh = Date.now() - scar.learnedAt < 30_000;
  return (
    <div
      className={`min-w-[260px] rounded-lg border border-blood-700/60 bg-blood-800/10 p-3 ${isFresh ? "scar-reveal" : ""}`}
    >
      <div className="text-xs text-neutral-500">Gen {scar.generation}</div>
      <div className="font-mono text-sm text-blood-400">{scar.cause}</div>
      <div className="text-xs text-neutral-300 mt-2 leading-relaxed">
        {scar.rule.mitigation}
      </div>
      <div className="text-[0.65rem] text-neutral-600 mt-2">
        learned from {scar.learnedFrom.slice(0, 10)}…
      </div>
    </div>
  );
}

function SectionHeader({
  children,
  inline,
}: {
  children: React.ReactNode;
  inline?: boolean;
}) {
  const cls = inline
    ? "text-xs uppercase tracking-widest text-neutral-500"
    : "text-xs uppercase tracking-widest text-neutral-500 mb-3";
  return <div className={cls}>{children}</div>;
}

function shortenWei(wei: string): string {
  const n = Number(wei) / 1e18;
  if (n === 0) return "$0";
  if (n < 0.001) return `${n.toExponential(2)} OG`;
  return `${n.toFixed(4)} OG`;
}
