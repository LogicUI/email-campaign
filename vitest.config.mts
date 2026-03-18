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
    setupFiles: ["./test/setup/vitest.setup.ts"],
    include: ["app/**/*.test.ts", "app/**/*.test.tsx", "test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
