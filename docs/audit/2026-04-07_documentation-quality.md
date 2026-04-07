# Audit 2: Documentation Quality

**Date:** 2026-04-07

## 1. Accuracy & Effectiveness Assessment

### 1.1 Core Mismatch

The single most critical outdated statement is the top-level README install section that still says:

```bash
npx @flyingrobots/graft
```

under “Or use directly.” That command is now a help-first human entrypoint. The explicit stdio transport command for MCP clients is `npx @flyingrobots/graft serve`, which is reflected in current config examples and in `src/cli/main.ts` plus `bin/graft.js`. The README should distinguish “inspect the CLI” from “start the MCP server” more clearly.

### 1.2 Audience & Goal Alignment

**Primary audience:** operators and integrators wiring Graft into local coding-agent workflows, with contributors as a secondary audience.

Top 3 audience questions:

1. What does Graft do, and why would I use it?
2. How do I wire it into my agent/editor quickly?
3. What do the tools/refusals mean when something goes wrong?

**Assessment:**  
The docs answer questions 1 and 2 fairly well. `README.md` gives a product claim, `docs/GUIDE.md` gives setup steps, and the quick-start path is much better than it was. Question 3 is answered partially: `docs/GUIDE.md` has troubleshooting and reason-code material, but the architecture and operational model still have to be reconstructed from multiple files rather than read from one contributor-facing reference.

### 1.3 Time-to-Value (TTV) Barrier

The biggest documentation bottleneck is that the operator setup story is still split across too many modes without a single “pick your path” decision table. A new developer has to infer whether they need:

- bare MCP only
- Claude hooks plus MCP
- project-local vs global config
- one-step `init` flags vs manual JSON/TOML editing

The information is present, but the decision flow is not.

## 2. Required Updates & Completeness Check

### 2.1 README.md Priority Fixes

Top three updates needed:

- Rewrite the “Or use directly” install paragraph so it distinguishes `npx @flyingrobots/graft` (human CLI/help) from `npx @flyingrobots/graft serve` (explicit MCP stdio startup).
- Tighten the quick-start section so it explains when the new `init --write-...` flags are enough and when the operator still needs manual per-client config.
- Add a short contributor/operator architecture pointer in the README that links to a dedicated architecture doc once it exists, instead of forcing readers to infer system structure from `GUIDE`, `BEARING`, `VISION`, and code.

### 2.2 Missing Standard Documentation

Two standard docs are still missing for a project of this type:

- `ARCHITECTURE.md` — there is no single contributor-facing system map for CLI, MCP, hooks, policy, WARP, and layered worldline behavior.
- `CODE_OF_CONDUCT.md` — the repo already has `CONTRIBUTING.md` and `SECURITY.md`, so this is the most obvious remaining standard community doc gap.

### 2.3 Supplementary Documentation

The most complex under-documented area is the runtime architecture around policy enforcement and the layered worldline model:

- CLI / entrypoint behavior in `bin/graft.js` and `src/cli/main.ts`
- MCP orchestration in `src/mcp/server.ts`
- repo observation in `src/mcp/repo-state.ts`
- WARP write/read split in `src/warp/indexer.ts` and `src/warp/observers.ts`

This deserves a dedicated architecture doc rather than scattered prose.

## 3. Final Action Plan

### 3.1 Recommendation Type

**A. Recommend incremental updates to the existing README and documentation.**

The docs are not broken enough to justify a full rewrite. They need targeted corrections, a clearer operator decision flow, and two standard supporting docs.

### 3.2 Deliverable (Prompt Generation)

Because the recommendation is incremental, the next move should be:

- fix the top README accuracy issues
- add an operator setup decision table
- create `ARCHITECTURE.md`
- create `CODE_OF_CONDUCT.md`

### 3.3 Mitigation Prompt

`Apply an incremental documentation update to Graft. First, update README.md so the install/quick-start path explicitly distinguishes human CLI use from MCP server startup, using npx @flyingrobots/graft serve wherever transport startup is intended. Second, add a short decision table to docs/GUIDE.md that tells operators when to use init --write-claude-mcp, init --write-claude-hooks, init --write-codex-mcp, or manual editor-specific config. Third, create ARCHITECTURE.md that explains the relationship between bin/graft.js, src/cli/main.ts, src/mcp/server.ts, src/mcp/repo-state.ts, src/warp/indexer.ts, and src/warp/observers.ts, including policy flow and layered worldline semantics. Finally, add CODE_OF_CONDUCT.md with a concise community standard appropriate for an Apache-licensed developer tools project, and link the new docs from README.md and CONTRIBUTING.md.`
