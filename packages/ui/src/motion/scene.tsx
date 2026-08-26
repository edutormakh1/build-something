"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { CanvasErrorBoundary } from "./canvas-error-boundary";
import type { CameraRigMode } from "./camera-rig";
import { useInViewport, useReducedMotion } from "./hooks";
import type { Tone } from "./tone";

export { SceneLights } from "./scene-lights";

const LiveScene = dynamic(() => import("./live-scene"), { ssr: false });

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
  const stillImg = <img className="bs-still" src={still} alt={stillAlt} />;

  if (reduced) {
    return (
      <div className={className} data-tone={tone}>
        {stillImg}
      </div>
    );
  }

  return (
    <div ref={setNode} className={className} data-tone={tone} style={{ position: "relative" }}>
      {stillImg}
      <CanvasErrorBoundary fallback={null}>
        <LiveScene playing={playing} mode={mode} lookAt={lookAt} alpha={alpha} tone={tone} camera={camera}>
          {children}
        </LiveScene>
      </CanvasErrorBoundary>
    </div>
  );
}
