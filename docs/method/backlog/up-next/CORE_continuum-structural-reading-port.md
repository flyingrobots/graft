---
title: "Continuum structural reading port"
feature: core
kind: architecture
legend: CORE
lane: up-next
priority: 1
effort: L
requirements:
  - "v0.8.0 Review Truth release branch remains release-focused"
  - "Continuum runtime-boundary family: ObserverPlan, ObservationRequest, ReadingEnvelope, WitnessedSuffixShell, CausalSuffixBundle, ImportOutcome"
  - "Existing Graft WARP/git-warp review, symbol-history, dead-symbol, provenance-hint, and structural-test-reference surfaces"
  - "Existing API / CLI / MCP capability posture"
acceptance_criteria:
  - "StructuralReadingPort exists as the only Graft-facing structural read boundary"
  - "The existing git-warp-backed committed-history implementation sits behind that port without changing v0.8.0 review behavior"
  - "git-warp readings are explicitly marked translated/non-Continuum-native"
  - "No git-warp commit/range evidence is modeled as a Continuum witness"
  - "At least one fixture-backed or Echo-backed test proves the Continuum-native evidence branch"
  - "API, CLI, MCP, and rendering paths consume the normalized Graft structural payload instead of substrate-specific facts"
  - "The design names Graft's proposed Continuum registry role without making Graft the semantic owner of shared families"
---

# Continuum structural reading port

## Hill

Make Graft's structural memory boundary Continuum-shaped, not
Continuum-native.

By the end of this slice, Graft should have one explicit structural reading
port that accepts Continuum-shaped boundary concepts without requiring every
substrate to publish native Continuum artifacts.

The first implementation must support the current cold committed-history
implementation while preparing for Echo/live-frontier readings through
Continuum-authored boundary families.

## Why

Graft's `v0.8.0` Review Truth release proves useful structural review behavior:

- structural PR summaries
- structural test-reference signals
- provenance hints
- symbol history
- dead-symbol evidence
- broader language/config parsing

The implementation is still mostly shaped around `git-warp` as the durable
structural substrate. That is useful for cold Git history, but it creates
pressure when Graft needs to reason about hot editor frontiers, Echo-backed
contract heads, jedit buffers, speculative lanes, and cross-runtime suffix
exchange.

The stack direction is now clearer:

- Continuum owns shared contract families and witness language.
- Wesley compiles those families into generated artifacts.
- Echo and `git-warp` are sibling runtime implementations.
- `warp-ttd` is the debugger/operator surface.
- Graft is the structural-code observer and review engine.

Graft should therefore consume and emit structural readings over witnessed
causal history where native evidence exists, and over explicitly translated
substrate evidence where it does not. A Continuum-shaped payload is not the
same thing as a Continuum-native witness.

## Proposed Continuum role

This is the role Graft should propose for Continuum's repo role matrix:

| Repo | Registry role | Must not become |
| :--- | :--- | :--- |
| Graft | Structural observer and review engine; consumes runtime-boundary, receipt, settlement, neighborhood, and observer families; produces code-aware structural reading payloads. | A runtime implementation, debugger product, shadow Continuum semantic owner, or permanent host-normalization layer. |

Graft-local structural payloads may remain Graft-owned until a second repo needs
the same interchange semantics. If a structural payload family becomes shared
across tools, promote it into Continuum through the normal family promotion
rules instead of copying local DTOs.

## Evidence rule

Graft may normalize readings into Continuum-compatible shape. Only
Continuum-producing runtimes may claim Continuum-native witnesshood.

The port should model evidentiary status directly:

```ts
type StructuralReadingEvidence =
  | ContinuumNativeEvidence
  | TranslatedSubstrateEvidence;

type ContinuumNativeEvidence = {
  kind: "continuum-native";
  envelope: ReadingEnvelope;
  witness?: WitnessedSuffixShell;
};

type TranslatedSubstrateEvidence = {
  kind: "translated-substrate";
  substrate: "git-warp";
  basis: GitWarpCommittedBasis;
  evidence: GitWarpEvidence;
  nativeContinuumWitness: false;
};
```

The ugly `nativeContinuumWitness: false` marker is intentional. It prevents a
Git commit/range, git-warp graph fact, or adapter-produced compatibility object
from being laundered into a Continuum witness.

## Expected shape

The first port should describe Graft's needs, not a generic graph database:

- basis identity
- observation request identity
- structural reading kind
- current/stale/incomparable freshness
- complete/partial/plural/budget-limited/rights-limited/unavailable posture
- evidence status: Continuum-native or translated-substrate
- witness, receipt, shell, or hologram reference only when genuinely present
- payload digest or identity
- typed payload for Graft-owned structural facts

The current git-warp-backed implementation should become one adapter:

```text
Graft review / symbol history / dead symbols / test references
  -> StructuralReadingPort
  -> git-warp committed-history adapter
  -> translated-substrate evidence
```

A future Echo/live-frontier implementation should become another adapter:

```text
Graft live frontier structural projection
  -> StructuralReadingPort
  -> Continuum runtime-boundary family
  -> Echo or jedit head/frontier basis
  -> continuum-native evidence
```

`warp-ttd` should consume Graft structural readings as observer artifacts. It
should not become the long-term place where Graft-specific code meaning is
hand-normalized against Echo and `git-warp`.

## Implementation path

1. Define the structural reading port in `src/ports/` or the existing core
   boundary that best matches the local architecture.
2. Define `StructuralReadingEvidence` as a union of Continuum-native evidence
   and translated substrate evidence.
3. Move current git-warp-facing review/symbol/dead-symbol/test-reference reads
   behind the port without changing their public output contracts.
4. Mark every git-warp committed-history reading as `translated-substrate` with
   `nativeContinuumWitness: false`.
5. Add a fixture-backed or Echo-backed Continuum runtime-boundary test proving
   the Continuum-native branch, then replace fixtures with generated artifacts
   when the stack is ready.
6. Route API, CLI, MCP, and rendering paths through the normalized Graft
   structural payload instead of substrate-specific facts.
7. Document the Graft/Continuum/warp-ttd split in the design packet and keep
   [NORTHSTAR.md](../../../../NORTHSTAR.md) aligned.

## Non-goals

- Do not rewrite `v0.8.0` release scope.
- Do not replace git-warp in one step.
- Do not require git-warp to publish native Continuum artifacts before it can
  back Graft's structural port.
- Do not model git-warp commit/range evidence as a Continuum witness.
- Do not let "Continuum-shaped" imply "Continuum-native".
- Do not add a direct Echo dependency before the port boundary exists.
- Do not make Graft the owner of Continuum runtime-boundary nouns.
- Do not make `warp-ttd` the structural-review engine.
- Do not force Graft structural payloads into Continuum before another repo
  needs the same semantics.
