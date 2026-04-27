"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DeferredHydraScene } from "@/components/three/DeferredScene";

function MeshIdTag() {
  const [id, setId] = useState<string>("0x000");
  useEffect(() => {
    setId(`0x${Math.floor(Math.random() * 0xfff).toString(16).padStart(3, "0")}`);
  }, []);
  return <span>mesh · alive · {id}</span>;
}

export function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });
      tl.from(".hero-tagline-bar", {
        scaleX: 0,
        duration: 1,
        transformOrigin: "left center",
      })
        .from(
          ".hero-tagline-text span",
          {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.04,
          },
          "-=0.6"
        )
        .from(
          titleRef.current,
          {
            y: 80,
            opacity: 0,
            duration: 1.3,
            ease: "expo.out",
          },
          "-=0.5"
        )
        .from(
          subtitleRef.current,
          {
            y: 20,
            opacity: 0,
            duration: 1,
          },
          "-=0.8"
        )
        .from(
          ".hero-cta",
          {
            y: 20,
            opacity: 0,
            duration: 0.7,
            stagger: 0.1,
          },
          "-=0.6"
        )
        .from(
          ".hero-stat",
          {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.08,
          },
          "-=0.6"
        )
        .from(
          ".hero-scroll-hint",
          { opacity: 0, y: -10, duration: 0.6 },
          "-=0.3"
        );

      // Parallax title + scene on scroll
      gsap.to(titleRef.current, {
        yPercent: -30,
        opacity: 0.1,
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(sceneRef.current, {
        yPercent: 18,
        scale: 1.15,
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const title = "HYDRA";

  return (
    <section
      ref={rootRef}
      className="relative min-h-[100svh] w-full overflow-hidden vignette"
    >
      {/* 3D scene */}
      <div
        ref={sceneRef}
        className="absolute inset-0 z-0 will-change-transform"
      >
        <DeferredHydraScene aliveCount={5} scarCount={1} priority="high" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 z-10 bg-grid opacity-50 pointer-events-none" />

      {/* Scanlines */}
      <div className="absolute inset-0 z-10 pointer-events-none scanlines" />

      {/* Title content */}
      <div className="relative z-20 min-h-[100svh] flex flex-col">
        <div className="flex-1 flex items-center">
          <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10 pt-28 pb-16 grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7">
              <div className="hero-tagline inline-flex items-center gap-3 mb-6">
                <span className="hero-tagline-bar inline-block h-[2px] w-12 bg-venom-400 origin-left" />
                <p className="hero-tagline-text font-mono text-[0.72rem] tracking-[0.35em] uppercase text-venom-300/85">
                  {"Anti-fragile agent swarm".split("").map((ch, i) => (
                    <span
                      key={i}
                      className="inline-block"
                      style={{ whiteSpace: ch === " " ? "pre" : "normal" }}
                    >
                      {ch}
                    </span>
                  ))}
                </p>
              </div>

              <h1
                ref={titleRef}
                className="font-display font-black text-[22vw] md:text-[14vw] leading-[0.88] tracking-[-0.03em] text-shadow-mythic will-change-transform"
              >
                <span className="text-gradient-venom">{title}</span>
              </h1>

              <p
                ref={subtitleRef}
                className="mt-8 max-w-xl text-[1.05rem] md:text-[1.15rem] leading-relaxed text-neutral-300 font-light"
              >
                Production execution + learning layer for autonomous agent
                fleets. Cut off one head,{" "}
                <span className="text-venom-300 font-medium">two grow back</span>
                — inheriting the dead head's full memory plus a{" "}
                <span className="text-blood-500 font-medium">defense rule</span>{" "}
                against whatever killed it. Every attack hardens the network.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <a href="#ritual" className="hero-cta mythic-btn">
                  Witness the Ritual
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5v14m0 0l-6-6m6 6l6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </a>
                <a href="/dashboard" className="hero-cta mythic-btn-ghost">
                  Enter the Swarm →
                </a>
              </div>

              <div
                ref={statsRef}
                className="mt-14 grid grid-cols-2 max-w-md gap-8"
              >
                <HeroStat
                  label="Sponsors"
                  value="3"
                  sub="KeeperHub · AXL · 0G"
                />
                <HeroStat label="Deaths survived" value="∞" sub="by design" />
              </div>
            </div>

            <div className="md:col-span-5 relative hidden md:block">
              {/* right-column runic annotation */}
              <div className="absolute right-0 top-0 rune-border p-6 max-w-sm bg-ink-950/35 backdrop-blur-[2px]">
                <div className="section-label mb-3">Codex I · Legend</div>
                <p className="text-sm leading-relaxed text-neutral-300">
                  "Some systems gain from disorder."
                  <span className="block mt-2 text-[0.72rem] text-neutral-500">
                    — Nassim Taleb, <em>Antifragile</em>
                  </span>
                </p>
                <div className="mt-5 flex items-center gap-2 text-[0.68rem] font-mono text-venom-300/70">
                  <span className="h-1 w-1 rounded-full bg-venom-400 animate-pulse" />
                  <MeshIdTag />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="relative z-20 pb-8">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10 flex items-center justify-between text-[0.7rem] font-mono tracking-[0.25em] uppercase text-neutral-500">
            <span>ETH Global · Open Agents · 2026</span>
            <span className="hero-scroll-hint flex items-center gap-2 text-venom-300/70">
              scroll
              <svg width="10" height="20" viewBox="0 0 10 20" fill="none">
                <path
                  d="M5 1v14m0 0l-4-4m4 4l4-4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </span>
            <span>KeeperHub × AXL × 0G</span>
          </div>
        </div>
      </div>

      {/* bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-ink-950 to-transparent z-10 pointer-events-none" />
    </section>
  );
}

function HeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="hero-stat">
      <div className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-neutral-500">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl text-gradient-venom">{value}</div>
      <div className="text-[0.72rem] text-neutral-500 mt-1">{sub}</div>
    </div>
  );
}
