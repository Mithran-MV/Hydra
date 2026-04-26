"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Pillar = {
  name: string;
  role: string;
  subtitle: string;
  body: string;
  features: string[];
  colorFrom: string;
  colorTo: string;
  sigil: React.ReactElement;
  accent: "venom" | "blood" | "ember";
};

const pillars: Pillar[] = [
  {
    name: "KeeperHub",
    role: "The Blood",
    subtitle: "Execution Layer",
    body:
      "Every on-chain action — swap, deposit, withdrawal, emergency redistribution — flows through KeeperHub. Transaction simulation previews every resurrection before it touches mainnet. Retries guarantee completion under gas spikes. Private routing hides intent from MEV. A full audit trail documents every death.",
    features: [
      "TX simulation",
      "Retry logic",
      "Private routing",
      "Audit trail",
      "Emergency exec",
      "Scheduled triggers",
    ],
    colorFrom: "#ff2d55",
    colorTo: "#6d0a1c",
    accent: "blood",
    sigil: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M32 10v44M10 32h44M18 18l28 28M46 18L18 46"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.55"
        />
        <circle cx="32" cy="32" r="6" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "Gensyn AXL",
    role: "The Nervous System",
    subtitle: "P2P Mesh",
    body:
      "Each head runs on a separate AXL node. Encrypted heartbeats pulse every 3 seconds. When a head goes silent, the mesh reaches consensus — ≥ ⌊N/2⌋+1 live heads must broadcast suspicion. The lowest live peer-ID elects itself leader and announces resurrection. Scars propagate through the same channels that confirmed the death.",
    features: [
      "ed25519 identity",
      "Heartbeat P2P",
      "Consensus",
      "Leader election",
      "Scar broadcast",
      "Cross-node",
    ],
    colorFrom: "#37ff9e",
    colorTo: "#00391d",
    accent: "venom",
    sigil: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const x = 32 + Math.cos(a) * 22;
          const y = 32 + Math.sin(a) * 22;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="currentColor" />
              {[0, 1, 2, 3, 4, 5].map((j) => {
                if (j <= i) return null;
                const b = (j / 6) * Math.PI * 2 - Math.PI / 2;
                const x2 = 32 + Math.cos(b) * 22;
                const y2 = 32 + Math.sin(b) * 22;
                return (
                  <line
                    key={j}
                    x1={x}
                    y1={y}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="0.7"
                    opacity="0.5"
                  />
                );
              })}
            </g>
          );
        })}
        <circle cx="32" cy="32" r="5" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: "0G",
    role: "The Soul",
    subtitle: "Persistence + Compute",
    body:
      "0G Storage is the memory that survives death. Every head writes state (KV) and history (Log) continuously. On resurrection, children download their parent's last-known state and every scar the swarm has ever learned. 0G Compute runs the children's inference — verifiable, decentralized. Contracts live on 0G Chain.",
    features: [
      "0G Storage · KV",
      "0G Storage · Log",
      "0G Compute",
      "0G Chain · EVM",
      "Scar registry",
      "Memory inheritance",
    ],
    colorFrom: "#ffb347",
    colorTo: "#5a2a00",
    accent: "ember",
    sigil: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <path
          d="M32 4 L6 16 L6 44 L32 60 L58 44 L58 16 Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M32 14 L14 22 L14 40 L32 50 L50 40 L50 22 Z"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.6"
        />
        <circle cx="32" cy="32" r="5" fill="currentColor" />
      </svg>
    ),
  },
];

export function Pillars() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".pillar-card").forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          y: 80,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
          delay: i * 0.08,
        });
      });
      gsap.from(".pillars-head", {
        opacity: 0,
        y: 40,
        duration: 1,
        scrollTrigger: {
          trigger: ".pillars-head",
          start: "top 85%",
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="pillars"
      ref={rootRef}
      className="relative py-32 md:py-48 overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="pillars-head text-center mb-20">
          <div className="section-label mb-5 justify-center inline-flex">
            Codex III · The Trinity
          </div>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
            <span className="text-neutral-100">Three pillars.</span>{" "}
            <span className="text-gradient-venom">One anti-fragile</span>{" "}
            <span className="text-neutral-100">creature.</span>
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-neutral-400 leading-relaxed">
            Each sponsor is load-bearing. Remove one, and HYDRA dies for real.
            Remove{" "}
            <span className="text-venom-300">AXL</span> — and the mesh becomes
            centralized. Remove{" "}
            <span className="text-ember-400">0G</span> — and death means
            amnesia. Remove{" "}
            <span className="text-blood-500">KeeperHub</span> — and the
            resurrection never reaches chain.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {pillars.map((p, i) => (
            <PillarCard key={p.name} p={p} index={i} />
          ))}
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-6 text-center">
          <LoopStep n="1" label="Heartbeat" accent="venom" />
          <LoopStep n="2" label="Death + Scar" accent="blood" />
          <LoopStep n="3" label="Inheritance + Resurrection" accent="ember" />
        </div>
      </div>
    </section>
  );
}

function PillarCard({ p, index }: { p: Pillar; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      el.style.transform = `perspective(1200px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg)`;
      el.style.setProperty("--mx", `${(e.clientX - rect.left).toFixed(0)}px`);
      el.style.setProperty("--my", `${(e.clientY - rect.top).toFixed(0)}px`);
    };
    const onLeave = () => {
      el.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const accentClass =
    p.accent === "venom"
      ? "text-venom-300"
      : p.accent === "blood"
        ? "text-blood-500"
        : "text-ember-400";
  const glowClass =
    p.accent === "venom"
      ? "glow-venom"
      : p.accent === "blood"
        ? "glow-blood"
        : "";

  return (
    <div
      ref={cardRef}
      className="pillar-card relative rounded-xl will-change-transform transition-transform duration-200 ease-out"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        className={`absolute -inset-px rounded-xl opacity-60 blur-2xl pointer-events-none`}
        style={{
          background: `radial-gradient(60% 50% at 50% 0%, ${p.colorFrom}66, transparent)`,
        }}
      />
      <div
        className={`relative rounded-xl border border-white/10 bg-ink-900/60 backdrop-blur overflow-hidden ${glowClass}`}
      >
        {/* spotlight */}
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background:
              "radial-gradient(280px at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.07), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />

        <div className="relative p-7">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-neutral-500">
                Pillar {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className={`font-display text-3xl mt-1 ${accentClass}`}>
                {p.name}
              </h3>
              <div className="font-mono text-[0.75rem] tracking-[0.25em] uppercase text-neutral-400 mt-1">
                {p.role}
              </div>
            </div>
            <div
              className={`w-14 h-14 ${accentClass} drop-shadow-[0_0_12px_currentColor]`}
            >
              {p.sigil}
            </div>
          </div>

          <div className="mb-3 font-mono text-[0.7rem] tracking-[0.3em] uppercase text-neutral-500">
            {p.subtitle}
          </div>
          <p className="text-[0.92rem] leading-relaxed text-neutral-300">
            {p.body}
          </p>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {p.features.map((f) => (
              <span
                key={f}
                className={`inline-flex items-center gap-1 rounded-sm border border-white/10 px-2 py-1 text-[0.65rem] font-mono tracking-wide ${accentClass}/80 bg-black/30`}
              >
                <span className={`h-1 w-1 rounded-full bg-current`} />
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoopStep({
  n,
  label,
  accent,
}: {
  n: string;
  label: string;
  accent: "venom" | "blood" | "ember";
}) {
  const color =
    accent === "venom"
      ? "text-venom-300 border-venom-500/40"
      : accent === "blood"
        ? "text-blood-500 border-blood-500/40"
        : "text-ember-400 border-ember-400/40";
  return (
    <div
      className={`rounded-lg border ${color} bg-ink-900/50 p-6 backdrop-blur-sm`}
    >
      <div className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-neutral-500">
        step {n}
      </div>
      <div className="font-display text-2xl mt-1">{label}</div>
    </div>
  );
}
