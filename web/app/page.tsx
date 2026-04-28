import { SmoothScroll } from "@/components/SmoothScroll";
import { Navbar } from "@/components/ui/Navbar";
import { Cursor } from "@/components/ui/Cursor";
import { Hero } from "@/components/sections/Hero";
import { SponsorCallout } from "@/components/sections/SponsorCallout";
import { Marquee } from "@/components/sections/Marquee";
import { LiveAttacks } from "@/components/sections/LiveAttacks";
import { LazySection } from "@/components/LazySection";
import { Fragile } from "@/components/sections/Fragile";
import { Ritual } from "@/components/sections/Ritual";
import { Pillars } from "@/components/sections/Pillars";
import { Scars } from "@/components/sections/Scars";
import { CTA } from "@/components/sections/CTA";

export default function LandingPage() {
  return (
    <SmoothScroll>
      <Cursor />
      <Navbar />
      <main className="relative">
        <Hero />
        <SponsorCallout />
        <Marquee />
        <LiveAttacks />
        <LazySection fallbackHeight="100vh">
          <Fragile />
        </LazySection>
        <LazySection fallbackHeight="100vh">
          <Ritual />
        </LazySection>
        <LazySection fallbackHeight="100vh">
          <Pillars />
        </LazySection>
        <LazySection fallbackHeight="80vh">
          <Scars />
        </LazySection>
        <LazySection fallbackHeight="100vh">
          <CTA />
        </LazySection>
      </main>
    </SmoothScroll>
  );
}
