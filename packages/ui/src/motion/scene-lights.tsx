"use client";

import type { Tone } from "./tone";

export function SceneLights({ tone, degrade }: { tone: Tone; degrade: boolean }) {
  const people = tone === "people";
  return (
    <>
      <ambientLight intensity={people ? 0.32 : 0.1} color={people ? "#f3ead9" : "#8b95a4"} />
      <hemisphereLight args={people ? ["#f7f1e4", "#6f1d22", 0.35] : ["#c5d0dc", "#07080c", 0.22]} />
      <directionalLight
        position={[3.8, 5.4, 2.6]}
        intensity={degrade ? 0.8 : people ? 1.35 : 0.55}
        color={people ? "#f0e6d2" : "#d7dee8"}
      />
      <directionalLight
        position={[-3.2, 1.6, -2.1]}
        intensity={people ? 0.28 : 0.18}
        color={people ? "#6f1d22" : "#d4b15a"}
      />
      <pointLight
        position={people ? [0.5, 0.2, 1.1] : [0, 0.15, 0.2]}
        intensity={degrade ? 0.25 : people ? 0.45 : 1.1}
        color={people ? "#c9a56a" : "#d4b15a"}
        distance={8}
      />
    </>
  );
}
