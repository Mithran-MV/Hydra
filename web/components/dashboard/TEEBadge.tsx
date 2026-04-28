"use client";

import type { InferenceTrace } from "@shared/types";

interface Props {
  inference: InferenceTrace | null;
}

export function TEEBadge({ inference }: Props) {
  if (!inference) {
    return (
      <div className="rounded-xl border border-ink-700 bg-ink-900/50 p-4 font-mono text-xs transition-all duration-200 hover:border-venom-500/60 hover:shadow-[0_0_24px_-4px_rgba(55,255,158,0.25)]">
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-neutral-500">
          0G Compute · TEE
        </div>
        <div className="mt-2 text-neutral-600">
          no inference yet — children call broker on resurrection
        </div>
      </div>
    );
  }
  const verified = inference.verified;
  return (
    <div
      className={`rounded-xl border p-4 font-mono text-xs transition-all duration-200 hover:shadow-[0_0_24px_-4px_rgba(55,255,158,0.35)] ${
        verified
          ? "border-venom-700/60 bg-venom-800/10"
          : "border-ember-700/60 bg-ember-800/10"
      }`}
    >
      <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em]">
        <span className="text-neutral-500">0G Compute · TEE</span>
        <span className={verified ? "text-venom-400" : "text-ember-400"}>
          {verified ? "✓ verified" : "○ unverified"}
        </span>
      </div>
      <div className="mt-2 text-neutral-300 leading-relaxed">
        {inference.decision || "(no answer)"}
      </div>
      <div className="mt-2 text-[0.65rem] text-neutral-600 flex flex-wrap gap-2">
        <span>by head {inference.by.slice(0, 10)}…</span>
        <span>· {inference.model}</span>
        <span>· {inference.ms}ms</span>
      </div>
    </div>
  );
}
