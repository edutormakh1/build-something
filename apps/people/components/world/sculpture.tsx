"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

export function Sculpture({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (reduced || !group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.y = t * 0.07;
    group.current.position.y = Math.sin(t * 0.45) * 0.03;
  });

  return (
    <group ref={group} position={[0, 1.55, 0]}>
      <mesh castShadow rotation={[0.35, 0.2, 0.55]}>
        <torusGeometry args={[0.92, 0.22, 32, 96]} />
        <meshStandardMaterial color="#8a6230" metalness={0.92} roughness={0.28} envMapIntensity={1.35} />
      </mesh>
      <mesh castShadow rotation={[1.2, -0.4, 1.05]}>
        <torusGeometry args={[0.9, 0.2, 24, 80]} />
        <meshPhysicalMaterial
          color="#8b939c"
          metalness={0.08}
          roughness={0.04}
          transmission={0.78}
          thickness={1.35}
          ior={1.48}
          envMapIntensity={1.6}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
}

export function Plinth() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.55, 0.56, 1.55]} />
        <meshStandardMaterial color="#2c2722" roughness={0.92} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.58, 0]} receiveShadow>
        <boxGeometry args={[1.15, 0.08, 1.15]} />
        <meshStandardMaterial color="#4a3b28" roughness={0.5} metalness={0.35} />
      </mesh>
    </group>
  );
}
