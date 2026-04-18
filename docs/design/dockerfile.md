---
title: "Cycle 0018: Dockerfile"
---

# Cycle 0018: Dockerfile

## Hill

Run graft as an MCP server in Docker without installing Node. Mount
the project directory at `/workspace` and connect via stdio.

## Design

Single-stage Dockerfile using Node 22 Alpine. Install dependencies,
copy source, set entrypoint to the MCP stdio transport.

```
docker run -i --rm -v "$PWD:/workspace" flyingrobots/graft
```

MCP clients configure it as:

```json
{
  "mcpServers": {
    "graft": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-v", "${workspaceFolder}:/workspace", "flyingrobots/graft"]
    }
  }
}
```

### Constraints

- Must work with stdio transport (stdin/stdout, no TTY allocation)
- Working directory inside container is `/workspace`
- `.graft/` directory created inside the mounted volume
- Tree-sitter WASM binaries must be present (installed via pnpm)
- No build step needed — tsx handles TypeScript directly

Effort: S
