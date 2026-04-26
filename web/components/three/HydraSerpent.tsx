"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const TUBE_SEGMENTS = 56;
const TUBE_RADIAL = 10;
const CURVE_POINTS = 28;
const SCALE_COUNT = 10; // fewer, bigger scale plates per neck

type NeckConfig = {
  origin: THREE.Vector3;
  target: THREE.Vector3;
  curl: number;
  phase: number;
  alive: boolean;
  blood?: boolean;
  lean: number; // back-lean of the neck (larger = further back in z)
};

function fillNeckCurve(
  out: THREE.Vector3[],
  cfg: NeckConfig,
  t: number
): void {
  const { origin, target, curl, phase } = cfg;
  const segments = out.length - 1;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    // ease-out curve (more curve at base, straighter at head)
    const eased = 1 - Math.pow(1 - u, 1.6);
    const x = origin.x * (1 - eased) + target.x * eased;
    const y = origin.y * (1 - u) + target.y * u;
    const z = origin.z * (1 - eased) + target.z * eased;

    const envelope = Math.sin(u * Math.PI);
    const sway =
      Math.sin(u * Math.PI * 1.6 + t * 0.9 + phase) * (curl * envelope * 0.8);
    const wave =
      Math.cos(u * Math.PI * 2 + t * 1.2 + phase * 0.7) *
      (curl * 0.35 * envelope);
    const rise = envelope * 1.2;

    out[i].set(x + sway, y + rise + wave * 0.2, z + wave * 0.6);
  }
}

// Short, sharp, upward-pointing horn — minimal curl, aggressive taper to a
// needle tip. 6-sided low-poly surface for hard angular facets that catch
// rim-light and read as "deadly spikes" from any angle.
function buildHornGeometry({
  side,
  length,
  baseRadius,
  curl,
  outwardFlare,
}: {
  side: number; // -1 left, +1 right
  length: number;
  baseRadius: number;
  curl: number; // tiny backward lean (kept small for upright look)
  outwardFlare: number; // lateral spread
}): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    // Mostly vertical with just a whisper of backward lean
    const backward = Math.pow(u, 1.4) * curl * length;
    const outward = side * outwardFlare * u * length;
    const up = u * length;
    pts.push(new THREE.Vector3(outward, up, -backward));
  }
  const path = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);

  const tubularSegments = 26;
  const radialSegments = 6; // low-poly angular facets
  const verts: number[] = [];
  const indices: number[] = [];
  const frames = path.computeFrenetFrames(tubularSegments, false);

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const p = path.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    // Aggressive taper — fat base, needle-sharp tip
    const taper = Math.pow(1 - u, 1.4);
    const r = baseRadius * taper;
    for (let j = 0; j < radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sinV = Math.sin(v);
      const cosV = Math.cos(v);
      verts.push(
        p.x + r * (N.x * cosV + B.x * sinV),
        p.y + r * (N.y * cosV + B.y * sinV),
        p.z + r * (N.z * cosV + B.z * sinV)
      );
    }
  }
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * radialSegments + j;
      const b = i * radialSegments + ((j + 1) % radialSegments);
      const c = (i + 1) * radialSegments + ((j + 1) % radialSegments);
      const d = (i + 1) * radialSegments + j;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(verts, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function DragonHornPair({
  length,
  baseRadius,
  curl,
  outwardFlare,
  position,
  tiltForward = 0,
  zRoll = 0.18,
  emissive,
  emissiveIntensity,
}: {
  length: number;
  baseRadius: number;
  curl: number;
  outwardFlare: number;
  position: [number, number, number];
  tiltForward?: number;
  zRoll?: number;
  emissive: string;
  emissiveIntensity: number;
}) {
  const geomL = useMemo(
    () =>
      buildHornGeometry({
        side: -1,
        length,
        baseRadius,
        curl,
        outwardFlare,
      }),
    [length, baseRadius, curl, outwardFlare]
  );
  const geomR = useMemo(
    () =>
      buildHornGeometry({
        side: 1,
        length,
        baseRadius,
        curl,
        outwardFlare,
      }),
    [length, baseRadius, curl, outwardFlare]
  );

  return (
    <group position={position} rotation={[tiltForward, 0, 0]}>
      <group rotation={[0, 0, -zRoll]}>
        <mesh geometry={geomR} castShadow>
          <meshStandardMaterial
            color="#0c0c0e"
            roughness={0.35}
            metalness={0.9}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>
      </group>
      <group rotation={[0, 0, zRoll]}>
        <mesh geometry={geomL} castShadow>
          <meshStandardMaterial
            color="#0c0c0e"
            roughness={0.35}
            metalness={0.9}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
}

// Thin triangular ear frill / membrane flap
function EarFrill({
  side,
  emissive,
  emissiveIntensity,
  baseColor,
}: {
  side: number;
  emissive: string;
  emissiveIntensity: number;
  baseColor: string;
}) {
  return (
    <group
      position={[side * 0.34, 0.18, 0.25]}
      rotation={[0.15, side * 0.75, side * -0.4]}
    >
      {/* Membrane */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.22, 0.42, 3, 1]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.55}
          metalness={0.35}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity * 0.75}
          side={THREE.DoubleSide}
          flatShading
        />
      </mesh>
      {/* Bony spine along the frill leading edge */}
      <mesh
        position={[0.21, 0.0, 0.0]}
        rotation={[0, 0, -0.2]}
      >
        <coneGeometry args={[0.02, 0.44, 5]} />
        <meshStandardMaterial
          color="#0a0a0a"
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}

function DragonHead({
  alive,
  emissive,
  eyeColor,
  jawRef,
  eyeLRef,
  eyeRRef,
  mouthGlowRef,
  baseColor,
}: {
  alive: boolean;
  emissive: string;
  eyeColor: string;
  baseColor: string;
  jawRef: React.RefObject<THREE.Group | null>;
  eyeLRef: React.RefObject<THREE.PointLight | null>;
  eyeRRef: React.RefObject<THREE.PointLight | null>;
  mouthGlowRef: React.RefObject<THREE.PointLight | null>;
}) {
  // Western-dragon skull: BLOCKY, BROAD, BLUNT muzzle. No pointed cones.
  // Reference silhouette: Drogon / Smaug — rectangular head, heavy jaw,
  // crocodile-style wide bite, minimal horn clutter.
  const mat = (opts?: Partial<THREE.MeshStandardMaterialParameters>) => (
    <meshStandardMaterial
      color={baseColor}
      roughness={0.45}
      metalness={0.55}
      emissive={emissive}
      emissiveIntensity={alive ? 0.22 : 0.04}
      flatShading
      {...opts}
    />
  );

  const boneMat = (
    <meshStandardMaterial
      color="#050505"
      roughness={0.2}
      metalness={0.95}
      emissive={emissive}
      emissiveIntensity={alive ? 0.25 : 0.04}
    />
  );

  const fangMat = (
    <meshStandardMaterial color="#ededf0" roughness={0.28} metalness={0.2} />
  );

  // Row of crocodile-style teeth along an edge
  const teethRow = (
    side: "upper" | "lower",
    y: number,
    count = 6
  ) => {
    const rot = side === "upper" ? Math.PI : 0;
    const arr = [];
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      const x = (u - 0.5) * 0.46;
      const z = 0.5 + u * 0.3 * (count > 3 ? 0.55 : 0.2);
      const size = 0.1 - Math.abs(u - 0.5) * 0.05;
      arr.push(
        <mesh key={i} position={[x, y, z + 0.45]} rotation={[rot, 0, 0]}>
          <coneGeometry args={[0.03, size, 4]} />
          {fangMat}
        </mesh>
      );
    }
    return arr;
  };

  return (
    <group>
      {/* ===== MAIN SKULL (rectangular, like a crocodile/dragon) =====
          wide cheekbones, flat top, forward-projecting brow, BLUNT nose */}

      {/* Cranium box — the bulk of the back of the head */}
      <mesh position={[0, 0.05, 0.22]}>
        <boxGeometry args={[0.58, 0.5, 0.55]} />
        {mat()}
      </mesh>

      {/* Upper muzzle — a flat-topped box that extends forward */}
      <mesh position={[0, -0.02, 0.85]}>
        <boxGeometry args={[0.48, 0.3, 0.8]} />
        {mat()}
      </mesh>

      {/* Blunt nose cap — narrower box truncated at the end */}
      <mesh position={[0, -0.05, 1.28]}>
        <boxGeometry args={[0.38, 0.24, 0.2]} />
        {mat()}
      </mesh>

      {/* Nose tip bevel — short trapezoid (truncated cone with 4 sides) */}
      <mesh position={[0, -0.05, 1.42]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.14, 0.18, 0.12, 4]} />
        {mat()}
      </mesh>

      {/* Wide nostrils on the tip */}
      <mesh position={[0.09, -0.03, 1.44]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.07, 0.04, 0.04]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[-0.09, -0.03, 1.44]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.07, 0.04, 0.04]} />
        <meshBasicMaterial color="#000" />
      </mesh>

      {/* Heavy BROW RIDGE — protrudes forward over the eyes (the menace) */}
      <mesh position={[0, 0.26, 0.55]}>
        <boxGeometry args={[0.62, 0.16, 0.38]} />
        {mat({ emissiveIntensity: alive ? 0.3 : 0.05 })}
      </mesh>
      {/* Brow outer corners angled out */}
      <mesh position={[0.32, 0.22, 0.5]} rotation={[0, 0.4, 0.15]}>
        <boxGeometry args={[0.16, 0.14, 0.24]} />
        {mat({ emissiveIntensity: alive ? 0.32 : 0.05 })}
      </mesh>
      <mesh position={[-0.32, 0.22, 0.5]} rotation={[0, -0.4, -0.15]}>
        <boxGeometry args={[0.16, 0.14, 0.24]} />
        {mat({ emissiveIntensity: alive ? 0.32 : 0.05 })}
      </mesh>

      {/* Jowls / cheek muscles — bulk at the jaw hinge */}
      <mesh position={[0.3, -0.05, 0.25]} rotation={[0, 0.1, 0.35]}>
        <boxGeometry args={[0.16, 0.32, 0.42]} />
        {mat()}
      </mesh>
      <mesh position={[-0.3, -0.05, 0.25]} rotation={[0, -0.1, -0.35]}>
        <boxGeometry args={[0.16, 0.32, 0.42]} />
        {mat()}
      </mesh>

      {/* ===== LOWER JAW (wide, blocky, hinges at the back) ===== */}
      <group ref={jawRef} position={[0, -0.2, 0.15]}>
        {/* Main jaw bone */}
        <mesh position={[0, -0.05, 0.55]}>
          <boxGeometry args={[0.48, 0.18, 0.82]} />
          {mat({ emissiveIntensity: alive ? 0.15 : 0.03 })}
        </mesh>
        {/* Front of jaw / chin (truncated) */}
        <mesh position={[0, -0.05, 1.05]}>
          <boxGeometry args={[0.36, 0.16, 0.22]} />
          {mat({ emissiveIntensity: alive ? 0.15 : 0.03 })}
        </mesh>
        {/* Chin tip bevel */}
        <mesh position={[0, -0.05, 1.18]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.12, 0.16, 0.1, 4]} />
          {mat({ emissiveIntensity: alive ? 0.15 : 0.03 })}
        </mesh>

        {/* Lower teeth row (6 teeth along the jaw top) */}
        {teethRow("lower", 0.05, 6)}
      </group>

      {/* Upper teeth row (6 teeth along the muzzle underside) */}
      {teethRow("upper", -0.18, 6)}

      {/* Big canine fangs (4 total — 2 up, 2 down) */}
      <mesh position={[0.14, -0.16, 1.1]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.045, 0.3, 5]} />
        {fangMat}
      </mesh>
      <mesh position={[-0.14, -0.16, 1.1]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.045, 0.3, 5]} />
        {fangMat}
      </mesh>

      {/* ===== EYES — deep set in the sides of the skull ===== */}
      {/* Dark socket */}
      <mesh position={[0.3, 0.12, 0.45]} rotation={[0, 0.5, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#000" roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[-0.3, 0.12, 0.45]} rotation={[0, -0.5, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#000" roughness={0.95} metalness={0} />
      </mesh>

      {/* Eyeball */}
      <mesh position={[0.33, 0.13, 0.52]}>
        <sphereGeometry args={[0.085, 14, 12]} />
        <meshBasicMaterial color={eyeColor} />
      </mesh>
      <mesh position={[-0.33, 0.13, 0.52]}>
        <sphereGeometry args={[0.085, 14, 12]} />
        <meshBasicMaterial color={eyeColor} />
      </mesh>

      {/* Vertical pupil slit — reptilian */}
      <mesh position={[0.35, 0.13, 0.57]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.018, 0.12, 0.005]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[-0.35, 0.13, 0.57]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.018, 0.12, 0.005]} />
        <meshBasicMaterial color="#000" />
      </mesh>

      <pointLight
        ref={eyeLRef}
        position={[0.33, 0.13, 0.62]}
        color={eyeColor}
        distance={3}
        intensity={alive ? 2.2 : 0}
      />
      <pointLight
        ref={eyeRRef}
        position={[-0.33, 0.13, 0.62]}
        color={eyeColor}
        distance={3}
        intensity={alive ? 2.2 : 0}
      />
      <pointLight
        ref={mouthGlowRef}
        position={[0, -0.12, 1.0]}
        color={eyeColor}
        distance={3.5}
        intensity={alive ? 1.6 : 0}
      />

      {/* ===== CROWN OF SPIKES — short, sharp, pointing UP ===== */}
      {/* Main horn pair — vertical, deadly, low-poly faceted */}
      <DragonHornPair
        length={0.95}
        baseRadius={0.11}
        curl={0.08}
        outwardFlare={0.18}
        position={[0, 0.3, -0.02]}
        tiltForward={-0.05}
        zRoll={0.22}
        emissive={emissive}
        emissiveIntensity={alive ? 0.3 : 0.05}
      />

      {/* Inner secondary pair — shorter upward spikes between the mains */}
      <DragonHornPair
        length={0.55}
        baseRadius={0.06}
        curl={0.05}
        outwardFlare={0.12}
        position={[0, 0.36, 0.12]}
        tiltForward={-0.1}
        zRoll={0.3}
        emissive={emissive}
        emissiveIntensity={alive ? 0.28 : 0.05}
      />

      {/* Row of upward crown spikes along the skull centerline */}
      {[0, 1, 2, 3].map((i) => {
        const u = i / 3;
        const z = 0.4 - u * 0.55;
        const size = 0.4 - Math.abs(u - 0.35) * 0.15;
        return (
          <mesh
            key={i}
            position={[0, 0.32, z]}
            rotation={[0, 0, 0]}
          >
            <coneGeometry args={[0.05, size, 4]} />
            {boneMat}
          </mesh>
        );
      })}

      {/* Outer brow spikes — smaller, angled outward so they bristle */}
      <mesh position={[0.2, 0.34, 0.3]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.045, 0.35, 4]} />
        {boneMat}
      </mesh>
      <mesh position={[-0.2, 0.34, 0.3]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.045, 0.35, 4]} />
        {boneMat}
      </mesh>

      {/* Ear frills — triangular membranes on each side, pinned below the horns */}
      <EarFrill
        side={1}
        baseColor={baseColor}
        emissive={emissive}
        emissiveIntensity={alive ? 0.22 : 0.04}
      />
      <EarFrill
        side={-1}
        baseColor={baseColor}
        emissive={emissive}
        emissiveIntensity={alive ? 0.22 : 0.04}
      />

      {/* Jaw hinge spikes */}
      <mesh position={[0.32, -0.06, 0.12]} rotation={[1.35, 0.5, 0.25]}>
        <coneGeometry args={[0.04, 0.4, 4]} />
        {boneMat}
      </mesh>
      <mesh position={[-0.32, -0.06, 0.12]} rotation={[1.35, -0.5, -0.25]}>
        <coneGeometry args={[0.04, 0.4, 4]} />
        {boneMat}
      </mesh>
    </group>
  );
}

function HydraNeck({
  cfg,
  scar,
  headTipRef,
}: {
  cfg: NeckConfig;
  scar: boolean;
  headTipRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const headRef = useRef<THREE.Group>(null);
  const jawRef = useRef<THREE.Group>(null);
  const eyeLRef = useRef<THREE.PointLight>(null);
  const eyeRRef = useRef<THREE.PointLight>(null);
  const mouthGlowRef = useRef<THREE.PointLight>(null);
  const scalesRef = useRef<THREE.InstancedMesh>(null);

  const curvePoints = useMemo(
    () => Array.from({ length: CURVE_POINTS }, () => new THREE.Vector3()),
    []
  );

  const { geometry, curve } = useMemo(() => {
    fillNeckCurve(curvePoints, cfg, 0);
    const curve = new THREE.CatmullRomCurve3(
      curvePoints,
      false,
      "catmullrom",
      0.5
    );
    const geometry = new THREE.TubeGeometry(
      curve,
      TUBE_SEGMENTS,
      0.36,
      TUBE_RADIAL,
      false
    );
    return { geometry, curve };
  }, [cfg, curvePoints]);

  const scaleGeom = useMemo(() => new THREE.ConeGeometry(0.13, 0.24, 4), []);
  const scaleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: cfg.blood ? "#1a0408" : "#020604",
        metalness: 0.95,
        roughness: 0.2,
        emissive: cfg.blood ? "#ff2d55" : scar ? "#ffb347" : "#37ff9e",
        emissiveIntensity: cfg.alive ? 0.5 : 0.1,
      }),
    [cfg.alive, cfg.blood, scar]
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    fillNeckCurve(curvePoints, cfg, t);
    curve.points = curvePoints;

    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const frames = curve.computeFrenetFrames(TUBE_SEGMENTS, false);
    const baseRadius = 0.38;
    const taper = (u: number) => 0.45 + (1 - u) * 0.55;

    let idx = 0;
    for (let i = 0; i <= TUBE_SEGMENTS; i++) {
      const u = i / TUBE_SEGMENTS;
      const p = curve.getPointAt(u);
      const N = frames.normals[i];
      const B = frames.binormals[i];
      const r = baseRadius * taper(u);
      for (let j = 0; j < TUBE_RADIAL; j++) {
        const v = (j / TUBE_RADIAL) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = Math.cos(v);
        posAttr.setXYZ(
          idx++,
          p.x + r * (N.x * cos + B.x * sin),
          p.y + r * (N.y * cos + B.y * sin),
          p.z + r * (N.z * cos + B.z * sin)
        );
      }
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    if (scalesRef.current) {
      for (let s = 0; s < SCALE_COUNT; s++) {
        const u = 0.12 + (s / SCALE_COUNT) * 0.8;
        const p = curve.getPointAt(u);
        const N = frames.normals[Math.round(u * TUBE_SEGMENTS)];
        const pos = p
          .clone()
          .add(N.clone().multiplyScalar(baseRadius * taper(u) + 0.03));
        dummy.position.copy(pos);
        dummy.lookAt(pos.clone().add(N));
        const scl = 0.7 + (1 - u) * 0.9;
        dummy.scale.setScalar(scl);
        dummy.updateMatrix();
        scalesRef.current.setMatrixAt(s, dummy.matrix);
      }
      scalesRef.current.instanceMatrix.needsUpdate = true;
    }

    if (headRef.current) {
      const headPos = curve.getPointAt(1);
      const before = curve.getPointAt(0.93);
      headRef.current.position.copy(headPos);
      const look = headPos
        .clone()
        .add(new THREE.Vector3().subVectors(headPos, before).normalize());
      headRef.current.lookAt(look);
      headRef.current.rotation.z += Math.sin(t * 1.2 + cfg.phase) * 0.03;
      headTipRef.current.copy(headPos);
    }

    const jawOpen =
      0.12 + (Math.sin(t * 1.4 + cfg.phase * 2) * 0.5 + 0.5) * 0.35;
    if (jawRef.current) jawRef.current.rotation.x = jawOpen;

    const pulse = 0.6 + Math.sin(t * 3.5 + cfg.phase * 2) * 0.4;
    if (eyeLRef.current) eyeLRef.current.intensity = cfg.alive ? pulse * 2.6 : 0;
    if (eyeRRef.current) eyeRRef.current.intensity = cfg.alive ? pulse * 2.6 : 0;
    if (mouthGlowRef.current)
      mouthGlowRef.current.intensity = cfg.alive
        ? 1.3 + pulse + jawOpen * 2.5
        : 0;
  });

  const baseColor = cfg.blood ? "#1c060c" : "#051010";
  const emissive = cfg.blood ? "#ff2d55" : scar ? "#ffb347" : "#37ff9e";
  const eyeColor = cfg.blood ? "#ff2d55" : scar ? "#ffb347" : "#37ff9e";

  return (
    <group>
      {/* Neck tube (clean + smooth — no surface noise) */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={baseColor}
          roughness={0.55}
          metalness={0.5}
          emissive={emissive}
          emissiveIntensity={cfg.alive ? 0.22 : 0.05}
        />
      </mesh>

      {/* Scale armor ridge (fewer, cleaner) */}
      <instancedMesh
        ref={scalesRef}
        args={[scaleGeom, scaleMat, SCALE_COUNT]}
        castShadow
      />

      {/* Head group */}
      <group ref={headRef}>
        <DragonHead
          alive={cfg.alive}
          emissive={emissive}
          eyeColor={eyeColor}
          baseColor={baseColor}
          jawRef={jawRef}
          eyeLRef={eyeLRef}
          eyeRRef={eyeRRef}
          mouthGlowRef={mouthGlowRef}
        />
      </group>
    </group>
  );
}

function LightningArcs({
  tips,
  alive,
}: {
  tips: React.MutableRefObject<THREE.Vector3>[];
  alive: number;
}) {
  const geometry = useMemo(() => {
    const maxSegs = 8 * 6;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(maxSegs * 2 * 3), 3)
    );
    return g;
  }, []);

  useFrame(({ clock }) => {
    const positions = (geometry.getAttribute("position") as THREE.BufferAttribute)
      .array as Float32Array;
    const t = clock.getElapsedTime();
    let idx = 0;
    const n = Math.min(alive, tips.length);
    for (let i = 0; i < n - 1; i++) {
      const a = tips[i].current;
      const b = tips[i + 1].current;
      if (!a || !b) continue;
      const segs = 6;
      let prev = a.clone();
      for (let s = 1; s <= segs; s++) {
        const u = s / segs;
        const lerp = new THREE.Vector3().lerpVectors(a, b, u);
        const jitter = 0.28 * Math.sin(t * 18 + i * 3 + s * 1.7);
        const normal = new THREE.Vector3(
          Math.cos(t * 1.3 + i) * jitter,
          Math.sin(t * 1.7 + s) * jitter,
          Math.cos(t * 1.1 + i + s) * jitter
        );
        const next = lerp.clone().add(normal.multiplyScalar(0.4));
        if (idx + 6 > positions.length) break;
        positions[idx++] = prev.x;
        positions[idx++] = prev.y;
        positions[idx++] = prev.z;
        positions[idx++] = next.x;
        positions[idx++] = next.y;
        positions[idx++] = next.z;
        prev = next;
      }
    }
    for (; idx < positions.length; idx++) positions[idx] = 0;
    (geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate =
      true;
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#b4ffdd"
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function RunicRings() {
  const ringRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    ringRef.current.rotation.y = t * 0.12;
  });

  return (
    <group ref={ringRef} position={[0, -3.8, -0.3]}>
      <mesh rotation={[Math.PI / 2.1, 0, 0]}>
        <torusGeometry args={[4.0, 0.03, 6, 128]} />
        <meshBasicMaterial
          color="#37ff9e"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, 0, 0]}>
        <torusGeometry args={[3.2, 0.018, 6, 96]} />
        <meshBasicMaterial
          color="#b4ffdd"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Glyph dashes on outer ring */}
      {[...Array(16)].map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * 4.0,
              Math.sin(Math.PI / 2.1) * 0.0,
              Math.sin(a) * 4.0,
            ]}
            rotation={[Math.PI / 2, 0, -a]}
          >
            <boxGeometry args={[0.2, 0.02, 0.02]} />
            <meshBasicMaterial color="#37ff9e" />
          </mesh>
        );
      })}
    </group>
  );
}

export function HydraSerpent({
  aliveCount = 5,
  scarCount = 1,
  interactive = true,
}: {
  aliveCount?: number;
  scarCount?: number;
  interactive?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const necks: NeckConfig[] = useMemo(() => {
    const totalSlots = Math.max(3, Math.min(aliveCount, 7));
    const arr: NeckConfig[] = [];
    for (let i = 0; i < totalSlots; i++) {
      // Fan heads across a shallow front arc
      const spreadAngle = Math.PI * 0.55;
      const u =
        totalSlots > 1 ? (i - (totalSlots - 1) / 2) / (totalSlots - 1) : 0;
      const sideAngle = u * spreadAngle; // left/right position
      // Alternate back/forward lean so they don't all stack
      const leanIdx = i - (totalSlots - 1) / 2;
      const backLean = Math.abs(leanIdx) * 0.4;

      const originX = Math.sin(sideAngle) * 0.35;
      const originZ = Math.cos(sideAngle) * 0.35 - 0.1;

      const targetDistance = 3.0;
      const targetHeight = 1.9 + Math.sin(i * 1.7) * 0.35 - backLean * 0.3;
      const targetX = Math.sin(sideAngle) * targetDistance * 1.25;
      const targetZ =
        Math.cos(sideAngle) * targetDistance * 0.7 + 0.4 - backLean * 0.7;

      arr.push({
        origin: new THREE.Vector3(originX, -2.3, originZ),
        target: new THREE.Vector3(targetX, targetHeight, targetZ),
        curl: 1.0 + Math.abs(u) * 0.4,
        phase: i * 1.37,
        alive: true,
        blood: false,
        lean: backLean,
      });
    }
    return arr;
  }, [aliveCount]);

  const tipRefs = useMemo(
    () => necks.map(() => ({ current: new THREE.Vector3() })),
    [necks]
  );

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      interactive ? pointer.x * 0.3 : Math.sin(t * 0.15) * 0.22,
      0.04
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      interactive ? -pointer.y * 0.08 : 0,
      0.04
    );
    groupRef.current.position.y = -0.35 + Math.sin(t * 0.5) * 0.1;
  });

  // Coiled body — positioned BEHIND the necks (negative z) so it reads as the body they rise from
  const coilGeometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 140; i++) {
      const u = i / 140;
      const angle = u * Math.PI * 5 + Math.PI;
      const r = 1.9 - u * 0.5;
      pts.push(
        new THREE.Vector3(
          Math.cos(angle) * r,
          -3.6 + u * 1.1,
          Math.sin(angle) * r - 0.5
        )
      );
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    return new THREE.TubeGeometry(curve, 160, 0.45, 10, false);
  }, []);

  return (
    <group ref={groupRef}>
      <RunicRings />

      {/* Coiled body (visibly separate from the neck bases, pushed back in z) */}
      <mesh geometry={coilGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#04090a"
          roughness={0.65}
          metalness={0.35}
          emissive="#0b3324"
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Heart core — more contained, behind the neck bases */}
      <mesh position={[0, -2.6, -0.4]}>
        <icosahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial
          color="#02110c"
          roughness={0.2}
          metalness={0.95}
          emissive="#37ff9e"
          emissiveIntensity={1.2}
        />
      </mesh>
      <mesh position={[0, -2.6, -0.4]}>
        <sphereGeometry args={[1.15, 16, 16]} />
        <meshBasicMaterial
          color="#37ff9e"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        position={[0, -2.4, -0.3]}
        color="#37ff9e"
        distance={8}
        intensity={2.8}
      />

      {/* Rim of scales around the neck collar */}
      {[...Array(14)].map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.9, -2.15, Math.sin(a) * 0.9 - 0.1]}
            rotation={[0.4, -a, 0.2]}
          >
            <boxGeometry args={[0.26, 0.22, 0.06]} />
            <meshStandardMaterial
              color="#060f0c"
              roughness={0.3}
              metalness={0.9}
              emissive="#37ff9e"
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}

      {/* Necks */}
      {necks.map((cfg, i) => (
        <HydraNeck
          key={i}
          cfg={cfg}
          scar={i < scarCount}
          headTipRef={tipRefs[i]}
        />
      ))}

      {/* Lightning mesh-arcs between heads */}
      <LightningArcs tips={tipRefs} alive={necks.length} />

      {/* Ground aura */}
      <mesh position={[0, -4.0, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 4.4, 96]} />
        <meshBasicMaterial
          color="#37ff9e"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -3.98, -0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.6, 3.72, 64]} />
        <meshBasicMaterial
          color="#37ff9e"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
