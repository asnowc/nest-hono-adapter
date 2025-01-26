import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  esbuild: {
    target: "ESNext",
  },
  test: {
    alias: {
      "nest-hono-adapter": path.join(import.meta.dirname!, "src/mod.ts"),
    },
  },
});
