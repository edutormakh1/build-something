"use client";

import { Relic } from "./relic";
import { Scene } from "./scene";
import { STILLS, type Tone } from "./tone";

export default function TransitVeil({ tone }: { tone: Tone }) {
  return (
    <div className="bs-transit" aria-hidden="true">
      <Scene
        className="bs-scene"
        still={STILLS[tone].mark}
        mode="transit"
        lookAt={[0, 0, 0]}
        alpha
        tone={tone}
        camera={{ fov: 28, position: [0, 0.2, 4.2] }}
      >
        <Relic tone={tone} scale={1.15} />
      </Scene>
    </div>
  );
}
