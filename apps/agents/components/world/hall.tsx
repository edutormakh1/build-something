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
        <meshStandardMaterial color="#0a090f" metalness={0.62} roughness={0.18} envMapIntensity={0.9} />
      </mesh>
      <mesh position={[-5.15, 3, 2]}>
        <boxGeometry args={[0.45, 6.2, 40]} />
        <meshStandardMaterial color="#12111a" roughness={0.88} />
      </mesh>
      <mesh position={[5.15, 3, 2]}>
        <boxGeometry args={[0.45, 6.2, 40]} />
        <meshStandardMaterial color="#12111a" roughness={0.88} />
      </mesh>
      <mesh position={[0, 3, -16]}>
        <boxGeometry args={[11, 6.2, 0.5]} />
        <meshStandardMaterial color="#0e0d14" roughness={0.9} />
      </mesh>
      <mesh position={[0, 6.15, 2]}>
        <boxGeometry args={[11.2, 0.28, 40]} />
        <meshStandardMaterial color="#0c0b12" roughness={0.8} />
      </mesh>

      <mesh position={[0, 3.35, 16.2]}>
        <torusGeometry args={[2.9, 0.22, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#d4b15a" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[-2.9, 1.5, 16.2]}>
        <boxGeometry args={[0.42, 3.1, 0.42]} />
        <meshStandardMaterial color="#1a1d28" roughness={0.45} metalness={0.5} />
      </mesh>
      <mesh position={[2.9, 1.5, 16.2]}>
        <boxGeometry args={[0.42, 3.1, 0.42]} />
        <meshStandardMaterial color="#1a1d28" roughness={0.45} metalness={0.5} />
      </mesh>

      {/* Inner night dais — login destination */}
      <group position={[0, 0, -8.4]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[2.5, 2.7, 0.24, 48]} />
          <meshStandardMaterial color="#161821" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[1.65, 1.8, 0.22, 48]} />
          <meshStandardMaterial color="#d4b15a" roughness={0.32} metalness={0.72} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshPhysicalMaterial
            color="#c5d4ea"
            transmission={0.88}
            roughness={0.04}
            thickness={1.1}
            ior={1.5}
            metalness={0.08}
            envMapIntensity={1.6}
            emissive="#d4b15a"
            emissiveIntensity={0.18}
          />
        </mesh>
      </group>

      {/* Moonlight slit */}
      <mesh position={[4.88, 3.5, 1.2]}>
        <boxGeometry args={[0.08, 2.6, 1.15]} />
        <meshBasicMaterial color="#c5d0dc" />
      </mesh>

      {/* Gold filament floor inlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[1.72, 1.78, 64]} />
        <meshBasicMaterial color="#d4b15a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <ringGeometry args={[2.35, 2.38, 64]} />
        <meshBasicMaterial color="#8a6a2a" />
      </mesh>

      <Instances limit={cols.length} range={cols.length} frustumCulled>
        <cylinderGeometry args={[0.24, 0.28, 4.3, 10]} />
        <meshStandardMaterial color="#1a1d28" roughness={0.72} metalness={0.22} />
        {cols.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>

      <Instances limit={frames.length} range={frames.length} frustumCulled>
        <boxGeometry args={[1.15, 1.55, 0.07]} />
        <meshStandardMaterial color="#0c0d12" roughness={0.3} metalness={0.28} emissive="#d4b15a" emissiveIntensity={0.04} />
        {frames.map((f, i) => (
          <Instance key={i} position={f.p} rotation={f.r} />
        ))}
      </Instances>

      <Instances limit={frames.length} range={frames.length} frustumCulled>
        <boxGeometry args={[1.28, 1.68, 0.05]} />
        <meshStandardMaterial color="#d4b15a" roughness={0.32} metalness={0.78} />
        {frames.map((f, i) => (
          <Instance key={`r${i}`} position={f.p} rotation={f.r} />
        ))}
      </Instances>
    </group>
  );
}
