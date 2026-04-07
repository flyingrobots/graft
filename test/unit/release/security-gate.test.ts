import { describe, expect, it } from "vitest";
import { evaluateSecurityGate, formatSecurityGateResult } from "../../../src/release/security-gate.js";

describe("release security gate", () => {
  it("passes when audit reports no high or critical findings", () => {
    const result = evaluateSecurityGate({
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 1,
          high: 0,
          critical: 0,
        },
      },
      advisories: {
        "1001": {
          id: 1001,
          module_name: "vite",
          severity: "moderate",
          title: "Moderate issue",
          recommendation: "Upgrade later",
          github_advisory_id: "GHSA-demo",
          findings: [
            {
              version: "8.0.3",
              paths: [ ".>vitest>vite" ],
            },
          ],
        },
      },
    });

    expect(result.blocking).toBe(false);
    expect(formatSecurityGateResult(result)).toContain("release security gate: pass");
  });

  it("fails when audit reports high findings", () => {
    const result = evaluateSecurityGate({
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 1,
          critical: 0,
        },
      },
      advisories: {
        "1116009": {
          id: 1116009,
          module_name: "vite",
          severity: "high",
          title: "server.fs.deny bypassed with queries",
          recommendation: "Upgrade to version 8.0.5 or later",
          github_advisory_id: "GHSA-v2wj-q39q-566r",
          findings: [
            {
              version: "8.0.3",
              paths: [ ".>vitest>vite" ],
            },
          ],
        },
      },
    });

    expect(result.blocking).toBe(true);
    expect(result.blockingFindings).toHaveLength(1);
    expect(formatSecurityGateResult(result)).toContain("release security gate: fail");
    expect(formatSecurityGateResult(result)).toContain("GHSA-v2wj-q39q-566r");
  });
});
