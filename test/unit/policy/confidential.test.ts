import { describe, expect, it } from "vitest";
import { isConfidentialPath } from "../../../src/policy/confidential.js";
import { evaluatePolicy } from "../../../src/policy/evaluate.js";
import { RefusedResult } from "../../../src/policy/types.js";

// Oracle: a file is confidential when its name is one the SECRET ban names,
// whatever reason the ordered bans would display for its path.
describe("policy: confidential content", () => {
  it("classifies every name the SECRET ban refuses as confidential", () => {
    for (const filePath of [".env", ".env.local", "server.pem", "deploy.key", "credentials.json"]) {
      const refusal = evaluatePolicy({ path: filePath, lines: 1, bytes: 1 });
      expect(refusal).toBeInstanceOf(RefusedResult);
      expect(refusal.reason, filePath).toBe("SECRET");
      expect(isConfidentialPath(filePath), filePath).toBe(true);
    }
  });

  it("stays confidential when another ban wins the displayed reason", () => {
    for (const filePath of ["dist/.env", "build/credentials.json", "out/tls/server.pem"]) {
      expect(evaluatePolicy({ path: filePath, lines: 1, bytes: 1 }).reason, filePath).toBe("BUILD_OUTPUT");
      expect(isConfidentialPath(filePath), filePath).toBe(true);
    }
    expect(evaluatePolicy({ path: "certs/root.key.png", lines: 1, bytes: 1 }).reason).toBe("BINARY");
    expect(isConfidentialPath("certs/root.key.png")).toBe(false);
  });

  it("does not classify ordinary or example files as confidential", () => {
    for (const filePath of [".env.example", "src/env.ts", "docs/my-credentials.md", "keys/index.ts", "dist/app.js"]) {
      expect(isConfidentialPath(filePath), filePath).toBe(false);
    }
  });
});
