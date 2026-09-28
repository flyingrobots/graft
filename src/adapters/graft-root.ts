import * as os from "node:os";
import * as path from "node:path";

export const GRAFT_ROOT_PATH_ENV = "GRAFT_ROOT_PATH";

export class InvalidGraftRootPathError extends Error {
  readonly code = "INVALID_GRAFT_ROOT_PATH";

  constructor(readonly value: string) {
    super(`${GRAFT_ROOT_PATH_ENV} must be an absolute path, got ${JSON.stringify(value)}`);
    this.name = "InvalidGraftRootPathError";
  }
}

function pathsFor(platform: NodeJS.Platform): typeof path.posix {
  return platform === "win32" ? path.win32 : path.posix;
}

/**
 * Whether a path names the same place for every process. On Windows,
 * `path.isAbsolute` also accepts `\graft`, which is rooted on whichever drive
 * is current, so only a drive root (`C:\`) or a UNC share (`\\server\share`)
 * qualifies there.
 */
function isFullyQualified(value: string, platform: NodeJS.Platform): boolean {
  if (platform !== "win32") return path.posix.isAbsolute(value);
  return /^[A-Za-z]:[\\/]/u.test(value) || /^[\\/]{2}[^\\/]/u.test(value);
}

/**
 * The per-user Graft root: GRAFT_ROOT_PATH when set, otherwise `<home>/.graft`.
 * This is the only place Graft reads the home directory, so every per-user
 * default (the daemon root among them) moves with GRAFT_ROOT_PATH, and nothing
 * needs HOME changed, which git, ssh and gh also read. A relative value is
 * refused: a daemon and its clients could resolve it from different working
 * directories.
 */
export function graftRootPath(
  env: Readonly<Record<string, string | undefined>> = process.env,
  homeDirectory: () => string = os.homedir,
  platform: NodeJS.Platform = process.platform,
): string {
  const paths = pathsFor(platform);
  const configured = env[GRAFT_ROOT_PATH_ENV];
  if (configured === undefined || configured === "") return paths.join(homeDirectory(), ".graft");
  if (!isFullyQualified(configured, platform)) throw new InvalidGraftRootPathError(configured);
  return paths.normalize(configured);
}

/**
 * What the Windows daemon pipe name is derived from. With GRAFT_ROOT_PATH unset
 * it is the home directory, as before the variable existed, so an existing
 * daemon's pipe keeps its name; with it set, each Graft root gets its own pipe.
 */
export function graftRootPipeKey(
  env: Readonly<Record<string, string | undefined>> = process.env,
  homeDirectory: () => string = os.homedir,
  platform: NodeJS.Platform = process.platform,
): string {
  const configured = env[GRAFT_ROOT_PATH_ENV];
  return configured === undefined || configured === "" ? homeDirectory() : graftRootPath(env, homeDirectory, platform);
}
