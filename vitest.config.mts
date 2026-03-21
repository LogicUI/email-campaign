import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./app/tests/setup/vitest.setup.ts"],
    include: ["app/tests/**/*.test.ts", "app/tests/**/*.test.tsx"],
  },
});
