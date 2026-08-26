"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Preload } from "@react-three/drei";
import { usePathname } from "next/navigation";
import { CameraRig } from "./camera-rig";
import { Hall } from "./hall";
import { Plinth } from "./sculpture";
import { Relic } from "@bs/ui";
import { Motes, ReflectionRig } from "./atmosphere";
import { sceneFromPath } from "./scenes";
import { usePageVisible, usePrefersReducedMotion } from "./motion";

function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <color attach="background" args={["#0b0907"]} />
      <fog attach="fog" args={["#0b0907", 9, 32]} />
      <hemisphereLight args={["#f0d7a4", "#1a120c", 0.22]} />
      <ambientLight intensity={0.08} />
      <spotLight
        position={[6.5, 7.2, 2]}
        intensity={48}
        angle={0.38}
        penumbra={0.85}
        color="#f0d4a0"
        castShadow={shadows}
        shadow-mapSize-width={shadows ? 1024 : 256}
        shadow-mapSize-height={shadows ? 1024 : 256}
        shadow-bias={-0.0002}
      />
      <pointLight position={[-3.8, 3.4, 12.5]} intensity={6} color="#e8c07a" distance={14} />
      <pointLight position={[0, 3.2, -8.2]} intensity={10} color="#f5ead2" distance={10} />
      <directionalLight position={[-4, 8, 10]} intensity={0.35} color="#c9b08a" />
    </>
  );
}

function Pulse({ reduced, live }: { reduced: boolean; live: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (reduced || !live) return;
    const id = window.setInterval(() => invalidate(), 90);
    return () => window.clearInterval(id);
  }, [reduced, live, invalidate]);
  return null;
}

function World({ reduced, live }: { reduced: boolean; live: boolean }) {
  const path = usePathname() || "/";
  const scene = sceneFromPath(path);
  const shadows = !reduced && live;
  return (
    <>
      <Lights shadows={shadows} />
      <ReflectionRig />
      <CameraRig scene={scene} reduced={reduced} />
      <Hall />
      <Plinth />
      <group position={[0, 1.18, 0]} scale={1.08}>
        <Relic tone="people" degrade={reduced} />
      </group>
      <Motes reduced={reduced} />
      <Pulse reduced={reduced} live={live} />
      <Preload all />
    </>
  );
}

export default function WorldCanvas() {
  const wrap = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const visible = usePageVisible(wrap);
  const [lost, setLost] = useState(false);
  const live = visible && !lost;

  if (lost) return null;

  return (
    <div ref={wrap} className="world-root scene-canvas" data-3d-scene="gallery-hall" aria-hidden="true">
      <Canvas
        dpr={reduced ? [1, 1] : [1, 1.5]}
        frameloop={live ? "demand" : "never"}
        shadows={!reduced}
        gl={{
          antialias: !reduced,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 1.8, 20], fov: 40, near: 0.1, far: 70 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            "webglcontextlost",
            (e) => {
              e.preventDefault();
              setLost(true);
            },
            { once: true },
          );
        }}
        performance={{ min: 0.45, max: 1, debounce: 200 }}
      >
        <AdaptiveDpr pixelated />
        <Suspense fallback={null}>
          <World reduced={reduced} live={live} />
        </Suspense>
      </Canvas>
    </div>
  );
}
