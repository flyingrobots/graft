import { z } from "zod";
import { importDiagnosticsAtRef } from "../../warp/committed-reference-scan.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { ToolDefinition, ToolHandler } from "../context.js";
import { nodePathOps } from "../../adapters/node-paths.js";

export const importDiagnosticsTool: ToolDefinition = {
  name: "graft_import_diagnostics",
  description: "Report first-party import bindings whose lexical shadows exclude qualified reference inference.",
  schema: { ref: z.string().optional() },
  createHandler(): ToolHandler {
    return async (args, ctx) => ctx.respond("graft_import_diagnostics", toJsonObject(await importDiagnosticsAtRef({ cwd: ctx.projectRoot, git: ctx.git, pathOps: nodePathOps, ref: (args["ref"] as string | undefined) ?? "HEAD" })));
  },
};
