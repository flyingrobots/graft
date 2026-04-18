import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createGraftServer } from "../../../src/mcp/server.js";
import { parse } from "../../helpers/mcp.js";

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-root-test-"));
  cleanups.push(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

describe("project root resolution", () => {
  it("uses explicit projectRoot over GRAFT_PROJECT_ROOT env var", async () => {
    const explicit = makeTmpDir();
    const envRoot = makeTmpDir();

    const server = createGraftServer({
      projectRoot: explicit,
      graftDir: path.join(explicit, ".graft"),
      env: { GRAFT_PROJECT_ROOT: envRoot },
    });

    const result = await server.callTool("doctor", {});
    expect(parse(result)["projectRoot"]).toBe(explicit);
  });

  it("uses GRAFT_PROJECT_ROOT env var when projectRoot option is not provided", async () => {
    const envRoot = makeTmpDir();

    const server = createGraftServer({
      graftDir: path.join(envRoot, ".graft"),
      env: { GRAFT_PROJECT_ROOT: envRoot },
    });

    const result = await server.callTool("doctor", {});
    expect(parse(result)["projectRoot"]).toBe(envRoot);
  });

  it("falls back gracefully when neither projectRoot nor env var is set", async () => {
    const tmpDir = makeTmpDir();

    const server = createGraftServer({
      graftDir: path.join(tmpDir, ".graft"),
      env: {},
    });

    const result = await server.callTool("doctor", {});
    const projectRoot = parse(result)["projectRoot"];
    // With env={} and no projectRoot, resolves to git root or process.cwd().
    expect(projectRoot).toBeDefined();
    expect(typeof projectRoot).toBe("string");
  });
});
