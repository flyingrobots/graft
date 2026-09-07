import type * as http from "node:http";
import {
  INSPECTION_LIMITS, INSPECTION_PATH, inspectionObservationSchema, inspectionRequestSchema,
  type InspectionObservation, type InspectionRequest,
} from "../contracts/daemon-inspection.js";

export function createDaemonInspectionRoute(capture: (request: InspectionRequest) => InspectionObservation) {
  const responses = new Set<http.ServerResponse>();
  function reply(res: http.ServerResponse, code: number, body: unknown): void {
    res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store", connection: "close" });
    res.end(JSON.stringify(body));
  }
  return {
    handle(req: http.IncomingMessage, res: http.ServerResponse): boolean {
      const rawUrl = req.url ?? "/";
      if (!rawUrl.startsWith("/inspect/")) return false;
      if (Buffer.byteLength(rawUrl) > INSPECTION_LIMITS.urlBytes) {
        reply(res, 414, { code: "INSPECTION_REQUEST_TOO_LARGE" }); return true;
      }
      const url = new URL(rawUrl, "http://localhost");
      if (url.pathname !== INSPECTION_PATH) {
        reply(res, 404, { code: "INSPECTION_UNSUPPORTED" }); return true;
      }
      if (req.method !== "GET") {
        reply(res, 405, { code: "INSPECTION_READ_ONLY" }); return true;
      }
      if (req.headers["transfer-encoding"] !== undefined || (req.headers["content-length"] !== undefined && req.headers["content-length"] !== "0")) {
        reply(res, 400, { code: "INSPECTION_BODY_NOT_ALLOWED" }); return true;
      }
      const params: Record<string, unknown> = {};
      for (const [key, value] of url.searchParams) {
        if (!(["sessionId", "workspaceId", "repoId", "limit"] as readonly string[]).includes(key) || Object.hasOwn(params, key)) {
          reply(res, 400, { code: "INVALID_INSPECTION_FILTER" }); return true;
        }
        params[key] = key === "limit" && /^[1-9][0-9]*$/u.test(value) ? Number(value) : value;
      }
      const request = inspectionRequestSchema.safeParse(params);
      if (!request.success) {
        reply(res, 400, { code: "INVALID_INSPECTION_FILTER" }); return true;
      }
      if (responses.size >= INSPECTION_LIMITS.observers) {
        reply(res, 503, { code: "INSPECTION_OBSERVER_LIMIT" }); return true;
      }
      // Observer accounting belongs to this server route, not a client name.
      responses.add(res);
      const timer = setTimeout(() => res.destroy(), INSPECTION_LIMITS.timeoutMs);
      timer.unref();
      const release = () => { clearTimeout(timer); responses.delete(res); };
      res.once("finish", release);
      res.once("close", release);
      try {
        const observation = capture(request.data);
        // The synchronous capture is over before validation/serialization.
        const encoded = JSON.stringify(inspectionObservationSchema.parse(observation));
        if (Buffer.byteLength(encoded) > INSPECTION_LIMITS.bytes) {
          reply(res, 503, { code: "INSPECTION_RESPONSE_TOO_LARGE" });
        } else {
          res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store", connection: "close" });
          res.end(encoded);
        }
      } catch {
        reply(res, 503, { code: "INSPECTION_OBSERVATION_FAILED" });
      }
      return true;
    },
    close(): void { for (const response of responses) response.destroy(); responses.clear(); },
  };
}
