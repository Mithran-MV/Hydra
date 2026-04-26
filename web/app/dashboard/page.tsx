"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mockSnapshot } from "@/lib/mock-swarm";
import type { SwarmSnapshot } from "@shared/types";

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
    <main className="min-h-screen bg-ink-950 text-ink-50 p-6 grid grid-rows-[auto_auto_1fr_auto] gap-6">
      <nav className="flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-sm tracking-[0.4em] text-venom-400 hover:text-venom-300 transition-colors"
        >
          ← HYDRA
        </Link>
        <div className="font-mono text-xs text-neutral-500">
          swarm.live · testnet
        </div>
      </nav>

      <header className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <Stat label="Generation" value={snapshot.generation.toString()} />
        <Stat label="Heads" value={snapshot.heads.length.toString()} />
        <Stat label="Scars learned" value={snapshot.scars.length.toString()} />
        <Stat
          label="Attacks survived"
          value={snapshot.attacksSurvived.toString()}
        />
        <Stat label="AUM" value={`$${snapshot.aum}`} />
      </header>

      <section className="rounded-xl border border-ink-700 bg-ink-900/50 flex items-center justify-center min-h-[420px] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="relative text-neutral-500 font-mono text-sm">
          [HydraGraph D3 force-directed mesh — wired in Day 10]
        </div>
      </section>

      <footer className="rounded-xl border border-ink-700 bg-ink-900/50 p-4 overflow-x-auto">
        <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
          Scars learned
        </div>
        {snapshot.scars.length === 0 ? (
          <div className="text-neutral-600 text-sm">
            No scars yet. Attack the swarm.
          </div>
        ) : (
          <div className="flex gap-3 pb-1">
            {snapshot.scars.map((scar) => (
              <div
                key={scar.id}
                className="min-w-[240px] rounded-lg border border-blood-700/60 bg-blood-800/10 p-3"
              >
                <div className="text-xs text-neutral-500">
                  Gen {scar.generation}
                </div>
                <div className="font-mono text-sm text-blood-500">
                  {scar.cause}
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  {scar.rule.mitigation}
                </div>
              </div>
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
