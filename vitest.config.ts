import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["test/setup-parser.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
    },
  },
});
