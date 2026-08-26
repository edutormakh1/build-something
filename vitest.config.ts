import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@bs/db": path.resolve(__dirname, "packages/db/src/index.ts"),
      "@bs/seo": path.resolve(__dirname, "packages/seo/src/index.ts"),
      "@bs/ui": path.resolve(__dirname, "packages/ui/src/index.ts"),
      "@bs/auth": path.resolve(__dirname, "packages/auth/src/index.ts"),
    },
  },
});
