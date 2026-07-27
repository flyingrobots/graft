import { startRestServer } from "../../../src/mcp/rest-server.js";

const portValue = process.env["PORT"];
const port = portValue === undefined ? 3000 : Number.parseInt(portValue, 10);

startRestServer({
  port,
  sessionsPath: "/tmp/graft-sessions",
  baseRepoPath: "/app",
  mode: "repo_local",
}).then(() => {
  console.log(`Graft REST server running on port ${String(port)}`);
}).catch((error: unknown) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
