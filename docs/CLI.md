# CLI

The Graft command surface is a composite of published binaries and repo-local operator scripts.

```mermaid
flowchart LR
    A[Graft CLI Surface] --> B[Lifecycle]
    A --> C[Namespaces]
    B --> B1[init]
    B --> B2[serve]
    B --> B3[daemon]
    B --> B4[index]
    C --> C1[read]
    C --> C2[struct]
    C --> C3[symbol]
    C --> C4[diag]
```

## What it is for
- bootstrap and setup via `graft init`
- local debugging and dogfooding of MCP peer commands
- human-facing inspection of bounded state such as:
  - `graft diag activity`
  - `graft diag doctor`
  - `graft diag stats`

## Core namespaces
- `read` — bounded reads and change checks
- `struct` — structural diff / since / map
- `symbol` — precision show / find
- `diag` — activity, doctor, explain, stats, capture

## Release-facing commands
```bash
graft diag activity --json
graft diag doctor --json
graft symbol find 'create*' --json
graft struct diff --json
```

`graft diag activity` is the current human-facing between-commit surface. It reports bounded local `artifact_history`, not canonical provenance.

## Related docs
- [README](../README.md)
- [Setup Guide](./SETUP.md)
- [MCP Guide](./MCP.md)
- [Advanced Guide](./ADVANCED_GUIDE.md)
- [Architecture](../ARCHITECTURE.md)
