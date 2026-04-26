"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DeferredHydraScene } from "@/components/three/DeferredScene";

export function CTA() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".cta-line", {
        opacity: 0,
        y: 80,
        stagger: 0.12,
        duration: 1.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top 75%",
        },
      });
      gsap.from(".cta-btn", {
        opacity: 0,
        y: 20,
        stagger: 0.08,
        duration: 0.8,
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top 70%",
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative min-h-[100svh] w-full overflow-hidden vignette flex items-center"
    >
      <div className="absolute inset-0">
        <DeferredHydraScene
          aliveCount={7}
          scarCount={4}
          interactive={false}
          quality="low"
        />
      </div>

      <div className="absolute inset-0 bg-ink-950/50" />
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute inset-0 scanlines pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 md:px-10 py-32 text-center">
        <div className="cta-line section-label mb-6 inline-flex">
          Codex V · The Verdict
        </div>
        <h2 className="font-display text-[12vw] md:text-[7.5rem] leading-[0.9] tracking-tight">
          <div className="cta-line text-gradient-venom text-shadow-mythic">
            YOU CAN'T KILL
          </div>
          <div className="cta-line text-outline italic">what evolves</div>
          <div className="cta-line text-neutral-100">from pain.</div>
        </h2>

        <p className="cta-line mt-10 max-w-2xl mx-auto text-neutral-300 text-lg leading-relaxed">
          HYDRA is a live anti-fragile agent swarm. Three heads running
          real DeFi strategies on 0G Chain. Cut one off. Watch two grow back —
          smarter. Every attack is a tuition payment. Every death, a lesson.
        </p>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard" className="cta-btn mythic-btn">
            Enter The Swarm
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </Link>
          <a
            href="https://ethglobal.com"
            target="_blank"
            rel="noreferrer"
            className="cta-btn mythic-btn-ghost"
          >
            Read the Codex →
          </a>
        </div>

        <div className="cta-line mt-16 flex items-center justify-center gap-4 font-mono text-[0.7rem] tracking-[0.3em] uppercase text-neutral-500">
          <span>KeeperHub</span>
          <span className="text-venom-400">✦</span>
          <span>Gensyn AXL</span>
          <span className="text-venom-400">✦</span>
          <span>0G</span>
        </div>
      </div>

      {/* bottom footer sliver */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 bg-ink-950/70 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-4 flex flex-wrap items-center justify-between gap-3 text-[0.68rem] font-mono tracking-[0.25em] uppercase text-neutral-500">
          <span>HYDRA · ETH Global Open Agents 2026</span>
          <span>
            MIT license · built solo · <span className="text-venom-300">gen.∞</span>
          </span>
        </div>
      </div>
    </section>
  );
}
