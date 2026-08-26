"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, TubeGeometry, Vector3, type Group, type Mesh } from "three";
import type { Tone } from "./tone";
import { useQuality } from "./quality";

function knotCurve(p: number, q: number, scale: number, lift = 0) {
  const pts: Vector3[] = [];
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = (0.72 + 0.28 * Math.cos(q * t)) * scale;
    pts.push(
      new Vector3(
        r * Math.cos(p * t),
        0.32 * Math.sin(q * t) * scale + lift,
        r * Math.sin(p * t),
      ),
    );
  }
  return new CatmullRomCurve3(pts, true, "catmullrom", 0.12);
}

function RelicMesh({
  tone,
  degrade,
}: {
  tone: Tone;
  degrade: boolean;
}) {
  const bronze = useRef<Mesh>(null);
  const glass = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);

  const geoA = useMemo(() => new TubeGeometry(knotCurve(2, 3, 1), degrade ? 64 : 96, 0.145, degrade ? 8 : 12, true), [degrade]);
  const geoB = useMemo(() => new TubeGeometry(knotCurve(3, 2, 0.86, 0.02), degrade ? 64 : 96, 0.11, degrade ? 8 : 10, true), [degrade]);
  useEffect(() => () => { geoA.dispose(); geoB.dispose(); }, [geoA, geoB]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (bronze.current) bronze.current.rotation.y = t * 0.12;
    if (glass.current) glass.current.rotation.y = t * 0.12 + 0.15;
    if (core.current) {
      core.current.rotation.y = -t * 0.08;
      core.current.position.y = Math.sin(t * 0.7) * 0.03;
    }
  });

  const people = tone === "people";
  const trans = degrade ? 0 : people ? 0.72 : 0.55;

  return (
    <group>
      <mesh ref={bronze} geometry={geoA} castShadow={false}>
        <meshPhysicalMaterial
          color={people ? "#6e4a28" : "#12141c"}
          metalness={0.92}
          roughness={people ? 0.4 : 0.28}
          envMapIntensity={0.6}
          specularIntensity={0.8}
        />
      </mesh>
      <mesh ref={glass} geometry={geoB}>
        <meshPhysicalMaterial
          color={people ? "#2e3238" : "#d4b15a"}
          metalness={people ? 0.08 : 0.85}
          roughness={people ? 0.08 : 0.22}
          transmission={trans}
          thickness={degrade ? 0 : 1.05}
          ior={1.48}
          transparent
          opacity={degrade ? 0.55 : 1}
          emissive={people ? "#000000" : "#c9a227"}
          emissiveIntensity={people ? 0 : degrade ? 0.25 : 0.55}
          attenuationColor={people ? "#1c1410" : "#d4b15a"}
          attenuationDistance={1.3}
        />
      </mesh>
      <mesh ref={core} scale={0.28}>
        <icosahedronGeometry args={[1, degrade ? 0 : 1]} />
        <meshPhysicalMaterial
          color={people ? "#cfc3ae" : "#0a0b10"}
          metalness={people ? 0.15 : 0.6}
          roughness={people ? 0.7 : 0.18}
          emissive={people ? "#000000" : "#d4b15a"}
          emissiveIntensity={people ? 0 : 0.2}
        />
      </mesh>
    </group>
  );
}

export function Relic({
  tone = "people",
  degrade,
  scale = 1,
}: {
  tone?: Tone;
  degrade?: boolean;
  scale?: number;
}) {
  const quality = useQuality();
  const low = degrade ?? quality.degrade;
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * 0.08;
  });
  return (
    <group ref={group} scale={scale}>
      <RelicMesh tone={tone} degrade={low} />
    </group>
  );
}
