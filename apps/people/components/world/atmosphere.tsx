"use client";

import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { usePathname } from "next/navigation";
import * as THREE from "three";
import { STILLS } from "@bs/ui";

export function ReflectionRig() {
  const path = usePathname();
  const still =
    path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/forgot")
      ? STILLS.people.hall
      : path.startsWith("/account")
        ? STILLS.people.environmentMark
        : STILLS.people.hero;
  return (
    <Suspense fallback={null}>
      <ReflectionTexture url={still} />
    </Suspense>
  );
}

function ReflectionTexture({ url }: { url: string }) {
  const texture = useTexture(url);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    scene.environment = texture;
    return () => {
      scene.environment = null;
    };
  }, [texture, scene]);
  return null;
}

export function Motes({ reduced, count = 72 }: { reduced: boolean; count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 12,
        y: 0.4 + Math.random() * 5.2,
        z: -12 + Math.random() * 28,
        s: 0.012 + Math.random() * 0.02,
        p: Math.random() * Math.PI * 2,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    if (reduced || !mesh.current) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      dummy.position.set(s.x + Math.sin(t * 0.12 + s.p) * 0.25, s.y + Math.sin(t * 0.18 + s.p) * 0.18, s.z);
      dummy.scale.setScalar(s.s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  if (reduced) return null;
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#e6d3a4" transparent opacity={0.28} depthWrite={false} />
    </instancedMesh>
  );
}
