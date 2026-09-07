// ---------------------------------------------------------------------------
// Release gate: the published package carries no Echo dependency.
//
// Graft's Echo integration is unfinished. The command transport that would
// reach a real Echo kernel speaks `graft.echo-kernel-command.v1`, a protocol
// no Echo build implements, and it lives on an unmerged branch. What remains
// in `src/echo/` is contract-shaped scaffolding plus two pure codecs.
//
// This gate keeps that true across releases: a consumer who installs
// @flyingrobots/graft must never need an Echo checkout, an Echo crate, or a
// local path dependency to run the library or the CLI.
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Entrypoints the published `main`, `exports`, and `bin` fields resolve to. */
const PUBLISHED_ENTRYPOINTS = ["src/index.ts", "src/cli/entrypoint.ts"];

/**
 * The only `src/echo/` modules the published surface may reach. Both are pure
 * encoders with no Echo runtime, process, or network behaviour: they turn
 * values into bytes and back. Everything else under `src/echo/` is unfinished
 * integration scaffolding and must stay unreachable from a published
 * entrypoint.
 */
const PUBLISHABLE_ECHO_MODULES = new Set([
  "src/echo/canonical-cbor.ts",
  "src/echo/codec-runtime.ts",
]);

/** Dependency specifiers that would tie an install to a local Echo checkout. */
const LOCAL_SPECIFIER_PROTOCOLS = ["file:", "link:", "portal:", "git+", "git:"];

const DEPENDENCY_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
  "bundledDependencies",
] as const;

function declaredDependencies(): (readonly [string, string])[] {
  const manifest = packageJson as unknown as Record<string, unknown>;
  return DEPENDENCY_FIELDS.flatMap((field) => {
    const block = manifest[field];
    if (block === undefined || block === null || typeof block !== "object") {
      return [];
    }
    return Object.entries(block as Record<string, string>).map(
      ([name, specifier]) => [name, specifier] as const,
    );
  });
}

function resolveRelativeImport(fromFile: string, specifier: string): string | undefined {
  const base = path.join(path.dirname(fromFile), specifier);
  const candidates = [
    base.replace(/\.js$/u, ".ts"),
    base.replace(/\.js$/u, ".tsx"),
    `${base}.ts`,
    path.join(base, "index.ts"),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(ROOT, candidate)));
}

/** Every relative specifier a module pulls in, static or dynamic. */
function relativeSpecifiers(source: string): string[] {
  const patterns = [
    /(?:^|[\s;}])(?:import|export)[\s\S]*?from\s*["'](\.[^"']+)["']/gu,
    /(?:^|[\s;}])import\s*["'](\.[^"']+)["']/gu,
    /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/gu,
  ];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]!));
}

/** Transitive closure of repo-relative modules reachable from the entrypoints. */
function publishedClosure(): Set<string> {
  const reached = new Set<string>();
  const pending = [...PUBLISHED_ENTRYPOINTS];

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (reached.has(current)) {
      continue;
    }
    const absolute = path.join(ROOT, current);
    if (!fs.existsSync(absolute)) {
      continue;
    }
    reached.add(current);

    for (const specifier of relativeSpecifiers(fs.readFileSync(absolute, "utf8"))) {
      const resolved = resolveRelativeImport(current, specifier);
      if (resolved !== undefined) {
        pending.push(resolved.split(path.sep).join("/"));
      }
    }
  }

  return reached;
}

describe("release Echo independence", () => {
  it("declares no Echo dependency in any dependency block", () => {
    const echoDependencies = declaredDependencies()
      .filter(([name]) => /echo/iu.test(name))
      .map(([name]) => name);

    expect(echoDependencies).toEqual([]);
  });

  it("declares no dependency resolved from a local path or a git checkout", () => {
    const localDependencies = declaredDependencies()
      .filter(([, specifier]) =>
        LOCAL_SPECIFIER_PROTOCOLS.some((protocol) => specifier.startsWith(protocol)),
      )
      .map(([name, specifier]) => `${name}@${specifier}`);

    expect(localDependencies).toEqual([]);
  });

  it("resolves every published entrypoint that the package manifest points at", () => {
    const missing = PUBLISHED_ENTRYPOINTS.filter(
      (entrypoint) => !fs.existsSync(path.join(ROOT, entrypoint)),
    );

    expect(missing).toEqual([]);
    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.bin.graft).toBe("./bin/graft.js");
  });

  it("keeps unfinished Echo integration modules out of the published import closure", () => {
    const reachableEchoModules = [...publishedClosure()]
      .filter((module) => module.startsWith("src/echo/"))
      .filter((module) => !PUBLISHABLE_ECHO_MODULES.has(module))
      .sort();

    expect(reachableEchoModules).toEqual([]);
  });

  it("keeps the Echo kernel transport seam out of the published import closure", () => {
    const reachableTransports = [...publishedClosure()]
      .filter((module) => /echo-kernel-transport|echo-command-kernel/u.test(module))
      .sort();

    expect(reachableTransports).toEqual([]);
  });
});
