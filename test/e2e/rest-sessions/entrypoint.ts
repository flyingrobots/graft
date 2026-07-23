import { startRestServer } from "../../../src/mcp/rest-server.js";
import { execSync } from "child_process";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

try {
  execSync('git config --global user.email "e2e@graft.local"');
  execSync('git config --global user.name "Graft E2E"');
  console.log("Git global identity configured.");
} catch (e) {
  console.warn("Failed to set git global config", e);
}

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
