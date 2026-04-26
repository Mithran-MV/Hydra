"use client";

import { Canvas } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { Suspense, useEffect, useRef, useState } from "react";
import { HydraSerpent } from "./HydraSerpent";
import { EmberParticles, StarField } from "./Particles";

export function HydraScene({
  aliveCount = 5,
  scarCount = 1,
  className,
  interactive = true,
  quality = "high",
}: {
  aliveCount?: number;
  scarCount?: number;
  className?: string;
  interactive?: boolean;
  quality?: "low" | "high";
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const particleCount = quality === "low" ? 120 : 260;

  return (
    <div
      ref={wrapRef}
      className={className ?? "absolute inset-0"}
      style={{ contain: "layout paint style" }}
    >
      {inView && (
        <Canvas
          dpr={[1, 1.5]}
          shadows={false}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          camera={{ position: [0, 1.3, 9.8], fov: 42 }}
          frameloop="always"
        >
          <color attach="background" args={["#05060a"]} />
          <fog attach="fog" args={["#05060a", 10, 28]} />

          <ambientLight intensity={0.18} />
          {/* Key light — cool cyan from upper front */}
          <directionalLight
            position={[3, 6, 5]}
            intensity={1.3}
            color="#b4ffdd"
          />
          {/* Fill light — soft green from below */}
          <pointLight
            position={[0, -1, 3]}
            color="#37ff9e"
            intensity={0.8}
            distance={9}
          />
          {/* Rim light — warm from behind for silhouette */}
          <directionalLight
            position={[-2, 3, -6]}
            intensity={1.6}
            color="#ffb347"
          />
          {/* Side kicker — blood accent */}
          <directionalLight
            position={[-5, 2, 3]}
            intensity={0.45}
            color="#ff2d55"
          />
          <pointLight position={[0, 6, 0]} color="#37ff9e" intensity={0.9} />

          <Suspense fallback={null}>
            <StarField count={quality === "low" ? 240 : 480} />

            <Float speed={0.6} rotationIntensity={0.04} floatIntensity={0.08}>
              <HydraSerpent
                aliveCount={aliveCount}
                scarCount={scarCount}
                interactive={interactive}
              />
            </Float>

            <EmberParticles count={particleCount} color="#37ff9e" radius={10} />
            <EmberParticles
              count={Math.floor(particleCount * 0.35)}
              color="#ff2d55"
              radius={6}
              speed={0.15}
            />
          </Suspense>

          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.95}
              luminanceThreshold={0.22}
              luminanceSmoothing={0.85}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.2} darkness={0.85} />
          </EffectComposer>
        </Canvas>
      )}
    </div>
  );
}
