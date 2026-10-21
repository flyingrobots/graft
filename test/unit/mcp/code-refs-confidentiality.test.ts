import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { MCP_TOOL_NAMES, getMcpOutputSchema, getMcpOutputSchemaMeta } from "../../../src/contracts/output-schemas.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

// Oracle: noninterference. Two repositories identical except for one
// confidential file must produce identical code_refs responses, call for
// call, on one server whose caches are warmed by earlier calls. The wall clock
// is pinned so the receipt's timestamp and latency are constant; otherwise a
// latency gaining a digit changes the receipt's byte counts. Only the random
// session and trace ids, which are fixed-length and never derived from
// repository content, are replaced before comparison. Sizes, ratios, counts,
// digests, paths, refusals and errors are compared as emitted. A finite set of
// fixtures supports the property; it does not prove it for every repository.

const PROBE = "API_TOKEN";
const PER_CALL_RECEIPT_FIELDS = ["sessionId", "traceId"] as const;
const PINNED_WALL_CLOCK = new Date("2026-10-21T00:00:00.000Z");

interface Fixture {
  /** Repository files other than the confidential one. */
  readonly files: Readonly<Record<string, string>>;
  /** Where the confidential file lives, relative to the repository root. */
  readonly confidentialPath: string;
}

interface ProbeCall {
  readonly query: string;
  readonly mode?: "text" | "call";
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
  const dir = createTestRepo("graft-code-refs-noninterference-");
  cleanups.push(dir);
  const files: Record<string, string> = { ...fixture.files };
  if (confidentialContent !== null) files[fixture.confidentialPath] = confidentialContent;
  for (const [relative, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, relative)), { recursive: true });
    fs.writeFileSync(path.join(dir, relative), content);
  }
  git(dir, "add -A");
  git(dir, "commit -m init");
  return dir;
}

function withoutPerCallFields(response: Record<string, unknown>): Record<string, unknown> {
  const receipt = { ...(response["_receipt"] as Record<string, unknown>) };
  for (const field of PER_CALL_RECEIPT_FIELDS) {
    expect(receipt, `receipt carries ${field}`).toHaveProperty(field);
    receipt[field] = "<per-call>";
  }
  return { ...response, _receipt: receipt };
}

async function session(dir: string, calls: readonly ProbeCall[]): Promise<Record<string, unknown>[]> {
  const server = createServerInRepo(dir);
  const responses: Record<string, unknown>[] = [];
  for (const call of calls) {
    responses.push(withoutPerCallFields(parse(await server.callTool("code_refs", { ...call }))));
  }
  return responses;
}

/** A warm-up call, the probe twice on warm caches, then the probe scoped to the confidential file's directory. */
function probeCalls(fixture: Fixture, mode: "text" | "call" = "text"): ProbeCall[] {
  const query = mode === "call" ? `${PROBE}(` : PROBE;
  const scope = path.posix.dirname(fixture.confidentialPath);
  return [
    { query: "createSurface", mode: "call" },
    { query, mode },
    { query, mode },
    { query, mode, path: scope === "." ? "." : scope },
  ];
}

async function expectNoninterference(
  fixture: Fixture,
  contents: { readonly matching: string | null; readonly other: string | null },
  mode: "text" | "call" = "text",
): Promise<void> {
  const calls = probeCalls(fixture, mode);
  const withMatch = await session(buildRepo(fixture, contents.matching), calls);
  const withoutMatch = await session(buildRepo(fixture, contents.other), calls);
  expect(withMatch).toEqual(withoutMatch);
}

const VISIBLE = { "src/consumer.ts": `createSurface();\nconst token = process.env.${PROBE};\n` };
const NOTHING_VISIBLE = { "src/consumer.ts": "createSurface();\n" };
const GRAFTIGNORED_MATCH = {
  ".gitignore": ".graft/\n",
  ".graftignore": "generated/**\n",
  "generated/client.ts": `export const ${PROBE} = "placeholder";\n`,
  "src/consumer.ts": "createSurface();\n",
};

const SECRET_WITH_PROBE = `${PROBE}=s3cr3t-value\n${PROBE}(rotate)\n`;
const SECRET_WITHOUT_PROBE = "OTHER_SETTING=unrelated\n";

describe("mcp: code_refs never derives a response from confidential content", () => {
  it("answers identically with visible matches whether .env contains the query or not", async () => {
    await expectNoninterference(
      { files: VISIBLE, confidentialPath: ".env" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
    );
  });

  it("answers identically with no visible matches whether .env contains the query or not", async () => {
    await expectNoninterference(
      { files: NOTHING_VISIBLE, confidentialPath: ".env" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
    );
  });

  it("treats dist/.env as confidential although it displays as BUILD_OUTPUT", async () => {
    await expectNoninterference(
      { files: VISIBLE, confidentialPath: "dist/.env" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
    );
    await expectNoninterference(
      { files: NOTHING_VISIBLE, confidentialPath: "dist/.env" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
    );
  });

  it("keeps a confidential file out of an answer refused for a relevance ban", async () => {
    await expectNoninterference(
      { files: GRAFTIGNORED_MATCH, confidentialPath: "generated/credentials.json" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
    );
  });

  it("answers call-mode probes identically for a confidential key file", async () => {
    await expectNoninterference(
      { files: NOTHING_VISIBLE, confidentialPath: "config/deploy.key" },
      { matching: SECRET_WITH_PROBE, other: SECRET_WITHOUT_PROBE },
      "call",
    );
  });

  it("does not disclose whether a confidential file exists", async () => {
    await expectNoninterference(
      { files: VISIBLE, confidentialPath: ".env" },
      { matching: SECRET_WITH_PROBE, other: null },
    );
    await expectNoninterference(
      { files: NOTHING_VISIBLE, confidentialPath: "dist/.env" },
      { matching: SECRET_WITH_PROBE, other: null },
    );
  });

  it("states that confidential files are not searched and keeps relevance counts", async () => {
    const dir = buildRepo({ files: GRAFTIGNORED_MATCH, confidentialPath: ".env" }, SECRET_WITH_PROBE);
    const [, result] = await session(dir, [{ query: "createSurface", mode: "call" }, { query: PROBE }]);

    expect(result?.["contentDenial"]).toEqual({
      classification: "SECRET",
      treatment: "not-searched",
      countsDisclosed: false,
    });
    expect(result?.["projection"]).toBe("refused");
    expect(result?.["reason"]).toBe("GRAFTIGNORE");
    expect(result?.["skipped"]).toEqual({
      files: 1,
      matches: 1,
      reasons: [{ reason: "GRAFTIGNORE", files: 1, matches: 1 }],
    });
    expect(result?.["provenance"]).toEqual(expect.objectContaining({ filesSearched: 4 }));
  });
});

// Oracle: the versioned-output-schemas invariant. A consumer selects a
// validator by the `_schema` identity a response advertises; that validator
// must be the one describing the emitted shape.
describe("mcp: code_refs schema identity", () => {
  it("is validated by the registered validator its advertised version names", async () => {
    const dir = buildRepo({ files: VISIBLE, confidentialPath: ".env" }, SECRET_WITH_PROBE);
    const server = createServerInRepo(dir);
    const response = parse(await server.callTool("code_refs", { query: PROBE }));
    const advertised = response["_schema"] as { id: string; version: string };

    const named = MCP_TOOL_NAMES.filter((tool) => {
      const meta = getMcpOutputSchemaMeta(tool);
      return meta.id === advertised.id && meta.version === advertised.version;
    });
    expect(named).toEqual(["code_refs"]);
    expect(advertised.version).toBe("3.0.0");

    const validator = getMcpOutputSchema("code_refs");
    expect(() => validator.parse(response)).not.toThrow();
    // The v3 validator is the one that knows the v3 fields: it rejects the
    // same response without them, and rejects it relabelled as the v2 shape.
    const withoutTerms = Object.fromEntries(
      Object.entries(response).filter(([key]) => key !== "contentDenial"),
    );
    expect(validator.safeParse(withoutTerms).success).toBe(false);
    expect(validator.safeParse({ ...response, _schema: { ...advertised, version: "2.0.0" } }).success).toBe(false);
  });
});
