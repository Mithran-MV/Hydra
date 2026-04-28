"use client";

export function SponsorCallout() {
  return (
    <section className="relative w-full bg-ink-950 border-y border-ink-700/40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-5">
        <p className="text-xs md:text-sm leading-relaxed text-neutral-400 italic">
          During build: reported a KeeperHub webhook auth bug via the
          hackathon check-in (Apr 26, 2026); KeeperHub team confirmed
          and shipped a fix two days later (Apr 28). Three additional
          issues from the same feedback are documented in{" "}
          <a
            href="https://github.com/Mithran-MV/Hydra/blob/main/KEEPERHUB_FEEDBACK.md"
            target="_blank"
            rel="noreferrer"
            className="not-italic text-venom-300 underline-offset-4 hover:underline"
          >
            KEEPERHUB_FEEDBACK.md
          </a>
          .
        </p>
      </div>
    </section>
  );
}
