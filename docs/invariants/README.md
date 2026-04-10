# Invariants

An invariant is a property that must ALWAYS hold. If violated, a
user-visible guarantee breaks. These are not style preferences —
they are system contracts.

Every invariant has at least one legend responsible for protecting
it. Cycles under that legend must verify the invariant holds.

## Index

### Policy (CORE)
- [policy-total](policy-total.md) — every safe_read evaluates policy
- [policy-surface-parity](policy-surface-parity.md) — bounded-read entry points activate the same policy contract
- [banned-never-leak](banned-never-leak.md) — banned files always refused
- [read-range-bounded](read-range-bounded.md) — max 250 lines enforced
- [state-cap](state-cap.md) — state_save rejects > 8KB

### Structural (CORE)
- [outline-total](outline-total.md) — supported languages always produce valid outlines
- [jump-table-valid](jump-table-valid.md) — start >= 1, end >= start

### Architectural (CLEAN_CODE)
- [domain-frozen](domain-frozen.md) — domain types are immutable after construction
- [core-no-platform](core-no-platform.md) — core has no node:* imports

### Cache (CORE)
- [cache-normalized](cache-normalized.md) — same file = same cache key

### WARP Ontology (WARP)
- [attribution-explicit-or-unknown](attribution-explicit-or-unknown.md) — actor attribution must name a supported actor class or explicitly stay unknown
- [attribution-confidence-evidence-bounded](attribution-confidence-evidence-bounded.md) — actor confidence cannot exceed the strength of supporting evidence
- [canonical-provenance-separate](canonical-provenance-separate.md) — canonical structural truth is not the same layer as canonical provenance
- [causal-events-carry-footprints](causal-events-carry-footprints.md) — provenance-capable events must have explicit footprints
- [causal-collapse-slice-based](causal-collapse-slice-based.md) — collapse admits the relevant causal slice, not the whole strand
- [checkout-epochs-explicit](checkout-epochs-explicit.md) — branch and history transitions must create explicit checkout-epoch boundaries
- [persisted-local-history-artifact-history](persisted-local-history-artifact-history.md) — persisted sub-commit history stays artifact_history until collapse admits it
- [transport-session-not-causal-session](transport-session-not-causal-session.md) — transport sessions are not the final product session model

### Observability (CORE)
- [receipt-always](receipt-always.md) — every MCP response has _receipt
- [versioned-output-schemas](versioned-output-schemas.md) — machine-readable outputs carry versioned schemas
- [decision-logged](decision-logged.md) — every policy decision hits NDJSON log

### Surfaces (CORE)
- [cli-mcp-feature-parity](cli-mcp-feature-parity.md) — product-facing CLI and MCP capabilities stay aligned

### Session (CORE)
- [depth-monotonic](depth-monotonic.md) — session depth never decreases
- [tripwire-thresholds](tripwire-thresholds.md) — tripwires fire at documented values

### Security (CORE)
- [path-traversal-blocked](path-traversal-blocked.md) — no escape from project root
- [no-secrets](no-secrets.md) — no credentials committed

### Process (all legends)
- [docs-match-code](docs-match-code.md) — docs reflect code at release
- [tests-are-spec](tests-are-spec.md) — tests pass = correct
- [zero-lint](zero-lint.md) — zero errors, zero warnings
