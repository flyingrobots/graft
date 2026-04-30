import { describe, expect, it } from "vitest";
import {
  analyzeSludgeFile,
  detectSludge,
} from "../../../src/operations/sludge-detector.js";
import type { FileSystem } from "../../../src/ports/filesystem.js";
import type { GitClient, GitRunRequest } from "../../../src/ports/git.js";

const SLOPPY_SOURCE = `
/** @typedef {{ name: string }} UserShape */
/** @typedef {{ id: string }} AccountShape */
/** @type {UserShape} */
const user = {};
/** @type {UserShape} */
const nextUser = {};
/** @type {AccountShape} */
const account = {};

type UserShape = { name: string };

export function buildUser(input: UserShape) {
  return { name: input.name };
}

export function touchUser(input: UserShape) {
  return input.name;
}

export function makeUser(input: UserShape) {
  return new User(input);
}
`;

const CLEAN_SOURCE = `
export class User {
  name(): string {
    return "Ada";
  }
}

export function createUser(): User {
  return new User();
}
`;

function fakeFs(files: Readonly<Record<string, string>>): FileSystem {
  return {
    readFile(path: string): Promise<string> {
      return Promise.resolve(files[path] ?? "");
    },
    readFileSync(path: string): string {
      return files[path] ?? "";
    },
    readdir(): Promise<string[]> {
      return Promise.resolve([]);
    },
    writeFile(): Promise<void> {
      return Promise.resolve();
    },
    appendFile(): Promise<void> {
      return Promise.resolve();
    },
    mkdir(): Promise<void> {
      return Promise.resolve();
    },
    stat(): Promise<{ size: number }> {
      return Promise.resolve({ size: 0 });
    },
  } as unknown as FileSystem;
}

function fakeGit(files: readonly string[]): GitClient {
  return {
    run(_request: GitRunRequest) {
      return Promise.resolve({
        status: 0,
        stdout: `${files.join("\n")}\n`,
        stderr: "",
      });
    },
  };
}

describe("operations: sludge-detector", () => {
  it("detects parser-backed structural sludge signals", () => {
    const report = analyzeSludgeFile("src/sloppy.ts", SLOPPY_SOURCE);

    expect(report).not.toBeNull();
    expect(report!.signals.map((signal) => signal.kind)).toEqual(expect.arrayContaining([
      "phantom_shape",
      "cast_density",
      "homeless_constructor",
      "free_function_data_behavior",
    ]));
    expect(report!.metrics.typedefCount).toBe(2);
    expect(report!.metrics.typeCastCount).toBe(3);
    expect(report!.metrics.homelessConstructorCount).toBe(1);
    expect(report!.signals.find((signal) => signal.kind === "homeless_constructor")).toEqual(
      expect.objectContaining({
        symbol: "buildUser",
        evidence: "returns object literal",
      }),
    );
  });

  it("does not flag a factory that returns a class instance", () => {
    const report = analyzeSludgeFile("src/clean.ts", CLEAN_SOURCE);

    expect(report).not.toBeNull();
    expect(report!.signals).toEqual([]);
    expect(report!.metrics.classCount).toBe(1);
  });

  it("scans tracked supported source files and omits unsupported files", async () => {
    const result = await detectSludge({
      cwd: "/repo",
      fs: fakeFs({
        "/repo/src/sloppy.ts": SLOPPY_SOURCE,
        "/repo/src/clean.ts": CLEAN_SOURCE,
      }),
      git: fakeGit(["src/sloppy.ts", "src/clean.ts", "README.md"]),
      resolvePath: (filePath) => `/repo/${filePath}`,
    });

    expect(result.scannedFiles).toBe(2);
    expect(result.filesWithSignals).toBe(1);
    expect(result.files[0]?.path).toBe("src/sloppy.ts");
    expect(result.summary).toContain("sludge signals");
  });
});
