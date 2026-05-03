import process from "node:process";
import { runIsolatedTests } from "./isolated-test-runner.js";

runIsolatedTests({
  argv: process.argv.slice(2),
  env: process.env,
});
