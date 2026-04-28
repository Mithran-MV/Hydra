"use client";

import { ATTACKS, CHAINSCAN_TX, shortenTx } from "@/lib/attacks";

export function LiveAttacks() {
  return (
    <section
      id="live-attacks"
      className="relative w-full bg-ink-950 border-y border-ink-700/60"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20">
        <div className="section-label mb-6">Codex II · Receipts</div>
        <h2 className="font-display text-4xl md:text-5xl tracking-tight text-neutral-50 mb-3">
          Live attacks captured
        </h2>
        <p className="max-w-2xl text-neutral-400 text-sm md:text-base leading-relaxed mb-8">
          Each row is a real kill against the live deployment. The
          tx hash links to chainscan-galileo so anyone can verify
          the death + scar + iNFT mint independently. The table grows
          by one row per attack through demo day per the cadence in{" "}
          <a
            href="https://github.com/Mithran-MV/Hydra/blob/main/docs/planning/DAILY_ATTACK_CADENCE.md"
            target="_blank"
            rel="noreferrer"
            className="text-venom-300 underline-offset-4 hover:underline"
          >
            DAILY_ATTACK_CADENCE.md
          </a>
          .
        </p>

        <div className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-900/40">
          <table className="w-full text-sm font-mono">
            <thead className="text-left text-[0.7rem] tracking-[0.25em] uppercase text-neutral-500 border-b border-ink-700">
              <tr>
                <th className="px-4 py-3 font-normal">#</th>
                <th className="px-4 py-3 font-normal">UTC</th>
                <th className="px-4 py-3 font-normal">Cause</th>
                <th className="px-4 py-3 font-normal">Target</th>
                <th className="px-4 py-3 font-normal">Outcome</th>
                <th className="px-4 py-3 font-normal">Death tx</th>
              </tr>
            </thead>
            <tbody>
              {ATTACKS.map((a) => (
                <tr
                  key={a.num}
                  className="border-b border-ink-800/60 last:border-0 hover:bg-ink-900/70 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-500">{a.num}</td>
                  <td className="px-4 py-3 text-neutral-300">{a.utc}</td>
                  <td className="px-4 py-3 text-blood-400">{a.cause}</td>
                  <td className="px-4 py-3 text-neutral-200">{a.target}</td>
                  <td className="px-4 py-3">
                    {a.outcome === "resurrected" ? (
                      <span className="text-venom-300">
                        killed → resurrected
                      </span>
                    ) : (
                      <span className="text-venom-200">defended</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.deathTx ? (
                      <a
                        href={CHAINSCAN_TX + a.deathTx}
                        target="_blank"
                        rel="noreferrer"
                        className="text-venom-300 hover:text-venom-200 underline-offset-4 hover:underline"
                      >
                        {shortenTx(a.deathTx)}
                      </a>
                    ) : (
                      <span
                        className="text-ember-400/80"
                        title={a.note ?? "death tx not on chain"}
                      >
                        nonce raced
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-neutral-500 leading-relaxed">
          Each attack also produces a scar tx, an iNFT mint, and two
          born events — see the full five-tx-per-attack table on{" "}
          <a
            href="https://github.com/Mithran-MV/Hydra#live-attacks-captured"
            target="_blank"
            rel="noreferrer"
            className="text-venom-300 underline-offset-4 hover:underline"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </section>
  );
}
