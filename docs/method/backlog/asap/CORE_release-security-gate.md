# Add a release-time dependency and security gate

The 2026-04-07 ship-readiness audit found that current dependency
security issues were discovered by manual `pnpm audit --json`, not by an
enforced release or CI gate.

Why this matters:
- release readiness should not depend on somebody remembering to run a
  manual audit command
- current Vite advisories show this is not a hypothetical gap
- the repo needs a repeatable, inspectable ship gate

Desired end state:
- define the minimum dependency/security checks required before release
- enforce them in CI and/or a release script
- fail clearly when critical or high-severity issues are present
- document the policy so operators know when audit output is a release
  blocker versus a tracked exception

Possible checks:
- `pnpm audit --json`
- lockfile drift detection
- optional dependency outdated policy for security-sensitive packages

Effort: M
