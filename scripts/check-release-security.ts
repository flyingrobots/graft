import { execFileSync } from "node:child_process";
import { evaluateSecurityGate, formatSecurityGateResult } from "../src/release/security-gate.js";

function readAuditReport(): unknown {
  try {
    const output = execFileSync("pnpm", [ "audit", "--json" ], {
      encoding: "utf-8",
      stdio: [ "pipe", "pipe", "pipe" ],
    });
    return JSON.parse(output) as unknown;
  } catch (err: unknown) {
    const stdout = (err as { stdout?: string }).stdout;
    if (typeof stdout === "string" && stdout.trim().length > 0) {
      return JSON.parse(stdout) as unknown;
    }
    throw err;
  }
}

const result = evaluateSecurityGate(readAuditReport());
console.log(formatSecurityGateResult(result));

if (result.blocking) {
  process.exitCode = 1;
}
