"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function EmberParticles({
  count = 600,
  radius = 8,
  color = "#37ff9e",
  speed = 0.35,
}: {
  count?: number;
  radius?: number;
  color?: string;
  speed?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * radius + 1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.6 - 2;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.04 + 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      sizes[i] = Math.random() * 0.08 + 0.015;
    }
    return { positions, velocities, sizes };
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry as THREE.BufferGeometry;
    const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3] * speed;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * speed;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * speed;

      pos[i * 3] += Math.sin(t + i * 0.1) * 0.002;

      if (pos[i * 3 + 1] > 6) {
        pos[i * 3] = (Math.random() - 0.5) * radius * 2;
        pos[i * 3 + 1] = -3;
        pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color={color}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export function StarField({ count = 1200 }: { count?: number }) {
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * 60 + 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      a[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      a[i * 3 + 1] = r * Math.cos(phi);
      a[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return a;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
