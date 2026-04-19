import { describe, it, expect } from "vitest";
import { scrubSecrets, sanitizeArgValues } from "../../../src/mcp/secret-scrub.js";

describe("scrubSecrets", () => {
  it("redacts private key blocks", () => {
    const input = "before\n-----BEGIN RSA PRIVATE KEY-----\nMIIEpA...\n-----END RSA PRIVATE KEY-----\nafter";
    const { value, redactions } = scrubSecrets(input);
    expect(value).toContain("[REDACTED PRIVATE KEY BLOCK]");
    expect(value).not.toContain("MIIEpA");
    expect(redactions).toBe(1);
  });

  it("redacts secret assignment patterns", () => {
    const cases = [
      "api_key=sk-1234567890",
      "access_token: ghp_xxxx",
      "password=hunter2",
      "client_secret = abcdef",
      "TOKEN=my-secret-token",
    ];
    for (const input of cases) {
      const { value, redactions } = scrubSecrets(input);
      expect(value).toContain("[REDACTED]");
      expect(redactions).toBeGreaterThan(0);
    }
  });

  it("redacts bearer tokens in non-assignment context", () => {
    const input = "Header bearer eyJhbGciOiJIUzI1NiJ9.payload.signature";
    const { value, redactions } = scrubSecrets(input);
    expect(value).toContain("bearer [REDACTED]");
    expect(value).not.toContain("eyJhbGci");
    expect(redactions).toBe(1);
  });

  it("redacts authorization assignment pattern", () => {
    const input = "Authorization: bearer eyJhbGciOiJIUzI1NiJ9.payload.signature";
    const { value, redactions } = scrubSecrets(input);
    expect(value).toContain("[REDACTED]");
    expect(value).not.toContain("eyJhbGci");
    expect(redactions).toBeGreaterThanOrEqual(1);
  });

  it("does not redact normal text", () => {
    const input = "export const API_VERSION = 2;";
    const { value, redactions } = scrubSecrets(input);
    expect(value).toBe(input);
    expect(redactions).toBe(0);
  });

  it("handles multiple redactions in the same string", () => {
    const input = "api_key=secret1\npassword=secret2\nbearer my-long-token-value";
    const { redactions } = scrubSecrets(input);
    expect(redactions).toBe(3);
  });
});

describe("sanitizeArgValues", () => {
  it("passes through normal args", () => {
    const result = sanitizeArgValues({ path: "src/app.ts", start: 1, end: 10 });
    expect(result).toEqual({ end: 10, path: "src/app.ts", start: 1 });
  });

  it("redacts sensitive keys regardless of value", () => {
    const result = sanitizeArgValues({
      path: "src/app.ts",
      token: "ghp_xxxx",
      apiKey: "sk-1234",
      password: "hunter2",
    });
    expect(result["token"]).toBe("[REDACTED]");
    expect(result["apiKey"]).toBe("[REDACTED]");
    expect(result["password"]).toBe("[REDACTED]");
    expect(result["path"]).toBe("src/app.ts");
  });

  it("truncates oversized string values", () => {
    const longValue = "x".repeat(1000);
    const result = sanitizeArgValues({ content: longValue });
    const contentStr = result["content"] as string;
    expect(contentStr.length).toBeLessThan(longValue.length);
    expect(contentStr).toContain("[truncated");
    expect(contentStr).toContain("1000 chars");
  });

  it("scrubs secrets in non-sensitive string values", () => {
    const result = sanitizeArgValues({
      command: "curl -H 'Authorization: bearer eyJhbGciOiJIUzI1NiJ9.payload.sig'",
    });
    const command = result["command"] as string;
    expect(command).toContain("[REDACTED]");
    expect(command).not.toContain("eyJhbGci");
  });

  it("preserves non-string values as-is", () => {
    const result = sanitizeArgValues({ start: 1, end: 10, verbose: true });
    expect(result["start"]).toBe(1);
    expect(result["end"]).toBe(10);
    expect(result["verbose"]).toBe(true);
  });

  it("sorts keys", () => {
    const result = sanitizeArgValues({ z: 1, a: 2, m: 3 });
    expect(Object.keys(result)).toEqual(["a", "m", "z"]);
  });

  it("handles all sensitive key variants", () => {
    const sensitiveKeys = [
      "token", "apiKey", "api_key", "secret", "password", "passwd",
      "access_token", "accessToken", "authorization", "auth", "bearer",
      "private_key", "privateKey", "client_secret", "clientSecret",
      "session_key", "sessionKey", "credentials",
    ];
    const args: Record<string, unknown> = {};
    for (const key of sensitiveKeys) {
      args[key] = "sensitive-value";
    }
    const result = sanitizeArgValues(args);
    for (const key of sensitiveKeys) {
      expect(result[key]).toBe("[REDACTED]");
    }
  });
});
