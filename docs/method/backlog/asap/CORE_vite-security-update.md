# Update Vite in the Vitest dependency chain for current advisories

`pnpm audit --json` currently reports three advisories through
`.>vitest>vite`, including two high-severity issues and one moderate
issue affecting `vite@8.0.3`.

Audit evidence:
- `GHSA-v2wj-q39q-566r` — high
- `GHSA-p9ff-h696-f583` — high
- `GHSA-4w7w-66w2-5vf9` — moderate

Recommended remediation from the live advisory data:
- upgrade to `vite@8.0.5` or later via the Vitest dependency chain

Scope:
- update the vulnerable dependency path safely
- verify whether the fix comes from a Vitest bump, an override, or both
- rerun tests and audit
- document any compatibility fallout

Effort: S
