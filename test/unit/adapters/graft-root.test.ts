import * as fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import nodeOs from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { graftRootPath, graftRootPipeKey, InvalidGraftRootPathError } from "../../../src/adapters/graft-root.js";
import { defaultDaemonRoot, resolveSocketPath } from "../../../src/mcp/daemon-bootstrap.js";
import { graftTestRoot, homeBeforeSetup } from "../../setup-graft-root.js";

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

  it("on Windows, accepts only a drive or UNC root, since a rooted path's drive depends on the process", () => {
    // Oracle: Windows path semantics. `\graft` and `/graft` are rooted on the
    // current drive and `C:graft` is relative to that drive's working
    // directory, so two processes can resolve any of them differently.
    const onWindows = (value: string): string => graftRootPath({ GRAFT_ROOT_PATH: value }, () => "C:\\Users\\fixture", "win32");
    for (const driveDependent of ["\\graft", "/graft", "C:graft"]) {
      expect(() => onWindows(driveDependent), driveDependent).toThrow(InvalidGraftRootPathError);
    }
    expect(onWindows("C:\\srv\\graft")).toBe("C:\\srv\\graft");
    expect(onWindows("d:/srv/graft")).toBe("d:\\srv\\graft");
    expect(onWindows("\\\\server\\share\\graft")).toBe("\\\\server\\share\\graft");
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

describe("default Windows daemon pipe", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    syncBuiltinESMExports();
  });

  it("is byte-identical to the name Graft used before GRAFT_ROOT_PATH existed when the variable is unset", () => {
    // Oracle: a reference vector, produced by running origin/main's
    // resolveSocketPath (c2a297a4, before GRAFT_ROOT_PATH) with platform win32
    // and os.homedir() returning C:\Users\fixture. A client built from this
    // branch must find a daemon started by that release.
    const legacyPipe = "\\\\.\\pipe\\graft-daemon-594fc3122879";
    vi.stubEnv("GRAFT_ROOT_PATH", undefined);
    vi.spyOn(nodeOs, "homedir").mockReturnValue("C:\\Users\\fixture");
    syncBuiltinESMExports();

    expect(resolveSocketPath(undefined, "C:\\Users\\fixture\\.graft\\daemon", undefined, { platform: "win32" })).toBe(legacyPipe);
  });

  it("follows an injected environment's GRAFT_ROOT_PATH, whatever the process's own says", () => {
    // Oracle: a relation, not a digest. The pipe for an injected root must not
    // move when only the ambient variable changes, and must move with the root.
    const pipe = (injectedRoot: string, ambientRoot: string): string => {
      vi.stubEnv("GRAFT_ROOT_PATH", ambientRoot);
      return resolveSocketPath(undefined, "unused", undefined, { platform: "win32", env: { GRAFT_ROOT_PATH: injectedRoot } });
    };
    expect(pipe("C:\\srv\\graft", "/ambient/one")).toBe(pipe("C:\\srv\\graft", "/ambient/two"));
    expect(pipe("C:\\srv\\graft", "/ambient/one")).not.toBe(pipe("C:\\srv\\other", "/ambient/one"));
  });

  it("is the same for every spelling of one configured Windows root", () => {
    // Oracle: Windows path equivalence. Drive letters and ASCII names compare
    // without case, `/` and `\` are both separators, and a trailing separator
    // names the same directory, so a client and a daemon given differently
    // spelled roots share the state directory and must share its pipe.
    const pipe = (root: string): string =>
      resolveSocketPath(undefined, "unused", undefined, { platform: "win32", env: { GRAFT_ROOT_PATH: root } });
    const spellings = ["C:\\Graft", "c:\\graft", "C:/GRAFT/", "c:\\Graft\\\\"];
    expect(new Set(spellings.map(pipe)).size).toBe(1);
    expect(pipe("C:\\Graft")).not.toBe(pipe("C:\\Graft2"));
  });
});

describe("test harness: Graft root isolation", () => {
  it("leaves HOME as the process received it", () => {
    // Oracle: HOME recorded by the setup file before it did anything. HOME may
    // legitimately differ from the account database's home (a sandbox, a
    // container, a service account), so that is not the reference.
    expect(process.env["HOME"]).toBe(homeBeforeSetup);
  });

  it("puts every per-user default in the setup's private temporary root", () => {
    // Oracle: the directory the setup file created for this test file. A fresh
    // mkdtemp directory cannot be the developer's real ~/.graft, and exact
    // equality holds on Windows too, where the temp directory itself lies
    // inside the user profile.
    expect(graftRootPath()).toBe(graftTestRoot);
    expect(defaultDaemonRoot()).toBe(path.join(graftTestRoot, "daemon"));
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
