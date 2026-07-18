import { describe, expect, it } from "vitest";
import { projectMcpV2PeerPayloadToCliV1 } from "../../../src/cli/peer-command.js";

describe("CLI peer payload projection", () => {
  it("removes MCP v2-only observation evidence from the frozen CLI v1 shape", () => {
    const projected = projectMcpV2PeerPayloadToCliV1({
      semanticTransition: {
        kind: "unknown",
        authority: "repo_snapshot",
        observationBasis: "snapshot_delta",
        phase: null,
      },
      activityWindow: {
        groups: [{
          items: [{
            eventKind: "transition",
            payload: {
              semanticKind: "unknown",
              authority: "repo_snapshot",
              observationBasis: "git_transition_evidence",
            },
          }],
        }],
      },
      _receipt: {
        mode: "full",
        traceId: "trace-1",
        cumulative: { reads: 1 },
      },
    });

    expect(projected).toEqual({
      semanticTransition: {
        kind: "unknown",
        authority: "repo_snapshot",
        phase: null,
      },
      activityWindow: {
        groups: [{
          items: [{
            eventKind: "transition",
            payload: {
              semanticKind: "unknown",
              authority: "repo_snapshot",
            },
          }],
        }],
      },
      _receipt: {
        traceId: "trace-1",
        cumulative: { reads: 1 },
      },
    });
  });
});
