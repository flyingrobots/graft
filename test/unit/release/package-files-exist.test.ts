import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");

describe("release: package.json files array", () => {
  it("every entry in the files array exists on disk", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      files?: string[];
    };
    const files = pkg.files ?? [];
    expect(files.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const entry of files) {
      const resolved = path.join(ROOT, entry);
      if (!fs.existsSync(resolved)) {
        missing.push(entry);
      }
    }

    expect(missing, `package.json files array references nonexistent paths: ${missing.join(", ")}`).toEqual([]);
  });
});
