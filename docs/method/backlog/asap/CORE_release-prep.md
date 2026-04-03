# Release prep for 0.1.0

Everything needed to `npm publish` a working package.

- `bin/graft.js` entry point (package.json references it, file
  doesn't exist). Should start the MCP stdio server.
- `exports` field in package.json for ESM consumers
- `main` / `types` fields if applicable
- `files` field to control what gets published
- Verify `npx @flyingrobots/graft` works end-to-end
- README setup instructions for MCP config

Depends on: graft diff (last feature before release).

Effort: S
