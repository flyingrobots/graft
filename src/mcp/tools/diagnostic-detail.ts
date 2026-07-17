import { z } from "zod";

export type DiagnosticDetail = "summary" | "full";

export const diagnosticDetailSchema = z.enum(["summary", "full"]).optional();

/** Resolve detail after strict tool-input validation. Explicit scans force full evidence. */
export function readDiagnosticDetail(
  args: Readonly<Record<string, unknown>>,
  forceFull = false,
): DiagnosticDetail {
  if (forceFull || args["detail"] === "full") {
    return "full";
  }
  return "summary";
}
