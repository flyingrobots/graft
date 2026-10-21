import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createIndexableServerInRepo, parse } from "../../helpers/mcp.js";

// Oracle: noninterference. Two repositories identical except for one
// confidential file must produce identical code_find responses, call for
// call, on one server whose caches are warmed by earlier calls, on the live
// path and on the WARP-index path. The wall clock and the session id are
// pinned; only the random trace id is replaced before comparison. Sizes,
// counts, paths, refusals and errors are compared as emitted. A finite set of
// fixtures supports the property; it does not prove it for every repository.

const PROBE = "rotateApiToken";
const PINNED_WALL_CLOCK = new Date("2026-10-21T00:00:00.000Z");
const PINNED_SESSION_ID = "00000000-0000-4000-8000-000000000001";

interface Fixture {
  readonly files: Readonly<Record<string, string>>;
  readonly confidentialPath: string;
}

interface ProbeCall {
  readonly query: string;
  readonly path?: string;
}

const cleanups: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(PINNED_WALL_CLOCK);
});

afterEach(async () => {
  vi.useRealTimers();
  for (const dir of cleanups.splice(0)) await cleanupTestRepo(dir);
});

function buildRepo(fixture: Fixture, confidentialContent: string | null): string {
  const dir = createTestRepo("graft-code-find-noninterference-");
  cleanups.push(dir);
  const files: Record<string, string> = { ".gitignore": ".graft/\n", ...fixture.files };
  if (confidentialContent !== null) files[fixture.confidentialPath] = confidentialContent;
  for (const [relative, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, relative)), { recursive: true });
    fs.writeFileSync(path.join(dir, relative), content);
  }
  git(dir, "add -A");
  git(dir, "commit -m init");
  return dir;
}

function withoutTraceId(response: Record<string, unknown>): Record<string, unknown> {
  const receipt = { ...(response["_receipt"] as Record<string, unknown>) };
  expect(receipt).toHaveProperty("traceId");
  receipt["traceId"] = "<per-call>";
  return { ...response, _receipt: receipt };
}

async function session(
  dir: string,
  calls: readonly ProbeCall[],
  options: { readonly indexFirst: boolean },
): Promise<Record<string, unknown>[]> {
  const indexable = createIndexableServerInRepo(dir, { sessionId: PINNED_SESSION_ID });
  if (options.indexFirst) await indexable.indexCurrentHead();
  const responses: Record<string, unknown>[] = [];
  for (const call of calls) {
    responses.push(withoutTraceId(parse(await indexable.server.callTool("code_find", { ...call }))));
  }
  return responses;
}

/**
 * The probe first, while the repository is unindexed, so it reaches file
 * content on the live path; then glob and scoped probes; then an unrelated
 * call and the probe again on warm caches. A successful call lazily indexes
 * its matched files, so later calls may answer from the WARP index.
 */
function probeCalls(fixture: Fixture): ProbeCall[] {
  const scope = path.posix.dirname(fixture.confidentialPath);
  return [
    { query: PROBE },
    { query: `${PROBE}*` },
    { query: PROBE, path: scope === "." ? "." : scope },
    { query: "createSurface" },
    { query: PROBE },
  ];
}

async function expectNoninterference(
  fixture: Fixture,
  contents: { readonly matching: string | null; readonly other: string | null },
  options: { readonly indexFirst: boolean } = { indexFirst: false },
): Promise<void> {
  const calls = probeCalls(fixture);
  const withMatch = await session(buildRepo(fixture, contents.matching), calls, options);
  const withoutMatch = await session(buildRepo(fixture, contents.other), calls, options);
  expect(withMatch).toEqual(withoutMatch);
}

const VISIBLE = {
  "src/surface.ts": "export function createSurface(): object { return {}; }\n",
  "src/token.ts": `export function ${PROBE}(): string { return "public"; }\n`,
};
const NOTHING_VISIBLE = {
  "src/surface.ts": "export function createSurface(): object { return {}; }\n",
};
const SECRET_WITH_PROBE = `export function ${PROBE}(): string { return "s3cr3t"; }\nexport const API_TOKEN = "s3cr3t";\n`;
const SECRET_WITHOUT_PROBE = "export const unrelatedSetting = 1;\n";

describe("mcp: code_find never derives a response from confidential content", () => {
  it("answers identically with no visible match whether credentials.ts defines the symbol or not", async () => {
    await expectNoninterference(
      { files: NOTHING_VISIBLE, confidentialPath: "credentials.ts" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
    );
  });

  it("answers identically beside a visible match", async () => {
    await expectNoninterference(
      { files: VISIBLE, confidentialPath: "config/credentials.ts" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
    );
  });

  it("treats dist/credentials.js as confidential although it displays as BUILD_OUTPUT", async () => {
    await expectNoninterference(
      { files: NOTHING_VISIBLE, confidentialPath: "dist/credentials.js" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
    );
  });

  it("answers identically from the WARP index after HEAD is indexed", async () => {
    await expectNoninterference(
      { files: NOTHING_VISIBLE, confidentialPath: "credentials.ts" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
      { indexFirst: true },
    );
    await expectNoninterference(
      { files: VISIBLE, confidentialPath: "credentials.ts" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
      { indexFirst: true },
    );
  });

  it("does not disclose whether a confidential file exists", async () => {
    await expectNoninterference(
      { files: NOTHING_VISIBLE, confidentialPath: "credentials.ts" },
      { matching: SECRET_WITH_PROBE, other: null },
    );
  });

  it("still finds the visible definition", async () => {
    const dir = buildRepo({ files: VISIBLE, confidentialPath: "credentials.ts" }, SECRET_WITH_PROBE);
    const [result] = await session(dir, probeCalls({ files: VISIBLE, confidentialPath: "credentials.ts" }), {
      indexFirst: false,
    });

    // Positive control: the first probe reaches file content on the live path.
    expect(result?.["source"]).toBe("live");
    expect(result?.["matches"]).toEqual([expect.objectContaining({ name: PROBE, path: "src/token.ts" })]);
    expect(result?.["total"]).toBe(1);
  });
});
