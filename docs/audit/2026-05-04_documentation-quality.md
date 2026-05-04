---
report_id: "AUD-2026-05-04-D-V01"
title: "Documentation Quality Audit: Graft Context Governor"
status: "Final"
audit:
  date_started: 2026-05-04
  date_completed: 2026-05-04
  type: "Full"
  scope: "README.md, GUIDE.md, docs/**/*"
  compliance_frameworks: ["Technical Writing Best Practices"]
target:
  repository: "github.com/flyingrobots/graft"
  branch: "main"
  commit_hash: "HEAD"
  language_stack: ["Markdown"]
  environment: "Documentation"
methodology:
  automated_tools: ["None"]
  manual_review_hours: 2
  false_positive_rate: "0%"
summary:
  total_findings: 5
  severity_count:
    critical: 0
    high: 0
    medium: 2
    low: 3
  remediation_status: "Pending"
related_reports:
  previous_audit: "2026-04-11_documentation-quality.md"
---

# Documentation quality audit: Graft context governor

## Accuracy and Effectiveness

### Core Mismatch

The README quick start mentions:

```bash
npx @flyingrobots/graft init --write-claude-hooks --write-codex-mcp
```

The command also supports additional editor integrations, including
Cursor, Windsurf, Cline, and Continue. Those are documented later in
`docs/SETUP.md`, but the README misses a chance to show the breadth
early.

### Audience and Goal Alignment

The primary audience is AI-native developers and tool builders. The
documentation answers their top questions:

1. How do I integrate this into my existing AI agent?
2. What are the benefits over raw file reads?
3. How do I extend or customize the read policy?

The answers are distributed across `docs/SETUP.md`, `README.md`,
`docs/VISION.md`, `docs/CLI.md`, and
`docs/strategy/security-model.md`.

### Time To Value Barrier

The most significant bottleneck is the daemon versus repo-local choice.
It is explained well, but users must understand shared machine state and
repo-local simplicity early in their journey.

## Required Updates and Completeness Check

### README Priority Fixes

- Update the quick start to mention that `init` is idempotent and safe
  to run more than once.
- Explicitly list supported editor integrations in the README features
  section: Claude, Cursor, Windsurf, Cline, Continue, and Codex.
- Add a small README verification section explaining how to tell if
  Graft is working.

### Missing Standard Documentation

- `docs/audit/REMEDIATION_LOG.md`: a central log tracking audit finding
  remediation.
- `docs/TROUBLESHOOTING.md`: a guide for common integration and runtime
  errors.

### Supplementary Documentation

The causal provenance model in `docs/strategy/causal-provenance.md` is
complex. It would benefit from a "Causal Provenance by Example" section
showing a sequence of edits and how Graft tracks them.

## Final Action Plan

Recommendation type: incremental updates to existing README and docs.

Deliverable prompt:

> Update `README.md` to list all supported editor integrations, add
> idempotent `init` language, and include a verification section. Also
> create `docs/TROUBLESHOOTING.md` with initial entries for daemon
> socket connection issues and repo authorization failures.
