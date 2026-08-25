// ---------------------------------------------------------------------------
// WarpContext — session-scoped DI bag for all graph access.
//
// Every graph interaction (reads AND writes) routes through this context.
// A strand scopes the agent's entire worldview — strand-local writes are
// invisible from live reads, so routing must be uniform.
// ---------------------------------------------------------------------------

import type {
  WarpGraphPort,
  WarpLens,
  WarpObserverOptions,
  WarpObserverPort,
  WarpPatchPort,
} from "../ports/warp.js";

export interface WarpContext {
  readonly app: WarpGraphPort;
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
  build: (patch: WarpPatchPort) => void | Promise<void>,
): Promise<string> {
  assertNoStrand(ctx);
  return ctx.app.patch(build);
}

export async function observeGraph(
  ctx: WarpContext,
  lens: WarpLens,
  options?: WarpObserverOptions,
): Promise<WarpObserverPort> {
  assertNoStrand(ctx);
  return ctx.app.observer(lens, options);
}

export async function materializeGraph(
  ctx: WarpContext,
): Promise<void> {
  assertNoStrand(ctx);
  await ctx.app.core().materialize();
}
