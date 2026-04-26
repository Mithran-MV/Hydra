"use client";

export function Marquee() {
  const items = [
    "CUT OFF ONE HEAD",
    "TWO GROW BACK",
    "MEMORY INHERITED",
    "SCAR LEARNED",
    "SWARM STRONGER",
    "KeeperHub × AXL × 0G",
  ];
  const loop = [...items, ...items, ...items];
  return (
    <div className="relative py-6 border-y border-venom-500/20 bg-ink-950 overflow-hidden">
      <div className="marquee">
        <div className="marquee-track">
          {loop.map((it, i) => (
            <div
              key={i}
              className="flex items-center gap-6 font-display tracking-[0.35em] text-xl md:text-2xl text-neutral-300 whitespace-nowrap"
            >
              <span>{it}</span>
              <span className="text-venom-400">✦</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
