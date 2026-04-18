import { describe, it, expect } from "vitest";

/**
 * Conformance test for the hand-written src/warp/plumbing.d.ts
 * ambient declaration. Validates that the actual @git-stunts/plumbing
 * runtime shape matches what the declaration claims, catching drift
 * before it becomes a runtime surprise.
 */
describe("ports: @git-stunts/plumbing declaration conformance", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@git-stunts/plumbing");
  const GitPlumbing = mod.default ?? mod;

  it("default export is a constructor function", () => {
    expect(typeof GitPlumbing).toBe("function");
    expect(GitPlumbing.prototype).toBeDefined();
  });

  it("exposes createDefault static method", () => {
    expect(typeof GitPlumbing.createDefault).toBe("function");
  });

  it("prototype has execute method", () => {
    expect(typeof GitPlumbing.prototype.execute).toBe("function");
  });

  it("prototype has executeStream method", () => {
    expect(typeof GitPlumbing.prototype.executeStream).toBe("function");
  });

  it("prototype has emptyTree getter", () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      GitPlumbing.prototype,
      "emptyTree",
    );
    // emptyTree can be either a getter or a regular method/property
    expect(descriptor).toBeDefined();
  });

  it("createDefault produces an instance with the expected methods", () => {
    const instance = GitPlumbing.createDefault({ cwd: process.cwd() });
    expect(typeof instance.execute).toBe("function");
    expect(typeof instance.executeStream).toBe("function");
    expect(typeof instance.emptyTree).toBe("string");
  });
});
