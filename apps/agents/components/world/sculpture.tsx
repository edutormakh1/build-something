"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Relic } from "@bs/ui";
import type { Group } from "three";

export function RelicOnPlinth({ reduced }: { reduced: boolean }) {
  const gyro = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  useFrame(({ clock }) => {
    if (reduced || !gyro.current) return;
    gyro.current.rotation.z = clock.elapsedTime * 0.08;
    gyro.current.rotation.x = Math.sin(clock.elapsedTime * 0.11) * 0.2;
  });

  return (
    <group position={[0, 1.55, 0]}>
      <group ref={gyro}>
        <mesh rotation={[Math.PI / 2.15, 0, 0]}>
          <torusGeometry args={[1.42, 0.008, 8, 64]} />
          <meshBasicMaterial color="#d4b15a" transparent opacity={0.45} />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0.6, 0]}>
          <torusGeometry args={[1.42, 0.006, 8, 64]} />
          <meshBasicMaterial color="#c5d4ea" transparent opacity={0.28} />
        </mesh>
      </group>
      <group scale={1.08} onPointerMove={() => invalidate()}>
        <Relic tone="agents" degrade={reduced} />
      </group>
    </group>
  );
}

export function Plinth() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.55, 0.56, 1.55]} />
        <meshStandardMaterial color="#12141c" roughness={0.86} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.58, 0]} receiveShadow>
        <boxGeometry args={[1.15, 0.08, 1.15]} />
        <meshStandardMaterial color="#d4b15a" roughness={0.32} metalness={0.75} />
      </mesh>
    </group>
  );
}
