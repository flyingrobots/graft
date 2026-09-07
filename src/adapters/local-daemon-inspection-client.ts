import * as http from "node:http";
import {
  INSPECTION_LIMITS, INSPECTION_PATH, INSPECTION_SCHEMA_VERSION,
  inspectionObservationSchema, inspectionRequestSchema,
  type InspectionRequest, type InspectionResult,
} from "../contracts/daemon-inspection.js";
import { GRAFT_VERSION } from "../version.js";

export interface InspectDaemonOptions {
  readonly socketPath: string;
  readonly request?: InspectionRequest | undefined;
}

/** No MCP, health probe, Git, workspace lookup, or spawn fallback. */
export async function inspectLocalDaemon(options: InspectDaemonOptions): Promise<InspectionResult> {
  if (typeof options.socketPath !== "string" || options.socketPath.length === 0 || options.socketPath.length > INSPECTION_LIMITS.urlBytes
    || (!options.socketPath.startsWith("/") && !options.socketPath.startsWith("\\\\.\\pipe\\"))) {
    return { status: "observation_failed", clientVersion: GRAFT_VERSION, reason: "INVALID_LOCAL_SOCKET" };
  }
  const parsed = inspectionRequestSchema.safeParse(options.request ?? {});
  if (!parsed.success) return { status: "observation_failed", clientVersion: GRAFT_VERSION, reason: "INVALID_INSPECTION_FILTER" };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(parsed.data)) params.set(key, String(value));
  return new Promise(resolve => {
    let settled = false;
    const finish = (result: InspectionResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve(result);
    };
    const fail = (reason: string) => { finish({ status: "observation_failed", clientVersion: GRAFT_VERSION, reason }); };
    const request = http.request({ socketPath: options.socketPath, path: `${INSPECTION_PATH}?${params.toString()}`, method: "GET", agent: false }, response => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        if (settled) { response.destroy(); return; }
        bytes += chunk.length;
        if (bytes > INSPECTION_LIMITS.bytes) {
          fail("INSPECTION_RESPONSE_TOO_LARGE"); response.destroy(); request.destroy(); return;
        }
        chunks.push(chunk);
      });
      response.once("error", () => { fail("INSPECTION_DISCONNECTED"); });
      response.once("aborted", () => { fail("INSPECTION_DISCONNECTED"); });
      response.once("end", () => {
        if (settled) return;
        if (response.statusCode === 404 || response.statusCode === 501) {
          finish({ status: "unsupported", clientVersion: GRAFT_VERSION, reason: "DAEMON_INSPECTION_UNSUPPORTED" }); return;
        }
        if (response.statusCode !== 200) { fail("INSPECTION_REQUEST_REFUSED"); return; }
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
          if (typeof body === "object" && body !== null && "schemaVersion" in body && body.schemaVersion !== INSPECTION_SCHEMA_VERSION) {
            finish({ status: "unsupported", clientVersion: GRAFT_VERSION, reason: "INSPECTION_SCHEMA_UNSUPPORTED" }); return;
          }
          const observation = inspectionObservationSchema.safeParse(body);
          if (!observation.success) { fail("INVALID_INSPECTION_OBSERVATION"); return; }
          finish({ status: "ok", clientVersion: GRAFT_VERSION, observation: observation.data });
        } catch { fail("INVALID_INSPECTION_OBSERVATION"); }
      });
    });
    const deadline = setTimeout(() => { fail("INSPECTION_TIMEOUT"); request.destroy(); }, INSPECTION_LIMITS.timeoutMs);
    request.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT" || error.code === "ECONNREFUSED") {
        finish({ status: "no_daemon", clientVersion: GRAFT_VERSION, reason: "NO_DAEMON_LISTENING" });
      } else { fail("INSPECTION_CONNECTION_FAILED"); }
    });
    request.end();
  });
}
