# Release Design: v0.11.0

## Included Work

- Add the Edict projection bridge for dirty `.edict` buffers, including the
  CLI-backed projection provider, syntax spans, diagnostics, Core projection
  slots, Target IR projection slots, and stable slot states.
- Add the projection provider registry so hosts can route language projections
  by language id or file extension instead of wiring one-off provider options.
- Add the projection authority boundary and the projection profile resolver,
  including separate profile and routing digests, blank override handling, and
  structured routing failures.
- Add authority-context propagation on projection bundles so editor hosts can
  display the selected profile, provider, language, extension coordinates, and
  extension digests.
- Add the profile-aware Wesley SDL provider seam for dirty `.graphql` and
  `.graphqls` buffers without making Graft interpret Wesley extension
  semantics.
- Preserve XML/SVG authority-resolution failures instead of silently falling
  back to native projection lanes.
- Preserve opaque Echo obstruction receipt projection slots from Edict
  projection output without claiming Echo execution, Jim admission, canonical
  receipt bytes, or scheduler counterfactual semantics.

## Deferred Work

- A real Wesley CLI, WASM, or LSP transport for the Wesley provider seam.
- Project-file discovery for `graft.projections.toml`.
- jedit UI rendering for Edict/Wesley projection lanes.
- Jim admission of Edict/Echo artifacts.
- Echo runtime execution for obstruction-strand receipts.
- Canonical Echo receipt bytes and receipt digests.
- General target plugin dispatch, settlement, or reintegration authority.

These remain follow-up work. They are not required for v0.11.0 because this
release ships Graft's projection broker surfaces and typed authority context,
not downstream runtime consequences.

## Hills Advanced

- **Editor Projection Brokerage**: Graft can route dirty editor buffers to
  language authorities while preserving normalized projection slots.
- **Authority Context Discipline**: Projection outputs can carry profile,
  provider, routing, and extension identity without Graft owning language
  semantics.
- **Edict Integration Readiness**: jedit can consume Graft's public package
  API to request Edict Core and Target IR projections from unsaved buffer text.
- **Receipt Display Readiness**: Future Edict/Echo receipts can pass through
  Graft as opaque projection data without being confused with hard rejection or
  scheduler counterfactuals.

## Sponsored Users

- **jedit** can depend on a published Graft package that includes Edict
  projection, authority context, Wesley provider seams, and receipt projection
  preservation.
- **Editor hosts** get reusable projection-provider routing instead of
  per-language ad hoc integration fields.
- **Language providers** keep semantic ownership of their payloads while Graft
  normalizes transport state, diagnostics, slots, and profile visibility.
- **Maintainers** get explicit non-goals around admission, execution, receipt
  canonicalization, and settlement authority.

## Version Justification

**Minor** (`0.10.1` to `0.11.0`).

This release adds public root exports, projection provider contracts, new
projection bundle fields, profile-resolution APIs, and additive editor-facing
projection capabilities. It does not intentionally break documented API, CLI,
or MCP behavior.

## Migration

- Existing `createStructuredBuffer(...)` callers continue to work.
- Existing direct `edictProjector` usage remains supported.
- Hosts that want the new routing model can register providers through
  `createProjectionProviderRegistry(...)` and optionally provide a
  `projectionProfileResolver`.
- Hosts that consume Echo receipt projection data must treat it as opaque
  projection payload unless and until Echo receipt bytes are canonicalized by a
  later release.

## Release Acceptance

This release is ready to tag when all of the following are true:

- `package.json` is bumped to `0.11.0`.
- `CHANGELOG.md` has a dated `0.11.0` section.
- `docs/releases/v0.11.0.md` is final.
- `docs/method/releases/v0.11.0/verification.md` records actual preflight
  evidence.
- `pnpm release:check` passes on the final release commit.
- The registry still reports `@flyingrobots/graft` latest as `0.10.1` before
  tag publication.
- The release PR is merged to `main`.
- `main` is exactly synced with `origin/main` before tagging.
- The `v0.11.0` tag is pushed only from the merged main release commit.
