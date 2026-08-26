"use client";

import { useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from "@react-three/drei";
import { CameraRig, type CameraRigMode } from "./camera-rig";
import { QualityContext } from "./quality";
import { SceneLights } from "./scene-lights";
import type { Tone } from "./tone";

/** Client-only r3f tree. Never imported during SSR. */
export default function LiveScene({
  children,
  playing,
  mode = "plinth",
  lookAt = [0, 0, 0],
  alpha = true,
  tone = "people",
  camera,
}: {
  children: ReactNode;
  playing: boolean;
  mode?: CameraRigMode;
  lookAt?: [number, number, number];
  alpha?: boolean;
  tone?: Tone;
  camera?: { fov?: number; position?: [number, number, number] };
}) {
  const [degrade, setDegrade] = useState(false);
  const pos =
    camera?.position ??
    (mode === "hall" ? ([0, 1.15, 7.4] as [number, number, number]) : ([0, 0.12, 3.2] as [number, number, number]));
  const fov = camera?.fov ?? (mode === "hall" ? 34 : 32);

  return (
    <Canvas
      frameloop={playing ? "always" : "never"}
      dpr={degrade ? [0.75, 1] : [1, 1.5]}
      gl={{
        antialias: !degrade,
        alpha,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      camera={{ fov, position: pos, near: 0.1, far: 40 }}
      performance={{ min: 0.35, max: 1, debounce: 200 }}
      style={{
        position: "absolute",
        inset: 0,
        background: alpha ? "transparent" : "var(--paper)",
      }}
    >
      <QualityContext.Provider value={{ degrade }}>
        <AdaptiveDpr pixelated={degrade} />
        <AdaptiveEvents />
        <PerformanceMonitor
          onDecline={() => setDegrade(true)}
          onIncline={() => setDegrade(false)}
          flipflops={3}
          onFallback={() => setDegrade(true)}
        />
        <CameraRig mode={mode} lookAt={lookAt} />
        <SceneLights tone={tone} degrade={degrade} />
        {children}
      </QualityContext.Provider>
    </Canvas>
  );
}
