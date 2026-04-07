import { z } from "zod";

const severitySchema = z.enum([ "info", "low", "moderate", "high", "critical" ]);

const auditReportSchema = z.object({
  metadata: z.object({
    vulnerabilities: z.object({
      info: z.number().int().nonnegative(),
      low: z.number().int().nonnegative(),
      moderate: z.number().int().nonnegative(),
      high: z.number().int().nonnegative(),
      critical: z.number().int().nonnegative(),
    }),
  }),
  advisories: z.record(z.string(), z.object({
    id: z.number().int().nonnegative(),
    module_name: z.string(),
    severity: severitySchema,
    title: z.string(),
    recommendation: z.string(),
    github_advisory_id: z.string().nullable().optional(),
    findings: z.array(z.object({
      version: z.string(),
      paths: z.array(z.string()),
    })).optional(),
  })),
});

export interface SecurityGateViolation {
  readonly id: number;
  readonly moduleName: string;
  readonly severity: "high" | "critical";
  readonly title: string;
  readonly advisoryId: string | null;
  readonly recommendation: string;
  readonly paths: readonly string[];
  readonly versions: readonly string[];
}

export interface SecurityGateResult {
  readonly blocking: boolean;
  readonly counts: {
    readonly info: number;
    readonly low: number;
    readonly moderate: number;
    readonly high: number;
    readonly critical: number;
  };
  readonly blockingFindings: readonly SecurityGateViolation[];
}

export function evaluateSecurityGate(report: unknown): SecurityGateResult {
  const parsed = auditReportSchema.parse(report);
  const blockingFindings: SecurityGateViolation[] = [];

  for (const advisory of Object.values(parsed.advisories)) {
    if (advisory.severity !== "high" && advisory.severity !== "critical") {
      continue;
    }
    blockingFindings.push({
      id: advisory.id,
      moduleName: advisory.module_name,
      severity: advisory.severity,
      title: advisory.title,
      advisoryId: advisory.github_advisory_id ?? null,
      recommendation: advisory.recommendation,
      paths: advisory.findings?.flatMap((finding) => finding.paths) ?? [],
      versions: advisory.findings?.map((finding) => finding.version) ?? [],
    });
  }

  return {
    blocking: blockingFindings.length > 0,
    counts: parsed.metadata.vulnerabilities,
    blockingFindings,
  };
}

export function formatSecurityGateResult(result: SecurityGateResult): string {
  const lines = [
    `audit summary: critical=${String(result.counts.critical)} high=${String(result.counts.high)} moderate=${String(result.counts.moderate)} low=${String(result.counts.low)} info=${String(result.counts.info)}`,
  ];

  if (!result.blocking) {
    lines.push("release security gate: pass");
    return lines.join("\n");
  }

  lines.push("release security gate: fail");
  for (const finding of result.blockingFindings) {
    const advisoryId = finding.advisoryId ?? `npm:${String(finding.id)}`;
    const paths = finding.paths.length > 0 ? finding.paths.join(", ") : "unknown path";
    const versions = finding.versions.length > 0 ? finding.versions.join(", ") : "unknown version";
    lines.push(
      `- ${finding.severity.toUpperCase()} ${advisoryId} ${finding.moduleName}@${versions} via ${paths}`,
    );
    lines.push(`  ${finding.title}`);
    lines.push(`  ${finding.recommendation}`);
  }

  return lines.join("\n");
}
