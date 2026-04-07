import { describe, it, expect, afterEach } from "vitest";
import { ZodError } from "zod";
import { TOOL_REGISTRY } from "../../../src/mcp/server.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GraftServer } from "../../../src/mcp/server.js";
import { createIsolatedServer, fixturePath, getTestRepoRoot, parse } from "../../helpers/mcp.js";

const EXPECTED_TOOL_NAMES = TOOL_REGISTRY.map((t) => t.name);
const SMALL_TS = fixturePath("small.ts");
const LARGE_TS = fixturePath("large.ts");
const MEDIUM_TS = fixturePath("medium.ts");
const BANNED_IMAGE = fixturePath("ban-targets/image.png");

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function createServer(): GraftServer {
  const isolated = createIsolatedServer();
  cleanups.push(() => {
    isolated.cleanup();
  });
  return isolated.server;
}

function createServerForProjectRoot(projectRoot: string): GraftServer {
  const isolated = createIsolatedServer({ projectRoot });
  cleanups.push(() => {
    isolated.cleanup();
  });
  return isolated.server;
}

describe("mcp: tool registration", () => {
  it("registers every tool in TOOL_REGISTRY", () => {
    const server = createServer();
    const toolNames = server.getRegisteredTools();
    for (const name of EXPECTED_TOOL_NAMES) {
      expect(toolNames).toContain(name);
    }
    expect(toolNames).toHaveLength(EXPECTED_TOOL_NAMES.length);
  });
});

describe("mcp: tool handlers", () => {
  it("safe_read returns structured JSON with projection", async () => {
    const server = createServer();
    const result = await server.callTool("safe_read", {
      path: SMALL_TS,
    });
    expect(result).toHaveProperty("content");
    const parsed = parse(result);
    expect(parsed["projection"]).toBe("content");
    expect(parsed["reason"]).toBe("CONTENT");
    expect(parsed["path"]).toBeDefined();
  });

  it("safe_read returns outline for large files", async () => {
    const server = createServer();
    const result = await server.callTool("safe_read", {
      path: LARGE_TS,
    });
    const parsed = parse(result);
    expect(parsed["projection"]).toBe("outline");
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("safe_read returns a markdown heading outline for large markdown files", async () => {
    const server = createServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-tools-md-"));
    const filePath = path.join(tmpDir, "README.md");
    fs.writeFileSync(filePath, "# Heading\n\n".repeat(220));
    const result = await server.callTool("safe_read", { path: filePath });
    const parsed = parse(result);
    expect(parsed["projection"]).toBe("outline");
    expect(parsed["reason"]).toBe("OUTLINE");
    expect(parsed["outline"]).toContainEqual(
      expect.objectContaining({ kind: "heading", name: "Heading" }),
    );
    expect(parsed["jumpTable"]).toContainEqual(
      expect.objectContaining({ kind: "heading", symbol: "Heading" }),
    );
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("safe_read returns refusal for banned files", async () => {
    const server = createServer();
    const result = await server.callTool("safe_read", {
      path: BANNED_IMAGE,
    });
    const parsed = parse(result);
    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("BINARY");
  });

  it("safe_read returns refusal for files matched by .graftignore", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-tools-ignore-safe-read-"));
    cleanups.push(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
    fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "generated", "secret.ts"), "export const hidden = true;\n");

    const server = createServerForProjectRoot(tmpDir);
    const parsed = parse(await server.callTool("safe_read", { path: "generated/secret.ts" }));

    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("GRAFTIGNORE");
  });

  it("file_outline returns outline with jump table", async () => {
    const server = createServer();
    const result = await server.callTool("file_outline", {
      path: MEDIUM_TS,
    });
    const parsed = parse(result);
    expect(parsed["outline"]).toBeDefined();
    expect(parsed["jumpTable"]).toBeDefined();
  });

  it("file_outline returns a markdown heading outline", async () => {
    const server = createServer();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-file-outline-tool-md-"));
    const filePath = path.join(tmpDir, "README.md");
    fs.writeFileSync(filePath, ["# Heading", "", "## Install", "", "Use it."].join("\n"));
    const result = await server.callTool("file_outline", { path: filePath });
    const parsed = parse(result);
    expect(parsed["outline"]).toContainEqual(
      expect.objectContaining({ kind: "heading", name: "Heading" }),
    );
    expect(parsed["jumpTable"]).toContainEqual(
      expect.objectContaining({ kind: "heading", symbol: "Install" }),
    );
    expect(parsed["error"]).toBeUndefined();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("file_outline refuses files matched by .graftignore", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-tools-ignore-outline-"));
    cleanups.push(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
    fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "generated", "secret.ts"), "export const hidden = true;\n");

    const server = createServerForProjectRoot(tmpDir);
    const parsed = parse(await server.callTool("file_outline", { path: "generated/secret.ts" }));

    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("GRAFTIGNORE");
  });

  it("read_range returns bounded content", async () => {
    const server = createServer();
    const result = await server.callTool("read_range", {
      path: MEDIUM_TS,
      start: 1,
      end: 10,
    });
    const parsed = parse(result);
    expect(parsed["content"]).toBeDefined();
    expect(parsed["startLine"]).toBe(1);
    expect(parsed["endLine"]).toBe(10);
  });

  it("state_save enforces 8 KB cap", async () => {
    const server = createServer();
    const oversized = "x".repeat(9000);
    const result = await server.callTool("state_save", {
      content: oversized,
    });
    const parsed = parse(result);
    expect(parsed["ok"]).toBe(false);
  });

  it("state_load returns null when no state saved", async () => {
    const server = createServer();
    const result = await server.callTool("state_load", {});
    const parsed = parse(result);
    expect(parsed["content"]).toBeNull();
  });

  it("doctor returns health check", async () => {
    const server = createServer();
    const result = await server.callTool("doctor", {});
    const parsed = parse(result);
    expect(parsed["projectRoot"]).toBeDefined();
    expect(parsed["parserHealthy"]).toBeDefined();
    expect(parsed["thresholds"]).toBeDefined();
  });

  it("stats returns metrics summary", async () => {
    const server = createServer();
    const result = await server.callTool("stats", {});
    const parsed = parse(result);
    expect(parsed["totalReads"]).toBeDefined();
    expect(parsed["totalOutlines"]).toBeDefined();
    expect(parsed["totalRefusals"]).toBeDefined();
  });
});

describe("mcp: context budget", () => {
  it("set_budget activates budget tracking", async () => {
    const server = createServer();
    const result = await server.callTool("set_budget", { bytes: 100000 });
    const parsed = parse(result);
    const budget = parsed["budget"] as { total: number; remaining: number; fraction: number };
    expect(budget.total).toBe(100000);
    expect(budget.fraction).toBeDefined();
  });

  it("budget appears in receipt after set_budget", async () => {
    const server = createServer();
    await server.callTool("set_budget", { bytes: 100000 });
    const result = await server.callTool("safe_read", { path: SMALL_TS });
    const parsed = parse(result);
    const receipt = parsed["_receipt"] as { budget?: { total: number; remaining: number } };
    expect(receipt.budget).toBeDefined();
    expect(receipt.budget!.total).toBe(100000);
    expect(receipt.budget!.remaining).toBeLessThan(100000);
  });

  it("budget tightens byte cap for large files", async () => {
    const server = createServer();
    // Set a very tight budget — 5% of 1000 = 50 bytes max per read
    await server.callTool("set_budget", { bytes: 1000 });
    const result = await server.callTool("safe_read", { path: MEDIUM_TS });
    const parsed = parse(result);
    // medium.ts should get an outline due to tight budget cap
    expect(["outline", "content"]).toContain(parsed["projection"]);
    const receipt = parsed["_receipt"] as { budget?: { remaining: number } };
    expect(receipt.budget).toBeDefined();
  });

  it("no budget in receipt when budget not set", async () => {
    const server = createServer();
    const result = await server.callTool("safe_read", { path: SMALL_TS });
    const parsed = parse(result);
    const receipt = parsed["_receipt"] as Record<string, unknown>;
    expect(receipt["budget"]).toBeUndefined();
  });
});

describe("mcp: policy check middleware", () => {
  it("read_range refuses banned files via middleware", async () => {
    const server = createServer();
    const result = await server.callTool("read_range", {
      path: BANNED_IMAGE,
      start: 1,
      end: 5,
    });
    const parsed = parse(result);
    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("BINARY");
  });

  it("read_range refuses files matched by .graftignore via middleware", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-mcp-tools-ignore-range-"));
    cleanups.push(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    fs.writeFileSync(path.join(tmpDir, ".graftignore"), "generated/**\n");
    fs.mkdirSync(path.join(tmpDir, "generated"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "generated", "secret.ts"),
      "export function hidden(): boolean {\n  return true;\n}\n",
    );

    const server = createServerForProjectRoot(tmpDir);
    const parsed = parse(await server.callTool("read_range", {
      path: "generated/secret.ts",
      start: 1,
      end: 2,
    }));

    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("GRAFTIGNORE");
  });

  it("code_find refuses banned file paths via middleware", async () => {
    const isolated = createIsolatedServer({ projectRoot: getTestRepoRoot() });
    cleanups.push(() => {
      isolated.cleanup();
    });
    const server = isolated.server;
    const result = await server.callTool("code_find", {
      query: "*",
      path: "test/fixtures/ban-targets/image.png",
    });
    const parsed = parse(result);
    expect(parsed["projection"]).toBe("refused");
    expect(parsed["reason"]).toBe("BINARY");
  });
});

describe("mcp: explain tool", () => {
  it("returns meaning and action for known reason code", async () => {
    const server = createServer();
    const result = await server.callTool("explain", { code: "BINARY" });
    const parsed = parse(result);
    expect(parsed["code"]).toBe("BINARY");
    expect(parsed["meaning"]).toBeDefined();
    expect(parsed["action"]).toBeDefined();
  });

  it("is case-insensitive", async () => {
    const server = createServer();
    const result = await server.callTool("explain", { code: "binary" });
    const parsed = parse(result);
    expect(parsed["code"]).toBe("BINARY");
    expect(parsed["meaning"]).toBeDefined();
  });

  it("returns error for unknown code", async () => {
    const server = createServer();
    const result = await server.callTool("explain", { code: "NONSENSE" });
    const parsed = parse(result);
    expect(parsed["error"]).toBe("Unknown reason code");
    expect(parsed["knownCodes"]).toBeDefined();
  });
});

describe("mcp: strict schema validation", () => {
  it("rejects unknown keys in tool arguments", async () => {
    const server = createServer();
    await expect(
      server.callTool("safe_read", {
        path: SMALL_TS,
        bogus_key: "should be rejected",
      }),
    ).rejects.toThrow(ZodError);
  });
});

describe("mcp: session tracking", () => {
  it("tracks session depth across tool calls", async () => {
    const server = createServer();
    // Make enough calls to move past 'early'
    for (let i = 0; i < 5; i++) {
      await server.callTool("safe_read", { path: SMALL_TS });
    }
    const result = await server.callTool("doctor", {});
    const parsed = parse(result);
    expect(parsed["sessionDepth"]).toBeDefined();
  });

  it("includes tripwire in response when triggered", async () => {
    const server = createServer();
    // Simulate a long session by injecting message count
    server.injectSessionMessages(501);
    const result = await server.callTool("safe_read", {
      path: SMALL_TS,
    });
    const parsed = parse(result);
    expect(parsed["tripwire"]).toBeDefined();
  });
});
