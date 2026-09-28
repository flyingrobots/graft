import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { graftRootPath, graftRootPipeKey, InvalidGraftRootPathError } from "../../../src/adapters/graft-root.js";
import { defaultDaemonRoot } from "../../../src/mcp/daemon-bootstrap.js";

// Promise: Graft finds its per-user root from GRAFT_ROOT_PATH, and only falls
// back to <home>/.graft when the variable is unset. Nothing else in Graft reads
// the home directory, so pointing GRAFT_ROOT_PATH elsewhere moves every
// per-user default without touching HOME, which git, ssh and gh also read.
const HOME = "/home/fixture";

describe("Graft root path", () => {
  it("uses GRAFT_ROOT_PATH when it is set", () => {
    expect(graftRootPath({ GRAFT_ROOT_PATH: "/srv/graft" }, () => HOME)).toBe("/srv/graft");
  });

  it("falls back to <home>/.graft when GRAFT_ROOT_PATH is unset or empty", () => {
    expect(graftRootPath({}, () => HOME)).toBe(path.join(HOME, ".graft"));
    expect(graftRootPath({ GRAFT_ROOT_PATH: "" }, () => HOME)).toBe(path.join(HOME, ".graft"));
  });

  it("refuses a relative GRAFT_ROOT_PATH, which daemon and clients could resolve differently", () => {
    expect(() => graftRootPath({ GRAFT_ROOT_PATH: "graft-state" }, () => HOME)).toThrow(InvalidGraftRootPathError);
  });

  it("derives the default daemon root from the Graft root", () => {
    expect(defaultDaemonRoot(graftRootPath({ GRAFT_ROOT_PATH: "/srv/graft" }, () => HOME))).toBe(path.join("/srv/graft", "daemon"));
    expect(defaultDaemonRoot(graftRootPath({}, () => HOME))).toBe(path.join(HOME, ".graft", "daemon"));
  });

  it("keeps the Windows pipe name of an unset root, so existing daemons are still found", () => {
    expect(graftRootPipeKey({}, () => HOME)).toBe(HOME);
    expect(graftRootPipeKey({ GRAFT_ROOT_PATH: "/srv/graft" }, () => HOME)).toBe("/srv/graft");
  });
});

describe("test harness: Graft root isolation", () => {
  // Oracle: the account database names the real home independently of any
  // environment variable; no test may default into it.
  const realHome = os.userInfo().homedir;
  const within = (root: string, target: string): boolean => {
    const relative = path.relative(root, target);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  };

  it("points every per-user default outside the real home, without changing HOME", () => {
    expect(process.env["HOME"]).toBe(realHome);
    expect(within(realHome, graftRootPath())).toBe(false);
    expect(within(realHome, defaultDaemonRoot())).toBe(false);
  });
});

describe("home directory reads", () => {
  // The home directory decides only the default Graft root. Any other read would
  // put a per-user default outside GRAFT_ROOT_PATH's control.
  const root = path.resolve(import.meta.dirname, "../../..");
  const sources = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sources(full);
      return entry.name.endsWith(".ts") ? [full] : [];
    });

  it("happen only in the Graft root resolver", () => {
    const readers = sources(path.join(root, "src"))
      .filter((file) => /\bhomedir\b|env\[\s*["']HOME["']\s*\]|env\.HOME\b/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file));
    expect(readers).toEqual(["src/adapters/graft-root.ts"]);
  });
});
