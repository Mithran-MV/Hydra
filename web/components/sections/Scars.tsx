"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type ScarCard = {
  id: string;
  cause: string;
  trigger: string;
  check: string;
  mitigation: string;
  gen: number;
  learnedFrom: string;
};

const scars: ScarCard[] = [
  {
    id: "scar-i",
    cause: "key_revoked",
    trigger: "signer returns 403 on submit",
    check: "verify signer whitelist every 60s",
    mitigation: "rotate-to-backup-signer",
    gen: 0,
    learnedFrom: "head.02",
  },
  {
    id: "scar-ii",
    cause: "process_killed",
    trigger: "heartbeat missed for 15s (no SIGTERM)",
    check: "snapshot state on every heartbeat",
    mitigation: "checkpoint-state-every-heartbeat",
    gen: 1,
    learnedFrom: "head.05",
  },
  {
    id: "scar-iii",
    cause: "api_timeout",
    trigger: "RPC call exceeds 2 sequential timeouts",
    check: "two-level RPC healthcheck on send",
    mitigation: "fallback-rpc-on-2-failures",
    gen: 2,
    learnedFrom: "head.07",
  },
  {
    id: "scar-iv",
    cause: "wallet_drained",
    trigger: "tx value exceeds balance threshold",
    check: "pre-sign tx inspector ≥ threshold",
    mitigation: "tx-value-cap + multi-sig-above-threshold",
    gen: 3,
    learnedFrom: "head.09",
  },
];

export function Scars() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".scar-card").forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          y: 60,
          rotate: i % 2 === 0 ? -2 : 2,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
          delay: i * 0.08,
        });
      });
      gsap.from(".scars-title", {
        opacity: 0,
        y: 40,
        duration: 1,
        scrollTrigger: {
          trigger: ".scars-title",
          start: "top 85%",
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="scars"
      ref={rootRef}
      className="relative py-32 md:py-48 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900/60 to-ink-950 pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="scars-title text-center mb-16">
          <div className="section-label mb-5 justify-center inline-flex">
            Codex IV · The Scars
          </div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
            <span className="text-neutral-100">Every death</span>{" "}
            <span className="text-gradient-blood italic">teaches.</span>
            <br />
            <span className="text-gradient-venom">Every scar</span>{" "}
            <span className="text-neutral-100">endures.</span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-neutral-400 leading-relaxed">
            A scar is a defense rule — written to 0G Storage under{" "}
            <span className="font-mono text-venom-300">scars/global</span>.
            Every living head — and every head yet unborn — inherits them all.
            The swarm does not forget.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {scars.map((s, i) => (
            <div
              key={s.id}
              className="scar-card group relative rounded-lg border border-white/10 bg-ink-900/50 p-6 backdrop-blur overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background:
                    "radial-gradient(300px at 50% 0%, rgba(255,45,85,0.14), transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-neutral-500">
                    Scar · {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[0.62rem] tracking-[0.3em] uppercase text-venom-300/70">
                    Gen {s.gen}
                  </span>
                </div>

                <div className="font-display text-xl text-blood-500 leading-tight mb-1">
                  {s.cause.replace(/_/g, " ")}
                </div>
                <div className="font-mono text-[0.68rem] text-neutral-500">
                  learned.from.{s.learnedFrom}
                </div>

                <div className="mt-5 space-y-3 text-[0.82rem]">
                  <KV k="trigger" v={s.trigger} accent="blood" />
                  <KV k="check" v={s.check} accent="ember" />
                  <KV k="mitigation" v={s.mitigation} accent="venom" />
                </div>

                <div className="mt-5 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <div className="mt-3 flex items-center justify-between text-[0.6rem] font-mono tracking-[0.25em] uppercase text-neutral-500">
                  <span>inherited · ∀ heads</span>
                  <span className="text-venom-300/70">immutable</span>
                </div>
              </div>

              {/* corner runes */}
              <span className="absolute top-2 left-2 text-blood-500/40 font-mono text-[0.55rem]">
                ▞
              </span>
              <span className="absolute bottom-2 right-2 text-venom-400/40 font-mono text-[0.55rem]">
                ▚
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function KV({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent: "blood" | "ember" | "venom";
}) {
  const color =
    accent === "blood"
      ? "text-blood-500"
      : accent === "ember"
        ? "text-ember-400"
        : "text-venom-300";
  return (
    <div>
      <div
        className={`font-mono text-[0.58rem] tracking-[0.3em] uppercase ${color}`}
      >
        {k}
      </div>
      <div className="font-mono text-[0.8rem] text-neutral-200 mt-0.5 leading-snug">
        {v}
      </div>
    </div>
  );
}
