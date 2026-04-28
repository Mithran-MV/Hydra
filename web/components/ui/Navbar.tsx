"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-xl bg-ink-950/70 border-b border-venom-500/10"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 3 L5 9 L5 20 L16 29 L27 20 L27 9 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-venom-400 drop-shadow-[0_0_6px_#37ff9e]"
            />
            <path
              d="M16 9 L10 12 L10 19 L16 23 L22 19 L22 12 Z"
              stroke="currentColor"
              strokeWidth="1"
              className="text-venom-300 opacity-70"
            />
          </svg>
          <span className="font-display text-[1.05rem] tracking-[0.4em] text-ink-50 group-hover:text-venom-300 transition-colors">
            HYDRA
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-mono text-[0.72rem] tracking-[0.25em] uppercase text-neutral-400">
          <a href="#fragile" className="hover:text-venom-300 transition-colors">
            The Fragile
          </a>
          <a href="#ritual" className="hover:text-venom-300 transition-colors">
            The Ritual
          </a>
          <a href="#pillars" className="hover:text-venom-300 transition-colors">
            Pillars
          </a>
          <a href="#scars" className="hover:text-venom-300 transition-colors">
            Scars
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="mythic-btn-ghost !py-2 !px-4 !text-[0.68rem]"
          >
            Live Swarm
          </Link>
          <Link
            href="/chronicle"
            className="mythic-btn !py-2 !px-4 !text-[0.68rem]"
            aria-label="Read the Chronicle — HYDRA's complete run record"
          >
            Chronicle
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
