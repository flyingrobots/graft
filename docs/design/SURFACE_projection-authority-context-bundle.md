# SURFACE: Projection authority context in bundles

## Hill

Graft can attach a resolved projection authority context to dirty-buffer
projection bundles and pass that context to registry-routed providers without
interpreting the profile's language semantics.

## Problem

The projection provider registry can route by language or extension, and the
profile config resolver can determine which authority profile applies to a
dirty buffer. Those two pieces are still separate. Editor hosts can resolve a
profile and can request a projection, but `StructuredBuffer` and
`createProjectionBundle(...)` do not yet carry the resolved context through the
projection shell.

The profile-aware Wesley provider needs that context before it can be useful:
Graft should know the selected profile id, profile digest, routing digest,
provider id, language id, and semantic extension identities, while Wesley owns
the meaning of SDL directives and descriptors.

## Authority Boundary

Graft may:

- run a supplied `ProjectionProfileResolver`;
- expose the selected `ResolvedAuthorityContext` in a projection bundle;
- pass the same context to the selected projection provider;
- surface resolver failures as structured projection results;
- use the resolved language id for registry routing.

Graft must not:

- interpret Wesley SDL directives;
- infer descriptor meaning from extension coordinates;
- reroute based on source text contents;
- execute Echo, admit Jim artifacts, settle consequences, or claim
  reintegration authority.

## API Shape

Buffer construction accepts an optional resolver and profile override:

```ts
createProjectionBundle("schemas/echo/schema.graphqls", source, {
  profile: "echo-contract-sdl",
  projectionProfileResolver,
  projectionRegistry,
});
```

Resolution happens before provider invocation:

1. Normalize blank profile overrides as absent.
2. Ask the resolver for authority context when one is supplied.
3. If the resolver returns a failure, do not invoke a provider.
4. If authority resolves, route the registry by `authority.language`.
5. If no resolver is supplied, keep existing registry behavior.

Projection bundles expose the authority slot:

```ts
type ProjectionAuthoritySlot =
  | { state: "not_configured" }
  | { state: "resolved"; authority: ResolvedAuthorityContext }
  | { state: "failed"; failure: ProjectionRoutingFailure };
```

The slot is part of the common `WarmProjectionBundleResult`, not a
language-specific payload. This lets jedit display support context before a
Wesley provider exists.

Registry-routed provider requests receive the resolved authority context as
optional metadata. Providers may use it when they own that language contract.
Direct compatibility hooks remain additive and do not require a resolver.

## Failure Behavior

Resolver failures are projection results, not process failures.

- `unknown_profile` remains structured.
- `ambiguous_profile` remains structured.
- `no_provider` remains structured.
- Provider invocation is skipped when authority resolution fails.
- `unknown_profile` and `ambiguous_profile` report projection unavailability.
- `no_provider` does not disable native structured parsing for languages that
  do not need a projection provider.

This lets editor UI distinguish:

- no resolver configured;
- resolver configured and authority resolved;
- resolver configured but authority failed;
- authority resolved but no provider is available.

## Acceptance Criteria

- `createStructuredBuffer(...)` and `createProjectionBundle(...)` accept a
  `projectionProfileResolver`.
- Both APIs accept an optional `profile` override.
- Projection bundles include an authority slot.
- Without a resolver, existing bundles report `authority:
  { state: "not_configured" }`.
- A routed dirty buffer exposes the exact resolved authority context in the
  bundle.
- Blank profile override falls through to route resolution.
- Explicit profile override wins and produces no `routingDigest`.
- Unknown profile returns a structured authority failure.
- Ambiguous route matches return a structured authority failure.
- Provider invocation is skipped when authority resolution fails.
- A resolver `no_provider` result does not prevent native TypeScript parsing.
- Registry-routed providers receive the resolved authority context.
- Existing direct Edict projection behavior remains compatible.
- The root package exports the new public types.

## Playback Questions

- Can jedit display the profile id, profile digest, route digest, provider id,
  language id, and extension identities for a dirty buffer?
- Can a profile override select a profile independent of path routes?
- Does a blank profile override behave like absence?
- Does an authority failure keep the provider from running?
- Can a registry provider inspect the same authority context that the bundle
  returns?
- Does existing Edict projection still work without profile resolution?

## Non-goals

- Do not parse TOML or discover `graft.projections.toml`.
- Do not add a Wesley provider.
- Do not add a Wesley process, CLI, LSP, LSM, or WASM adapter.
- Do not interpret Wesley SDL or descriptor semantics.
- Do not add jedit UI.
- Do not execute Echo.
- Do not add Jim admission.
- Do not add settlement or reintegration authority.

## Test Strategy

- Unit-test authority propagation through `StructuredBuffer`.
- Unit-test one-shot `createProjectionBundle(...)` authority propagation.
- Unit-test blank override, explicit override, unknown profile, and ambiguous
  route behavior.
- Unit-test provider request authority metadata.
- Unit-test public root exports.
- Run focused structured-buffer/library tests for RED/GREEN, then typecheck,
  lint, build, release surface gate, whitespace check, package-docs, and the
  full isolated suite before opening a PR.
