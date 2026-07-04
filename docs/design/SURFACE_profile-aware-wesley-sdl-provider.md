# SURFACE: Profile-aware Wesley SDL provider

## Hill

Graft can route dirty GraphQL SDL buffers to a Wesley projection provider with
the resolved authority context attached, while preserving Wesley-owned payloads
and diagnostics without interpreting Wesley SDL extension semantics.

The invariant remains:

```text
Graft may know which Wesley profile applies.
Graft must not know what the Wesley profile means.
```

## Problem

The projection provider registry, profile resolver, and authority-context
bundle slices established the routing shell. The shell can now identify which
authority profile applies to a dirty buffer and expose that context to editor
hosts. It still has no concrete non-Edict provider.

Wesley SDL is the right second provider, but it must be profile-aware from the
start. Real Wesley usage is not bare GraphQL parsing; it is base SDL plus
extension profiles, descriptor semantics, generated artifacts, and canonical
digests. Graft should pass the selected authority context to Wesley and preserve
the returned projection payloads. Graft must not inspect directives, infer
descriptor meaning, or reroute based on source text.

## Boundary

Graft may:

- route `.graphql` and `.graphqls` dirty buffers through the provider registry;
- pass `ResolvedAuthorityContext` to a Wesley provider;
- expose the selected authority context in the projection bundle;
- preserve Wesley syntax spans, diagnostics, digest summaries, and payload
  lanes;
- surface Wesley provider failures as projection-provider unavailability.

Graft must not:

- interpret `@echoContractHost`, `@edictLawpack`, or any Wesley directive;
- decide whether an extension is semantically required by source text;
- reroute a buffer after Wesley reports diagnostics;
- execute Echo;
- admit Jim artifacts;
- claim settlement or reintegration authority.

## Provider Contract

The implementation adds a Wesley provider binding alongside the existing Edict
binding.

Conceptual request shape:

```ts
type WesleyProjectionRequest = {
  name: string;
  content: string;
  basis?: WarmProjectionBasis | null;
  authority: ResolvedAuthorityContext;
  emit: Array<"syntax" | "diagnostics" | "digests" | "payloads">;
};
```

Conceptual bundle shape:

```ts
type WesleyProjectionBundle = {
  language: "wesley-sdl";
  name: string;
  basis: WarmProjectionBasis | null;
  syntax: ProjectionSlot<{ spans: SyntaxSpan[] }>;
  diagnostics: { items: WesleyDiagnosticItem[] };
  digests: ProjectionSlot<{ items: Array<{ kind: string; digest: string }> }>;
  payloads: Record<string, ProjectionSlot<unknown>>;
  status: {
    status: "ok" | "error";
    checked: number;
    errors: number;
  };
};
```

`payloads` are Wesley-owned. Graft preserves their lane names and values but
does not interpret their semantics.

Expected initial lanes:

- `schemaModel`
- `canonicalCodec`
- `typescriptPreview`
- `descriptors`

The provider may omit lanes by returning `not_requested`.

## Structured Buffer Behavior

When authority resolves to `language: "wesley-sdl"` and a registry provider is
registered:

1. `createStructuredBufferSnapshot(...)` invokes the Wesley provider with dirty
   buffer text, basis, emit set, and the exact resolved authority context.
2. A successful provider result makes the snapshot format `graphql`.
3. Syntax and diagnostics come from the Wesley bundle when available.
4. Provider diagnostics mark the projection partial.
5. Provider failure reports `PROJECTION_PROVIDER_UNAVAILABLE`.
6. Missing provider under resolved Wesley authority remains
   `PROJECTION_PROVIDER_UNAVAILABLE`.

Wrong-profile behavior is provider-owned:

```graphql
extend schema @echoContractHost
```

If project config routes that dirty buffer through `wesley-base`, Graft must
still call Wesley with `wesley-base`. Wesley reports the diagnostic. Graft
preserves it and does not inspect the directive or reroute to
`echo-contract-sdl`.

## Acceptance Criteria

- `ProjectionProviderRegistry` can register a Wesley provider binding.
- Registry lookup routes `.graphql` and `.graphqls` to the Wesley provider.
- A resolved `wesley-sdl` authority invokes the Wesley provider through
  `createProjectionBundle(...)`.
- The provider receives dirty buffer content, basis, emit set, and the exact
  `ResolvedAuthorityContext`.
- Projection bundles preserve the resolved authority context.
- Wesley syntax spans populate the common syntax slot.
- Wesley diagnostics populate the common diagnostics slot with source
  `wesley`.
- Wesley provider diagnostics mark the bundle partial.
- Wesley-owned payload lanes are accessible from `StructuredBuffer`.
- A wrong-profile fixture proves Graft preserves Wesley diagnostics without
  inspecting or rerouting source directives.
- Provider throws are surfaced as `PROJECTION_PROVIDER_UNAVAILABLE`.
- Existing Edict registry and direct Edict behavior remain unchanged.
- Root exports include Wesley provider types.

## Playback Questions

- Can a dirty `.graphqls` buffer route through a registry-registered Wesley
  provider?
- Can jedit display the same authority context that Wesley received?
- Can a wrong-profile Echo directive remain routed to `wesley-base` while
  Wesley reports the diagnostic?
- Can a host inspect Wesley payload lanes without Graft knowing descriptor
  semantics?
- Does Edict projection still work through direct and registry paths?

## Non-goals

- Do not parse `graft.projections.toml`.
- Do not add Wesley CLI, LSP, LSM, or WASM transport.
- Do not add generated TypeScript/codecs from real Wesley output.
- Do not interpret Wesley SDL directives or descriptor semantics in Graft.
- Do not add jedit UI.
- Do not execute Echo.
- Do not add Jim admission.
- Do not add settlement or reintegration authority.

## Test Strategy

- Add focused registry tests for Wesley provider registration and extension
  routing.
- Add focused structured-buffer tests using a deterministic in-memory Wesley
  provider.
- Prove RED with the focused registry and structured-buffer tests before
  implementation.
- Run focused tests, `pnpm typecheck`, `pnpm lint`, `pnpm build`,
  `pnpm release:surface-gate`, `git diff --check`, package docs, and the full
  suite before local retro and PR.
