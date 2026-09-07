/**
 * How many daemon jobs may run at once, and where that number comes from.
 *
 * The scheduler has always accepted `maxConcurrentJobs`; nothing ever supplied
 * it, so both construction sites took the conservative built-in default of 2
 * and there was no way to change it short of editing an installed package.
 * That default is right for a laptop running one assistant against one repo,
 * and wrong the moment several sessions share a daemon: with a cap of two,
 * a fan-out of agents queues behind itself and every session waits on the
 * slowest, including the one that started the fan-out.
 *
 * The knob is deliberately an environment variable rather than a stored
 * setting. Concurrency is a property of the machine the daemon happens to be
 * running on -- cores, memory, how many sessions the operator keeps open --
 * not of any repository, so it does not belong in a repo's configuration
 * where it would travel to machines it was never measured for.
 */

export interface DaemonSchedulerConfig {
  readonly maxConcurrentJobs: number;
}

export interface ResolveDaemonSchedulerConfigOptions {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly overrides?: Partial<DaemonSchedulerConfig>;
}

/** The built-in ceiling, unchanged: what an operator gets by saying nothing. */
export const DEFAULT_MAX_CONCURRENT_JOBS = 2;

/**
 * A positive integer, or the fallback.
 *
 * Malformed input falls back rather than throwing. This value is read while
 * the daemon is starting, and a typo in a shell profile should not leave a
 * machine with no daemon at all -- an operator who writes
 * `GRAFT_MAX_CONCURRENT_JOBS=ten` gets the default and a working daemon,
 * which is the failure they can diagnose from `daemon_status`.
 */
function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const trimmed = value.trim();
  if (trimmed === "") return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  if (normalized <= 0) return fallback;
  return normalized;
}

export function resolveDaemonSchedulerConfig(
  options: ResolveDaemonSchedulerConfigOptions = {},
): DaemonSchedulerConfig {
  const env = options.env ?? process.env;
  const base: DaemonSchedulerConfig = {
    maxConcurrentJobs: parsePositiveInteger(
      env["GRAFT_MAX_CONCURRENT_JOBS"],
      DEFAULT_MAX_CONCURRENT_JOBS,
    ),
  };
  return {
    ...base,
    ...options.overrides,
  };
}
