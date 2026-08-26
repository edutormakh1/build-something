export type SceneId = "home" | "hall" | "gallery" | "piece" | "chamber" | "library" | "wing";

export type ScenePose = {
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

/** Cinematic camera poses in the bronze/glass hall. +Z is the entrance. */
export const SCENES: Record<SceneId, ScenePose> = {
  home: { pos: [0, 1.62, 9.4], look: [0, 1.28, 0.2], fov: 38 },
  hall: { pos: [0.15, 1.52, 11.5], look: [0, 1.35, -7], fov: 36 },
  gallery: { pos: [-5.4, 1.85, 3.2], look: [2.2, 1.35, -1], fov: 48 },
  piece: { pos: [0.55, 1.48, 4.1], look: [0, 1.22, 0], fov: 32 },
  chamber: { pos: [1.6, 1.42, 5.4], look: [0, 1.45, 0], fov: 34 },
  library: { pos: [3.4, 2.05, 8.2], look: [-0.6, 1.1, -1.4], fov: 44 },
  wing: { pos: [2.1, 1.72, 10.5], look: [0, 1.2, 0], fov: 42 },
};

export function sceneFromPath(path: string): SceneId {
  if (path === "/login" || path === "/signup" || path === "/forgot-password") return "hall";
  if (path === "/") return "home";
  if (path.startsWith("/products/")) return "piece";
  if (path.startsWith("/products") || path.startsWith("/categories") || path.startsWith("/best") || path.startsWith("/alternatives") || path.startsWith("/compare")) return "gallery";
  if (path.startsWith("/account") || path.startsWith("/admin") || path.startsWith("/submit") || path === "/reviews") return "chamber";
  if (path.startsWith("/blog") || path.startsWith("/authors") || path.startsWith("/methodology") || path.startsWith("/editorial")) return "library";
  return "wing";
}
