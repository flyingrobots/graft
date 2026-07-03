# SURFACE: Projection authority boundary

## Hill

Graft can route dirty-buffer projection work to the correct language authority
without owning that language's semantics, consequences, or runtime authority.

The invariant is:

```text
Graft may know which Wesley profile applies.
Graft must not know what the Wesley profile means.
```

That invariant generalizes beyond Wesley. Graft may resolve the authority
context for Edict, Wesley SDL, Colorful, or future projection families. Each
provider owns interpretation, diagnostics, artifacts, and payload meaning.

## Problem

The Edict projection bridge proved that dirty editor text can flow through a
language authority and come back as syntax, diagnostics, Core, Target IR, and
digests. The projection provider registry then proved that routing can be
centralized without adding one top-level option per language.

The next provider cannot be a bare "GraphQL SDL" route. Wesley SDL is normally
used with extension profiles: base SDL plus domain-specific descriptor
semantics, generated artifacts, and canonical digests. If Graft only routes by
file extension, it cannot preserve the support context that tells an editor
which authority was asked to interpret a buffer. If Graft starts interpreting
Wesley directives or descriptor meanings, it becomes a second Wesley
implementation.

This design freezes the boundary before profile-aware Wesley projection lands.

## Boundary Doctrine

Graft owns:

- buffer identity and dirty source transport
- project configuration discovery
- profile selection and route resolution
- normalized projection slots
- basis, stale state, and routing failures
- preservation of provider payloads and diagnostics

Providers own:

- parsing and semantic interpretation
- extension meaning
- descriptor validation
- generated artifacts
- canonical artifact digests
- compiler or projection diagnostics

Graft routes profiles. Providers interpret profiles. Jim admits artifacts. Echo
executes artifacts. XYPH settles consequences.

## Projection Profile

A projection profile is the authority context. It binds the provider, language,
extension identities, and provider options that can affect semantics.

Conceptual shape:

```ts
type ProjectionProfile = {
  id: string;
  language: string;
  provider: string;
  profileDigest: string;
  extensions: Array<{
    coordinate: string;
    digest: string;
  }>;
  options?: Record<string, unknown>;
};
```

`profileDigest` must bind only the authority context:

- `id`
- `language`
- `provider`
- extension coordinates
- extension digests
- provider options relevant to semantics

`profileDigest` must not bind route globs. Changing which files route to a
profile changes routing, not what the profile means.

## Projection Route

A projection route maps buffers to authority contexts.

Conceptual shape:

```ts
type ProjectionRoute = {
  profileId: string;
  routingDigest: string;
  include: string[];
  exclude?: string[];
};
```

`routingDigest` binds routing rules:

- profile id
- include globs
- exclude globs
- explicit priority, if a future design adds priority

This slice does not add route priority. Ambiguous matches must fail.

## Resolved Authority Context

A resolved authority context records the authority context that governed a
specific projection request. It is passed to the provider and returned in the
projection bundle so editor UX can show the support context.

Conceptual shape:

```ts
type ResolvedAuthorityContext = {
  language: string;
  profileId: string;
  profileDigest: string;
  routingDigest?: string;
  provider: string;
  extensions: Array<{
    coordinate: string;
    digest: string;
  }>;
  resolutionSource: "explicit" | "project_config" | "extension_fallback";
};
```

`routingDigest` is present when resolution uses project configuration. Explicit
profile overrides and extension fallback may omit it unless a later design gives
those paths a route artifact.

## Resolution Rules

Profile resolution is deterministic:

1. Explicit nonblank profile override.
2. Project configuration glob match.
3. Registry extension fallback.
4. No provider.

Blank profile overrides are absence-shaped input:

| Input | Meaning |
| :--- | :--- |
| `undefined` | absent |
| `null` | absent |
| `""` | absent |
| `"   "` | absent |

Nonblank bad input is not absent:

| Case | Required result |
| :--- | :--- |
| Unknown explicit profile | `unknown_profile` |
| Two or more matching routes | `ambiguous_profile` |
| Known profile with unsupported provider | `profile_provider_unavailable` |
| Known profile with unsupported language | `unsupported_profile_language` |
| Known profile with unsupported extensions | `unsupported_extension_set` |

Graft must not silently choose the first matching route.

## Routing Failures

Routing failures are projection failures, not process crashes.

Conceptual kind set:

```ts
type ProjectionRoutingFailureKind =
  | "no_provider"
  | "unknown_profile"
  | "ambiguous_profile"
  | "unsupported_profile_language"
  | "unsupported_extension_set"
  | "profile_provider_unavailable"
  | "profile_config_invalid";
```

Editor hosts must be able to distinguish routing failure from provider
diagnostics and provider process failure.

## Projection Bundle Shell

The common projection shell normalizes state, not semantics.

Conceptual shape:

```ts
type LanguageProjectionBundle = {
  language: string;
  name: string;
  basis?: ProjectionBasis;
  authority?: ResolvedAuthorityContext;
  syntax: ProjectionSlot<SyntaxProjection>;
  diagnostics: DiagnosticProjection;
  digests: ProjectionSlot<DigestProjection>;
  payloads: Record<string, ProjectionSlot<unknown>>;
};
```

The shell may carry:

- language id
- buffer name
- basis and stale metadata
- resolved authority context
- syntax or syntax-adjacent spans
- diagnostics
- digest summaries
- authority-owned payload lanes

The shell must not force all languages into Edict-shaped `core` or `targetIr`
fields.

## Wesley Payload Lanes

The profile-aware Wesley provider should preserve Wesley-owned payload lanes
under `payloads`.

Expected lanes:

```ts
type WesleyPayloads = {
  schemaModel: ProjectionSlot<{
    digest: string;
    review: unknown;
  }>;
  canonicalCodec: ProjectionSlot<{
    digest: string;
    review: unknown;
  }>;
  typescriptPreview: ProjectionSlot<{
    text: string;
    digest?: string;
  }>;
  descriptors: ProjectionSlot<Array<{
    kind: string;
    coordinate: string;
    digest: string;
    review: unknown;
  }>>;
};
```

The `descriptors` lane is the pressure valve. Echo contract descriptors, Edict
lawpack descriptors, and later domain descriptor families can all travel there
without Graft learning their semantics.

Graft may preserve:

- descriptor kind
- descriptor coordinate
- descriptor digest
- descriptor review payload
- provider diagnostics

Graft must not interpret:

- `@echoContractHost`
- `@edictLawpack`
- codec law
- descriptor meaning
- Echo host semantics

## Config Sketch

The profile-aware Wesley slice should introduce project configuration along
these lines:

```toml
[profiles.wesley-base]
language = "wesley-sdl"
provider = "wesley"
profileDigest = "sha256:0000000000000000000000000000000000000000000000000000000000000000"
extensions = [
  { coordinate = "wesley.graphql-sdl/v1", digest = "sha256:1111111111111111111111111111111111111111111111111111111111111111" },
]

[profiles.echo-contract-sdl]
language = "wesley-sdl"
provider = "wesley"
profileDigest = "sha256:2222222222222222222222222222222222222222222222222222222222222222"
extensions = [
  { coordinate = "wesley.graphql-sdl/v1", digest = "sha256:1111111111111111111111111111111111111111111111111111111111111111" },
  { coordinate = "echo.graphql-contract-descriptors/v1", digest = "sha256:3333333333333333333333333333333333333333333333333333333333333333" },
]

[[routes]]
profile = "echo-contract-sdl"
routingDigest = "sha256:4444444444444444444444444444444444444444444444444444444444444444"
include = ["schemas/echo/**/*.graphql", "schemas/echo/**/*.graphqls"]

[[routes]]
profile = "wesley-base"
routingDigest = "sha256:5555555555555555555555555555555555555555555555555555555555555555"
include = ["schemas/base/**/*.graphql", "schemas/base/**/*.graphqls"]
```

The example digests are placeholders. The implementation slice must decide
whether profile and route digests are supplied, computed from canonical config,
or both in a reviewed way. It must not leave their semantics implicit.

## Wrong-profile Boundary Test

The Wesley provider slice must include a wrong-profile fixture:

```graphql
extend schema @echoContractHost
```

Route that fixture through `wesley-base`.

Expected behavior:

- Graft routes according to project configuration.
- Wesley returns a structured diagnostic.
- Graft preserves the diagnostic.
- Graft preserves the resolved authority context.
- Graft does not inspect the directive.
- Graft does not reroute automatically.

This test proves that Graft selected the authority context and Wesley
interpreted the language.

## Acceptance Criteria

- The boundary invariant is recorded as a design packet before the Wesley
  implementation slice starts.
- Profile identity and routing identity are explicitly separate.
- `profileDigest` is defined as authority-context identity.
- `routingDigest` is defined as route-selection identity.
- Resolution precedence is defined.
- Blank profile overrides are defined as absent.
- Unknown nonblank profile overrides are defined as structured failures.
- Ambiguous route matches are defined as structured failures.
- The common projection shell is defined as a normalized transport and state
  shell, not a semantic model.
- Wesley payload lanes are identified without making Graft own Wesley
  semantics.
- The wrong-profile boundary test is required for the implementation slice.
- Non-goals are explicit.

## Playback Questions

- Can an implementer explain the difference between `profileDigest` and
  `routingDigest`?
- Can an editor show which authority context governed a projection without
  interpreting the provider payload?
- Can a blank profile override fall through exactly like absence?
- Can an unknown nonblank profile return a stable routing failure?
- Can an ambiguous project-config match fail without choosing a route?
- Can Wesley reject an SDL directive under the wrong profile while Graft only
  preserves the result?
- Can Edict, Wesley, and Colorful keep language-owned payload lanes under the
  same projection shell?

## Non-goals

- Do not implement profile config parsing in this slice.
- Do not implement profile-aware Wesley projection in this slice.
- Do not add a Wesley CLI, WASM, or process adapter in this slice.
- Do not add jedit UI in this slice.
- Do not add Echo execution.
- Do not add Jim admission.
- Do not claim verifier, settlement, or reintegration authority.
- Do not make Graft interpret Wesley SDL directives, descriptors, codec laws,
  lawpacks, or Echo host semantics.

## Implementation Sequence

1. Add project profile config and deterministic authority-context resolution.
2. Add the common authority context shell to projection bundles.
3. Add a profile-aware Wesley provider contract with fake provider fixtures.
4. Add the real Wesley adapter after the contract is proven.
5. Add generic jedit projection rendering over the common shell.
6. Add domain-specific jedit panes for Wesley payload lanes.

## Test Strategy For Follow-up Slices

- Resolver tests for explicit, blank, unknown, ambiguous, config-match, and
  extension-fallback cases.
- Digest tests proving profile changes move `profileDigest` and routing-only
  changes move `routingDigest` without changing `profileDigest`.
- Provider-boundary tests proving Graft preserves Wesley diagnostics without
  interpreting SDL directives.
- Payload-shell tests proving Edict and Wesley can use different payload lanes
  under the same common slot model.
- No tests that merely assert this document's wording.
