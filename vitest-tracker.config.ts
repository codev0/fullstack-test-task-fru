import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["tracker/**/*.{test,spec}.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
