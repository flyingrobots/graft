# Dockerfile

Docker-based startup for the MCP server. Run graft without installing
Node. Mounts the project directory at /workspace.

```
docker run -i --rm -v "$PWD:/workspace" flyingrobots/graft
```

Effort: S
