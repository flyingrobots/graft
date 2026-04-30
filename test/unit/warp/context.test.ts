import { describe, expect, it, vi } from "vitest";
import type { WarpContext } from "../../../src/warp/context.js";
import {
  patchGraph,
  observeGraph,
  materializeGraph,
} from "../../../src/warp/context.js";

// ---------------------------------------------------------------------------
// Helpers — minimal WarpApp stand-in for unit isolation
// ---------------------------------------------------------------------------

function fakeApp(overrides: {
  patch?: ReturnType<typeof vi.fn>;
  observer?: ReturnType<typeof vi.fn>;
  core?: ReturnType<typeof vi.fn>;
} = {}): WarpContext["app"] {
  const patch = overrides.patch ?? vi.fn(() => Promise.resolve("sha:abc"));
  const observer = overrides.observer ?? vi.fn(() => Promise.resolve({
    getNodes: () => Promise.resolve([]),
    getNodeProps: () => Promise.resolve(null),
    getEdges: () => Promise.resolve([]),
  }));
  const materialize = vi.fn(() => Promise.resolve());
  const core = overrides.core ?? vi.fn(() => ({ materialize }));

  return { patch, observer, core } as unknown as WarpContext["app"];
}

function liveContext(app?: WarpContext["app"]): WarpContext {
  return { app: app ?? fakeApp(), strandId: null };
}

function strandContext(strandId: string, app?: WarpContext["app"]): WarpContext {
  return { app: app ?? fakeApp(), strandId };
}

// ---------------------------------------------------------------------------
// patchGraph
// ---------------------------------------------------------------------------

describe("warp context: patchGraph", () => {
  it("delegates to app.patch() when strandId is null", async () => {
    const patch = vi.fn(() => Promise.resolve("sha:patch"));
    const app = fakeApp({ patch });
    const ctx = liveContext(app);
    const build = vi.fn();

    const sha = await patchGraph(ctx, build);

    expect(sha).toBe("sha:patch");
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith(build);
  });

  it("throws when strandId is set (strand merging not ready)", async () => {
    const ctx = strandContext("strand-agent-1");

    await expect(patchGraph(ctx, vi.fn())).rejects.toThrow(
      /strand isolation not yet supported/i,
    );
  });

  it("includes the strandId in the error message", async () => {
    const ctx = strandContext("my-strand-42");

    await expect(patchGraph(ctx, vi.fn())).rejects.toThrow("my-strand-42");
  });
});

// ---------------------------------------------------------------------------
// observeGraph
// ---------------------------------------------------------------------------

describe("warp context: observeGraph", () => {
  it("delegates to app.observer() when strandId is null", async () => {
    const fakeObserver = {
      getNodes: () => Promise.resolve(["node:1"]),
      getNodeProps: () => Promise.resolve(null),
      getEdges: () => Promise.resolve([]),
    };
    const observerFn = vi.fn(() => Promise.resolve(fakeObserver));
    const app = fakeApp({ observer: observerFn });
    const ctx = liveContext(app);
    const lens = { match: "sym:*" };

    const obs = await observeGraph(ctx, lens);

    expect(obs).toBe(fakeObserver);
    expect(observerFn).toHaveBeenCalledTimes(1);
    expect(observerFn).toHaveBeenCalledWith(lens, undefined);
  });

  it("passes observer options through", async () => {
    const observerFn = vi.fn(() => Promise.resolve({
      getNodes: () => Promise.resolve([]),
      getNodeProps: () => Promise.resolve(null),
      getEdges: () => Promise.resolve([]),
    }));
    const app = fakeApp({ observer: observerFn });
    const ctx = liveContext(app);
    const lens = { match: "ast:*" };
    const options = { source: { kind: "live" as const, ceiling: 5 } };

    await observeGraph(ctx, lens, options);

    expect(observerFn).toHaveBeenCalledWith(lens, options);
  });

  it("throws when strandId is set (strand merging not ready)", async () => {
    const ctx = strandContext("strand-agent-2");

    await expect(
      observeGraph(ctx, { match: "sym:*" }),
    ).rejects.toThrow(/strand isolation not yet supported/i);
  });
});

// ---------------------------------------------------------------------------
// materializeGraph
// ---------------------------------------------------------------------------

describe("warp context: materializeGraph", () => {
  it("delegates to app.core().materialize() when strandId is null", async () => {
    const materialize = vi.fn(() => Promise.resolve());
    const core = vi.fn(() => ({ materialize }));
    const app = fakeApp({ core });
    const ctx = liveContext(app);

    await materializeGraph(ctx);

    expect(core).toHaveBeenCalledTimes(1);
    expect(materialize).toHaveBeenCalledTimes(1);
  });

  it("throws when strandId is set (strand merging not ready)", async () => {
    const ctx = strandContext("strand-agent-3");

    await expect(materializeGraph(ctx)).rejects.toThrow(
      /strand isolation not yet supported/i,
    );
  });
});
