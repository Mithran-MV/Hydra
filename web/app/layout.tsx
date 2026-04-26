import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HYDRA — Anti-Fragile Agent Swarm",
  description:
    "Cut off one head. Two grow back. HYDRA is an anti-fragile agent swarm where every attack makes the network stronger. Built on KeeperHub, Gensyn AXL, and 0G.",
  keywords: [
    "HYDRA",
    "anti-fragile",
    "agent swarm",
    "KeeperHub",
    "Gensyn AXL",
    "0G",
    "DeFi",
    "autonomous agents",
    "ETH Global",
  ],
  openGraph: {
    title: "HYDRA — You can't kill what evolves from pain.",
    description:
      "An anti-fragile agent swarm. Kill a head, two grow back — with memory and a scar.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-ink-950 text-ink-50" suppressHydrationWarning>
      <body className="antialiased film-grain" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
