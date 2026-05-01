import { describe, expect, it } from "vitest";
import type { BacklogStatusModel } from "../../../src/cli/backlog-status-model.js";

type RenderBacklogStatus = (model: BacklogStatusModel) => string;

const model: BacklogStatusModel = {
  summary: {
    activeBacklogByLane: {
      "up-next": 1,
      asap: 1,
    },
    activeDesignCount: 1,
    completedRetroCount: 1,
    blockedInternalCount: 1,
    blockedExternalCount: 1,
    unresolvedDependencyReferenceCount: 1,
  },
  items: [
    {
      id: "CORE_mismatch",
      title: "Mismatched lane",
      legend: "CORE",
      feature: "core",
      kind: "leaf",
      lane: "up-next",
      frontmatterLane: "asap",
      sourceLane: undefined,
      status: "stale_metadata",
      sourcePath: "docs/method/backlog/up-next/CORE_mismatch.md",
      blockedBy: [],
      blocking: [],
      blockedByExternal: [],
      retroPath: undefined,
    },
    {
      id: "CORE_done",
      title: "Completed design",
      legend: "CORE",
      feature: "core",
      kind: "leaf",
      lane: undefined,
      frontmatterLane: undefined,
      sourceLane: "asap",
      status: "completed",
      sourcePath: "docs/design/CORE_done.md",
      blockedBy: [],
      blocking: [],
      blockedByExternal: [],
      retroPath: "docs/method/retro/CORE_done/retro.md",
    },
    {
      id: "CORE_blocked",
      title: "Blocked by dependency",
      legend: "CORE",
      feature: "core",
      kind: "leaf",
      lane: "asap",
      frontmatterLane: "asap",
      sourceLane: undefined,
      status: "blocked_internal",
      sourcePath: "docs/method/backlog/asap/CORE_blocked.md",
      blockedBy: ["CORE_dependency"],
      blocking: [],
      blockedByExternal: [],
      retroPath: undefined,
    },
    {
      id: "CORE_external",
      title: "Externally blocked",
      legend: "CORE",
      feature: "core",
      kind: "leaf",
      lane: "asap",
      frontmatterLane: "asap",
      sourceLane: undefined,
      status: "blocked_external",
      sourcePath: "docs/method/backlog/asap/CORE_external.md",
      blockedBy: [],
      blocking: [],
      blockedByExternal: ["vendor-runtime"],
      retroPath: undefined,
    },
    {
      id: "CORE_active-design",
      title: "Active design",
      legend: "CORE",
      feature: "core",
      kind: "leaf",
      lane: undefined,
      frontmatterLane: undefined,
      sourceLane: "asap",
      status: "active_design",
      sourcePath: "docs/design/CORE_active-design.md",
      blockedBy: [],
      blocking: [],
      blockedByExternal: [],
      retroPath: undefined,
    },
    {
      id: "CORE_backlog",
      title: "Ordinary backlog",
      legend: "CORE",
      feature: "core",
      kind: "leaf",
      lane: "asap",
      frontmatterLane: "asap",
      sourceLane: undefined,
      status: "backlog",
      sourcePath: "docs/method/backlog/asap/CORE_backlog.md",
      blockedBy: [],
      blocking: [],
      blockedByExternal: [],
      retroPath: undefined,
    },
  ],
  warnings: [
    {
      type: "lane_frontmatter_mismatch",
      itemId: "CORE_mismatch",
      sourcePath: "docs/method/backlog/up-next/CORE_mismatch.md",
      field: undefined,
      ref: undefined,
      expectedLane: "up-next",
      actualLane: "asap",
    },
    {
      type: "unresolved_dependency_ref",
      itemId: "CORE_missing_ref",
      sourcePath: "docs/method/backlog/asap/CORE_missing_ref.md",
      field: "blocked_by",
      ref: "CORE_missing",
      expectedLane: undefined,
      actualLane: undefined,
    },
  ],
};

async function loadRenderer(): Promise<RenderBacklogStatus> {
  const mod = await import("../../../src/cli/backlog-status-render.js") as {
    readonly renderBacklogStatus?: unknown;
  };
  expect(mod.renderBacklogStatus).toEqual(expect.any(Function));
  return mod.renderBacklogStatus as RenderBacklogStatus;
}

function indexOfLine(rendered: string, pattern: RegExp): number {
  const index = rendered.split("\n").findIndex((line) => pattern.test(line));
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("backlog status renderer", () => {
  it("renders deterministic summary-first text from a synthetic model", async () => {
    const renderBacklogStatus = await loadRenderer();

    const first = renderBacklogStatus(model);
    const second = renderBacklogStatus(model);

    expect(second).toBe(first);
    expect(first).toContain("Backlog Status");
    expect(indexOfLine(first, /^Summary\b/u)).toBeLessThan(indexOfLine(first, /^Active Backlog\b/u));
    expect(indexOfLine(first, /^Summary\b/u)).toBeLessThan(indexOfLine(first, /^Warnings\b/u));
    expect(first).toContain("asap: 1");
    expect(first).toContain("up-next: 1");
    expect(first).toContain("active designs: 1");
    expect(first).toContain("completed retros: 1");
    expect(first).toContain("blocked internal: 1");
    expect(first).toContain("blocked external: 1");
    expect(first).toContain("unresolved dependency refs: 1");
  });

  it("renders backlog, design, completed, blocked, and warning sections with visible evidence", async () => {
    const renderBacklogStatus = await loadRenderer();

    const rendered = renderBacklogStatus(model);

    const activeBacklog = indexOfLine(rendered, /^Active Backlog\b/u);
    const activeDesign = indexOfLine(rendered, /^Active Design\b/u);
    const completed = indexOfLine(rendered, /^Completed\b/u);
    const blocked = indexOfLine(rendered, /^Blocked\b/u);
    const warnings = indexOfLine(rendered, /^Warnings\b/u);

    expect(activeBacklog).toBeLessThan(activeDesign);
    expect(activeDesign).toBeLessThan(completed);
    expect(completed).toBeLessThan(blocked);
    expect(blocked).toBeLessThan(warnings);
    expect(rendered).toContain("CORE_backlog");
    expect(rendered).toContain("CORE_active-design");
    expect(rendered).toContain("CORE_done");
    expect(rendered).toContain("CORE_blocked");
    expect(rendered).toContain("CORE_dependency");
    expect(rendered).toContain("CORE_external");
    expect(rendered).toContain("vendor-runtime");
    expect(rendered).toContain("CORE_missing_ref");
    expect(rendered).toContain("blocked_by -> CORE_missing");
    expect(rendered).toContain("CORE_mismatch");
    expect(rendered).toContain("lane up-next has frontmatter lane asap");
  });

  it("renders items and warnings in stable source-path order", async () => {
    const renderBacklogStatus = await loadRenderer();

    const rendered = renderBacklogStatus(model);

    expect(indexOfLine(rendered, /CORE_backlog/u)).toBeLessThan(indexOfLine(rendered, /CORE_mismatch/u));
    expect(indexOfLine(rendered, /CORE_active-design/u)).toBeLessThan(indexOfLine(rendered, /CORE_done/u));
    expect(indexOfLine(rendered, /CORE_blocked/u)).toBeLessThan(indexOfLine(rendered, /CORE_external/u));
    expect(indexOfLine(rendered, /CORE_missing_ref.*CORE_missing/u)).toBeLessThan(
      indexOfLine(rendered, /CORE_mismatch.*frontmatter/u),
    );
  });
});
