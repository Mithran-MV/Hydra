"use client";

import type { KeeperHubRun } from "@shared/types";

interface Props {
  run: KeeperHubRun | null;
}

export function KeeperHubRunCard({ run }: Props) {
  if (!run) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-4 font-mono text-xs">
        <div className="text-xs uppercase tracking-widest text-neutral-500">
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
      className={`rounded-xl border p-4 font-mono text-xs ${
        ok
          ? "border-venom-700/60 bg-venom-800/10"
          : "border-blood-700/60 bg-blood-800/10"
      }`}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-widest">
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
