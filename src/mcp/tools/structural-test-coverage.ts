import { z } from "zod";
import { structuralTestCoverageMap } from "../../operations/structural-test-coverage-map.js";
import { toJsonObject } from "../../operations/result-dto.js";
import type { ToolDefinition, ToolHandler } from "../context.js";

export const structuralTestCoverageTool: ToolDefinition = {
  name: "graft_test_coverage",
  description:
    "Structural/reference test coverage map. Reports exported source symbols " +
    "with or without obvious references in the configured test directory, " +
    "without claiming execution coverage.",
  schema: {
    sourcePath: z.string().optional(),
    testPath: z.string().optional(),
  },
  createHandler(): ToolHandler {
    return async (args, ctx) => {
      const result = await structuralTestCoverageMap({
        cwd: ctx.projectRoot,
        fs: ctx.fs,
        git: ctx.git,
        process: ctx.process,
        resolveWorkingTreePath: (filePath) => ctx.resolvePath(filePath),
        sourcePath: args["sourcePath"] as string | undefined,
        testPath: args["testPath"] as string | undefined,
      });
      ctx.recordFootprint({
        paths: [
          ...result.files.map((file) => file.path),
          ...new Set(result.files.flatMap((file) =>
            file.symbols.flatMap((symbol) => symbol.referencingTestFiles)
          )),
        ],
        symbols: result.files.flatMap((file) => file.symbols.map((symbol) => symbol.name)),
      });
      return ctx.respond("graft_test_coverage", toJsonObject(result));
    };
  },
};
