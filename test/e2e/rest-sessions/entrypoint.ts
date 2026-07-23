import { startRestServer } from "../../../src/mcp/rest-server.js";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

startRestServer({
  port,
  sessionsPath: "/tmp/graft-sessions",
  baseRepoPath: "/app",
  mode: "repo_local",
}).then(() => {
  console.log(`Graft REST server running on port ${port}`);
}).catch(err => {
  console.error("Failed to start server", err);
  process.exit(1);
});
