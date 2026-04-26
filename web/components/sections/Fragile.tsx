"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function Fragile() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      // Shatter the "single agent" on scroll
      gsap.utils.toArray<HTMLElement>(".shard").forEach((shard, i) => {
        gsap.to(shard, {
          x: (Math.random() - 0.5) * 800,
          y: (Math.random() - 0.5) * 400,
          rotation: (Math.random() - 0.5) * 720,
          opacity: 0,
          ease: "power2.in",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top center",
            end: "bottom top",
            scrub: 1.2,
          },
        });
      });

      // Reveal text
      gsap.from(".fragile-headline", {
        opacity: 0,
        y: 60,
        duration: 1,
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top 80%",
          end: "top 30%",
          scrub: 0.6,
        },
      });

      // Counter
      gsap.utils.toArray<HTMLElement>(".counter").forEach((el) => {
        const target = Number(el.getAttribute("data-target") ?? "0");
        gsap.fromTo(
          el,
          { innerText: 0 },
          {
            innerText: target,
            duration: 2,
            snap: { innerText: 1 },
            scrollTrigger: { trigger: el, start: "top 80%" },
            onUpdate: () => {
              el.innerText = Math.round(Number(el.innerText)).toLocaleString();
            },
          }
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="fragile"
      ref={rootRef}
      className="relative py-32 md:py-48 overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-6 md:px-10 grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-5">
          <div className="section-label mb-6">Codex II · The Fragile World</div>
          <h2 className="fragile-headline font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
            <span className="text-outline">Every agent</span>
            <br />
            <span className="text-blood-500 drop-shadow-[0_0_30px_rgba(255,45,85,0.45)]">
              is one
            </span>{" "}
            <span className="text-neutral-100">death</span>
            <br />
            <span className="text-neutral-100">from </span>
            <span className="text-gradient-blood italic">ruin.</span>
          </h2>
          <p className="mt-8 max-w-lg text-neutral-400 text-lg leading-relaxed">
            A single compromised key. A revoked API. A crashed node. Today's
            agent systems collapse the moment one piece fails. Positions
            liquidated. Trades abandoned. Capital lost.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            <FragileStat target={1} label="Key leaks" />
            <FragileStat target={100} label="% loss" suffix="%" />
            <FragileStat target={0} label="Recovery" />
          </div>
        </div>

        <div className="md:col-span-7 relative h-[560px] flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full relative">
              {/* central brittle agent */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px]">
                <div className="absolute inset-0 rounded-full border border-blood-500/40 animate-breathe" />
                <div className="absolute inset-8 rounded-full border border-blood-500/60" />
                <div className="absolute inset-16 rounded-full border border-blood-500/70 glow-blood" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="font-mono text-[0.65rem] tracking-[0.4em] text-blood-500 uppercase mb-2">
                      Agent · Legacy
                    </div>
                    <div className="font-display text-6xl text-gradient-blood">
                      SPOF
                    </div>
                    <div className="font-mono text-[0.68rem] text-neutral-500 mt-2">
                      single.point.of.failure
                    </div>
                  </div>
                </div>
              </div>

              {/* shards — they scatter on scroll */}
              {[...Array(28)].map((_, i) => {
                const a = (i / 28) * Math.PI * 2;
                const r = 180 + (i % 3) * 22;
                const x = (50 + (Math.cos(a) * r) / 6).toFixed(2);
                const y = (50 + (Math.sin(a) * r) / 6).toFixed(2);
                const size = 14 + (i % 5) * 8;
                const h = (size / 1.5).toFixed(2);
                return (
                  <span
                    key={i}
                    className="shard absolute bg-blood-500/70 mix-blend-screen"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${size}px`,
                      height: `${h}px`,
                      transform: `rotate(${i * 30}deg)`,
                      clipPath:
                        "polygon(20% 0%, 100% 25%, 80% 100%, 0% 75%)",
                      filter: "drop-shadow(0 0 6px rgba(255,45,85,0.8))",
                    }}
                  />
                );
              })}

              {/* Crack lines radiating */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 600 600"
              >
                {[...Array(8)].map((_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  const x2 = 300 + Math.cos(a) * 280;
                  const y2 = 300 + Math.sin(a) * 280;
                  return (
                    <line
                      key={i}
                      x1="300"
                      y1="300"
                      x2={x2}
                      y2={y2}
                      stroke="rgba(255,45,85,0.25)"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                      className="shard"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* corner labels */}
          <div className="absolute top-6 left-6 font-mono text-[0.65rem] tracking-[0.3em] uppercase text-blood-500/70">
            STATE.CORRUPT
          </div>
          <div className="absolute top-6 right-6 font-mono text-[0.65rem] tracking-[0.3em] uppercase text-blood-500/70">
            HEARTBEAT.LOST
          </div>
          <div className="absolute bottom-6 left-6 font-mono text-[0.65rem] tracking-[0.3em] uppercase text-blood-500/70">
            KEY.REVOKED
          </div>
          <div className="absolute bottom-6 right-6 font-mono text-[0.65rem] tracking-[0.3em] uppercase text-blood-500/70">
            POSITION.LIQUIDATED
          </div>
        </div>
      </div>
    </section>
  );
}

function FragileStat({
  target,
  label,
  suffix = "",
}: {
  target: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="font-display text-4xl text-blood-500">
        <span className="counter" data-target={target}>
          {target}
        </span>
        {suffix}
      </div>
      <div className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-neutral-500 mt-1">
        {label}
      </div>
    </div>
  );
}
