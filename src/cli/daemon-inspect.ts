import { inspectionRequestSchema, type InspectionRequest } from "../contracts/daemon-inspection.js";
import { defaultDaemonRoot, resolveSocketPath } from "../mcp/daemon-bootstrap.js";

export function parseDaemonInspect(cwd: string, args: readonly string[]): { socketPath: string; json: boolean; request: InspectionRequest } {
  const values: Record<string, unknown> = {};
  let socketPath: string | undefined;
  let json = false;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === undefined || seen.has(flag)) throw new Error("INVALID_INSPECTION_ARGUMENTS");
    seen.add(flag);
    if (flag === "--json") { json = true; continue; }
    const value = args[++i];
    if (value === undefined || value.startsWith("--")) throw new Error("INVALID_INSPECTION_ARGUMENTS");
    if (flag === "--socket") { socketPath = value; continue; }
    const key = ({ "--session": "sessionId", "--workspace": "workspaceId", "--repo": "repoId", "--limit": "limit" } as Record<string, string>)[flag];
    if (key === undefined) throw new Error("INVALID_INSPECTION_ARGUMENTS");
    values[key] = key === "limit" && /^[1-9][0-9]*$/u.test(value) ? Number(value) : value;
  }
  const request = inspectionRequestSchema.safeParse(values);
  if (!request.success) throw new Error("INVALID_INSPECTION_FILTER");
  return { socketPath: resolveSocketPath(socketPath, defaultDaemonRoot(), cwd), json, request: request.data };
}
