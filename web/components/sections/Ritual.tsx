"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DeferredHydraScene } from "@/components/three/DeferredScene";

const acts = [
  {
    num: "I",
    title: "HEARTBEAT",
    caption: "Three heads. Three wallets. Three strategies. AXL mesh alive.",
    sub: "heartbeat.3s · gen.0 · status.healthy",
    alive: 3,
    scars: 0,
    tint: "venom",
  },
  {
    num: "II",
    title: "FIRST BLOOD",
    caption: "Head 2 falls — key revoked. The mesh reaches consensus.",
    sub: "suspect → confirmed_dead → leader.elected",
    alive: 2,
    scars: 0,
    tint: "blood",
  },
  {
    num: "III",
    title: "INHERITANCE",
    caption: "0G Storage returns the dead head's memory. Its state is not lost.",
    sub: "og.storage.read · kv://head-2/state",
    alive: 2,
    scars: 0,
    tint: "ember",
  },
  {
    num: "IV",
    title: "RESURRECTION",
    caption:
      "Two children spawn on 0G Compute. KeeperHub atomically redistributes the dead position.",
    sub: "og.compute.spawn ×2 · keeperhub.emergency.redistribute",
    alive: 4,
    scars: 0,
    tint: "venom",
  },
  {
    num: "V",
    title: "SCAR",
    caption:
      'A defense rule is written to the swarm\'s soul: "rotate keys every 60 seconds, use backup signer." Every head, born or living, inherits it.',
    sub: "scar.broadcast · 0g.kv://scars/global",
    alive: 4,
    scars: 1,
    tint: "ember",
  },
  {
    num: "VI",
    title: "STRONGER",
    caption:
      "Four heads. One scar. The next attacker hits a wall that did not exist yesterday. The swarm has learned.",
    sub: "gen.1 · antifragility.coefficient = +∞",
    alive: 5,
    scars: 1,
    tint: "venom",
  },
] as const;

export function Ritual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const aliveRef = useRef<HTMLSpanElement>(null);
  const scarsRef = useRef<HTMLSpanElement>(null);
  const genRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!rootRef.current || !stageRef.current) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>(".ritual-panel");
      const steps = panels.length;

      const scrollDist = window.innerHeight * 3.6; // matches spacer height

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: `+=${scrollDist}`,
          pin: stageRef.current,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      panels.forEach((panel, i) => {
        if (i > 0) {
          tl.fromTo(
            panel,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 0.6 },
            i
          );
        }
        if (i < panels.length - 1) {
          tl.to(
            panel,
            {
              opacity: 0,
              y: -40,
              duration: 0.4,
            },
            i + 0.6
          );
        }
      });

      // HUD updates per panel
      panels.forEach((panel, i) => {
        ScrollTrigger.create({
          trigger: rootRef.current,
          start: `${(i / steps) * 100}% top`,
          end: `${((i + 0.99) / steps) * 100}% top`,
          onEnter: () => setActive(i),
          onEnterBack: () => setActive(i),
        });
      });

      const setActive = (i: number) => {
        const act = acts[i];
        if (aliveRef.current) aliveRef.current.textContent = `${act.alive}`;
        if (scarsRef.current) scarsRef.current.textContent = `${act.scars}`;
        if (genRef.current)
          genRef.current.textContent = `${Math.floor(i / 3)}`;
        // update scene driver
        window.dispatchEvent(
          new CustomEvent("ritual:act", { detail: { alive: act.alive, scars: act.scars } })
        );
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="ritual" ref={rootRef} className="relative bg-ink-950">
      <div
        ref={stageRef}
        className="relative h-[100svh] w-full overflow-hidden vignette"
      >
        <div className="absolute inset-0">
          <RitualScene />
        </div>

        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute inset-0 scanlines pointer-events-none" />

        {/* Top HUD */}
        <div className="absolute top-0 left-0 right-0 z-20 p-6 md:p-10 flex items-center justify-between text-[0.68rem] font-mono tracking-[0.3em] uppercase">
          <div className="flex items-center gap-6 text-neutral-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-venom-400 animate-pulse" />
              REC · 01
            </span>
            <span className="hidden md:inline">protocol · hydra · gen</span>
            <span ref={genRef} className="text-venom-300">
              0
            </span>
          </div>
          <div className="font-display tracking-[0.4em] text-venom-300/90 text-sm">
            THE DEATH RITUAL
          </div>
          <div className="flex items-center gap-6 text-neutral-400">
            <span>
              alive.<span ref={aliveRef} className="text-venom-300">3</span>
            </span>
            <span>
              scars.<span ref={scarsRef} className="text-ember-400">0</span>
            </span>
          </div>
        </div>

        {/* Corner brackets */}
        <Bracket className="top-20 left-6 md:left-10" />
        <Bracket className="top-20 right-6 md:right-10" flip />
        <Bracket className="bottom-20 left-6 md:left-10" rot />
        <Bracket className="bottom-20 right-6 md:right-10" rot flip />

        {/* Panels */}
        <div className="absolute inset-0 z-10 flex items-end md:items-center">
          <div className="w-full px-6 md:px-10 pb-24 md:pb-0 md:pl-[8%]">
            <div className="relative max-w-2xl">
              {acts.map((a, i) => (
                <div
                  key={i}
                  className={`ritual-panel ${i === 0 ? "" : "absolute inset-0"} will-change-transform`}
                >
                  <div
                    className={`section-label mb-4 ${
                      a.tint === "blood"
                        ? "text-blood-500"
                        : a.tint === "ember"
                          ? "text-ember-400"
                          : "text-venom-300"
                    }`}
                  >
                    <span>ACT {a.num}</span>
                  </div>
                  <h3
                    className={`font-display text-[12vw] md:text-[5.8rem] leading-[0.92] tracking-tight ${
                      a.tint === "blood"
                        ? "text-gradient-blood"
                        : a.tint === "ember"
                          ? "text-ember-400"
                          : "text-gradient-venom"
                    }`}
                  >
                    {a.title}
                  </h3>
                  <p className="mt-5 text-lg md:text-xl text-neutral-300 max-w-xl leading-relaxed">
                    {a.caption}
                  </p>
                  <p className="mt-3 font-mono text-[0.72rem] tracking-widest uppercase text-neutral-500">
                    {a.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
          {acts.map((a, i) => (
            <div key={i} className="flex items-center gap-3 justify-end">
              <span className="font-mono text-[0.6rem] tracking-[0.3em] text-neutral-500 hidden md:inline">
                {a.num.padStart(2, "0")}
              </span>
              <span
                className={`h-[2px] transition-all duration-500 ${
                  a.tint === "blood"
                    ? "bg-blood-500"
                    : a.tint === "ember"
                      ? "bg-ember-400"
                      : "bg-venom-400"
                }`}
                style={{ width: 18 + i * 2 }}
              />
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

function RitualScene() {
  const aliveRef = useRef(3);
  const scarsRef = useRef(0);

  useEffect(() => {
    const onAct = (e: Event) => {
      const detail = (e as CustomEvent<{ alive: number; scars: number }>).detail;
      aliveRef.current = detail.alive;
      scarsRef.current = detail.scars;
    };
    window.addEventListener("ritual:act", onAct);
    return () => window.removeEventListener("ritual:act", onAct);
  }, []);

  return <RitualSceneClient aliveRef={aliveRef} scarsRef={scarsRef} />;
}

function RitualSceneClient({
  aliveRef,
  scarsRef,
}: {
  aliveRef: React.MutableRefObject<number>;
  scarsRef: React.MutableRefObject<number>;
}) {
  // trigger re-render on act changes
  const [, setTick] = useTick();
  useEffect(() => {
    const onAct = () => setTick((t) => t + 1);
    window.addEventListener("ritual:act", onAct);
    return () => window.removeEventListener("ritual:act", onAct);
  }, [setTick]);

  return (
    <DeferredHydraScene
      aliveCount={aliveRef.current}
      scarCount={scarsRef.current}
      interactive={false}
      quality="low"
    />
  );
}

function useTick() {
  return useState(0);
}

function Bracket({
  className = "",
  flip,
  rot,
}: {
  className?: string;
  flip?: boolean;
  rot?: boolean;
}) {
  return (
    <svg
      className={`absolute w-12 h-12 text-venom-400/50 z-10 pointer-events-none ${className}`}
      viewBox="0 0 48 48"
      style={{
        transform: `${flip ? "scaleX(-1)" : ""} ${rot ? "scaleY(-1)" : ""}`,
      }}
    >
      <path
        d="M2 14V2h12M2 4h6M4 2v6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
