"use client";

import { Instances, Instance } from "@react-three/drei";
import { useMemo } from "react";

function columnSlots() {
  const slots: [number, number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const z = 14.5 - i * 3.35;
    slots.push([-4.35, 2.15, z], [4.35, 2.15, z]);
  }
  return slots;
}

function frameSlots() {
  const slots: { p: [number, number, number]; r: [number, number, number] }[] = [];
  for (let i = 0; i < 9; i++) {
    const z = 12.2 - i * 2.35;
    slots.push({ p: [-4.78, 1.85, z], r: [0, Math.PI / 2, 0] });
    slots.push({ p: [4.78, 1.85, z], r: [0, -Math.PI / 2, 0] });
  }
  return slots;
}

export function Hall() {
  const cols = useMemo(columnSlots, []);
  const frames = useMemo(frameSlots, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[16, 42]} />
        <meshStandardMaterial color="#161310" metalness={0.55} roughness={0.22} envMapIntensity={0.85} />
      </mesh>
      <mesh position={[-5.15, 3, 2]}>
        <boxGeometry args={[0.45, 6.2, 40]} />
        <meshStandardMaterial color="#241e18" roughness={0.86} />
      </mesh>
      <mesh position={[5.15, 3, 2]}>
        <boxGeometry args={[0.45, 6.2, 40]} />
        <meshStandardMaterial color="#241e18" roughness={0.86} />
      </mesh>
      <mesh position={[0, 3, -16]}>
        <boxGeometry args={[11, 6.2, 0.5]} />
        <meshStandardMaterial color="#1c1814" roughness={0.9} />
      </mesh>
      <mesh position={[0, 6.15, 2]}>
        <boxGeometry args={[11.2, 0.28, 40]} />
        <meshStandardMaterial color="#1a1612" roughness={0.8} />
      </mesh>

      {/* Entrance arch */}
      <mesh position={[0, 3.35, 16.2]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.9, 0.28, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#c4b089" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[-2.9, 1.5, 16.2]}>
        <boxGeometry args={[0.5, 3.1, 0.5]} />
        <meshStandardMaterial color="#9a7a48" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[2.9, 1.5, 16.2]}>
        <boxGeometry args={[0.5, 3.1, 0.5]} />
        <meshStandardMaterial color="#9a7a48" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Inner dais + glass sphere — the private club */}
      <group position={[0, 0, -8.4]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[2.5, 2.7, 0.24, 48]} />
          <meshStandardMaterial color="#3a332a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[1.65, 1.8, 0.22, 48]} />
          <meshStandardMaterial color="#6a5433" roughness={0.4} metalness={0.45} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.52, 32, 32]} />
          <meshPhysicalMaterial
            color="#f2ebe0"
            transmission={0.92}
            roughness={0.03}
            thickness={1.2}
            ior={1.5}
            metalness={0.05}
            envMapIntensity={1.8}
          />
        </mesh>
      </group>

      {/* Window light well */}
      <mesh position={[4.88, 3.4, 1.2]}>
        <boxGeometry args={[0.08, 2.4, 1.1]} />
        <meshBasicMaterial color="#f0d5a0" />
      </mesh>

      <Instances limit={cols.length} range={cols.length} frustumCulled>
        <cylinderGeometry args={[0.26, 0.3, 4.3, 10]} />
        <meshStandardMaterial color="#3f3529" roughness={0.78} metalness={0.12} />
        {cols.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      <Instances limit={frames.length} range={frames.length} frustumCulled>
        <boxGeometry args={[1.28, 1.68, 0.05]} />
        <meshStandardMaterial color="#7a5a2e" roughness={0.4} metalness={0.65} />
        {frames.map((f, i) => (
          <Instance key={`r${i}`} position={f.p} rotation={f.r} />
        ))}
      </Instances>
      <Instances limit={frames.length} range={frames.length} frustumCulled>
        <boxGeometry args={[1.12, 1.48, 0.06]} />
        <meshStandardMaterial color="#1a1410" roughness={0.35} metalness={0.25} emissive="#2a2014" emissiveIntensity={0.18} />
        {frames.map((f, i) => (
          <Instance
            key={i}
            position={[f.p[0] + (f.p[0] < 0 ? 0.06 : -0.06), f.p[1], f.p[2]]}
            rotation={f.r}
          />
        ))}
      </Instances>
    </group>
  );
}
