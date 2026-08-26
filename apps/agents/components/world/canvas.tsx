"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Preload } from "@react-three/drei";
import { usePathname } from "next/navigation";
import { CameraRig } from "./camera-rig";
import { Hall } from "./hall";
import { Plinth, RelicOnPlinth } from "./sculpture";
import { Motes, ReflectionRig } from "./atmosphere";
import { sceneFromPath } from "./scenes";
import { usePageVisible, usePrefersReducedMotion } from "./motion";

function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <color attach="background" args={["#07060b"]} />
      <fog attach="fog" args={["#07060b", 10, 34]} />
      <hemisphereLight args={["#c5d4ea", "#07080c", 0.18]} />
      <ambientLight intensity={0.07} color="#8b95a4" />
      <spotLight
        position={[6.2, 7.4, 2.2]}
        intensity={36}
        angle={0.36}
        penumbra={0.9}
        color="#d7dee8"
        castShadow={shadows}
        shadow-mapSize-width={shadows ? 1024 : 256}
        shadow-mapSize-height={shadows ? 1024 : 256}
        shadow-bias={-0.0002}
      />
      <pointLight position={[0, 1.7, 0.2]} intensity={8} color="#d4b15a" distance={9} />
      <pointLight position={[-3.6, 3.2, 12]} intensity={4} color="#c5d4ea" distance={14} />
      <directionalLight position={[-4, 8, 10]} intensity={0.28} color="#8b95a4" />
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
      <RelicOnPlinth reduced={reduced} />
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
        camera={{ position: [0, 1.8, 20], fov: 38, near: 0.1, far: 70 }}
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
