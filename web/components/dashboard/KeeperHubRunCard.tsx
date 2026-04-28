"use client";

import type { KeeperHubRun } from "@shared/types";

interface Props {
  run: KeeperHubRun | null;
}

export function KeeperHubRunCard({ run }: Props) {
  if (!run) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-4 font-mono text-xs transition-all duration-200 hover:border-venom-500/60 hover:shadow-[0_0_24px_-4px_rgba(55,255,158,0.25)]">
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-neutral-500">
          KeeperHub · last run
        </div>
        <div className="mt-2 text-neutral-600">
          no webhook fired yet — leader posts on confirmed-death
        </div>
      </div>
    );
  }
  const ok = run.ok;
  return (
    <div
      className={`rounded-xl border p-4 font-mono text-xs transition-all duration-200 hover:shadow-[0_0_24px_-4px_rgba(55,255,158,0.35)] ${
        ok
          ? "border-venom-700/60 bg-venom-800/10"
          : "border-blood-700/60 bg-blood-800/10"
      }`}
    >
      <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em]">
        <span className="text-neutral-500">KeeperHub · last run</span>
        <span className={ok ? "text-venom-400" : "text-blood-400"}>
          {ok ? "✓ delivered" : `✗ ${run.status}`}
        </span>
      </div>
      <div className="mt-2 text-neutral-300">
        cause: <span className="text-blood-400">{run.cause}</span>
      </div>
      {run.runId && (
        <div className="mt-1 text-neutral-600 truncate">
          runId: {run.runId.slice(0, 24)}…
        </div>
      )}
      {!ok && run.status === 401 && (
        <div className="mt-2 text-[0.65rem] text-ember-400 leading-snug">
          (webhook auth gap — see KEEPERHUB_FEEDBACK.md; workflow still executes via MCP)
        </div>
      )}
    </div>
  );
}
