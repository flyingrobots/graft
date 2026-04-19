import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface TestDir {
  readonly path: string;
  cleanup(): void;
}

export function createTestDir(prefix = "graft-test-"): TestDir {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    path: dir,
    cleanup(): void {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
