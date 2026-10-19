import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  {
    ignores: [
      "**/node_modules/**", "**/.next/**", "**/.open-next/**",
      "**/.wrangler/**", "**/.turbo/**", "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Existing Supabase helpers predate this gate. Keep their typing debt visible
    // until auth work replaces @ts-nocheck; all other TS rules still apply.
    files: ["packages/auth/src/server.ts", "packages/auth/src/middleware.ts"],
    rules: { "@typescript-eslint/ban-ts-comment": "warn" },
  },
  {
    // Footer JSON API resource links intentionally use anchors, not page routing.
    files: ["packages/ui/src/footer.tsx"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  {
    settings: {
      next: {
        rootDir: ["apps/people/", "apps/agents/"].map((dir) =>
          fileURLToPath(new URL(dir, import.meta.url))),
      },
    },
  },
];

export default config;
