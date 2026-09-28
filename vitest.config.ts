import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "tests/**/*.test.ts"],
    globalSetup: ["test/global-setup-fresh-dist.ts"],
    setupFiles: ["test/setup-canonical-tmpdir.ts", "test/setup-graft-root.ts", "test/setup-parser.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
    },
  },
});
