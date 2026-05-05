import process from "node:process";
import { runIsolatedTests } from "./isolated-test-runner.js";

await runIsolatedTests({
  argv: process.argv.slice(2),
  env: process.env,
});
