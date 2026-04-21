// ---------------------------------------------------------------------------
// WarpContext — session-scoped DI bag for all graph access.
//
// Every graph interaction (reads AND writes) routes through this context.
// A strand scopes the agent's entire worldview — strand-local writes are
// invisible from live reads, so routing must be uniform.
// ---------------------------------------------------------------------------

import type WarpApp from "@git-stunts/git-warp";
import type { Lens, Observer, ObserverOptions, PatchBuilderV2 } from "@git-stunts/git-warp";

export interface WarpContext {
  readonly app: WarpApp;
  readonly strandId: string | null;
}

function assertNoStrand(ctx: WarpContext): void {
  if (ctx.strandId !== null) {
    throw new Error(
      `Strand isolation not yet supported (strandId: ${ctx.strandId}). ` +
      `git-warp strand merging is not ready.`,
    );
  }
}

export async function patchGraph(
  ctx: WarpContext,
  build: (patch: PatchBuilderV2) => void | Promise<void>,
): Promise<string> {
  assertNoStrand(ctx);
  return ctx.app.patch(build);
}

export async function observeGraph(
  ctx: WarpContext,
  lens: Lens,
  options?: ObserverOptions,
): Promise<Observer> {
  assertNoStrand(ctx);
  return ctx.app.observer(lens, options);
}

export async function materializeGraph(
  ctx: WarpContext,
): Promise<void> {
  assertNoStrand(ctx);
  await ctx.app.core().materialize();
}
