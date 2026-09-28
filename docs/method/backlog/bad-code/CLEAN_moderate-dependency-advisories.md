---
title: "Update dependencies with moderate release advisories"
feature: release
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 1
effort: S
status: open
reported: 2026-09-11
owner: flyingrobots
---

# Update dependencies with moderate release advisories

The v0.14.0 preflight reports eight moderate package-advisory entries across
seven unique advisories, with zero high or critical findings. The release
policy permits triaged moderate findings; this card retains the unresolved
risk. Release ownership is `flyingrobots`. Reassess before the next release.

| Dependency and path | Advisory | Fixed version |
| :--- | :--- | :--- |
| `eslint > @humanfs/node`, development | [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g) | `0.16.8` |
| `sdk > express > qs`, runtime | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx), [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | `6.16.0` |
| `vitest` and `vitest > @vitest/mocker`, development | [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) | `4.1.11` |
| `sdk > hono`, runtime | [GHSA-gqvv-2mrq-wpjv](https://github.com/advisories/GHSA-gqvv-2mrq-wpjv), [GHSA-g6gw-c38x-mqfc](https://github.com/advisories/GHSA-g6gw-c38x-mqfc), [GHSA-crvj-82cr-hjcx](https://github.com/advisories/GHSA-crvj-82cr-hjcx) | `4.13.5` |

The development-only entries affect the tooling dependency graph rather than
the published runtime dependency list. The `qs` and `hono` entries remain in
the runtime graph. A source search found no direct use of those APIs in
Graft's CLI or MCP modules, but that does not establish their absence from
transitive execution. No finding is declared unreachable or fixed.

Update the existing overrides and affected development resolutions in a
focused dependency change. Require the security gate, transport/parser tests,
and package/release contracts to pass. Preserve the original audit count when
recording the new result. Evidence: v0.14.0 release witness and
`/tmp/graft-v0140-audit.json` from the local preflight.
