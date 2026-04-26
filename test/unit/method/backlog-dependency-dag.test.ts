import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildBacklogDagModel,
  parseBacklogCardMarkdown,
  readBacklogCards,
  renderBacklogDagDot,
} from "../../../scripts/generate-backlog-dependency-dag.js";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const backlogRoot = path.join(repoRoot, "docs", "method", "backlog");

describe("backlog dependency DAG", () => {
  it("keeps the checked-in DOT generated from active backlog frontmatter", () => {
    const model = buildBacklogDagModel(readBacklogCards(backlogRoot));
    const expectedDot = renderBacklogDagDot(model);
    const actualDot = fs.readFileSync(path.join(backlogRoot, "dependency-dag.dot"), "utf8");

    expect(actualDot).toBe(expectedDot);
    expect(model.edges.some((edge) => edge.kinds.includes("blocked_by"))).toBe(true);
    expect(model.edges.some((edge) => edge.kinds.includes("blocking"))).toBe(true);
    expect(model.edges.some((edge) => edge.kinds.includes("blocked_by_external"))).toBe(true);
  });

  it("renders blocked_by, blocking, and blocked_by_external dependencies", () => {
    const upstream = parseBacklogCardMarkdown(
      [
        "---",
        "title: Upstream card",
        "lane: v0.7.0",
        "blocking:",
        "  - SURFACE_downstream",
        "---",
        "",
      ].join("\n"),
      "/repo/docs/method/backlog/v0.7.0/CORE_upstream.md",
      "v0.7.0",
    );
    const downstream = parseBacklogCardMarkdown(
      [
        "---",
        "title: Downstream card",
        "lane: v0.7.0",
        "blocked_by:",
        "  - CORE_upstream",
        "blocked_by_external:",
        "  - git-warp observer geometry ladder",
        "---",
        "",
      ].join("\n"),
      "/repo/docs/method/backlog/v0.7.0/SURFACE_downstream.md",
      "v0.7.0",
    );

    const model = buildBacklogDagModel([upstream, downstream]);
    const dot = renderBacklogDagDot(model);

    expect(model.edges).toEqual([
      {
        from: "external_git_warp_observer_geometry_ladder",
        to: "v0_7_0_SURFACE_downstream",
        kinds: ["blocked_by_external"],
        external: true,
        unresolved: false,
      },
      {
        from: "v0_7_0_CORE_upstream",
        to: "v0_7_0_SURFACE_downstream",
        kinds: ["blocked_by", "blocking"],
        external: false,
        unresolved: false,
      },
    ]);
    expect(dot).toContain("v0_7_0_CORE_upstream -> v0_7_0_SURFACE_downstream");
    expect(dot).toContain("external_git_warp_observer_geometry_ladder -> v0_7_0_SURFACE_downstream");
  });
});
