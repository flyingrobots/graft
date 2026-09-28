# Release v0.14.0

## Scope and version

Release the bounded resident LRU and daemon lifecycle repairs from PR #251.
PR #255 also adopted testing policy, without adding runtime behavior.

The minor version follows Graft's pre-1.0 policy. This release adds the
`GRAFT_WARP_MAX_RESIDENTS` option and resident accounting, and changes admission
at capacity: a request for another writer lane can now fail instead of growing
memory without a handle limit. This is an intentional policy-default change.
The root package exports and command names are unchanged.

## Users and migration

Operators get a finite shared graph working set. Agents retain captured routes
while operations run, and idle sessions no longer retain graph pins. Library
consumers keep the documented root exports; internal source imports are not a
supported package contract.

Pin `0.14.0` when reproducibility matters. Restart the daemon after installation;
replacing files does not change a process that already loaded the old package.
Reconnect MCP clients after restart. Configure a limit from 1 through 64 only
when needed. Full pinned capacity returns an error; retry after work settles.
MCP status consumers must select `graft.mcp.daemon_status` schema `2.0.0` for
the added required `activeWarpResidents` count. Keep that count distinct from
unique repositories, memory bytes, or index freshness. The text CLI has no
registered JSON status schema and retains its `ok | degraded` projection.

## Gates

Follow the [release runbook](../../release-runbook.md): sequential local
preflight, isolated MCP dogfood, clean release commit, completed third-party
review and green CI, then regular merge into `main`. The signed tag must point
to that merged `main` commit. GitHub Actions owns publication; verify sanity,
release assets, and npm delivery separately.

The [verification witness](verification.md) records each result. Deployment
uses a new immutable installation directory, preserves the previous install,
and verifies the old process has no active or queued jobs before graceful
replacement. Transport sessions do not survive daemon restart.

## Deferred

Single-graph/worker byte limits and detailed resident-owner inspection remain
the two committed WARP debt cards. No Echo runtime migration, git-warp major
upgrade, or module split ships here.
