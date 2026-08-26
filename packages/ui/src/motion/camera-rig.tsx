"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

export type CameraRigMode = "mark" | "plinth" | "hall" | "transit";

const RIG: Record<CameraRigMode, { z: number; y: number; wander: number; pointer: number; lerp: number }> = {
  mark: { z: 2.75, y: 0.06, wander: 0.07, pointer: 0.16, lerp: 0.05 },
  plinth: { z: 3.55, y: 0.18, wander: 0.11, pointer: 0.26, lerp: 0.045 },
  hall: { z: 7.4, y: 1.15, wander: 0.18, pointer: 0.32, lerp: 0.035 },
  transit: { z: 4.4, y: 0.45, wander: 0.55, pointer: 0.04, lerp: 0.07 },
};

export function CameraRig({
  mode = "plinth",
  lookAt = [0, 0, 0],
}: {
  mode?: CameraRigMode;
  lookAt?: [number, number, number];
}) {
  const cfg = RIG[mode];
  const desired = useRef(new Vector3());
  const look = useRef(new Vector3(lookAt[0], lookAt[1], lookAt[2]));
  const lookGoal = useRef(new Vector3(lookAt[0], lookAt[1], lookAt[2]));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const px = state.pointer.x;
    const py = state.pointer.y;
    lookGoal.current.set(lookAt[0], lookAt[1], lookAt[2]);
    desired.current.set(
      Math.sin(t * 0.17) * cfg.wander + px * cfg.pointer,
      cfg.y + Math.cos(t * 0.13) * cfg.wander * 0.5 + py * cfg.pointer * 0.4,
      cfg.z + Math.sin(t * 0.09) * cfg.wander * 0.28,
    );
    state.camera.position.lerp(desired.current, cfg.lerp);
    look.current.lerp(lookGoal.current, 0.08);
    state.camera.lookAt(look.current);
    if (Math.abs(px) + Math.abs(py) > 0.9) state.performance.regress();
  });

  return null;
}
