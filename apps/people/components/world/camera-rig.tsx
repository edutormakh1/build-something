"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SCENES, type SceneId } from "./scenes";

export function CameraRig({ scene, reduced }: { scene: SceneId; reduced: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  const look = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const desiredLook = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());
  const mouse = useRef({ x: 0, y: 0 });
  const moving = useRef(true);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!reduced) invalidate();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [invalidate, reduced]);

  useLayoutEffect(() => {
    const cfg = SCENES[scene];
    if (reduced) {
      camera.position.set(...cfg.pos);
      camera.lookAt(...cfg.look);
      camera.fov = cfg.fov;
      camera.updateProjectionMatrix();
      invalidate();
    } else {
      moving.current = true;
      invalidate();
    }
  }, [scene, reduced, camera, invalidate]);

  useFrame((_, dt) => {
    if (reduced) return;
    const cfg = SCENES[scene];
    const parallax = 0.22;
    desired.current.set(
      cfg.pos[0] + mouse.current.x * parallax,
      cfg.pos[1] - mouse.current.y * parallax * 0.35,
      cfg.pos[2],
    );
    desiredLook.current.set(
      cfg.look[0] + mouse.current.x * 0.12,
      cfg.look[1] - mouse.current.y * 0.06,
      cfg.look[2],
    );
    const k = 1 - Math.exp(-dt * 2.35);
    camera.position.lerp(desired.current, k);
    look.current.lerp(desiredLook.current, k);
    camera.lookAt(look.current);
    const fov = camera.fov + (cfg.fov - camera.fov) * k;
    if (Math.abs(fov - camera.fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const dist = tmp.current.copy(camera.position).sub(desired.current).length();
    if (dist > 0.004 || Math.abs(cfg.fov - camera.fov) > 0.05) {
      moving.current = true;
      invalidate();
    } else {
      moving.current = false;
    }
  });

  return null;
}
