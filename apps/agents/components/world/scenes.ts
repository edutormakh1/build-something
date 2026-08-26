export type SceneId = "home" | "hall" | "gallery" | "piece" | "study" | "wing";

export type ScenePose = {
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

/** Camera stations around the obsidian relic. +Z is the night entrance. */
export const SCENES: Record<SceneId, ScenePose> = {
  home: { pos: [0.15, 1.58, 9.2], look: [0, 1.32, 0.15], fov: 36 },
  hall: { pos: [0.2, 1.48, 11.2], look: [0, 1.4, -7.2], fov: 34 },
  gallery: { pos: [-5.2, 1.9, 3.4], look: [1.8, 1.28, -0.8], fov: 46 },
  piece: { pos: [0.48, 1.46, 3.85], look: [0, 1.28, 0], fov: 30 },
  study: { pos: [-0.35, 1.38, 3.15], look: [0, 1.22, 0], fov: 28 },
  wing: { pos: [3.2, 1.85, 8.4], look: [-0.4, 1.15, -1.1], fov: 42 },
};

export function sceneFromPath(path: string): SceneId {
  if (path === "/login" || path === "/signup" || path === "/forgot-password") return "hall";
  if (path === "/") return "home";
  if (path.startsWith("/skills/")) return "study";
  if (path.startsWith("/products/")) return "piece";
  if (path.startsWith("/products") || path.startsWith("/categories")) return "gallery";
  if (path.startsWith("/scorecard") || path.startsWith("/methodology") || path.startsWith("/api") || path.startsWith("/for-agents") || path.startsWith("/about")) return "wing";
  return "wing";
}
