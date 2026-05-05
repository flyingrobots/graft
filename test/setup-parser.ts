import { beforeAll } from "vitest";
import { ensureParserReady } from "../src/parser/runtime.js";

beforeAll(async () => {
  await ensureParserReady();
});
