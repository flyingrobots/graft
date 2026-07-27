import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../../..");
const ENTRYPOINT = path.join(
  REPOSITORY_ROOT,
  "test/e2e/rest-sessions/entrypoint.ts",
);
const READY_MESSAGE = "Graft REST server running on port 0";

function isolatedEntrypointEnvironment(
  temporaryDirectory: string,
  globalConfig: string,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || key.startsWith("GIT_")) {
      continue;
    }
    environment[key] = value;
  }

  environment["HOME"] = temporaryDirectory;
  environment["XDG_CONFIG_HOME"] = temporaryDirectory;
  environment["GIT_CONFIG_GLOBAL"] = globalConfig;
  environment["GIT_CONFIG_NOSYSTEM"] = "1";
  environment["GIT_TERMINAL_PROMPT"] = "0";
  environment["PORT"] = "0";
  return environment;
}

function waitForServerStartup(child: ChildProcess): Promise<void> {
  const stdout = child.stdout;
  const stderr = child.stderr;
  if (stdout === null || stderr === null) {
    throw new Error("REST-session entrypoint must expose stdout and stderr");
  }

  return new Promise((resolve, reject) => {
    let output = "";
    let errors = "";
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `REST-session entrypoint did not start within 10 seconds\nstdout:\n${output}\nstderr:\n${errors}`,
        ),
      );
    }, 10_000);

    stdout.setEncoding("utf8");
    stderr.setEncoding("utf8");
    stdout.on("data", (chunk: string) => {
      output += chunk;
      if (output.includes(READY_MESSAGE)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    stderr.on("data", (chunk: string) => {
      errors += chunk;
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `REST-session entrypoint exited before startup: code=${String(code)} signal=${String(signal)}\nstdout:\n${output}\nstderr:\n${errors}`,
        ),
      );
    });
  });
}

describe("REST-session Git identity isolation", () => {
  let child: ChildProcess | undefined;
  let temporaryDirectory: string | undefined;

  afterEach(async () => {
    if (child?.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
    if (temporaryDirectory !== undefined) {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("preserves the caller's exact global Git configuration during startup", async () => {
    temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "graft-rest-identity-"),
    );
    const globalConfig = path.join(temporaryDirectory, "global.gitconfig");
    const originalConfig = Buffer.from(
      "[user]\n\tname = Operator Sentinel\n\temail = operator@example.test\n",
      "utf8",
    );
    fs.writeFileSync(globalConfig, originalConfig);

    child = spawn(
      process.execPath,
      ["--import", "tsx", ENTRYPOINT],
      {
        cwd: REPOSITORY_ROOT,
        env: isolatedEntrypointEnvironment(temporaryDirectory, globalConfig),
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    await waitForServerStartup(child);

    expect(fs.readFileSync(globalConfig)).toEqual(originalConfig);
  });
});
