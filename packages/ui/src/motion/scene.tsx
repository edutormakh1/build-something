"use client";

import { useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from "@react-three/drei";
import { CameraRig, type CameraRigMode } from "./camera-rig";
import { useInViewport, useReducedMotion } from "./hooks";
import { QualityContext } from "./quality";
import type { Tone } from "./tone";

export function Scene({
  children,
  className = "bs-scene",
  still,
  stillAlt = "",
  mode = "plinth",
  lookAt = [0, 0, 0],
  alpha = true,
  tone = "people",
  camera,
}: {
  children: ReactNode;
  className?: string;
  still: string;
  stillAlt?: string;
  mode?: CameraRigMode;
  lookAt?: [number, number, number];
  alpha?: boolean;
  tone?: Tone;
  camera?: { fov?: number; position?: [number, number, number] };
}) {
  const reduced = useReducedMotion();
  const { setNode, playing } = useInViewport<HTMLDivElement>(!reduced);
  const [degrade, setDegrade] = useState(false);

  if (reduced) {
    return (
      <div className={className} data-tone={tone}>
        <img className="bs-still" src={still} alt={stillAlt} />
      </div>
    );
  }

  const pos = camera?.position ?? (mode === "hall" ? ([0, 1.15, 7.4] as [number, number, number]) : ([0, 0.12, 3.2] as [number, number, number]));
  const fov = camera?.fov ?? (mode === "hall" ? 34 : 32);

  return (
    <div ref={setNode} className={className} data-tone={tone} style={{ position: "relative" }}>
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
        style={{ background: alpha ? "transparent" : "var(--paper)" }}
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
    </div>
  );
}

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
