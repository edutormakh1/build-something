"use client";

import { Relic } from "./relic";
import { Scene } from "./scene";
import { STILLS, type Tone } from "./tone";
import { useQuality } from "./quality";

function HallArchitecture({ tone }: { tone: Tone }) {
  const { degrade } = useQuality();
  const people = tone === "people";
  const wall = people ? "#cfc3ae" : "#12141c";
  const floor = people ? "#b9ab93" : "#0a0b10";
  const ox = people ? "#6f1d22" : "#161821";
  const trim = people ? "#a88445" : "#d4b15a";

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow={false}>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color={floor} roughness={0.86} metalness={people ? 0.04 : 0.35} />
      </mesh>
      <mesh position={[0, 2.2, -5.4]}>
        <boxGeometry args={[16, 7, 0.35]} />
        <meshStandardMaterial color={ox} roughness={0.9} />
      </mesh>
      <mesh position={[-6.4, 1.6, -1.2]} rotation={[0, 0.18, 0]}>
        <boxGeometry args={[0.4, 6.2, 10]} />
        <meshStandardMaterial color={wall} roughness={0.88} />
      </mesh>
      <mesh position={[6.6, 1.6, -1.2]} rotation={[0, -0.12, 0]}>
        <boxGeometry args={[0.4, 6.2, 10]} />
        <meshStandardMaterial color={wall} roughness={0.88} />
      </mesh>
      {/* window light plane */}
      <mesh position={[6.35, 2.1, -1.8]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 3.2]} />
        <meshBasicMaterial color={people ? "#f4ead8" : "#c5d0dc"} transparent opacity={0.55} />
      </mesh>
      {/* plinth */}
      <mesh position={[0, -0.72, 0]}>
        <boxGeometry args={[1.6, 0.66, 1.6]} />
        <meshStandardMaterial color={people ? "#d9cbb6" : "#1a1d28"} roughness={0.78} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.36, 0]}>
        <boxGeometry args={[1.28, 0.12, 1.28]} />
        <meshStandardMaterial color={trim} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* candle stand (people) / filament post (agents) */}
      <mesh position={[-2.4, -0.2, -1.6]}>
        <cylinderGeometry args={[0.03, 0.05, 1.6, degrade ? 6 : 8]} />
        <meshStandardMaterial color={people ? "#2a1c14" : "#d4b15a"} metalness={0.8} roughness={0.3} emissive={people ? "#000" : "#c9a227"} emissiveIntensity={people ? 0 : 0.4} />
      </mesh>
      <mesh position={[-2.4, 0.68, -1.6]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color={people ? "#f0c27a" : "#e0c36a"} />
      </mesh>
      <pointLight position={[-2.4, 0.7, -1.6]} color={people ? "#f0c27a" : "#d4b15a"} intensity={0.7} distance={5} />
      {/* gold filament floor inlay for agents */}
      {!people ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.03, 0]}>
          <ringGeometry args={[1.8, 1.84, degrade ? 24 : 48]} />
          <meshBasicMaterial color="#d4b15a" />
        </mesh>
      ) : null}
      <group position={[0, 0.22, 0]} scale={0.82}>
        <Relic tone={tone} />
      </group>
    </group>
  );
}

export function LoginHall({
  tone = "people",
  className = "bs-scene bs-scene-hall",
}: {
  tone?: Tone;
  className?: string;
}) {
  return (
    <Scene
      className={className}
      still={STILLS[tone].hall}
      stillAlt={tone === "people" ? "Limestone hall with bronze relic" : "Obsidian hall with gold filament relic"}
      mode="hall"
      lookAt={[0, 0.35, 0]}
      alpha={false}
      tone={tone}
    >
      <HallArchitecture tone={tone} />
    </Scene>
  );
}
