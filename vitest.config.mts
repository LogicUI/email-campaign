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
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "app/tests/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.config.{ts,mts,js}",
        "**/types/**",
        "**/zodSchemas/**",
        "app/core/persistence/migrations/**",
      ],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
});
