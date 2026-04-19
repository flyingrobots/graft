/**
 * WARP graph initialization — opens the graft-ast graph backed by
 * the repo's own .git directory.
 *
 * Single entry point. Returns a WARP port handle ready for patch
 * writes and observer reads.
 */

import RawWarpApp, { GitGraphAdapter } from "@git-stunts/git-warp";
import GitPlumbing from "@git-stunts/plumbing";
import type {
  WarpHandle,
  WarpMaterializeReceipt,
  WarpObserver,
  WarpObserverLens,
  WarpObserverOptions,
  WarpPatchBuilder,
} from "../ports/warp.js";
import { DEFAULT_WARP_WRITER_ID } from "./writer-id.js";

export const GRAPH_NAME = "graft-ast";

export interface OpenWarpOptions {
  readonly cwd: string;
  readonly writerId?: string;
}

function toRawLens(lens: WarpObserverLens): {
  match: string | string[];
  expose?: string[];
  redact?: string[];
} {
  return {
    match: typeof lens.match === "string" ? lens.match : [...lens.match],
    ...(lens.expose !== undefined ? { expose: [...lens.expose] } : {}),
    ...(lens.redact !== undefined ? { redact: [...lens.redact] } : {}),
  };
}

function toRawObserverOptions(options: WarpObserverOptions | undefined): {
  source?: { kind: "live"; ceiling: number | null };
} | undefined {
  if (options === undefined) {
    return undefined;
  }
  if (options.source === undefined) {
    return {};
  }
  return {
    source: {
      kind: options.source.kind,
      ceiling: options.source.ceiling,
    },
  };
}

function wrapWarpApp(app: RawWarpApp): WarpHandle {
  return {
    async hasNode(nodeId: string): Promise<boolean> {
      const observer = await app.observer({ match: nodeId });
      const nodes = await observer.getNodes();
      return nodes.includes(nodeId);
    },
    observer(lens, options): Promise<WarpObserver> {
      return app.observer(toRawLens(lens), toRawObserverOptions(options)) as Promise<WarpObserver>;
    },
    patch(build): Promise<string> {
      return app.patch((patch) => build(patch as unknown as WarpPatchBuilder));
    },
    async materialize(): Promise<void> {
      await app.core().materialize();
    },
    async materializeReceipts(): Promise<readonly WarpMaterializeReceipt[]> {
      const { receipts } = await app.core().materialize({ receipts: true });
      return receipts as readonly WarpMaterializeReceipt[];
    },
  };
}

export async function openWarp(options: OpenWarpOptions): Promise<WarpHandle> {
  // createDefault() wires the ShellRunnerFactory (required port)
  const plumbing = GitPlumbing.createDefault({ cwd: options.cwd });
  const persistence = new GitGraphAdapter({ plumbing });

  const app = await RawWarpApp.open({
    persistence,
    graphName: GRAPH_NAME,
    writerId: options.writerId ?? DEFAULT_WARP_WRITER_ID,
    onDeleteWithData: "cascade",
  });

  return wrapWarpApp(app);
}
