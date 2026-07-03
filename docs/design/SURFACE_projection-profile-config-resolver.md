# SURFACE: Projection profile config resolver

## Hill

Graft can resolve a dirty buffer to a deterministic projection authority context
from an explicit profile override, project route configuration, or extension
fallback without interpreting the selected profile's language semantics.

## Problem

The projection authority boundary now separates profile identity from routing
identity. The next implementation step is the pure resolver that enforces that
boundary before any Wesley provider is attached.

This slice adds an in-memory profile config resolver. It does not read
`graft.projections.toml` from disk yet. File discovery and TOML parsing can land
after the resolver behavior is executable and covered.

## Authority Boundary

Graft may resolve:

- which profile id applies
- which provider id owns the projection
- which language id the provider will receive
- which route selected the profile
- which file-extension fallback selected the profile
- which profile and route digests describe that support context

Graft must not interpret:

- Wesley SDL directives
- Wesley extension semantics
- descriptor payload meaning
- Echo contract host semantics
- Edict lawpack descriptor semantics

## Config Model

The resolver accepts an already-parsed config object:

```ts
type ProjectionProfileResolverConfig = {
  profiles: ProjectionProfileInput[];
  routes?: ProjectionRouteInput[];
  extensionFallbacks?: ProjectionExtensionFallbackInput[];
};
```

Profile inputs bind authority context:

```ts
type ProjectionProfileInput = {
  id: string;
  language: string;
  provider: string;
  extensions: Array<{
    coordinate: string;
    digest: string;
  }>;
  options?: Record<string, unknown>;
};
```

Route inputs bind buffer selection:

```ts
type ProjectionRouteInput = {
  profileId: string;
  include: string[];
  exclude?: string[];
};
```

Extension fallback inputs are only the final route of last resort:

```ts
type ProjectionExtensionFallbackInput = {
  language: string;
  profileId: string;
  fileExtensions: string[];
};
```

`extensions` on `ProjectionProfileInput` are semantic extension identities.
`fileExtensions` on `ProjectionExtensionFallbackInput` are path suffixes. The
names stay separate because collapsing them would blur language authority with
file routing.

## Digest Rules

The resolver computes review digests from normalized config:

- `profileDigest = sha256(canonicalJson(["graft.projection-profile/v1", ...]))`
- `routingDigest = sha256(canonicalJson(["graft.projection-route/v1", ...]))`

`profileDigest` binds:

- profile id
- language id
- provider id
- semantic extension coordinates and digests
- semantic provider options

Digest input must be strict JSON data. The digest path rejects lossy preimages
such as `undefined`, array holes, non-finite numbers, functions, symbols,
bigints, and non-plain objects before hashing.

`routingDigest` binds:

- profile id
- include globs
- exclude globs

Changing route globs must not change `profileDigest`.
Changing profile semantic inputs must change `profileDigest`.

Profile order and route order in the config object must not affect the digest
for a selected profile or route.

## Resolution Rules

Resolution order is:

1. Explicit nonblank profile override.
2. Project route match.
3. Extension fallback.
4. No provider.

Blank profile overrides are absence-shaped input:

| Input | Meaning |
| :--- | :--- |
| `undefined` | absent |
| `null` | absent |
| `""` | absent |
| `"   "` | absent |

Nonblank unknown profile overrides return a structured `unknown_profile`
failure.

Project route matching is deterministic:

- Include globs match normalized slash paths.
- Exclude globs remove a route from consideration.
- Negated glob patterns are rejected; callers must use `exclude` instead.
- Matching zero routes falls through to extension fallback.
- Matching one route resolves that route.
- Matching more than one route returns `ambiguous_profile`.

The resolver must not pick the first matching route.

## Routing Failures

The resolver returns structured failures:

```ts
type ProjectionRoutingFailureKind =
  | "no_provider"
  | "unknown_profile"
  | "ambiguous_profile"
  | "profile_config_invalid";
```

The boundary design names additional future failure kinds for provider
capability checks. This slice only resolves config and routing. Provider
capability checks belong to the provider-contract slice.

## Acceptance Criteria

- A caller can create a resolver from an in-memory profile config.
- The resolver computes deterministic `profileDigest` and `routingDigest`
  values.
- Explicit nonblank profile override wins over route and extension fallback.
- Blank profile override is treated as absent.
- Unknown nonblank profile override returns `unknown_profile`.
- Route matches include `routingDigest` and `resolutionSource:
  "project_config"`.
- Route-only changes alter `routingDigest` but not `profileDigest`.
- Profile semantic changes alter `profileDigest`.
- Ambiguous route matches return `ambiguous_profile`.
- Excluded routes do not match.
- Extension fallback is used after project routes.
- No matching route or fallback returns `no_provider`.
- Config validation rejects duplicate profile ids, missing routes, duplicate
  extension fallbacks, malformed digests, negated route globs, malformed
  fallback file extensions, and empty route includes.
- The root package exports the resolver factory, error class, and public types.

## Playback Questions

- Can a synthetic dirty buffer pick a profile by explicit override?
- Does a blank profile override fall through to project routes?
- Can two matching routes fail without route-order dependence?
- Can a fallback `.graphqls` extension resolve only after routes miss?
- Can an editor display the resolved profile id, profile digest, route digest,
  provider id, language id, and semantic extension identities?
- Can profile and route digests change independently?

## Non-goals

- Do not parse TOML or read `graft.projections.toml` from disk.
- Do not add profile context to `StructuredBuffer` yet.
- Do not add a Wesley provider.
- Do not add a Wesley process, CLI, or WASM adapter.
- Do not add jedit UI.
- Do not add Echo execution, Jim admission, settlement, or reintegration
  authority.

## Test Strategy

- Unit-test resolver creation and route resolution in
  `test/unit/operations/projection-profile-resolver.test.ts`.
- Unit-test root package exports in `test/unit/library/index.test.ts`.
- Run focused resolver and root-export tests for RED/GREEN.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm release:surface-gate`,
  `pnpm build`, `git diff --check`, and the full suite before opening the PR.
