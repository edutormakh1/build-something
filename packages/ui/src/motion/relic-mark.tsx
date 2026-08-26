"use client";

import { Relic } from "./relic";
import { Scene } from "./scene";
import { STILLS, type Tone } from "./tone";

export function RelicMark({ tone = "people" }: { tone?: Tone }) {
  return (
    <Scene
      className="bs-scene bs-relic"
      still={STILLS[tone].mark}
      stillAlt=""
      mode="mark"
      alpha
      tone={tone}
      camera={{ fov: 28, position: [0, 0.05, 2.7] }}
    >
      <Relic tone={tone} scale={0.92} />
    </Scene>
  );
}

export function RelicPlinth({ tone = "people" }: { tone?: Tone }) {
  return (
    <Scene
      className="bs-scene bs-scene-plinth"
      still={STILLS[tone].hero}
      stillAlt={tone === "people" ? "Bronze and glass relic" : "Obsidian relic with gold filament"}
      mode="plinth"
      alpha
      tone={tone}
    >
      <Relic tone={tone} />
    </Scene>
  );
}
